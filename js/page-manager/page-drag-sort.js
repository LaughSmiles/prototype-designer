// 页面拖拽排序模块
// 负责页面列表的拖拽排序功能

const PageDragSort = {
    // 拖拽状态
    // _dragFromIndex: null,
    // _draggingItem: null,

    // 设置拖拽事件监听器
    setupDragEvents(pageList, pageManager) {
        if (!pageList) return;

        // 在容器上绑定拖放事件,支持在空白区域放置
        if (!pageList._dragEventsBound) {
            pageList.addEventListener('dragover', (e) => {
                this.handleContainerDragOver(e, pageManager);
            });

            pageList.addEventListener('drop', (e) => {
                this.handleContainerDrop(e, pageManager);
            });

            pageList._dragEventsBound = true;
        }
    },

    // 绑定页面项的拖拽事件
    bindItemEvents(item, index, pageManager) {
        item.addEventListener('dragstart', (e) => {
            this.handleDragStart(e, index, pageManager);
        });

        item.addEventListener('dragover', (e) => {
            this.handleDragOver(e, pageManager);
        });

        item.addEventListener('drop', (e) => {
            this.handleDrop(e, index, pageManager);
        });

        item.addEventListener('dragenter', (e) => {
            this.handleDragEnter(e, item);
        });

        item.addEventListener('dragleave', (e) => {
            this.handleDragLeave(e, item);
        });

        item.addEventListener('dragend', (e) => {
            this.handleDragEnd(e, pageManager);
        });
    },

    // 开始拖拽
    handleDragStart(event, fromIndex, pageManager) {
        pageManager._dragFromIndex = fromIndex;
        pageManager._draggingItem = event.target;

        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/html', event.target.innerHTML);
        event.target.classList.add('dragging');

        pageManager.hideInsertIndicator();
        console.log(`开始拖拽页面 ${fromIndex}`);
    },

    // 拖拽经过目标元素
    handleDragOver(event, pageManager) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';

        const draggingItem = pageManager._draggingItem;
        if (!draggingItem) return;

        const targetItem = event.target.closest('.page-list-item');
        if (!targetItem || targetItem === draggingItem) {
            return;
        }

        // 移除所有插入空间的类
        const items = pageManager.pageListEl.querySelectorAll('.page-list-item');
        items.forEach(item => {
            item.classList.remove('insert-space-before', 'insert-space-after');
        });

        // 计算鼠标在目标元素中的位置
        const rect = targetItem.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const isInsertBefore = event.clientY < midY;

        // 显示插入指示器
        pageManager.showInsertIndicator(targetItem, isInsertBefore);

        // 添加插入空间效果
        if (isInsertBefore) {
            targetItem.classList.add('insert-space-before');
        } else {
            targetItem.classList.add('insert-space-after');
        }
    },

    // 放置拖拽元素
    handleDrop(event, toIndex, pageManager) {
        event.preventDefault();
        event.stopPropagation();

        const targetItem = event.target.closest('.page-list-item');
        if (!targetItem) return;

        const draggingItem = pageManager._draggingItem;
        if (!draggingItem || draggingItem === targetItem) {
            this.clearDragState(pageManager);
            return;
        }

        // 计算插入位置
        const rect = targetItem.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const isInsertBefore = event.clientY < midY;

        // 移动拖拽元素到正确位置
        if (isInsertBefore) {
            pageManager.pageListEl.insertBefore(draggingItem, targetItem);
        } else {
            pageManager.pageListEl.insertBefore(draggingItem, targetItem.nextSibling);
        }

        // 清理拖拽状态
        pageManager.hideInsertIndicator();
        this.clearInsertSpaces(pageManager);
        this.clearAllTransforms(pageManager);

        // 同步数据
        this.syncPageData(pageManager);

        // 保存状态用于撤销
        HistoryManager.saveState();

        console.log('拖拽放置完成');
    },

    // 拖拽进入目标元素
    handleDragEnter(event, targetItem) {
        event.preventDefault();
    },

    // 拖拽离开目标元素
    handleDragLeave(event, targetItem) {
        event.preventDefault();
    },

    // 拖拽结束
    handleDragEnd(event, pageManager) {
        this.clearDragState(pageManager);
        this.clearAllTransforms(pageManager);

        delete pageManager._dragFromIndex;
        delete pageManager._draggingItem;

        console.log('拖拽结束');
    },

    // 容器上的拖拽经过事件
    handleContainerDragOver(event, pageManager) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';

        const draggingItem = pageManager._draggingItem;
        if (!draggingItem) return;

        const targetItem = event.target.closest('.page-list-item');

        if (targetItem && targetItem !== draggingItem) {
            this.handleDragOver(event, pageManager);
        } else {
            this.clearInsertSpaces(pageManager);

            const containerRect = pageManager.pageListEl.getBoundingClientRect();
            const mouseY = event.clientY;

            const items = Array.from(pageManager.pageListEl.querySelectorAll('.page-list-item'));
            if (items.length === 0) return;

            const firstItemRect = items[0].getBoundingClientRect();
            const lastItemRect = items[items.length - 1].getBoundingClientRect();

            if (mouseY < firstItemRect.top) {
                pageManager.showInsertIndicator(items[0], true);
            } else if (mouseY > lastItemRect.bottom) {
                pageManager.showInsertIndicator(items[items.length - 1], false);
            }
        }
    },

    // 容器上的放置事件
    handleContainerDrop(event, pageManager) {
        event.preventDefault();
        event.stopPropagation();

        const draggingItem = pageManager._draggingItem;
        if (!draggingItem) return;

        const items = Array.from(pageManager.pageListEl.querySelectorAll('.page-list-item'));
        if (items.length === 0) return;

        const firstItemRect = items[0].getBoundingClientRect();
        const lastItemRect = items[items.length - 1].getBoundingClientRect();
        const mouseY = event.clientY;

        if (mouseY < firstItemRect.top) {
            pageManager.pageListEl.insertBefore(draggingItem, items[0]);
        } else if (mouseY > lastItemRect.bottom) {
            pageManager.pageListEl.appendChild(draggingItem);
        }

        // 清理
        pageManager.hideInsertIndicator();
        this.clearInsertSpaces(pageManager);
        this.clearAllTransforms(pageManager);

        // 同步数据
        this.syncPageData(pageManager);
        HistoryManager.saveState();

        console.log('容器拖拽放置完成');
    },

    // 同步页面数据
    syncPageData(pageManager) {
        const items = Array.from(document.querySelectorAll('.page-list-item'));
        const newOrder = [];

        items.forEach(item => {
            const pageId = item.dataset.pageId;
            const page = pageManager.pages.find(p => p.id === pageId);
            if (page) {
                newOrder.push(page);
            }
        });

        pageManager.pages = newOrder;
    },

    // 清理拖拽状态
    clearDragState(pageManager) {
        const items = document.querySelectorAll('.page-list-item');
        items.forEach(item => {
            item.classList.remove('dragging', 'drag-over', 'insert-space-before', 'insert-space-after');
        });
        pageManager.hideInsertIndicator();
        this.clearAllTransforms(pageManager);
    },

    // 清理所有插入空间的样式
    clearInsertSpaces(pageManager) {
        const items = pageManager.pageListEl.querySelectorAll('.page-list-item');
        items.forEach(item => {
            item.classList.remove('insert-space-before', 'insert-space-after');
        });
    },

    // 清理所有transform效果
    clearAllTransforms(pageManager) {
        const items = pageManager.pageListEl.querySelectorAll('.page-list-item');
        items.forEach(item => {
            item.style.transform = '';
        });
    }
};
