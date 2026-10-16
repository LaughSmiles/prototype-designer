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
     * 锚点解析规则：
     *   - 锚点引用里的 rect 取**宿主矩形**：元素级锚点用页面元素矩形，
     *     inner 锚点用 iframe 内那个子元素的矩形（由 AnchorSession 解析）。
     *   - 解析不出宿主（页面刚加载、iframe 内元素还没上报）时，
     *     该端退回「整元素」语义，线仍然画得出来，不会消失。
     *
     * 旧数据（没有 fromAnchor/toAnchor 字段）走 route()，路径与升级前逐像素一致。
     */
    routeFor(element, fromEl, toEl, fromRect, toRect) {
        const hasAnchor = !!(element.fromAnchor || element.toAnchor);
        if (!hasAnchor) {
            return ConnectorRouter.route(fromRect, toRect);
        }

        const fromHost = this._hostRectOf(element.fromAnchor, fromEl, fromRect);
        const toHost = this._hostRectOf(element.toAnchor, toEl, toRect);

        return ConnectorRouter.routeFromAnchor(
            fromHost.rect, toHost.rect, fromHost.anchor, toHost.anchor);
    },

    /**
     * 解析锚点引用的宿主矩形 + 传给路由的锚点描述符。
     *
     * inner 锚点必须用**子元素自己的矩形**，否则线会从整个页面框的边出发，
     * 而不是从那个按钮出发 —— 这正是"内部元素也能作锚点"的意义所在。
     */
    _hostRectOf(anchorRef, fallbackEl, fallbackRect) {
        if (!anchorRef) return { rect: fallbackRect, anchor: null };

        // inner 锚点：向 AnchorSession 要宿主矩形
        if (anchorRef.kind === 'inner' && anchorRef.selector &&
            typeof AnchorSession !== 'undefined' && AnchorSession.resolve) {
            const resolved = AnchorSession.resolve({
                elementId: anchorRef.elementId || (fallbackEl && fallbackEl.id),
                kind: 'inner',
                selector: anchorRef.selector,
                side: anchorRef.side,
                t: anchorRef.t,
            });
            if (resolved && resolved.rect) {
                return {
                    rect: resolved.rect,
                    anchor: { side: anchorRef.side, t: anchorRef.t },
                };
            }
            // 内部宿主暂时解析不到 → 退回元素级，保证线可见
            return {
                rect: fallbackRect,
                anchor: { side: anchorRef.side, t: anchorRef.t },
            };
        }

        return { rect: fallbackRect, anchor: { side: anchorRef.side, t: anchorRef.t } };
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
     * 渲染当前 hover 元素的锚点（MasterGo 的「连接点」）。
     *
     * 绘制在**独立的顶层 SVG**（#connectorAnchorLayer）里，而不是塞进
     * 每个元素的 div：
     *   - 锚点画在元素边界**外侧**，塞进元素 div 会被 overflow 裁掉
     *   - iframe 内的子元素锚点根本不属于任何画布元素的 DOM 子树
     *
     * 锚点是纯视觉 + 命中靠几何计算（AnchorSession.hitTest），
     * 所以整层 pointer-events:none，不干扰任何既有交互。
     */
    renderAnchors() {
        const canvas = document.getElementById('canvas');
        if (!canvas) return;

        let layer = document.getElementById('connectorAnchorLayer');
        if (!layer) {
            layer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            layer.id = 'connectorAnchorLayer';
            layer.setAttribute('class', 'connector-anchor-layer');
            layer.style.cssText =
                'position:absolute;left:0;top:0;width:100%;height:100%;' +
                'overflow:visible;pointer-events:none;z-index:120;';
            canvas.appendChild(layer);
        }

        layer.innerHTML = '';

        const hoverId = (typeof ToolsConnector !== 'undefined') ? ToolsConnector.hoverElementId : null;
        if (!hoverId) return;
        const el = ElementManager.getElement(hoverId);
        if (!el) return;

        const hosts = AnchorSession.hostsOf(el);
        const r = AnchorProvider.RADIUS;

        for (const host of hosts) {
            for (const a of host.anchors) {
                const p = AnchorProvider.resolvePoint(host.rect, a);
                if (!p) continue;
                const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                c.setAttribute('class', 'connector-anchor');
                c.setAttribute('cx', p.x);
                c.setAttribute('cy', p.y);
                c.setAttribute('r', r);
                // 内部子元素的锚点用略淡的颜色，与宿主自身锚点区分开
                c.setAttribute('fill', host.kind === 'inner' ? '#ffffff' : '#ffffff');
                c.setAttribute('stroke', host.kind === 'inner' ? '#7cb3f5' : '#409EFF');
                c.setAttribute('stroke-width', '2');
                layer.appendChild(c);
            }
        }
    },

    /** 清空锚点层（切换工具 / 离开画布时调用） */
    clearAnchors() {
        const layer = document.getElementById('connectorAnchorLayer');
        if (layer) layer.innerHTML = '';
    }
};
