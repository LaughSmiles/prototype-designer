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
        fromId: null,      // 起点的页面元素 id；空白处起笔时为 null
        fromAnchor: null,  // 起点锚点引用（从锚点起拖时非空）
        fromFree: null,    // 起点在空白处时的坐标（MasterGo：起点不必落在页面上）
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

    // 段拖拽中的状态（MasterGo：hover 每段中点的胶囊，按住拖动整段平移）
    segState: {
        active: false,
        connectorId: null,
        segIndex: -1,      // 第 i 段 = points[i] → points[i+1]
        basePoints: null,  // 按下那一刻的路径点，作为拖动基准
        grabX: 0,          // 按下时的鼠标画布坐标，算位移用
        grabY: 0,
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
            // 拖后跟随：鼠标**离开所有页面框**的那一刻结束跟随（锚点同时被清空）。
            // 这正是 MasterGo 的手感：拖完线鼠标还在框上就继续亮，移开才灭。
            if (!this.hoverElementId) this._anchorFollow = false;
            return this._renderAnchorIds([this.hoverElementId], cursor);
        }

        this._renderAnchorIds([sourceId, targetId], cursor);
        return [sourceId, targetId];
    },

    /**
     * 拖完端点后是否继续跟随鼠标刷新锚点。
     *
     * ⚠️ 为什么需要这个标记（用户报的两个问题之一）：
     *    拖端点在任何工具下都能起手（见 tools.js 的 mousedown 分发），
     *    而 refreshAnchors 只在**连接线工具**下被调用。于是用户在
     *    **选择工具**下拖完端点后，没有任何人接管后续的鼠标移动 ——
     *    锚点就永远停在最后的画面上，要切一次工具才清掉。
     *    用户报的「拖拽完后，页面会残留页面页面的锚点」正是此处。
     *
     * ⚠️ 为什么不是「mouseup 时直接 clearAnchors」：
     *    那样鼠标明明还停在页面框上，锚点却瞬间消失，手感很突兀。
     *    这里改成让跟随继续，由 refreshAnchors 在鼠标移出所有页面框时
     *    自然收尾（语义与连接线工具下完全一致）。
     *
     * ⚠️ 不能拿它当「选择工具下也显示锚点」的开关：
     *    它只在拖过端点之后为真，用完即清，所以选择工具**悬停**时
     *    画布依旧保持干净（锚点按需出现那条设计不变）。
     */
    _anchorFollow: false,

    /** 锚点层此刻是否还需要跟随鼠标刷新 */
    shouldFollowAnchors() {
        return !!this._anchorFollow;
    },

    /** 结束拖后跟随（切工具 / 取消时调用） */
    endAnchorFollow() {
        this._anchorFollow = false;
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

    /**
     * mousedown：起笔。
     *
     * ⚠️ 起点**不要求**落在页面框上（MasterGo 实测：空白处按住就能拉出独立连接线）。
     *    落在页面框/锚点上 → 起点绑定；落在空白 → 起点自由，坐标记在 fromFree。
     *    这两种形态由后面的 resolveOne 统一分流，调用方不必再判断。
     */
    handleMouseDown(e) {
        if (e.button !== 0) return;

        const pos = this.toCanvasCoords(e);

        // ⚠️ 必须用 findAnchorOwnerAt 而不是 findPageElementAt：
        //    锚点画在框外 6px，findPageElementAt 对它返回 null，
        //    结果是「点在锚点上却连画都起不来」（实测 started=false）。
        //    返回 null 不是错误 —— 那就是「在空白处起笔」。
        const from = this.findAnchorOwnerAt(e);
        const snap = from ? this.snapToAnchor(from, pos) : null;

        this.state.fromId = from ? from.id : null;
        this.state.fromAnchor = snap ? snap.ref : null;
        this.state.fromFree = from ? null : { x: pos.x, y: pos.y };
        this.state.isDrawing = true;
        this.state.cursor = pos;
        // 立刻把源元素的锚点画出来，让用户看到"线从这儿出发"
        if (from) this._renderAnchorIds([from.id], pos);
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
            // ⚠️ 必须把坐标写回 state.cursor（用户报的问题 ①）：
            //    下面 _renderAnchorIds 传的是 state.cursor，而它只在
            //    refreshAnchors 里被更新 —— 那个函数**只在连接线工具下**跑
            //    （见 tools.js 的 mousemove 门禁），可拖端点在任何工具下都能起手。
            //    于是选择工具下拖端点时，cursor 是个陈旧值，
            //    hoveredInnerHost() 拿它去算"鼠标在哪个内部元素上"必然算错 →
            //    **页面内部的锚点一个都不亮**。
            //    这里的坐标本来就算过（下面吸附要用），只是从前没写回去。
            const cursor = this.toCanvasCoords(e);
            this.state.cursor = cursor;

            this.dragState.hoverId = this.resolveDropTarget(e);
            const hoverEl = this.dragState.hoverId ? ElementManager.getElement(this.dragState.hoverId) : null;
            const snap = hoverEl ? this.snapToAnchor(hoverEl, cursor) : null;
            this.dragState.hoverAnchor = snap ? snap.ref : null;
            const src = this._draggedElementId();
            this._renderAnchorIds([src, this.dragState.hoverId], cursor);
            this.renderPreview();
        }
    },

    /** mouseup：落线 */
    handleMouseUp(e) {
        if (this.state.isDrawing) {
            const cursor = this.toCanvasCoords(e);
            const hit = this.findAnchorOwnerAt(e);
            const to = this.resolveDropTarget(e);

            // ⚠️ 拖回自己身上 = 无效，必须拦。
            //    这里不能只看 resolveDropTarget 的返回值：它对「没命中」和
            //    「命中了自己」都返回 null，两者混在一起就会把回拖到自己
            //    的操作误判成"落点自由"，凭空画出一条线。
            const droppedOnSelf = !!(this.state.fromId && hit && hit.id === this.state.fromId);

            if (droppedOnSelf) {
                PageLibrary.showHint('⚠️ 不能连到自己');
            } else {
                // 落点没落在任何页面框上 → 那一端自由（MasterGo：两端都可自由）
                const toFree = to ? null : { x: cursor.x, y: cursor.y };
                const created = ElementManager.addConnectorElement(
                    this.state.fromId, to,
                    this.state.fromAnchor, this.state.hoverAnchor,
                    this.state.fromFree, toFree);
                if (created) {
                    PageLibrary.showHint('✅ 连接线已创建');
                    HistoryManager.saveState();
                } else {
                    PageLibrary.showHint('⚠️ 连接线创建失败');
                }
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
                    // 落在页面框上 → 绑定：绑定端改连，自由端转成绑定端
                    ElementManager.retargetConnector(connectorId, end, targetId, this.dragState.hoverAnchor);
                    PageLibrary.showHint('✅ 连接线已改连');
                } else if (this.findAnchorOwnerAt(e)) {
                    // 命中了元素却是 null → 命中的是另一端，会成自环
                    PageLibrary.showHint('⚠️ 不能连到自己');
                } else {
                    // 落在空白 → 这一端自由：
                    //   原来绑定的 → 解绑；原来自由的 → 挪坐标（同一个入口收口）
                    const cursor = this.toCanvasCoords(e);
                    ElementManager.retargetConnector(connectorId, end, null, null, cursor);
                    PageLibrary.showHint('✅ 端点已移到空白处');
                }
                HistoryManager.saveState();
            }
            this.dragState.active = false;
            this.dragState.connectorId = null;
            this.dragState.end = null;
            this.dragState.hoverId = null;
            this.dragState.hoverAnchor = null;
            this.removePreview();
            this._syncAfterEndpointDrag(e);
        }
    },

    /**
     * 拖端点收尾后的锚点收口。
     *
     * ⚠️ 这里**不能**直接 clearAnchors()：鼠标此刻多半还停在页面框上，
     *    锚点凭空消失会很突兀。改成让「拖后跟随」接管 ——
     *    鼠标还框上就继续亮，一旦移出所有页面框，refreshAnchors
     *    自然会把锚点清掉。选择工具下也照样工作，因为
     *    tools.js 的 mousemove 门禁已经放开成「连接线工具 **或** 正在跟随」。
     *
     * ⚠️ 不是连接线工具时，本次 mouseup 之后不会再有 refreshAnchors 调用
     *    来「重新画出正确的锚点集」，所以这里必须自己补一次首帧，
     *    否则用户看到的是拖拽过程中的中间态（可能是空的、也可能是旧的）。
     */
    _syncAfterEndpointDrag(e) {
        this._anchorFollow = true;
        if (Tools.currentTool === 'connector') return;   // 连接线工具自己会持续刷新

        if (!e || typeof e.clientX !== 'number') {
            ElementManager.clearAnchors();
            this._anchorFollow = false;
            return;
        }
        // 补一次首帧：位置取「松手处」，语义与后续 mousemove 完全一致
        this.refreshAnchors(e);
    },

    /**
     * 解析落点元素（排除另一端已有的元素，避免连成自环）。
     *
     * ⚠️ 返回 null 有**两种**含义，调用方必须自己区分：
     *    ① 鼠标不在任何页面框上 → 这一端自由
     *    ② 落点就是另一端 → 无效（handleMouseUp 里用 findAnchorOwnerAt 复核）
     * 起点是自由端时没有"另一端元素"，第 ② 条不适用。
     */
    resolveDropTarget(e) {
        // ⚠️ 同样走 findAnchorOwnerAt：用户会直接点在目标框外侧的锚点上落线，
        //    用 findPageElementAt 的话这种情况会被判为"没落在任何元素上"，
        //    线根本连不上（用户报的问题 1）。
        const hit = this.findAnchorOwnerAt(e);
        if (!hit) return null;

        // 绘制新线：不能连到自己（起点自由时没有"自己"，跳过）
        if (this.state.isDrawing && this.state.fromId && hit.id === this.state.fromId) return null;

        // 改连端点：不能连到另一端（否则变成自环）
        if (this.dragState.active) {
            const connector = ElementManager.getElement(this.dragState.connectorId);
            if (connector) {
                const otherId = this.dragState.end === 'from' ? connector.toId : connector.fromId;
                if (otherId && hit.id === otherId) return null;
            }
        }
        return hit.id;
    },

    cancelDrawing() {
        this.state.isDrawing = false;
        this.state.fromId = null;
        this.state.fromAnchor = null;
        this.state.fromFree = null;
        this.state.hoverId = null;
        this.state.hoverAnchor = null;
        this.removePreview();
        // 画新线是「收工」语义：调用方随即会切回选择工具，
        // 不保留拖后跟随（那条只属于「拖端点」）。
        this._anchorFollow = false;
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

    // ------------------------------------------------------------ 段拖拽

    /**
     * 判断鼠标是否命中某一段中点的胶囊。
     * @returns {?{connectorId:string, segIndex:number}}
     */
    hitTestSegmentHandle(e) {
        const target = e.target;
        if (!target || !target.closest) return null;
        const h = target.closest('.connector-seg-handle');
        if (!h) return null;
        const idx = parseInt(h.dataset.segIndex, 10);
        if (!Number.isFinite(idx)) return null;
        return { connectorId: h.dataset.connectorId, segIndex: idx };
    },

    /** 开始拖拽某一段（由 tools.js 在 mousedown 命中胶囊时调用） */
    beginSegmentDrag(connectorId, segIndex, e) {
        const el = ElementManager.getElement(connectorId);
        if (!el || el.type !== 'connector') return false;

        const points = el._routePoints;
        if (!Array.isArray(points) || points.length < 2) return false;
        if (segIndex < 0 || segIndex >= points.length - 1) return false;

        const pos = this.toCanvasCoords(e);
        this.segState.active = true;
        this.segState.connectorId = connectorId;
        this.segState.segIndex = segIndex;
        this.segState.basePoints = points.map(p => ({ x: p.x, y: p.y }));
        this.segState.grabX = pos.x;
        this.segState.grabY = pos.y;
        return true;
    },

    /**
     * 第 i 段控制的是哪个拐点。
     *
     * 规则（实测反推）：第 i 段控制 min(i+1, n-2) 号拐点。
     *   · Z 形 4 点：seg0 → P1、seg1 → P2、seg2 → P2
     *   · L 形 3 点：seg0 → P1、seg1 → P1（末段的末端是钉死的终点，只能动内侧角）
     * 也就是：优先动「靠后那个拐点」，但它如果是钉死的终点，就退回靠前那个。
     */
    _segInnerIndex(segIndex, pointCount) {
        return Math.min(segIndex + 1, pointCount - 2);
    },

    /** 拖动中：重算路径并就地重绘 */
    handleSegmentMouseMove(e) {
        const st = this.segState;
        if (!st.active) return;

        const el = ElementManager.getElement(st.connectorId);
        if (!el) return;
        const base = st.basePoints;
        if (!base || base.length < 2) return;

        // ⚠️ 两端都自由时 fromEl/toEl 都是 null —— 早年的 `if (!fromEl || !toEl) return`
        //    会让**所有自由连接线的段都拖不动**，且不报任何错。
        //    wpRef 的平移基准本来就依赖两端元素，自由端不需要平移，跳过即可。
        const fromEl = el.fromId ? ElementManager.getElement(el.fromId) : null;
        const toEl = el.toId ? ElementManager.getElement(el.toId) : null;

        const cursor = this.toCanvasCoords(e);
        const i = st.segIndex;
        const a = base[i];
        const b = base[i + 1];

        // 只取**法线分量**：水平段只吃 dy，垂直段只吃 dx。
        // 斜着拖时另一个分量被丢弃 —— 这正是「始终保持正交」的实现方式。
        const horizontal = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
        const delta = horizontal ? (cursor.y - st.grabY) : (cursor.x - st.grabX);

        const pts = base.map(p => ({ x: p.x, y: p.y }));
        const inner = this._segInnerIndex(i, base.length);
        if (horizontal) pts[inner].y += delta;
        else pts[inner].x += delta;

        // 首尾钉回当前锚点，再正交化 —— 跟 MasterGo 的拖段语义一致
        //
        // ⚠️ bend 必须传：它告诉正交化「这次是哪个拐点、动的哪根坐标」，
        //    拐角补全的方向要跟着它走。少了它，横段能拖、竖段一律拖不动
        //    （新 x 被补成水平短头后又被共线合并吃掉），且不报任何错。
        const first = el._routePoints[0];
        const last = el._routePoints[el._routePoints.length - 1];
        const next = ConnectorRouter.applyWaypoints(pts, el._routePoints, first, last,
            { index: inner, axis: horizontal ? 'y' : 'x' });
        if (!next || next.length < 2) return;

        // 第一次掰形状时记下两端的绝对位置；之后页面框移动就按这个基准算位移。
        // ⚠️ 两端都得是绑定端才记 —— 自由端没有元素位置可记，
        //    硬记 null.position 会在这里直接抛 TypeError。
        if (!el.wpRef && fromEl && toEl) {
            el.wpRef = {
                from: { x: fromEl.position.x, y: fromEl.position.y },
                to: { x: toEl.position.x, y: toEl.position.y },
            };
        }
        el.waypoints = next;

        const div = document.querySelector(`[data-element-id="${el.id}"]`);
        if (div) {
            if (!div.classList.contains('seg-dragging')) div.classList.add('seg-dragging');
            ElementManager.renderConnectorInto(div, el);
        }
    },

    /** 结束段拖拽 */
    endSegmentDrag() {
        const st = this.segState;
        if (!st.active) return;

        const el = ElementManager.getElement(st.connectorId);
        st.active = false;
        st.connectorId = null;
        st.segIndex = -1;
        st.basePoints = null;
        st.grabX = 0;
        st.grabY = 0;

        if (!el) return;

        const div = document.querySelector(`[data-element-id="${el.id}"]`);
        if (div) div.classList.remove('seg-dragging');

        if (Array.isArray(el.waypoints) && el.waypoints.length >= 2) {
            HistoryManager.saveState();
        }
    },

    /** 是否正在拖段 */
    isSegmentDragging() {
        return !!this.segState.active;
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

    /**
     * 把当前状态解析成两端规格：[端0, 端1]，每项 {id, anchor, free, useCursor}。
     * id 为 null = 那一端是自由端（坐标取 free，或 useCursor 时取鼠标位置）。
     */
    _previewEnds() {
        const s = this.state;
        if (s.isDrawing) {
            return [
                { id: s.fromId, anchor: s.fromAnchor, free: s.fromFree },
                { id: s.hoverId, anchor: s.hoverAnchor, free: null, useCursor: true },
            ];
        }

        const d = this.dragState;
        if (d.active) {
            const c = ElementManager.getElement(d.connectorId);
            if (!c) return null;
            const isFrom = d.end === 'from';
            // 固定不动的那一端
            const fixedId = isFrom ? c.toId : c.fromId;
            const fixedAnchor = isFrom ? c.toAnchor : c.fromAnchor;
            const fixedFree = isFrom ? c.toFree : c.fromFree;
            // 正在被拖的那一端：命中页面框就用命中锚点，否则退回原锚点/原自由坐标
            const baseAnchor = isFrom ? c.fromAnchor : c.toAnchor;
            return [
                {
                    id: d.hoverId,
                    anchor: d.hoverAnchor || baseAnchor,
                    free: null,
                    useCursor: true,
                },
                { id: fixedId, anchor: fixedAnchor, free: fixedFree },
            ];
        }
        return null;
    },

    /**
     * 渲染当前拖拽的预览线。
     *
     * ⚠️ 两条分支**故意不合并**：
     *    两端都绑定时必须逐像素复现历史行为（resolveEndpoints + routeFromAnchor），
     *    一旦和自由端共用同一段代码，日后任一侧改动都会连累另一侧。
     */
    renderPreview() {
        const preview = this.ensurePreview();
        if (!preview) return;

        const ends = this._previewEnds();
        if (!ends) return;

        let pts = null;

        if (ends[0].id && ends[1].id) {
            // —— 两端都绑定：历史路径 ——
            // ⚠️ 端点解析走**唯一入口** AnchorSession.resolveEndpoints。
            //    这里曾经自己 rectOf() 拿页面框矩形，而落线走 _hostRectOf
            //    拿内部子元素矩形 —— 同一个锚点，预览终点 y=54、
            //    实际终点 y=521.5，用户看到的正是「预览和实际不一样」。
            const ep = AnchorSession.resolveEndpoints(
                ends[0].id, ends[1].id, ends[0].anchor, ends[1].anchor);

            let fromRect, toRect, fromSide, toSide;
            if (ep) {
                fromRect = ep.fromRect; toRect = ep.toRect;
                fromSide = ep.fromSide; toSide = ep.toSide;
            } else {
                // 端点元素刚消失：退回页面框，至少把预览画出来
                const f = ElementManager.getElement(ends[0].id);
                const t = ElementManager.getElement(ends[1].id);
                if (!f || !t) return;
                fromRect = this.rectOf(f); toRect = this.rectOf(t);
                fromSide = ends[0].anchor ? { side: ends[0].anchor.side, t: ends[0].anchor.t } : null;
                toSide = ends[1].anchor ? { side: ends[1].anchor.side, t: ends[1].anchor.t } : null;
            }
            pts = this.routeWithAnchors(fromRect, toRect, fromSide, toSide);
        } else {
            // —— 至少一端自由：两端都解析成「点」，走中点台阶路由 ——
            const resolve = (end) => {
                const free = end.free ||
                    (end.useCursor && this.state.cursor
                        ? { x: this.state.cursor.x, y: this.state.cursor.y }
                        : null);
                return AnchorSession.resolveOne(end.id, end.anchor, free);
            };
            const a = resolve(ends[0]);
            const b = resolve(ends[1]);
            if (!a || !b) return;
            pts = (a.point && b.point)
                ? ConnectorRouter.routeFreePoints(a.point, b.point)
                : ConnectorRouter.route(a.rect, b.rect);
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
