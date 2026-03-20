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

    // 更新连接线
    updateConnectionsForElement(elementId) {
        // 占位函数
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
