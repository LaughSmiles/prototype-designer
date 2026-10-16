// 元素渲染模块
// 负责画布上所有元素的渲染

// ============================ 页面框自适应高度 ============================
//
// 画布上的页面框默认是设备固定尺寸（1440×900 / 375×812），页面内容超出部分只能
// 在 iframe 内部滚动，画布上永远只能看到一屏。页面在画布里加载后会把真实内容高度
// 报回来（见 js/page-autofit.js），由这里盖到外框样式上，实现「像 MasterGo 一样」
// 的完整长框展示。
//
// ⚠️ 只写 div.style.height，绝不写 element.height：
//    自适应是渲染时的表现，不是画布数据。存档 JSON、脏标记、撤销栈都不该被它影响。
//    这也意味着拖动/缩放画布视图、重新渲染都不会丢失已测得的高度（缓存在这里）。

const PROTO_FRAME_BAR = 30; // 顶部拖拽条高度，与下方 calc(100% - 30px) 保持一致

window.ProtoAutoFit = {
    _cache: Object.create(null), // elementId -> { h, w } 实测内容尺寸（不含拖拽条与边框）

    remember(elementId, box) {
        if (!elementId || !box) return;
        this._cache[elementId] = { h: box.h, w: box.w };
    },

    /**
     * 把缓存的尺寸套到外框上。
     * 必须是**绝对赋值**：ResizeObserver 会在内容后续增长时反复调用本函数
     * （实测 pc-home 首次测量后内容又长了 2px），累加式写法会把框越撑越大。
     */
    apply(elementId, div, baseWidth, baseHeight) {
        const box = this._cache[elementId];
        if (!box || !div) return;
        if (typeof baseWidth !== 'number' || typeof baseHeight !== 'number') {
            const el = ElementManager.state.elements.find(e => e.id === elementId);
            if (!el) return;
            baseWidth = el.width;
            baseHeight = el.height;
        }

        // ⬇️ 边框补偿（本轮核心修复）
        // .canvas-element.page-element 是 border:1px + box-sizing:border-box，
        // style.height/width 里会被上下左右边框各吃掉 1px。
        // 早期版本没补这 2px，iframe 就比内容矮 2px → 冒出纵向滚动条
        // → 视口被压窄 15px → 移动页写死的 html,body{width:375px} 横向溢出
        // → 画布上凭空多出「右 + 下」两条滚动条。
        // 这里动态读取而不是写死 2，主题/样式变化都能自适应。
        const borderW = (div.offsetWidth - div.clientWidth) || 0;
        const borderH = (div.offsetHeight - div.clientHeight) || 0;

        // 只许长不许矮：页面框代表设备视口，不该比设备尺寸还矮
        div.style.width = `${Math.max(baseWidth, box.w) + borderW}px`;
        div.style.height = `${Math.max(baseHeight, box.h) + PROTO_FRAME_BAR + borderH}px`;
    },

    clear(elementId) {
        delete this._cache[elementId];
    }
};

