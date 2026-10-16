// 智能连接线工具模块
// 负责连接线的绘制、预览、端点拖拽改连
//
// 移植自 MasterGo 连接线交互：
//   - 在页面框 A 内按下 → 拖到页面框 B 松手 → 建立 from/to 绑定
//   - 路径不存坐标，每次由 ConnectorRouter 按当前几何实时算出
//   - 选中后可拖两端圆点改连谁（路径自动重算）
//
// 坐标换算与 tools-arrow.js 保持一致：
//   画布坐标 = (鼠标在 wrapper 中的坐标 - pan) / zoom

const ToolsConnector = {
    // 绘制中的状态
    state: {
        isDrawing: false,
        fromId: null,      // 起点的页面元素 id
        fromAnchor: null,  // 起点锚点引用（从锚点起拖时非空）
        hoverId: null,     // 拖拽时鼠标下的页面元素 id
        hoverAnchor: null, // 鼠标吸附到的锚点引用
        cursor: null,      // 当前鼠标画布坐标
    },

    // 端点拖拽中的状态（选中连线后拖两端圆点）
    dragState: {
        active: false,
        connectorId: null,
        end: null,         // 'from' | 'to'
        hoverId: null,
        hoverAnchor: null,
    },

    /** 当前悬停的页面元素（用于显示锚点），null = 不显示 */
    hoverElementId: null,

    /**
     * 锚点吸附半径（屏幕像素）。
     * 换算到画布坐标时会除以 zoom，保证缩放后手感一致。
     */
    SNAP_PX: 12,

    // ------------------------------------------------------------ 坐标换算

    /** 屏幕坐标 → 画布坐标 */
    toCanvasCoords(e) {
        const canvasWrapper = document.getElementById('canvasWrapper');
        if (!canvasWrapper) return { x: 0, y: 0 };
        const rect = canvasWrapper.getBoundingClientRect();
        const view = CanvasView.getView();
        return {
            x: (e.clientX - rect.left - view.pan.x) / view.zoom,
            y: (e.clientY - rect.top - view.pan.y) / view.zoom,
        };
    },

    /** 命中检测：找出鼠标位置最顶层的页面元素（page-element） */
    findPageElementAt(e) {
        const target = e.target;
        if (!target || !target.closest) return null;

        // 命中页面元素本体
        const el = target.closest('.canvas-element.page-element');
        if (el) {
            const id = el.dataset.elementId;
            return id ? ElementManager.getElement(id) : null;
        }
        // 命中 iframe 时向上找（iframe 内部的元素拿不到，但 wrapper 能找到）
        const iframeEl = target.closest('iframe');
        if (iframeEl) {
            const parent = iframeEl.closest('.canvas-element.page-element');
            if (parent) {
                const id = parent.dataset.elementId;
                return id ? ElementManager.getElement(id) : null;
            }
        }
        // 兜底：用坐标做几何命中（覆盖 .page-click-overlay 等遮罩场景）
        const pos = this.toCanvasCoords(e);
        return this.findPageElementByPoint(pos.x, pos.y);
    },

    /** 几何命中：从上到下（后渲染的在上）找第一个包含该点的页面元素 */
    findPageElementByPoint(x, y) {
        const elements = ElementManager.state.elements;
        for (let i = elements.length - 1; i >= 0; i--) {
            const el = elements[i];
            if (el.type !== 'page') continue;
            if (x >= el.position.x && x <= el.position.x + el.width &&
                y >= el.position.y && y <= el.position.y + el.height) {
                return el;
            }
        }
        return null;
    },

    /** 取得元素矩形（供路由使用） */
    rectOf(el) {
        if (!el) return null;
        return { x: el.position.x, y: el.position.y, width: el.width, height: el.height };
    },

    /** 取某页面元素内的 iframe（锚点桥需要它） */
    iframeOf(elementId) {
        const wrapper = document.querySelector(`.canvas-element.page-element[data-element-id="${elementId}"]`);
        return wrapper ? wrapper.querySelector('iframe') : null;
    },

    // ------------------------------------------------------------ 锚点显示

    /**
     * 设置当前悬停的元素 → 决定显示哪些锚点。
     *
     * MasterGo 的锚点是**按需出现**的：不 hover 就不显示。
     * 所以这里每次 hover 变化都要重绘锚点层。
     */
    setHoverElement(element) {
        const id = element ? element.id : null;
        if (id === this.hoverElementId) return;
        this.hoverElementId = id;
        AnchorSession.hoverId = id;

        // ⚠️ 用 typeof 而不是 window.ElementManager：
        //    顶层 const 在词法作用域里，不挂在 window 上（CLAUDE.md 记录过此坑）。
        if (typeof ElementManager === 'undefined' || !ElementManager.renderAnchors) return;

        if (id) {
            // 异步预热内部宿主；回来后再重绘一次（首次可能只有元素级锚点）
            const iframeEl = this.iframeOf(id);
            AnchorSession.primeInnerHosts(element, iframeEl, () => {
                if (this.hoverElementId === id) ElementManager.renderAnchors();
            });
        }
        ElementManager.renderAnchors();
    },

    /** 当前吸附半径（画布坐标） */
    snapTolerance() {
        const view = CanvasView.getView();
        const zoom = view && view.zoom ? view.zoom : 1;
        return this.SNAP_PX / zoom;
    },

    /** 在给定元素上尝试吸附到某个锚点 */
    snapToAnchor(element, canvasPos) {
        if (!element) return null;
        const hosts = AnchorSession.hostsOf(element);
        return AnchorSession.hitTest(canvasPos.x, canvasPos.y, hosts, this.snapTolerance());
    },

    // ------------------------------------------------------------ 绘制

    /** mousedown：在锚点上按下 → 从该锚点起画；在元素内按下 → 元素级起画 */
    handleMouseDown(e) {
        if (e.button !== 0) return;
        const from = this.findPageElementAt(e);
        if (!from) return;   // 没落在页面框上就不开始

        const pos = this.toCanvasCoords(e);

        // 优先吸附到锚点：点中锚点 = 用户明确指定了连接点
        const snap = this.snapToAnchor(from, pos);
        this.state.fromAnchor = snap ? snap.ref : null;

        this.state.isDrawing = true;
        this.state.fromId = from.id;
        this.state.cursor = pos;
        e.preventDefault();
        e.stopPropagation();
    },

    /** mousemove：实时预览 */
    handleMouseMove(e) {
        if (this.state.isDrawing) {
            this.state.cursor = this.toCanvasCoords(e);
            const hover = this.findPageElementAt(e);
            const hoverId = hover && hover.id !== this.state.fromId ? hover.id : null;
            this.state.hoverId = hoverId;
            // 终点也支持吸附锚点
            const snap = hover ? this.snapToAnchor(hover, this.state.cursor) : null;
            this.state.hoverAnchor = snap ? snap.ref : null;
            this.renderPreview();
            return;
        }

        if (this.dragState.active) {
            this.dragState.hoverId = this.resolveDropTarget(e);
            const hoverEl = this.dragState.hoverId ? ElementManager.getElement(this.dragState.hoverId) : null;
            const snap = hoverEl ? this.snapToAnchor(hoverEl, this.toCanvasCoords(e)) : null;
            this.dragState.hoverAnchor = snap ? snap.ref : null;
            this.renderPreview();
        }
    },

    /** mouseup：落点建线 / 端点改连 */
    handleMouseUp(e) {
        if (this.state.isDrawing) {
            const to = this.resolveDropTarget(e);
            if (to && to !== this.state.fromId) {
                ElementManager.addConnectorElement(
                    this.state.fromId, to, this.state.fromAnchor, this.state.hoverAnchor);
                PageLibrary.showHint('✅ 连接线已创建');
                HistoryManager.saveState();
            } else {
                PageLibrary.showHint('⚠️ 需要拖到另一个页面框上');
            }
            this.cancelDrawing();
            Tools.setTool('select');
            return;
        }

        if (this.dragState.active) {
            const connectorId = this.dragState.connectorId;
            const end = this.dragState.end;
            const targetId = this.dragState.hoverId;
            if (connectorId) {
                if (targetId) {
                    ElementManager.retargetConnector(connectorId, end, targetId, this.dragState.hoverAnchor);
                    HistoryManager.saveState();
                    PageLibrary.showHint('✅ 连接线已改连');
                } else {
                    PageLibrary.showHint('⚠️ 未落在页面框上，改连已取消');
                }
            }
            this.dragState.active = false;
            this.dragState.connectorId = null;
            this.dragState.end = null;
            this.dragState.hoverId = null;
            this.dragState.hoverAnchor = null;
            this.removePreview();
        }
    },

    /** 解析落点元素（排除另一端已有的元素，避免连成自环） */
    resolveDropTarget(e) {
        const hit = this.findPageElementAt(e);
        if (!hit) return null;

        // 绘制新线：不能连到自己
        if (this.state.isDrawing && hit.id === this.state.fromId) return null;

        // 改连端点：不能连到另一端（否则变成自环）
        if (this.dragState.active) {
            const connector = ElementManager.getElement(this.dragState.connectorId);
            if (connector) {
                const otherId = this.dragState.end === 'from' ? connector.toId : connector.fromId;
                if (hit.id === otherId) return null;
            }
        }
        return hit.id;
    },

    cancelDrawing() {
        this.state.isDrawing = false;
        this.state.fromId = null;
        this.state.fromAnchor = null;
        this.state.hoverId = null;
        this.state.hoverAnchor = null;
        this.removePreview();
    },

    // ------------------------------------------------------------ 端点拖拽

    /** 开始拖拽某个端点（由 canvas-view-events 在 mousedown 命中圆点时调用） */
    beginEndpointDrag(connectorId, end) {
        this.dragState.active = true;
        this.dragState.connectorId = connectorId;
        this.dragState.end = end;
        this.dragState.hoverId = null;
        this.dragState.hoverAnchor = null;
    },

    /** 判断鼠标是否命中某条连线的某个端点圆点，返回 {connectorId, end} 或 null */
    hitTestEndpoint(e) {
        const target = e.target;
        if (!target || !target.closest) return null;
        const handle = target.closest('.connector-handle');
        if (!handle) return null;
        return {
            connectorId: handle.dataset.connectorId,
            end: handle.dataset.end,
        };
    },

    // ------------------------------------------------------------ 预览渲染

    ensurePreview() {
        let preview = document.getElementById('connectorPreview');
        if (preview) return preview;
        const canvas = document.getElementById('canvas');
        if (!canvas) return null;
        preview = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        preview.id = 'connectorPreview';
        preview.style.cssText = 'position:absolute;pointer-events:none;z-index:999;overflow:visible;';
        canvas.appendChild(preview);
        return preview;
    },

    removePreview() {
        document.getElementById('connectorPreview')?.remove();
    },

    /** 渲染当前拖拽的预览线 */
    renderPreview() {
        const preview = this.ensurePreview();
        if (!preview) return;

        let fromRect = null, toRect = null;
        let fromAnchor = null, toAnchor = null;

        if (this.state.isDrawing) {
            const fromEl = ElementManager.getElement(this.state.fromId);
            fromRect = this.rectOf(fromEl);
            fromAnchor = this.state.fromAnchor;
            // 拖到页面框上 → 预览吸附；否则用光标位置当自由点
            const hoverEl = this.state.hoverId ? ElementManager.getElement(this.state.hoverId) : null;
            toRect = hoverEl
                ? this.rectOf(hoverEl)
                : { x: this.state.cursor.x, y: this.state.cursor.y, width: 0, height: 0 };
            toAnchor = this.state.hoverAnchor;
        } else if (this.dragState.active) {
            const connector = ElementManager.getElement(this.dragState.connectorId);
            if (!connector) return;
            const fromEl = ElementManager.getElement(connector.fromId);
            const toEl = ElementManager.getElement(connector.toId);
            const movingEl = this.dragState.end === 'from' ? fromEl : toEl;
            if (movingEl) fromRect = this.rectOf(movingEl);
            const fixedEl = this.dragState.end === 'from' ? toEl : fromEl;
            toRect = this.dragState.hoverId
                ? this.rectOf(ElementManager.getElement(this.dragState.hoverId))
                : (fixedEl ? this.rectOf(fixedEl) : null);
            // 被拖的一端用鼠标下的锚点（或保持原锚点），另一端保持不动
            const movingAnchor = this.dragState.end === 'from'
                ? (this.dragState.hoverAnchor || connector.fromAnchor)
                : (this.dragState.hoverAnchor || connector.toAnchor);
            if (this.dragState.end === 'from') {
                fromAnchor = movingAnchor;
                toAnchor = connector.toAnchor;
            } else {
                fromAnchor = connector.fromAnchor;
                toAnchor = movingAnchor;
            }
        }

        if (!fromRect || !toRect) return;

        // 端点拖拽时保持方向：from 始终是从 toId → 被拖的一端
        let pts;
        if (this.dragState.active) {
            const connector = ElementManager.getElement(this.dragState.connectorId);
            const toEl = ElementManager.getElement(this.dragState.end === 'from' ? connector.toId : connector.fromId);
            if (this.dragState.end === 'from') {
                pts = this.routeWithAnchors(toRect, fromRect, toAnchor, fromAnchor);
            } else {
                pts = this.routeWithAnchors(fromRect, toRect, fromAnchor, toAnchor);
            }
        } else {
            pts = this.routeWithAnchors(fromRect, toRect, fromAnchor, toAnchor);
        }

        if (!pts || pts.length < 2) return;

        const padding = 20;
        const allX = pts.map(p => p.x);
        const allY = pts.map(p => p.y);
        const minX = Math.min(...allX), maxX = Math.max(...allX);
        const minY = Math.min(...allY), maxY = Math.max(...allY);

        preview.setAttribute('viewBox', `${minX - padding} ${minY - padding} ${maxX - minX + padding * 2} ${maxY - minY + padding * 2}`);
        preview.style.left = `${minX - padding}px`;
        preview.style.top = `${minY - padding}px`;
        preview.style.width = `${maxX - minX + padding * 2}px`;
        preview.style.height = `${maxY - minY + padding * 2}px`;

        preview.innerHTML = '';
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', ConnectorRouter.toRoundedPath(pts, ConnectorRouter.DEFAULT_RADIUS));
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', '#409EFF');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('stroke-dasharray', '6,4');
        preview.appendChild(path);

        // 箭头
        const last = pts[pts.length - 1];
        const prev = pts[pts.length - 2];
        const head = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        head.setAttribute('d', this.arrowHeadPath(prev, last));
        head.setAttribute('fill', '#409EFF');
        preview.appendChild(head);

        // 高亮悬停目标
        const hoverEl = (this.state.isDrawing ? this.state.hoverId : this.dragState.hoverId)
            ? ElementManager.getElement(this.state.isDrawing ? this.state.hoverId : this.dragState.hoverId)
            : null;
        if (hoverEl) {
            const ring = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            ring.setAttribute('x', hoverEl.position.x - 3);
            ring.setAttribute('y', hoverEl.position.y - 3);
            ring.setAttribute('width', hoverEl.width + 6);
            ring.setAttribute('height', hoverEl.height + 6);
            ring.setAttribute('fill', 'none');
            ring.setAttribute('stroke', '#409EFF');
            ring.setAttribute('stroke-width', '2');
            ring.setAttribute('rx', '4');
            preview.appendChild(ring);
        }

        // 吸附到锚点时，在吸附点画一个实心圆，明确告诉用户"就钉在这里"
        const activeAnchor = this.state.isDrawing ? this.state.hoverAnchor : this.dragState.hoverAnchor;
        const activeElId = this.state.isDrawing ? this.state.hoverId : this.dragState.hoverId;
        if (activeAnchor && activeElId) {
            const hostEl = ElementManager.getElement(activeAnchor.elementId || activeElId);
            const resolved = AnchorSession.resolve({
                elementId: activeAnchor.elementId || activeElId,
                kind: activeAnchor.kind,
                selector: activeAnchor.selector,
                side: activeAnchor.side,
                t: activeAnchor.t,
            }) || (hostEl ? {
                point: AnchorProvider.resolvePoint(this.rectOf(hostEl), activeAnchor),
            } : null);
            if (resolved && resolved.point) {
                const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                dot.setAttribute('cx', resolved.point.x);
                dot.setAttribute('cy', resolved.point.y);
                dot.setAttribute('r', '5');
                dot.setAttribute('fill', '#409EFF');
                preview.appendChild(dot);
            }
        }
    },

    /**
     * 有锚点走锚点路由，没有就退回普通路由。
     *
     * ⚠️ 这两个分支必须都在，缺一个就会破坏旧数据：
     *    旧连接线没有锚点字段，若强行走 routeFromAnchor 会得到
     *    与升级前不同的路径（线会突然变形）。
     */
    routeWithAnchors(fromRect, toRect, fromAnchor, toAnchor) {
        if (!fromAnchor && !toAnchor) {
            return ConnectorRouter.route(fromRect, toRect);
        }
        return ConnectorRouter.routeFromAnchor(fromRect, toRect, fromAnchor, toAnchor);
    },

    arrowHeadPath(from, to) {
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const headLength = 14;
        const headAngle = Math.PI / 6;
        const x1 = to.x, y1 = to.y;
        const x2 = x1 - headLength * Math.cos(angle - headAngle);
        const y2 = y1 - headLength * Math.sin(angle - headAngle);
        const x3 = x1 - headLength * Math.cos(angle + headAngle);
        const y3 = y1 - headLength * Math.sin(angle + headAngle);
        return `M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} Z`;
    },
};
