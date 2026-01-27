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

        // 获取当前完整状态
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
        return {
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
    },

    // 恢复状态
    restoreState(state) {
        this.isUndoingOrRedoing = true;

        try {
            // 清空画布
            const canvas = document.getElementById('canvas');
            if (canvas) {
                canvas.innerHTML = '';
            }

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

            // 重新渲染所有元素
            ElementManager.state.elements.forEach(element => {
                ElementManager.renderElement(element);
            });

            // 更新页面库的使用计数徽章
            // 先重置所有徽章(隐藏所有徽章)
            const allBadges = document.querySelectorAll('[id^="badge-"]');
            allBadges.forEach(badge => {
                badge.style.display = 'none';
                badge.textContent = '0';
            });

            // 然后更新usageCount中的页面
            Object.keys(ElementManager.state.usageCount).forEach(pageId => {
                const count = ElementManager.state.usageCount[pageId];
                PageLibrary.updateUsageBadge(pageId, count);
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
        PageLibrary.showHint(`已撤销 (${this.currentIndex + 1}/${this.historyStack.length})`);

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
        PageLibrary.showHint(`已重做 (${this.currentIndex + 1}/${this.historyStack.length})`);

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