const ElementRenderer = {
    // 渲染元素(不更新计数,用于撤销/重做)
    renderElementWithoutCount(element) {
        const canvas = document.getElementById('canvas');
        if (!canvas) return;

        const div = document.createElement('div');
        div.className = `canvas-element ${element.type}-element`;
        div.dataset.elementId = element.id;

        if (element.type === 'page') {
            this.renderPageElement(div, element, canvas);
        } else if (element.type === 'arrow') {
            this.renderArrowElement(div, element, canvas);
        } else if (element.type === 'connector') {
            this.renderConnectorElement(div, element, canvas);
        } else if (element.type === 'annotation') {
            ElementAnnotation.renderAnnotationElement(div, element);
            return; // 批注元素有自己的返回处理
        }

        // 连接线元素自带端点手柄，不需要额外的拖拽手柄（但要删除按钮）
        if (element.type !== 'connector') {
            // 添加删除按钮(批注元素已经在renderAnnotationElement中添加了,跳过)
            const deleteBtn = document.createElement('div');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
            deleteBtn.style.pointerEvents = 'auto';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                ElementManager.deleteElement(element.id);
            });
            div.appendChild(deleteBtn);
        }

        canvas.appendChild(div);

        // 选中状态
        if (ElementManager.state.selectedElements.includes(element.id) ||
            ElementManager.state.selectedElement === element.id) {
            div.classList.add('selected');
        }
    },

    // 渲染元素
    renderElement(element) {
        this.renderElementWithoutCount(element);
        ElementManager.updateStatusBar();
    },

    // 渲染页面元素
    renderPageElement(div, element, canvas) {
        div.style.left = `${element.position.x}px`;
        div.style.top = `${element.position.y}px`;
        div.style.width = `${element.width}px`;
        div.style.height = `${element.height}px`;
        // 若此前已测得内容尺寸，优先用它（element.width/height 是设备尺寸，只是下限）
        window.ProtoAutoFit.apply(element.id, div, element.width, element.height);

        // 拖拽手柄
        const dragHandle = document.createElement('div');
        dragHandle.className = 'page-drag-handle canvas-drag-handle';
        const pageName = PageLibrary.getPageName(element.pageId);
        dragHandle.innerHTML = `<i class="fas fa-grip-vertical"></i> ${pageName || '页面'}`;
        div.appendChild(dragHandle);

        // iframe预览
        const iframe = document.createElement('iframe');
        // 自适应高度的识别标记：页面侧靠 window.name 判断自己被画布以「页面元素」方式
        // 加载。全屏预览浮层与 index.html 总览页都不设这个名字，因此完全不受影响。
        // ⚠️ 必须在 src 之前设置，否则首个 about:blank 拿不到这个名字。
        iframe.name = `proto-canvas-${element.id}`;
        const pageInfo = PageLibrary.getPageInfo(element.pageId);
        iframe.src = pageInfo ? pageInfo.filePath : `pages/${element.pageId}.html`;
        iframe.style.width = '100%';
        iframe.style.height = 'calc(100% - 30px)';
        iframe.style.marginTop = '30px';
        iframe.style.border = 'none';
        // 框已精确贴合内容，auto 会在测量出现 1~2px 误差时露出滚动条；
        // hidden 是外层兜底，保证画布里不出现任何滚动条。
        iframe.style.overflow = 'hidden';
        div.appendChild(iframe);

        // ⚠️ 预热内部宿主：iframe 内容一就绪就去取，不等用户 hover。
        //
        // 用户报的第二个问题「锚点是逐步显示的，不是一下子全部显示」：
        //   修复前内部宿主是在 **hover 时**才去取，
        //   而 file:// 走 postMessage 桥要一个来回（约 5ms），
        //   于是首帧只有元素级 12 个，隔一帧才补到 152 个 —— 肉眼可见的"逐步出现"。
        //   MasterGo 是一帧出齐的。
        //
        // 挂在 load 上是因为此时内部 DOM 才有意义（about:blank 阶段没有内容）。
        // primeInnerHosts 自带去重，重复触发不会重复发请求。
        iframe.addEventListener('load', () => {
            if (typeof AnchorSession === 'undefined' || !AnchorSession.primeInnerHosts) return;
            AnchorSession.primeInnerHosts(element, iframe, () => {
                // 若用户此刻正悬停在这个元素上，立刻补齐
                if (typeof ToolsConnector !== 'undefined' &&
                    ToolsConnector.hoverElementId === element.id &&
                    typeof ElementManager !== 'undefined' && ElementManager.renderAnchors) {
                    ElementManager.renderAnchors([element.id]);
                }
            });
        });

        // 透明点击遮罩层：覆盖在 iframe 上方，捕获鼠标事件并正常冒泡
        const clickOverlay = document.createElement('div');
        clickOverlay.className = 'page-click-overlay';
        clickOverlay.style.position = 'absolute';
        clickOverlay.style.left = '0';
        clickOverlay.style.top = '30px';
        clickOverlay.style.width = '100%';
        clickOverlay.style.height = 'calc(100% - 30px)';
        clickOverlay.style.cursor = 'inherit';
        div.appendChild(clickOverlay);

        // 预览按钮（悬停时显示，点击打开全屏预览）
        const previewBtn = document.createElement('div');
        previewBtn.className = 'preview-btn';
        previewBtn.innerHTML = '<i class="fas fa-eye"></i>';
        previewBtn.title = '全屏预览此页面';
        previewBtn.style.pointerEvents = 'auto';
        previewBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            ev.preventDefault();
            const name = PageLibrary.getPageName(element.pageId);
            CanvasViewEvents.openPreview(name, element.id);
        });
        div.appendChild(previewBtn);

        // 右键菜单
        div.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const currentTool = Tools.getCurrentTool();
            if (currentTool === 'arrow' && Tools.arrowState.isDrawing) {
                return;
            }
            const pageInfo = PageLibrary.getPageInfo(element.pageId);
            ElementManager.showContextMenu(e.clientX, e.clientY, element, iframe, pageInfo);
        });

        // 不在这里appendChild，由调用者统一添加
    },

    // 渲染箭头元素
    renderArrowElement(div, element, canvas) {
        const points = element.points;
        if (points.length < 2) return;

        const allX = points.map(p => p.x);
        const allY = points.map(p => p.y);
        const minX = Math.min(...allX);
        const maxX = Math.max(...allX);
        const minY = Math.min(...allY);
        const maxY = Math.max(...allY);

        element.position = { x: minX, y: minY };
        element.width = maxX - minX;
        element.height = maxY - minY;

        const padding = 10;

        div.style.left = `${minX - padding}px`;
        div.style.top = `${minY - padding}px`;
        div.style.width = `${element.width + padding * 2}px`;
        div.style.height = `${element.height + padding * 2}px`;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'arrow-svg');
        svg.setAttribute('viewBox', `${-padding} ${-padding} ${element.width + padding * 2} ${element.height + padding * 2}`);
        svg.style.position = 'absolute';
        svg.style.left = '0';
        svg.style.top = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';

        const pathData = ElementManager.generateArrowPath(points, minX, minY);
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', '#e74c3c');
        path.setAttribute('stroke-width', '3');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');

        const arrowHead = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arrowHead.setAttribute('d', this.getArrowHeadPath(points[points.length - 2], points[points.length - 1], minX, minY));
        arrowHead.setAttribute('fill', '#e74c3c');

        svg.appendChild(path);
        svg.appendChild(arrowHead);
        div.appendChild(svg);

        // 不在这里appendChild，由调用者统一添加
    },

    // 生成箭头头部路径
    getArrowHeadPath(fromPoint, toPoint, offsetX, offsetY) {
        const angle = Math.atan2(toPoint.y - fromPoint.y, toPoint.x - fromPoint.x);
        const headLength = 15;
        const headAngle = Math.PI / 6;

        const x1 = toPoint.x - offsetX;
        const y1 = toPoint.y - offsetY;
        const x2 = x1 - headLength * Math.cos(angle - headAngle);
        const y2 = y1 - headLength * Math.sin(angle - headAngle);
        const x3 = x1 - headLength * Math.cos(angle + headAngle);
        const y3 = y1 - headLength * Math.sin(angle + headAngle);

        return `M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} Z`;
    },

    // ================================================================ 智能连接线

    /**
     * 为一条连接线算出路径点集。
     *
     * ⚠️ 端点解析一律走 `AnchorSession.resolveEndpoints` —— **唯一入口**。
     *    本项目曾因"同一逻辑写两份"出过三次分叉 bug，其中一次就是
     *    「预览用页面框矩形、落线用内部元素矩形」，用户看到预览终点
     *    y=54、实际终点 y=521.5。现在收敛为单处，结构上杜绝复发。
     *
     * 旧数据（没有 fromAnchor/toAnchor 字段）走 route()，
     * 路径与升级前逐像素一致。
     */
    routeFor(element, fromEl, toEl, fromRect, toRect) {
        const hasAnchor = !!(element.fromAnchor || element.toAnchor);
        if (!hasAnchor) {
            return ConnectorRouter.route(fromRect, toRect);
        }

        const ep = AnchorSession.resolveEndpoints(
            fromEl.id, toEl.id, element.fromAnchor, element.toAnchor);
        if (!ep) {
            // 端点元素已消失 → 退回元素级，至少把线画出来
            return ConnectorRouter.routeFromAnchor(fromRect, toRect,
                element.fromAnchor, element.toAnchor);
        }
        return ConnectorRouter.routeFromAnchor(
            ep.fromRect, ep.toRect, ep.fromSide, ep.toSide);
    },

    /**
     * 渲染智能连接线。
     *
     * 路径不存坐标 —— 每次都由 ConnectorRouter 按两端元素**当前**的位置实时算出，
     * 所以这里读的是元素实时 position，元素一动，线就跟着重算。
     */
    renderConnectorElement(div, element, canvas) {
        const fromEl = ElementManager.getElement(element.fromId);
        const toEl = ElementManager.getElement(element.toId);

        // 端点元素已不存在：静默跳过（deleteElement 会连带清理）
        if (!fromEl || !toEl) return;

        const fromRect = { x: fromEl.position.x, y: fromEl.position.y, width: fromEl.width, height: fromEl.height };
        const toRect = { x: toEl.position.x, y: toEl.position.y, width: toEl.width, height: toEl.height };

        // 锚点优先；旧数据没有锚点字段 → 退化为整元素路由（路径与升级前一致）
        const points = this.routeFor(element, fromEl, toEl, fromRect, toRect);
        if (!points || points.length < 2) return;

        // 缓存算出的路径点到元素上（供选中时放端点手柄 / 状态栏显示用）
        element._routePoints = points;

        const allX = points.map(p => p.x);
        const allY = points.map(p => p.y);
        const minX = Math.min(...allX), maxX = Math.max(...allX);
        const minY = Math.min(...allY), maxY = Math.max(...allY);

        // 把算出的包围盒写回元素，保持与 arrow 一致的约定
        element.position = { x: minX, y: minY };
        element.width = maxX - minX;
        element.height = maxY - minY;

        const padding = 12;   // 给箭头头部留空间

        div.style.left = `${minX - padding}px`;
        div.style.top = `${minY - padding}px`;
        div.style.width = `${element.width + padding * 2}px`;
        div.style.height = `${element.height + padding * 2}px`;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'connector-svg');
        svg.setAttribute('viewBox',
            `${minX - padding} ${minY - padding} ${element.width + padding * 2} ${element.height + padding * 2}`);
        svg.style.position = 'absolute';
        svg.style.left = '0';
        svg.style.top = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.overflow = 'visible';

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', 'connector-path');
        const round = ConnectorRouter.DEFAULT_RADIUS;
        path.setAttribute('d', ConnectorRouter.toRoundedPath(points, round));
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', '#999999');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        // 加宽透明命中区，让细线也好点中
        const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        hit.setAttribute('class', 'connector-hit');
        hit.setAttribute('d', ConnectorRouter.toRoundedPath(points, round));
        hit.setAttribute('fill', 'none');
        hit.setAttribute('stroke', 'transparent');
        hit.setAttribute('stroke-width', '12');

        const arrowHead = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arrowHead.setAttribute('class', 'connector-arrow');
        arrowHead.setAttribute('d', this.getArrowHeadPath(points[points.length - 2], points[points.length - 1], 0, 0));
        arrowHead.setAttribute('fill', '#999999');

        // 命中区在下、视觉在上，保证点线时先命中透明区
        svg.appendChild(hit);
        svg.appendChild(path);
        svg.appendChild(arrowHead);
        div.appendChild(svg);

        // 端点手柄（仅选中时显示），坐标已换算到 div 的局部系
        const fromHandle = document.createElement('div');
        fromHandle.className = 'connector-handle';
        fromHandle.dataset.connectorId = element.id;
        fromHandle.dataset.end = 'from';
        fromHandle.style.left = `${points[0].x - minX}px`;
        fromHandle.style.top = `${points[0].y - minY}px`;
        fromHandle.title = '拖动可改连起点';
        div.appendChild(fromHandle);

        const toHandle = document.createElement('div');
        toHandle.className = 'connector-handle';
        toHandle.dataset.connectorId = element.id;
        toHandle.dataset.end = 'to';
        toHandle.style.left = `${points[points.length - 1].x - minX}px`;
        toHandle.style.top = `${points[points.length - 1].y - minY}px`;
        toHandle.title = '拖动可改连终点';
        div.appendChild(toHandle);

        // 不在这里appendChild，由调用者统一添加
    },

    // ================================================================ 锚点层

    /**
     * 渲染锚点（MasterGo 的「连接点」）。
     *
     * ⚠️ 为什么锚点层挂在 document.body 而不是 #canvas：
     *    #canvas 在 #canvasWrapper 里，而 wrapper 是 `overflow:hidden`、
     *    高度仅等于视口可见区（实测 727px）。用户放大看单个页面框时，
     *    页面框底边会落到屏幕 y=834 > 771，
     *    **底部 14 个锚点全被裁掉**（实测 insideWrapper:0 / clipped:14）。
     *    数据层是完整对称的（124 个），丢的是渲染而非数据。
     *    改成 body + position:fixed 后，锚点不再受画布滚动区裁剪。
     *
     * @param {?Array<string>|?string} elementIds 要显示的页面元素 id
     * @param {?{x,y}} cursor 鼠标画布坐标；决定第二层高亮哪个内部元素
     */
    renderAnchors(elementIds, cursor) {
        const layer = this._ensureAnchorLayer();
        if (!layer) return;

        layer.innerHTML = '';

        // 归一成数组并去重：绘制期同一元素可能既是源又是目标
        const ids = (Array.isArray(elementIds) ? elementIds : [elementIds]).filter(Boolean);
        const unique = ids.filter((v, i) => ids.indexOf(v) === i);

        // fixed 层以视口为参照系：画布坐标要先换算成屏幕坐标再落点。
        // ⚠️ origin 必须是 #canvasWrapper 的屏幕位置 —— 画布坐标是相对 wrapper 的，
        //    不是相对视口原点。用 (0,0) 会让所有锚点整体偏移 wrapper.left/top。
        const view = (typeof CanvasView !== 'undefined' && CanvasView.getView)
            ? CanvasView.getView() : { zoom: 1, pan: { x: 0, y: 0 } };
        const wrapper = document.getElementById('canvasWrapper');
        const origin = wrapper
            ? wrapper.getBoundingClientRect()
            : { left: 0, top: 0 };
        const rendered = [];

        for (const id of unique) {
            const el = ElementManager.getElement(id);
            if (!el) continue;
            const hosts = AnchorSession.hostsOf(el);
            // ⚠️ 两层模型（修「应该逐步显示却一次全亮」）：
            //    第一层 = 页面框自身（恒亮）
            //    第二层 = 鼠标当前所在的**那一个**内部元素
            //    其余内部元素的锚点**不显示** —— MasterGo 就是这个行为。
            const layers = AnchorSession.pageLevelHosts(hosts).slice();
            const inner = AnchorSession.hoveredInnerHost(cursor, hosts);
            if (inner) layers.push(inner);

            for (const host of layers) {
                for (const a of host.anchors) {
                    const canvasPt = AnchorProvider.resolvePoint(host.rect, a);
                    if (!canvasPt) continue;
                    const p = AnchorSession.toViewport(canvasPt, view, origin);
                    if (!p) continue;

                    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    c.setAttribute('class', 'connector-anchor');
                    c.setAttribute('cx', p.x);
                    c.setAttribute('cy', p.y);
                    // ⚠️ r 直接用屏幕单位，**不除 zoom**。
                    //    锚点层是 position:fixed（不受画布缩放影响），
                    //    再除 zoom 等于反向放大 —— 实测 zoom=0.25 时圆点涨到 40px，
                    //    而 MasterGo 缩放到 12% 仍是 10~11px。
                    //    恒定 10px 同时也解决了「小圆点互相盖住导致只显示一半」。
                    c.setAttribute('r', AnchorProvider.RADIUS);
                    c.setAttribute('fill', '#ffffff');
                    // 内部子元素的锚点用略淡的蓝，与宿主自身锚点区分开
                    c.setAttribute('stroke', host.kind === 'inner' ? '#7cb3f5' : '#409EFF');
                    c.setAttribute('stroke-width', '1.5');
                    layer.appendChild(c);

                    // 清单里存的仍是**画布坐标**，因为命中检测用的是画布坐标
                    rendered.push({
                        ref: {
                            elementId: host.elementId,
                            kind: host.kind,
                            selector: host.selector,
                            side: a.side,
                            t: a.t,
                        },
                        point: canvasPt,
                    });
                }
            }
        }

        AnchorSession.setRendered(rendered);
    },

    /** 创建（或复用）锚点层：挂在 body 上，fixed 定位，不受画布滚动区裁剪 */
    _ensureAnchorLayer() {
        let layer = document.getElementById('connectorAnchorLayer');
        if (layer && layer.parentNode === document.body) return layer;

        layer = layer || document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        layer.id = 'connectorAnchorLayer';
        layer.setAttribute('class', 'connector-anchor-layer');
        layer.style.cssText =
            'position:fixed;left:0;top:0;width:100%;height:100%;' +
            'overflow:visible;pointer-events:none;z-index:120;';
        document.body.appendChild(layer);
        return layer;
    },

    /** 清空锚点层（切换工具 / 离开画布时调用） */
    clearAnchors() {
        const layer = document.getElementById('connectorAnchorLayer');
        if (layer) layer.innerHTML = '';
        // ⚠️ 清单必须同步清空，否则残留锚点还能被命中 ——
        //    用户看到的是空画布，却能"点到"早已消失的锚点。
        AnchorSession.setRendered([]);
    }
};
