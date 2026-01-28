// 历史记录管理模块
// 负责撤销/重做功能的实现

const HistoryManager = {
    // 历史记录栈
    historyStack: [],

    // 当前索引位置(支持redo功能)
    currentIndex: -1,

    // 最大保存步数
    maxSteps: 50,

    // 是否正在执行撤销/重做(防止递归保存)
    isUndoingOrRedoing: false,

    // 初始化
    init() {
        console.log('✅ 历史记录管理器初始化完成');
    },

    // 保存当前状态到历史记录
    saveState() {
        // 如果正在执行撤销/重做,不保存状态
        if (this.isUndoingOrRedoing) {
            return;
        }

        // 如果历史栈为空,先保存空状态作为起点
        if (this.historyStack.length === 0) {
            // 创建真正的空状态
            const allPageIds = PageLibrary.getAllPageIds();
            const emptyUsageCount = {};
            allPageIds.forEach(pageId => {
                emptyUsageCount[pageId] = 0;
            });

            const emptyState = {
                elements: [],
                nextId: ElementManager.state.nextId,
                usageCount: emptyUsageCount,
                selectedElement: null,
                selectedElements: [],
                pages: JSON.parse(JSON.stringify(PageManager.pages)),
                currentPageId: PageManager.currentPageId,
                pageCounter: PageManager.pageCounter,
                viewState: {
                    scale: CanvasView.state.zoom,
                    offsetX: CanvasView.state.pan.x,
                    offsetY: CanvasView.state.pan.y
                },
                timestamp: Date.now()
            };

            this.historyStack.push(emptyState);
            this.currentIndex = 0;
            console.log('💾 初始化历史栈,保存空状态');
            // 不 return,继续执行保存当前状态
        }

        // 捕获当前状态
        const state = this.captureState();

        // 如果当前不在栈顶,删除当前位置之后的所有历史
        if (this.currentIndex < this.historyStack.length - 1) {
            this.historyStack = this.historyStack.slice(0, this.currentIndex + 1);
        }

        // 添加新状态到栈
        this.historyStack.push(state);
        this.currentIndex++;

        // 限制最大步数
        if (this.historyStack.length > this.maxSteps) {
            this.historyStack.shift();
            this.currentIndex--;
        }

        console.log(`💾 历史记录已保存 (${this.currentIndex + 1}/${this.historyStack.length})`);
    },

    // 捕获当前完整状态
    captureState() {
        const state = {
            // 元素管理器状态
            elements: JSON.parse(JSON.stringify(ElementManager.state.elements)),
            nextId: ElementManager.state.nextId,
            usageCount: JSON.parse(JSON.stringify(ElementManager.state.usageCount)),
            selectedElement: ElementManager.state.selectedElement,
            selectedElements: JSON.parse(JSON.stringify(ElementManager.state.selectedElements)),

            // 页面管理器状态
            pages: JSON.parse(JSON.stringify(PageManager.pages)),
            currentPageId: PageManager.currentPageId,
            pageCounter: PageManager.pageCounter,

            // 画布视图状态
            viewState: {
                scale: CanvasView.state.zoom,
                offsetX: CanvasView.state.pan.x,
                offsetY: CanvasView.state.pan.y
            },

            // 时间戳
            timestamp: Date.now()
        };

        // 调试信息: 打印当前状态摘要
        const elementNames = state.elements.map(el => {
            if (el.type === 'page') {
                const pageInfo = PageLibrary.getPageInfo(el.pageId);
                return pageInfo ? pageInfo.name : el.pageId;
            }
            return el.type;
        }).join(', ');

        console.log(`📸 捕获状态: ${state.elements.length}个元素 [${elementNames}]`);

        return state;
    },

    // 恢复状态
    restoreState(state) {
        this.isUndoingOrRedoing = true;

        try {
            // 获取画布元素(不要清空,智能更新会处理)
            const canvas = document.getElementById('canvas');

            // 恢复元素管理器状态
            ElementManager.state.elements = JSON.parse(JSON.stringify(state.elements));
            ElementManager.state.nextId = state.nextId;
            ElementManager.state.usageCount = JSON.parse(JSON.stringify(state.usageCount));
            ElementManager.state.selectedElement = state.selectedElement;
            ElementManager.state.selectedElements = JSON.parse(JSON.stringify(state.selectedElements));

            // 恢复页面管理器状态
            PageManager.pages = JSON.parse(JSON.stringify(state.pages));
            PageManager.currentPageId = state.currentPageId;
            PageManager.pageCounter = state.pageCounter;

            // 恢复画布视图状态
            if (state.viewState) {
                CanvasView.state.zoom = state.viewState.scale;
                CanvasView.state.pan.x = state.viewState.offsetX;
                CanvasView.state.pan.y = state.viewState.offsetY;
                CanvasView.updateView();
                CanvasView.updateZoomDisplay();
            }

            // 智能更新元素:复用现有DOM,避免iframe刷新
            if (canvas) {
                // 1. 获取当前画布上的所有元素ID
                const existingIds = new Set();
                canvas.querySelectorAll('.canvas-element').forEach(el => {
                    const id = el.dataset.elementId;
                    if (id) existingIds.add(id);
                });

                // 2. 删除恢复后不存在的元素
                existingIds.forEach(id => {
                    if (!ElementManager.state.elements.find(e => e.id === id)) {
                        const el = canvas.querySelector(`[data-element-id="${id}"]`);
                        if (el) el.remove();
                    }
                });

                // 3. 添加或更新元素
                ElementManager.state.elements.forEach(element => {
                    const existingDiv = canvas.querySelector(`[data-element-id="${element.id}"]`);
                    if (existingDiv) {
                        // 对于页面元素,复用iframe,只更新位置和尺寸
                        if (element.type === 'page') {
                            ElementManager.updateElementPosition(existingDiv, element);
                            ElementManager.updateElementSize(existingDiv, element);
                        }
                        // 对于箭头/文字/文字卡片元素,需要完全重新渲染
                        // 因为它们的位置/尺寸由内部内容决定
                        else {
                            existingDiv.remove();
                            // 关键修复: 使用专门的渲染方法,不更新计数
                            // (撤销时已经恢复了正确的usageCount)
                            ElementManager.renderElementWithoutCount(element);
                        }
                    } else {
                        // 新建:渲染新元素
                        // 关键修复: 使用专门的渲染方法,不更新计数
                        // (撤销时已经恢复了正确的usageCount)
                        ElementManager.renderElementWithoutCount(element);
                    }
                });
            }

            // 更新页面库的使用计数徽章
            // 先获取所有页面ID
            const allPageIds = PageLibrary.getAllPageIds();

            // 重置所有徽章为0并隐藏
            allPageIds.forEach(pageId => {
                PageLibrary.updateUsageBadge(pageId, 0);
            });

            // 然后更新usageCount中计数>0的页面
            Object.keys(ElementManager.state.usageCount).forEach(pageId => {
                const count = ElementManager.state.usageCount[pageId];
                if (count > 0) {
                    PageLibrary.updateUsageBadge(pageId, count);
                }
            });

            // 更新页面列表
            PageManager.renderTabs();

            // 更新状态栏
            ElementManager.updateStatusBar();

            // 恢复选中状态
            if (ElementManager.state.selectedElement) {
                const selectedEl = document.querySelector(`[data-element-id="${ElementManager.state.selectedElement}"]`);
                if (selectedEl) {
                    selectedEl.classList.add('selected');
                }
            }

            console.log('✅ 状态已恢复');
        } catch (error) {
            console.error('❌ 恢复状态失败:', error);
        } finally {
            this.isUndoingOrRedoing = false;
        }
    },

    // 撤销
    undo() {
        if (this.currentIndex <= 0) {
            console.log('⚠️ 没有更多历史记录可以撤销');
            PageLibrary.showHint('没有更多历史记录');
            return false;
        }

        this.currentIndex--;
        const state = this.historyStack[this.currentIndex];
        this.restoreState(state);

        const time = new Date(state.timestamp).toLocaleTimeString();
        console.log(`↩️ 撤销到 ${time}`);
        PageLibrary.showHint(`已撤销 (${this.currentIndex}/${this.historyStack.length - 1})`);

        return true;
    },

    // 重做
    redo() {
        if (this.currentIndex >= this.historyStack.length - 1) {
            console.log('⚠️ 没有更多历史记录可以重做');
            PageLibrary.showHint('没有更多历史记录');
            return false;
        }

        this.currentIndex++;
        const state = this.historyStack[this.currentIndex];
        this.restoreState(state);

        const time = new Date(state.timestamp).toLocaleTimeString();
        console.log(`↪️ 重做到 ${time}`);
        PageLibrary.showHint(`已重做 (${this.currentIndex}/${this.historyStack.length - 1})`);

        return true;
    },

    // 清空历史记录
    clear() {
        this.historyStack = [];
        this.currentIndex = -1;
        console.log('🗑️ 历史记录已清空');
    },

    // 获取历史记录数量
    getHistoryCount() {
        return this.historyStack.length;
    },

    // 获取当前索引
    getCurrentIndex() {
        return this.currentIndex;
    },

    // 是否可以撤销
    canUndo() {
        return this.currentIndex > 0;
    },

    // 是否可以重做
    canRedo() {
        return this.currentIndex < this.historyStack.length - 1;
    }
};
