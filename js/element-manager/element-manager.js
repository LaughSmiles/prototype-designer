// 元素管理模块
// 负责画布上所有元素的创建、更新、删除等操作

const ElementManager = {
    // 画布状态
    state: {
        elements: [],
        selectedElement: null,
        selectedElements: [],
        nextId: 1,
        usageCount: {}
    },

    // 初始化
    init() {
        ElementKeyboard.setupKeyboardEvents();
        ElementKeyboard.restoreFullscreenState();
        this.initializeUsageCount();
    },

    // 初始化使用计数器
    initializeUsageCount() {
        const pageIds = PageLibrary.getAllPageIds();
        pageIds.forEach(id => {
            this.state.usageCount[id] = 0;
        });
    },

    // 增加页面使用计数
    incrementUsageCount(pageId) {
        if (!this.state.usageCount.hasOwnProperty(pageId)) {
            this.state.usageCount[pageId] = 0;
        }
        this.state.usageCount[pageId]++;
        PageLibrary.updateUsageBadge(pageId, this.state.usageCount[pageId]);
    },

    // 减少页面使用计数
    decrementUsageCount(pageId) {
        if (this.state.usageCount.hasOwnProperty(pageId) && this.state.usageCount[pageId] > 0) {
            this.state.usageCount[pageId]--;
            PageLibrary.updateUsageBadge(pageId, this.state.usageCount[pageId]);
        }
    },

    // 获取所有使用计数
    getUsageCounts() {
        return { ...this.state.usageCount };
    },

    // 添加页面元素
    addPageElement(pageId, x, y, saveState = true) {
        ElementAdder.addPageElement(pageId, x, y, saveState);
    },

    // 添加箭头元素
    addArrowElement(points) {
        ElementAdder.addArrowElement(points);
    },

    // 添加智能连接线（绑定 fromId/toId + 可选锚点，路径实时计算）
    // 返回新元素 id（调用方常需要它，比如紧接着改锚点或选中）
    addConnectorElement(fromId, toId, fromAnchor = null, toAnchor = null, fromFree = null, toFree = null) {
        return ElementAdder.addConnectorElement(fromId, toId, fromAnchor, toAnchor, fromFree, toFree);
    },

    /**
     * 改连连接线的某一端（可同时指定新的锚点）。
     *
     * ⚠️ newTargetId 传 null = **把这一端改成自由端**（MasterGo 语义）：
     *    · 原本绑定的一端拖到空白处 → 解绑，坐标落在鼠标处
     *    · 原本自由的一端拖到页面框上 → newTargetId 有值，走下面的绑定分支
     * 两种形态由这一入口统一收口，别处不要再各写一套改端逻辑。
     */
    retargetConnector(connectorId, end, newTargetId, newAnchor = null, freePoint = null) {
        const connector = this.getElement(connectorId);
        if (!connector || connector.type !== 'connector') return;

        const isFrom = end === 'from';
        const idKey = isFrom ? 'fromId' : 'toId';
        const anchorKey = isFrom ? 'fromAnchor' : 'toAnchor';
        const freeKey = isFrom ? 'fromFree' : 'toFree';

        // 不能连到自己
        const otherId = isFrom ? connector.toId : connector.fromId;
        if (newTargetId && newTargetId === otherId) return;

        if (!newTargetId) {
            // —— 解绑成自由端 ——
            if (!freePoint || !Number.isFinite(freePoint.x) || !Number.isFinite(freePoint.y)) return;
            connector[idKey] = null;
            connector[anchorKey] = null;
            connector[freeKey] = { x: freePoint.x, y: freePoint.y };
        } else {
            // —— 绑定到元素 ——
            connector[idKey] = newTargetId;
            // 锚点必须跟着宿主一起换：旧锚点指向的是旧元素，
            // 留着它会让 _hostRectOf 去新元素上找一个不存在的 selector。
            connector[anchorKey] = newAnchor || null;
            connector[freeKey] = null;
        }

        // ⚠️ 换了一端 = 手动掰出来的形状作废。
        //    那些拐点是为了「连原来那个页面」才摆的，换了终点后多半绕得很难看，
        //    强行留着还要求一层兜底去处理「终点离得很远/很近」的极端情况。
        //    直接清空 → 回落自动路由，简单且不会出错（用户确认的口径）。
        delete connector.waypoints;
        delete connector.wpRef;

        // 就地重绘而非重建：保住选中态与端点手柄（改连后线仍是选中状态）
        const div = document.querySelector(`[data-element-id="${connectorId}"]`);
        if (div) {
            this.renderConnectorInto(div, connector);
        } else {
            this.renderElement(connector);
        }
        this.updateStatusBar();
    },

    // 添加批注标记元素
    addAnnotationElement(boxX, boxY) {
        return ElementAdder.addAnnotationElement(boxX, boxY);
    },

    // 渲染元素(不更新计数)
    renderElementWithoutCount(element) {
        ElementRenderer.renderElementWithoutCount(element);
    },

    // 渲染元素
    renderElement(element) {
        ElementRenderer.renderElement(element);
    },

    // 渲染锚点：elementIds = 页面元素 id（可多个），cursor = 鼠标画布坐标
    // （决定第二层高亮哪个内部元素，对齐 MasterGo 的逐层聚焦）
    renderAnchors(elementIds, cursor) {
        ElementRenderer.renderAnchors(elementIds, cursor);
    },

    // 清空锚点层（切换工具 / 离开画布时调用）
    clearAnchors() {
        ElementRenderer.clearAnchors();
        if (typeof ToolsConnector !== 'undefined') ToolsConnector.hoverElementId = null;
        if (typeof AnchorSession !== 'undefined') AnchorSession.hoverId = null;
    },

    /**
     * 元素尺寸变化后清掉它的 iframe 内部宿主缓存。
     * 缓存键含尺寸，尺寸一变旧键自然失效；这里主动清是为了释放内存，
     * 避免反复拖拽改尺寸时缓存无限增长。
     */
    invalidateAnchorCache(elementId) {
        if (typeof AnchorSession !== 'undefined') AnchorSession.invalidate(elementId);
    },

    // 获取元素
    getElement(id) {
        return this.state.elements.find(el => el.id === id);
    },

    // 选中元素
    selectElement(id, addToSelection = false) {
        if (addToSelection) {
            if (!this.state.selectedElements.includes(id)) {
                this.state.selectedElements.push(id);
            }
        } else {
            if (this.state.selectedElement !== id) {
                this.deselectElement();
                this.state.selectedElement = id;
            }
            this.state.selectedElements = [id];
        }

        const div = document.querySelector(`[data-element-id="${id}"]`);
        if (div) {
            div.classList.add('selected');
        }

        // 状态栏要同步（连接线的文案按两端元素名生成，必须在选中态确定后算）
        this.updateStatusBar();
    },

    // 取消选中
    deselectElement(id = null) {
        if (id) {
            this.state.selectedElements = this.state.selectedElements.filter(el => el !== id);
            if (this.state.selectedElement === id) {
                this.state.selectedElement = null;
            }

            const div = document.querySelector(`[data-element-id="${id}"]`);
            if (div) {
                div.classList.remove('selected');
            }
        } else {
            this.state.selectedElements.forEach(elId => {
                const div = document.querySelector(`[data-element-id="${elId}"]`);
                if (div) {
                    div.classList.remove('selected');
                }
            });
            this.state.selectedElements = [];
            this.state.selectedElement = null;
        }

        this.updateStatusBar();
    },

    // 更新元素位置
    updateElementPosition(div, element) {
        if (element.type === 'annotation') {
            const containerDiv = document.querySelector(`[data-element-id="${element.id}"]`);
            if (containerDiv) {
                ElementAnnotation.updateAnnotationContainerIfNeeded(containerDiv, element);
            }
        } else {
            div.style.left = `${element.position.x}px`;
            div.style.top = `${element.position.y}px`;
        }
    },

    // 更新元素大小
    updateElementSize(div, element) {
        div.style.width = `${element.width}px`;
        div.style.height = `${element.height}px`;
        // 撤销/重做会走到这里，把高度重置回设备固定尺寸。
        // 页面元素要再套一次自适应缓存，否则长框会被打回一屏。
        if (element.type === 'page' && window.ProtoAutoFit) {
            window.ProtoAutoFit.apply(element.id, div, element.width, element.height);
        }
    },

    // 删除元素
    deleteElement(id) {
        const index = this.state.elements.findIndex(el => el.id === id);
        if (index === -1) return;

        const element = this.state.elements[index];

        if (element.type === 'page') {
            this.decrementUsageCount(element.pageId);
            // 删除页面元素时，连带删除所有以它为端点的连接线
            this.removeConnectorsForElement(element.id);
        }

        this.state.elements.splice(index, 1);

        // 清掉自适应高度缓存，避免 id 复用时套用到不相干的高度上
        if (window.ProtoAutoFit) window.ProtoAutoFit.clear(id);

        const div = document.querySelector(`[data-element-id="${id}"]`);
        if (div) {
            div.remove();
        }

        this.state.selectedElements = this.state.selectedElements.filter(el => el !== id);
        if (this.state.selectedElement === id) {
            this.state.selectedElement = null;
        }

        this.updateStatusBar();
        HistoryManager.saveState();
    },

    /**
     * 删除所有以 elementId 为端点的连接线。
     * MasterGo 同样行为：连线是端点的从属物，端点没了连线也没了。
     */
    removeConnectorsForElement(elementId) {
        const doomed = this.state.elements.filter(
            el => el.type === 'connector' && (el.fromId === elementId || el.toId === elementId)
        );
        for (const c of doomed) {
            const i = this.state.elements.indexOf(c);
            if (i !== -1) this.state.elements.splice(i, 1);
            document.querySelector(`[data-element-id="${c.id}"]`)?.remove();
            this.state.selectedElements = this.state.selectedElements.filter(el => el !== c.id);
            if (this.state.selectedElement === c.id) this.state.selectedElement = null;
        }
        // 元素没了，它的 iframe 内部宿主缓存也必须丢掉：
        // 留着会在下次同名 id 出现时命中过期几何。
        if (typeof AnchorSession !== 'undefined') AnchorSession.invalidate(elementId);
        if (doomed.length > 0) {
            Debug.log(`已连带删除 ${doomed.length} 条连接线`);
        }
        return doomed.length;
    },

    // 删除所有元素
    clearAll(silent = false) {
        if (!silent) {
            ModalManager.showConfirm(
                '确定要清空画布吗? 此操作无法撤销。',
                '清空画布',
                () => {
                    this.executeClearAll(true);
                }
            );
        } else {
            this.executeClearAll(true);
        }
    },

    // 执行清空
    executeClearAll(silent) {
        const canvas = document.getElementById('canvas');
        const elements = canvas.querySelectorAll('.canvas-element');
        elements.forEach(el => el.remove());

        this.state.elements = [];
        this.state.selectedElement = null;
        this.state.selectedElements = [];

        Object.keys(this.state.usageCount).forEach(pageId => {
            this.state.usageCount[pageId] = 0;
            PageLibrary.updateUsageBadge(pageId, 0);
        });

        this.updateStatusBar();

        if (!silent) {
            HistoryManager.saveState();
            PageLibrary.showHint('✅ 画布已清空');
        }
    },

    // 更新状态栏
    updateStatusBar() {
        const countSpan = document.getElementById('elementCount');
        const selectedSpan = document.getElementById('selectedInfo');

        if (countSpan) {
            countSpan.textContent = `元素: ${this.state.elements.length}`;
        }

        if (selectedSpan) {
            if (this.state.selectedElement) {
                const element = this.getElement(this.state.selectedElement);
                let info = '';
                if (element.type === 'page') {
                    const pageName = PageLibrary.getPageName(element.pageId);
                    info = `选中: ${pageName} (拖拽手柄移动)`;
                } else if (element.type === 'arrow') {
                    // ⚠️ 不能再写「点击任意位置拖动」：箭头已改成
                    //    容器 pointer-events:none + 只有 .arrow-hit 那条 10px 手感带接事件，
                    //    "任意位置" 现在指的是一大块空气，用户照着做会点不中。
                    const pointCount = Array.isArray(element.points) ? element.points.length : 0;
                    info = `选中: 箭头 (${pointCount} 个点，点线身拖动)`;
                } else if (element.type === 'connector') {
                    // 自由端没有页面名，显示「自由点」，别让用户以为线坏了
                    const nameOf = (id) => {
                        if (!id) return '自由点';
                        const el = this.getElement(id);
                        return (el && PageLibrary.getPageName(el.pageId)) || '?';
                    };
                    info = `选中: 连接线 ${nameOf(element.fromId)} → ${nameOf(element.toId)} (拖两端圆点可改连)`;
                } else if (element.type === 'annotation') {
                    info = `选中: 批注标记 (拖动锚点或框)`;
                }
                selectedSpan.textContent = info;
            } else {
                selectedSpan.textContent = '未选择';
            }
        }
    },

    // 获取所有元素数据
    getAllElements() {
        return JSON.parse(JSON.stringify(this.state.elements));
    },

    // 生成箭头路径
    generateArrowPath(points, offsetX, offsetY) {
        if (points.length < 2) return '';

        let path = '';
        path += `M ${points[0].x - offsetX} ${points[0].y - offsetY}`;

        // 前面的点正常画
        for (let i = 1; i < points.length - 1; i++) {
            const x = points[i].x - offsetX;
            const y = points[i].y - offsetY;
            path += ` L ${x} ${y}`;
        }

        // 最后一个点：计算箭头根部位置，画到根部而不是终点
        const secondLastPoint = points[points.length - 2];
        const lastPoint = points[points.length - 1];
        const angle = Math.atan2(lastPoint.y - secondLastPoint.y, lastPoint.x - secondLastPoint.x);
        const headLength = 15;
        const headAngle = Math.PI / 6;
        const rootDistance = headLength * Math.cos(headAngle);

        const rootX = lastPoint.x - rootDistance * Math.cos(angle) - offsetX;
        const rootY = lastPoint.y - rootDistance * Math.sin(angle) - offsetY;
        path += ` L ${rootX} ${rootY}`;

        return path;
    },

    /**
     * 更新与指定元素相连的所有连接线。
     *
     * 这是一个原本就存在的空占位钩子（canvas-view-events.js 在拖动页面元素的
     * 每一帧都会调用它），现在由连接线功能填实。
     *
     * 连接线不存坐标 —— 路径每次由 ConnectorRouter 按两端元素当前位置实时算出，
     * 所以这里只需把受影响的连线**重画一遍**即可自动跟随。
     */
    updateConnectionsForElement(elementId) {
        const canvas = document.getElementById('canvas');
        if (!canvas) return;

        for (const connector of this.state.elements) {
            if (connector.type !== 'connector') continue;
            if (connector.fromId !== elementId && connector.toId !== elementId) continue;

            const div = canvas.querySelector(`[data-element-id="${connector.id}"]`);
            if (!div) continue;

            // 就地重画：不销毁重建，避免打断选中态与事件绑定
            this.renderConnectorInto(div, connector);
        }
    },

    /** 把连接线内容重新渲染进已有容器（保留容器本身与选中态） */
    renderConnectorInto(div, element) {
        const fromEl = this.getElement(element.fromId);
        const toEl = this.getElement(element.toId);

        // ⚠️ 矩形一律由渲染器的公共函数出（绑定端取元素矩形、自由端取 0×0），
        //    这里再写一份就会重演"首次画得出、改连后变形"的老问题。
        const { fromRect, toRect } = ElementRenderer.endpointRects(element, fromEl, toEl);
        if (!fromRect || !toRect) return;

        // ⚠️ 必须复用渲染器的锚点感知路由，不能在这里再写一份 route()：
        //    两处逻辑一旦分叉，就会出现「首次渲染走锚点、改连后走整元素」的鬼影。
        const points = ElementRenderer.routeFor(element, fromEl, toEl, fromRect, toRect);
        if (!points || points.length < 2) return;

        element._routePoints = points;

        const allX = points.map(p => p.x);
        const allY = points.map(p => p.y);
        const minX = Math.min(...allX), maxX = Math.max(...allX);
        const minY = Math.min(...allY), maxY = Math.max(...allY);

        element.position = { x: minX, y: minY };
        element.width = maxX - minX;
        element.height = maxY - minY;

        // 清空旧内容（保留容器）
        div.innerHTML = '';

        // ⚠️ 绘制全部交给渲染器的公共函数：这里曾经自己抄了一份
        //    （svg + hit + path + arrow + 两个端点手柄），漏改就会
        //    出现「首次画得出、改连后缺手柄」只在交互里暴露的 bug。
        ElementRenderer.renderConnectorParts(div, element, points, minX, minY);
    },

    // 显示右键菜单
    showContextMenu(x, y, element, iframe, pageInfo) {
        ElementKeyboard.showContextMenu(x, y, element, iframe, pageInfo);
    },

    // 聚焦批注内容
    focusAnnotationContent(elementId) {
        ElementAnnotation.focusAnnotationContent(elementId);
    }
};
