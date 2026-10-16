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
     * 按当前状态刷新锚点层（供 mousemove 统一调用）。
     *
     * 三种状态：
     *   · 空闲          → 显示悬停元素的锚点
     *   · 绘制新线中    → 显示 **源元素 + 悬停目标** 两个元素的锚点（问题 1）
     *   · 拖拽已有端点  → 同上，被拖的那一端就是源
     *
     * ⚠️ 目标元素的判定必须走 findAnchorOwnerAt（含外扩带），
     *    否则鼠标移到目标框的框外锚点上时会被判为"不在任何元素上"，
     *    锚点又整片消失 —— 这正是用户报的"锚点闪一下就没"。
     */
    refreshAnchors(e) {
        // 鼠标画布坐标：决定第二层高亮哪个内部元素
        const cursor = this.toCanvasCoords(e);
        this.state.cursor = cursor;
        const dragging = this.state.isDrawing || this.dragState.active;
        const sourceId = this.state.isDrawing
            ? this.state.fromId
            : (this.dragState.active ? this._draggedElementId() : null);

        let targetId = null;
        if (dragging) {
            const t = this.findAnchorOwnerAt(e);
            targetId = t && t.id !== sourceId ? t.id : null;
        } else {
            const h = this.findAnchorOwnerAt(e);
            this.hoverElementId = h ? h.id : null;
            AnchorSession.hoverId = this.hoverElementId;
            return this._renderAnchorIds([this.hoverElementId], cursor);
        }

        this._renderAnchorIds([sourceId, targetId], cursor);
        return [sourceId, targetId];
    },

    /** 拖拽端点时，被拖那一端所属的元素 id */
    _draggedElementId() {
        const c = ElementManager.getElement(this.dragState.connectorId);
        if (!c) return null;
        return this.dragState.end === 'from' ? c.fromId : c.toId;
    },

    /**
     * 渲染指定元素集合的锚点。
     *
     * ⚠️ 内部宿主已在 iframe 的 load 事件里**预热**过（见 element-renderer），
     *    所以这里通常只是直接渲染，不会触发二次补绘 —— 这正是修复
     *    「锚点逐步显示」的关键。
     *
     *    仍保留 primeInnerHosts 兜底：iframe 若在预热之前就已加载完
     *    （例如元素从存档恢复、DOMContentLoaded 时 load 已触发过），
     *    缓存可能是空的，那时补一次是对的。
     */
    _renderAnchorIds(ids, cursor) {
        if (typeof ElementManager === 'undefined' || !ElementManager.renderAnchors) return;
        const list = ids.filter(Boolean);
        // cursor 决定第二层高亮哪个内部元素（MasterGo 的逐层聚焦）
        ElementManager.renderAnchors(list, cursor);

        for (const id of list) {
            const el = ElementManager.getElement(id);
            if (!el) continue;
            // 缓存已就绪 → 不做任何异步动作，首帧即为最终结果
            const key = AnchorSession._cacheKey(el);
            if (AnchorSession._innerCache.has(key)) continue;

            const iframeEl = this.iframeOf(id);
            if (!iframeEl) continue;
            AnchorSession.primeInnerHosts(el, iframeEl, () => {
                if (list.indexOf(id) !== -1) ElementManager.renderAnchors(list, cursor);
            });
        }
    },

    /**
     * 设置当前悬停的元素 → 决定显示哪些锚点。
     *
     * MasterGo 的锚点是**按需出现**的：不 hover 就不显示。
     */
    setHoverElement(element) {
        const id = element ? element.id : null;
        if (id === this.hoverElementId) return;
        this.hoverElementId = id;
        AnchorSession.hoverId = id;

        if (typeof ElementManager === 'undefined' || !ElementManager.renderAnchors) return;
        // 统一走 _renderAnchorIds：缓存已就绪时首帧即完整（修「逐步显示」）
        this._renderAnchorIds([this.hoverElementId], this.state.cursor);
    },

    /** 当前吸附半径（画布坐标） */
    snapTolerance() {
        const view = CanvasView.getView();
        const zoom = view && view.zoom ? view.zoom : 1;
        return this.SNAP_PX / zoom;
    },

    /**
     * 锚点场景的宿主归属判定（修复「选了 A 锚点连到 B 锚点」）。
     *
     * ⚠️ 为什么不能直接用 findPageElementAt：
     *    锚点画在元素边界**外侧** 6px，而 findPageElementAt 只认框内，
     *    于是每个锚点都落在宿主的命中区之外（实测 foundNull: 12/12）。
     *    后果是鼠标朝锚点移动时锚点层被清空，点上去又连不上。
     *
     *    这里承认那段外扩带，视觉不变，只修命中（选项 C）。
     *
     * @param {?object} el 已知元素（可选，给定时直接算它的宿主）
     * @returns {?object} 归属的页面元素
     */
    findAnchorOwnerAt(e) {
        const pos = this.toCanvasCoords(e);

        // 1) 优先命中「屏幕上已经画出来的锚点」—— 屏幕上是什么，命中就是什么。
        //    这是「选了 A 连到 B」的直接解药：不再用几何重新推导宿主。
        const rendered = AnchorSession.hitRendered(pos, this.snapTolerance());
        if (rendered && rendered.ref && rendered.ref.elementId) {
            const byRef = ElementManager.getElement(rendered.ref.elementId);
            if (byRef) return byRef;
        }

        // 2) 兜底：精确包含（元素框内）
        const inside = this.findPageElementAt(e);
        if (inside) return inside;

        // 3) 兜底：外扩带 —— 点在某个元素的锚点带上
        const pages = ElementManager.state.elements.filter(el => el.type === 'page');
        let best = null;
        for (const el of pages) {
            const r = this.rectOf(el);
            const owner = AnchorSession.ownerOf(pos, [r]);
            if (owner && (!best || owner.dist < best.dist)) {
                best = { el, dist: owner.dist };
            }
        }
        return best ? best.el : null;
    },

    /** 在给定元素上尝试吸附到某个锚点 */
    snapToAnchor(element, canvasPos) {
        if (!element) return null;

        // 优先用渲染清单 —— 保证「看到的」与「点到的」是同一个
        const rendered = AnchorSession.hitRendered(canvasPos, this.snapTolerance());
        if (rendered && rendered.ref) {
            const owner = ElementManager.getElement(rendered.ref.elementId);
            if (owner && owner.id === element.id) return rendered;
        }

        const hosts = AnchorSession.hostsOf(element);
        return AnchorSession.hitTest(canvasPos.x, canvasPos.y, hosts, this.snapTolerance());
    },

    // ------------------------------------------------------------ 绘制

    /** mousedown：在锚点上按下 → 从该锚点起画；在元素内按下 → 元素级起画 */
    handleMouseDown(e) {
        if (e.button !== 0) return;

        // ⚠️ 必须用 findAnchorOwnerAt 而不是 findPageElementAt：
        //    锚点画在框外 6px，findPageElementAt 对它返回 null，
        //    结果是**点在锚点上却连画都起不来**（实测 started=false）。
        const from = this.findAnchorOwnerAt(e);
        if (!from) return;

        const pos = this.toCanvasCoords(e);

        // 优先吸附到已渲染的锚点：点中圆点 = 用户明确指定了连接点
        const snap = this.snapToAnchor(from, pos);
        this.state.fromAnchor = snap ? snap.ref : null;

        this.state.isDrawing = true;
        this.state.fromId = from.id;
        this.state.cursor = pos;
        // 立刻把源元素的锚点画出来，让用户看到"线从这儿出发"
        this._renderAnchorIds([from.id], pos);
        e.preventDefault();
        e.stopPropagation();
    },

    /** mousemove：实时预览 */
    handleMouseMove(e) {
        if (this.state.isDrawing) {
            this.state.cursor = this.toCanvasCoords(e);
            const hover = this.findAnchorOwnerAt(e);
            this.state.hoverId = hover && hover.id !== this.state.fromId ? hover.id : null;
            // 终点也支持吸附锚点
            const snap = this.state.hoverId ? this.snapToAnchor(
                ElementManager.getElement(this.state.hoverId), this.state.cursor) : null;
            this.state.hoverAnchor = snap ? snap.ref : null;
            // 目标元素锚点常驻可见（问题 1）
            this._renderAnchorIds([this.state.fromId, this.state.hoverId], this.state.cursor);
            this.renderPreview();
            return;
        }

        if (this.dragState.active) {
            this.dragState.hoverId = this.resolveDropTarget(e);
            const hoverEl = this.dragState.hoverId ? ElementManager.getElement(this.dragState.hoverId) : null;
            const snap = hoverEl ? this.snapToAnchor(hoverEl, this.toCanvasCoords(e)) : null;
            this.dragState.hoverAnchor = snap ? snap.ref : null;
            const src = this._draggedElementId();
            this._renderAnchorIds([src, this.dragState.hoverId], this.state.cursor);
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
        // ⚠️ 同样走 findAnchorOwnerAt：用户会直接点在目标框外侧的锚点上落线，
        //    用 findPageElementAt 的话这种情况会被判为"没落在任何元素上"，
        //    线根本连不上（用户报的问题 1）。
        const hit = this.findAnchorOwnerAt(e);
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
        // 收工后回到"只显示悬停元素"的状态，别把源/目标的锚点留在画布上
        if (typeof ElementManager !== 'undefined' && ElementManager.clearAnchors) {
            ElementManager.clearAnchors();
        }
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

        let fromId = null, toId = null;
        let fromAnchor = null, toAnchor = null;

        if (this.state.isDrawing) {
            fromId = this.state.fromId;
            fromAnchor = this.state.fromAnchor;
            // 拖到页面框上 → 预览吸附；否则用光标位置当自由点
            toId = this.state.hoverId;
            toAnchor = this.state.hoverAnchor;
        } else if (this.dragState.active) {
            const connector = ElementManager.getElement(this.dragState.connectorId);
            if (!connector) return;
            // 被拖的一端用鼠标下的锚点（或保持原锚点），另一端保持不动
            const movingAnchor = this.dragState.end === 'from'
                ? (this.dragState.hoverAnchor || connector.fromAnchor)
                : (this.dragState.hoverAnchor || connector.toAnchor);
            if (this.dragState.end === 'from') {
                toId = connector.fromId;
                toAnchor = movingAnchor;
                fromId = connector.toId;
                fromAnchor = connector.toAnchor;
            } else {
                fromId = connector.fromId;
                fromAnchor = connector.fromAnchor;
                toId = connector.toId;
                toAnchor = movingAnchor;
            }
        }

        if (!fromId || !toId) return;

        // ⚠️ 端点解析走**唯一入口** AnchorSession.resolveEndpoints。
        //    这里曾经自己 rectOf() 拿页面框矩形，而落线走 _hostRectOf
        //    拿内部子元素矩形 —— 同一个锚点，预览终点 y=54、
        //    实际终点 y=521.5，用户看到的正是「预览和实际不一样」。
        const ep = AnchorSession.resolveEndpoints(fromId, toId, fromAnchor, toAnchor);

        let fromRect, toRect, fromSide, toSide;
        if (ep) {
            fromRect = ep.fromRect; toRect = ep.toRect;
            fromSide = ep.fromSide; toSide = ep.toSide;
        } else {
            // 端点元素刚消失：退回页面框，至少把预览画出来
            const f = ElementManager.getElement(fromId);
            const t = ElementManager.getElement(toId);
            if (!f || !t) return;
            fromRect = this.rectOf(f); toRect = this.rectOf(t);
            fromSide = fromAnchor ? { side: fromAnchor.side, t: fromAnchor.t } : null;
            toSide = toAnchor ? { side: toAnchor.side, t: toAnchor.t } : null;
        }

        // 光标不在任何元素上时（还没拖到目标框），终点用自由点
        if (!toId) {
            toRect = { x: this.state.cursor.x, y: this.state.cursor.y, width: 0, height: 0 };
            toSide = null;
        }

        const pts = this.routeWithAnchors(fromRect, toRect, fromSide, toSide);

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
            // ⚠️ 复用公共入口解析宿主矩形，不再自己 rectOf()。
            //    这里曾经用 rectOf(hostEl) 兜底 → inner 锚点会退回页面框矩形，
            //    画出与实际连线不符的吸附点（同源分叉 bug）。
            const hostId = activeAnchor.elementId || activeElId;
            const otherId = activeElId === hostId ? (fromId === hostId ? toId : fromId) : hostId;
            const ep = AnchorSession.resolveEndpoints(
                otherId, hostId, null, activeAnchor);
            const point = ep ? AnchorProvider.resolvePoint(ep.toRect, ep.toSide) : null;
            if (point) {
                const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                dot.setAttribute('cx', point.x);
                dot.setAttribute('cy', point.y);
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
