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

    // ================================================================
    // 连接线命中区（手感带）

    /**
     * 命中区应当是**屏幕上恒定 10px** 宽的透明带，不随画布缩放变粗变细。
     *
     * ⚠️ 为什么不能写死 stroke-width：
     *    #canvas 用 `transform: scale(zoom)` 缩放（canvas-view.js:146），
     *    SVG 元素的 stroke 会跟着这个 transform 一起缩放。
     *    zoom=0.25 时写死的 12 在屏幕上只剩 3px —— 细到几乎点不中；
     *    zoom=4 时又变成 48px，一条线能"点中"半张页面。
     *    所以必须在**画布坐标系**里写 10 / zoom，屏幕上的实际宽度
     *    才是 (10/zoom) * zoom = 10。
     *
     * 与锚点恒定 10px 是同一条原则（见 renderAnchors 里 AnchorProvider.RADIUS
     * 不除 zoom 的注释）。⚠️ 但**不能**用 vector-effect="non-scaling-stroke"
     * 偷懒：那个属性不跟随祖先 transform 的 zoom，只是让它不缩放，
     *    并不能把宽度调成"屏幕上 10px"，也无法按 zoom 动态改值。
     *
     * @returns {number} 画布坐标系下的 stroke-width
     */
    getHitStrokeWidth() {
        let zoom = 1;
        try {
            // ⚠️ 用裸标识符 CanvasView（不要 window.CanvasView）：
            //    classic script 的顶层 const 活在全局**词法**作用域，不挂到 window。
            if (typeof CanvasView !== 'undefined' && CanvasView.getView) {
                const v = CanvasView.getView();
                if (v && typeof v.zoom === 'number' && v.zoom > 0) zoom = v.zoom;
            }
        } catch (e) {
            zoom = 1;
        }
        return 10 / zoom;
    },

    /**
     * 重算**已渲染**的所有连接线命中区宽度。
     *
     * ⚠️ 缩放时必须调用：命中区是在 renderConnectorElement 里写死的，
     *    画布 zoom 变了但 DOM 不会自动重算，不重写就会出现
     *    「放大后点不中线 / 缩小后乱点」。
     *    用 requestAnimationFrame 节流，连续滚轮缩放时每帧最多跑一次。
     */
    refreshHitStrokeWidths() {
        if (this._hitRefreshPending) return;
        this._hitRefreshPending = true;
        const run = () => {
            this._hitRefreshPending = false;
            const w = this.getHitStrokeWidth();
            const hits = document.querySelectorAll('.connector-hit');
            for (let i = 0; i < hits.length; i++) {
                hits[i].setAttribute('stroke-width', String(w));
            }
        };
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
        else run();
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
        return this.applyWaypointsTo(
            element, fromEl, toEl, this._routeBase(element, fromEl, toEl, fromRect, toRect));
    },

    /** 自动路由本体（不含手动路径点） */
    _routeBase(element, fromEl, toEl, fromRect, toRect) {
        // ---- 自由端分支：至少一端不在任何页面框上（MasterGo 实测的独立连接线）----
        //
        // ⚠️ 这条分支必须排在最前面，且**不得**碰下面那段绑定逻辑：
        //    两端都绑定时逐像素不变是这个模块的立身之本，
        //    一旦共用同一段代码就再也分不清了。
        if (!fromEl || !toEl) {
            const a = AnchorSession.resolveOne(element.fromId, element.fromAnchor, element.fromFree);
            const b = AnchorSession.resolveOne(element.toId, element.toAnchor, element.toFree);
            // 两端都能定出具体坐标 → 走「中点台阶」路由（对齐 MasterGo）
            if (a && b && a.point && b.point) {
                return ConnectorRouter.routeFreePoints(a.point, b.point);
            }
            // 绑定端没带锚点 → 退回整元素矩形路由，至少保证有线可看
            const ar = a ? a.rect : fromRect;
            const br = b ? b.rect : toRect;
            if (ar && br) return ConnectorRouter.route(ar, br);
            return null;
        }

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
     * 应用手动路径点（MasterGo「拖段」的产物）。
     *
     * ⚠️ 为什么不能把 waypoints 存成「每段一个偏移量」：
     *    实测拖一次段，段数会变（3 段 Z 形塌成 2 段 L 形；再拖末段又回到 3 段），
     *    按段索引存的偏移当场就对不上。所以这里存的是**完整路径点**。
     *
     * ⚠️ 页面框移动时的行为（实验实测，对应用户确认的「平移」方案）：
     *    把 waypoints 整体平移两端绑定元素的位移**平均值**，
     *    再把首尾钉回锚点 → 形状跟着框走，不会被拉扁。
     *    实测：框水平左移 135，线的 X 不变、W 减 135、H 一像素不动。
     *
     * 没有 waypoints 的旧数据走 base，行为逐像素不变。
     */
    applyWaypointsTo(element, fromEl, toEl, base) {
        const wp = element.waypoints;
        const ref = element.wpRef;
        if (!Array.isArray(wp) || wp.length < 2) return base;
        if (!Array.isArray(base) || base.length < 2) return base;

        let moved = wp;
        if (ref && fromEl && toEl && fromEl.position && toEl.position) {
            const dfx = fromEl.position.x - ref.from.x;
            const dfy = fromEl.position.y - ref.from.y;
            const dtx = toEl.position.x - ref.to.x;
            const dty = toEl.position.y - ref.to.y;
            const dx = (dfx + dtx) / 2;
            const dy = (dfy + dty) / 2;
            if (dx !== 0 || dy !== 0) {
                moved = ConnectorRouter.translatePoints(wp, dx, dy);
            }
        }

        return ConnectorRouter.applyWaypoints(moved, base, base[0], base[base.length - 1]);
    },

    /**
     * 渲染智能连接线。
     *
     * 路径不存坐标 —— 每次都由 ConnectorRouter 按两端元素**当前**的位置实时算出，
     * 所以这里读的是元素实时 position，元素一动，线就跟着重算。
     */
    /**
     * 取一条连接线两端的「路由矩形」。
     *
     * 绑定端 → 元素自身的矩形；自由端 → 用它存的坐标造一个 0×0 矩形。
     *
     * ⚠️ 必须抽成公共函数：renderConnectorElement（首次绘制）与
     *    renderConnectorInto（改连 / 拖段后就地重绘）过去各造一份，
     *    本仓库已被"同一逻辑写两份"坑过三次。这里一次写死，两处共用。
     */
    endpointRects(element, fromEl, toEl) {
        const rectOf = (el, free) => {
            if (el) {
                return { x: el.position.x, y: el.position.y, width: el.width, height: el.height };
            }
            if (free && Number.isFinite(free.x) && Number.isFinite(free.y)) {
                return { x: free.x, y: free.y, width: 0, height: 0 };
            }
            return null;
        };
        return {
            fromRect: rectOf(fromEl, element.fromFree),
            toRect: rectOf(toEl, element.toFree),
        };
    },

    /**
     * 渲染智能连接线。
     *
     * 绑定端：路径不存坐标 —— 每次由 ConnectorRouter 按两端元素**当前**的位置实时算出。
     * 自由端：路径由 fromFree/toFree + waypoints 决定。
     */
    renderConnectorElement(div, element, canvas) {
        const fromEl = ElementManager.getElement(element.fromId);
        const toEl = ElementManager.getElement(element.toId);

        // 两端都解析不出来（元素被删光且没存自由坐标）→ 静默跳过
        const { fromRect, toRect } = this.endpointRects(element, fromEl, toEl);
        if (!fromRect || !toRect) return;

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

        // 不在这里 appendChild，由调用者统一添加
        this.renderConnectorParts(div, element, points, minX, minY);
    },

    /**
     * 画一条连接线的**全部可视内容**：SVG + 端点手柄 + 段胶囊。
     *
     * ⚠️ 为什么必须抽成公共函数：renderConnectorElement（首次绘制）与
     *    renderConnectorInto（改连 / 拖段后的就地重绘）过去各写了一份，
     *    本仓库已被"同一逻辑写两份"坑过三次。只要它们有任何一处漏改，
     *    就会出现「首次画得出、改连后缺手柄」这类只在交互里才暴露的 bug。
     *
     * ⚠️ 容器定位在 minX - CONNECTOR_PADDING，所以**子元素落位必须补回这个 padding**：
     *    `left = 点.x - minX + padding` 才对得上画布坐标。
     *    漏掉它会把端点圆点与段胶囊整体偏移 12px —— 端点圆点只是"看着稍微歪一点"，
     *    而 18×6 的胶囊偏 12px 后整条飞出线的 stroke 范围，
     *    于是 hover 不亮、点不中，且**不报任何错**。
     */
    renderConnectorParts(div, element, points, minX, minY) {
        if (!div || !Array.isArray(points) || points.length < 2) return;

        const padding = this.CONNECTOR_PADDING;   // 给箭头头部留空间

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
        hit.setAttribute('stroke-width', String(this.getHitStrokeWidth()));

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
        this._appendHandle(div, element, points[0], minX, minY, 'from', '拖动可改连起点');
        this._appendHandle(div, element, points[points.length - 1], minX, minY, 'to', '拖动可改连终点');

        // 段胶囊（MasterGo：每段中点一个，悬停连线即出现）
        this._appendSegmentHandles(div, element, points, minX, minY);
    },

    /** 端点拖拽圆点 */
    _appendHandle(div, element, point, minX, minY, end, title) {
        const h = document.createElement('div');
        h.className = 'connector-handle';
        h.dataset.connectorId = element.id;
        h.dataset.end = end;
        // ⚠️ 补回 padding：容器原点在 minX - padding（见 renderConnectorParts）
        h.style.left = `${point.x - minX + this.CONNECTOR_PADDING}px`;
        h.style.top = `${point.y - minY + this.CONNECTOR_PADDING}px`;
        h.title = title;
        div.appendChild(h);
    },

    /**
     * 段胶囊 —— MasterGo 实测：hover 到连线上，每一段的中点都冒出一个
     * 18.5×6.5 屏幕像素的粗蓝胶囊；按住拖动可以把这一段整段平移。
     * 端点圆点则只在**选中**时出现。
     *
     * ⚠️ 胶囊落在「直线部分」的中点，不是几何中点：
     *    段的两头是圆角（DEFAULT_RADIUS=16），算几何中点会正好压在圆弧上。
     *    实测扣掉两端各 8 屏幕 px（=16 画布 px × 0.5 缩放）后与 MasterGo 逐像素吻合。
     */
    _appendSegmentHandles(div, element, points, minX, minY) {
        const size = this.getSegHandleSize();
        for (let i = 0; i < points.length - 1; i++) {
            const a = points[i];
            const b = points[i + 1];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len = Math.hypot(dx, dy);
            // 微段（亚像素残差）不放手柄，否则会堆出一堆点不中的小圆点
            if (len <= 1) continue;

            const vertical = Math.abs(dy) > Math.abs(dx);
            const inset = this.getCornerRadius();   // 画布坐标，无需再除 zoom
            const a1 = vertical ? { x: a.x, y: a.y + inset } : { x: a.x + inset, y: a.y };
            const b1 = vertical ? { x: b.x, y: b.y - inset } : { x: b.x - inset, y: b.y };
            if (Math.hypot(b1.x - a1.x, b1.y - a1.y) <= 1) continue;

            const cx = (a1.x + b1.x) / 2;
            const cy = (a1.y + b1.y) / 2;

            // ⚠️ 朝向必须跟随线段：竖段要用「窄而长」的竖胶囊，横段用「宽而扁」的横胶囊。
            //    MasterGo 实测就是这样（横段 18.5×6.5、竖段 6.5×18.5，屏幕像素），
            //    写成固定朝向时竖线上会躺着一个横把手 —— 不报错，只是明显不对。
            const boxW = vertical ? size.h : size.w;
            const boxH = vertical ? size.w : size.h;

            const h = document.createElement('div');
            h.className = 'connector-seg-handle';
            h.dataset.connectorId = element.id;
            h.dataset.segIndex = String(i);
            h.dataset.vertical = vertical ? '1' : '0';
            // 存下中心坐标，缩放重算尺寸时才能把中心钉回原处（见 refreshSegHandleSizes）
            // ⚠️ 补回 padding：容器原点在 minX - padding（见 renderConnectorParts）
            h.dataset.cx = String(cx - minX + this.CONNECTOR_PADDING);
            h.dataset.cy = String(cy - minY + this.CONNECTOR_PADDING);
            h.style.left = `${cx - minX + this.CONNECTOR_PADDING - boxW / 2}px`;
            h.style.top = `${cy - minY + this.CONNECTOR_PADDING - boxH / 2}px`;
            h.style.width = `${boxW}px`;
            h.style.height = `${boxH}px`;
            h.title = '拖动可调整这一段的位置';
            div.appendChild(h);
        }
    },

    /** 段胶囊的屏幕尺寸（MasterGo 实测 18.5×6.5px，缩放时保持恒定） */
    SEG_HANDLE_SCREEN_W: 18,
    SEG_HANDLE_SCREEN_H: 6,

    /**
     * 连接线容器四周留白（画布坐标）。
     * 容器定位在 minX - padding，手柄/胶囊落位时必须用同一个值补回来，
     * 否则两者差一个 padding，手柄会整体偏移（且不报错）。
     */
    CONNECTOR_PADDING: 12,

    /** 段胶囊尺寸（画布坐标系） */
    getSegHandleSize() {
        return {
            w: this.SEG_HANDLE_SCREEN_W / this.getZoom(),
            h: this.SEG_HANDLE_SCREEN_H / this.getZoom(),
        };
    },

    /** 圆角半径（与 toRoundedPath 用同一个值） */
    getCornerRadius() {
        return ConnectorRouter.DEFAULT_RADIUS;
    },

    /** 当前画布缩放（读不到时按 1 处理） */
    getZoom() {
        try {
            // ⚠️ 用裸标识符 CanvasView（不要 window.CanvasView）：
            //    classic script 的顶层 const 活在全局**词法**作用域，不挂到 window。
            if (typeof CanvasView !== 'undefined' && CanvasView.getView) {
                const v = CanvasView.getView();
                if (v && typeof v.zoom === 'number' && v.zoom > 0) return v.zoom;
            }
        } catch (e) { /* 读不到就按 1 处理 */ }
        return 1;
    },

    /**
     * 缩放后重算段胶囊尺寸。
     *
     * ⚠️ 与 refreshHitStrokeWidths 同理：胶囊的宽高是在渲染时算成画布坐标写死的，
     *    画布 zoom 变了但 DOM 不会自动重算，不重写就会「放大后胶囊糊成一大坨、
     *    缩小时小到看不见」。
     */
    refreshSegHandleSizes() {
        if (this._segRefreshPending) return;
        this._segRefreshPending = true;
        const run = () => {
            this._segRefreshPending = false;
            const size = this.getSegHandleSize();
            const nodes = document.querySelectorAll('.connector-seg-handle');
            for (let i = 0; i < nodes.length; i++) {
                const el = nodes[i];
                // ⚠️ 必须沿用渲染时的朝向（dataset.vertical），否则缩放一次
                //    就会把所有竖段上的竖胶囊打回横的 —— 缩放不该改变外观。
                const vertical = el.dataset.vertical === '1';
                const boxW = vertical ? size.h : size.w;
                const boxH = vertical ? size.w : size.h;
                el.style.width = `${boxW}px`;
                el.style.height = `${boxH}px`;
                // left/top 是按旧尺寸居中算的，换尺寸后要把中心钉回原处
                const cx = parseFloat(el.dataset.cx);
                const cy = parseFloat(el.dataset.cy);
                if (Number.isFinite(cx) && Number.isFinite(cy)) {
                    el.style.left = `${cx - boxW / 2}px`;
                    el.style.top = `${cy - boxH / 2}px`;
                }
            }
        };
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
        else run();
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
