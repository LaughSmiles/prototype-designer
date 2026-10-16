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

    // 添加智能连接线（绑定 fromId/toId，路径实时计算）
    addConnectorElement(fromId, toId) {
        ElementAdder.addConnectorElement(fromId, toId);
    },

    // 改连连接线的某一端
    retargetConnector(connectorId, end, newTargetId) {
        const connector = this.getElement(connectorId);
        if (!connector || connector.type !== 'connector') return;

        // 不能连到自己
        const otherId = end === 'from' ? connector.toId : connector.fromId;
        if (newTargetId === otherId) return;

        if (end === 'from') {
            connector.fromId = newTargetId;
        } else {
            connector.toId = newTargetId;
        }

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
                    info = `选中: 箭头 (点击任意位置拖动)`;
                } else if (element.type === 'connector') {
                    const fromName = PageLibrary.getPageName((this.getElement(element.fromId) || {}).pageId) || '?';
                    const toName = PageLibrary.getPageName((this.getElement(element.toId) || {}).pageId) || '?';
                    info = `选中: 连接线 ${fromName} → ${toName} (拖两端圆点可改连)`;
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
        if (!fromEl || !toEl) return;

        const fromRect = { x: fromEl.position.x, y: fromEl.position.y, width: fromEl.width, height: fromEl.height };
        const toRect = { x: toEl.position.x, y: toEl.position.y, width: toEl.width, height: toEl.height };
        const points = ConnectorRouter.route(fromRect, toRect);
        if (!points || points.length < 2) return;

        element._routePoints = points;

        const allX = points.map(p => p.x);
        const allY = points.map(p => p.y);
        const minX = Math.min(...allX), maxX = Math.max(...allX);
        const minY = Math.min(...allY), maxY = Math.max(...allY);

        element.position = { x: minX, y: minY };
        element.width = maxX - minX;
        element.height = maxY - minY;

        const padding = 12;
        div.style.left = `${minX - padding}px`;
        div.style.top = `${minY - padding}px`;
        div.style.width = `${element.width + padding * 2}px`;
        div.style.height = `${element.height + padding * 2}px`;

        // 清空旧内容（保留容器）
        div.innerHTML = '';

        const d = ConnectorRouter.toRoundedPath(points, ConnectorRouter.DEFAULT_RADIUS);
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'connector-svg');
        svg.setAttribute('viewBox',
            `${minX - padding} ${minY - padding} ${element.width + padding * 2} ${element.height + padding * 2}`);
        svg.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;';

        const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        hit.setAttribute('class', 'connector-hit');
        hit.setAttribute('d', d);
        hit.setAttribute('fill', 'none');
        hit.setAttribute('stroke', 'transparent');
        hit.setAttribute('stroke-width', '12');

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', 'connector-path');
        path.setAttribute('d', d);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', '#999999');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');

        const arrowHead = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arrowHead.setAttribute('class', 'connector-arrow');
        arrowHead.setAttribute('d', ElementRenderer.getArrowHeadPath(points[points.length - 2], points[points.length - 1], 0, 0));
        arrowHead.setAttribute('fill', '#999999');

        svg.appendChild(hit);
        svg.appendChild(path);
        svg.appendChild(arrowHead);
        div.appendChild(svg);

        // 端点手柄（仅选中时可见）
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
