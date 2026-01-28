// 页面管理器 - 多页面/多画布管理
// 负责页面的创建、切换、删除等操作

const PageManager = {
    // 页面列表
    pages: [],

    // 当前激活页面ID
    currentPageId: null,

    // 页面列表DOM元素引用
    pageListEl: null,

    // 插入指示器元素
    insertIndicator: null,

    // 页面计数器(用于生成唯一ID)
    pageCounter: 0,

    // 全局元素ID计数器(确保所有页面的元素ID唯一)
    globalNextElementId: 1,

    // 生成唯一的元素ID
    generateElementId() {
        return `elem_${this.globalNextElementId++}`;
    },

    // 获取当前全局元素ID计数器
    getGlobalNextElementId() {
        return this.globalNextElementId;
    },

    // 设置全局元素ID计数器(用于加载缓存)
    setGlobalNextElementId(id) {
        this.globalNextElementId = id;
    },

    // 初始化
    init() {
        // 创建插入指示器
        this.createInsertIndicator();

        // 如果没有页面,创建默认页面
        if (this.pages.length === 0) {
            this.createPage('页面1');
        }

        // 渲染标签栏
        this.renderTabs();

        // 设置新增按钮事件(只绑定一次)
        const addPageBtn = document.getElementById('addPageBtn');
        if (addPageBtn) {
            addPageBtn.addEventListener('click', () => {
                const newPage = this.createPage();
                PageLibrary.showHint(`✅ 已创建新页面: ${newPage.name}`);
            });
        }
    },

    // 创建新页面
    createPage(name = null) {
        const pageId = `page_${++this.pageCounter}`;
        const pageNum = this.pages.length + 1;

        const page = {
            id: pageId,
            name: name || `页面${pageNum}`,
            view: {
                zoom: 0.5,
                pan: { x: 0, y: 0 }
            },
            elements: [],
            usageCount: {} // 每个画布页面有独立的空usageCount
        };

        this.pages.push(page);

        // 如果是第一个页面,自动设置为当前页面
        if (this.pages.length === 1) {
            this.currentPageId = pageId;
        }

        this.renderTabs();

        // 自动切换到新创建的页面
        this.switchPage(page.id);

        return page;
    },

    // 删除页面
    deletePage(pageId) {
        // 至少保留一个页面
        if (this.pages.length <= 1) {
            PageLibrary.showHint('⚠️ 至少需要保留一个页面');
            return;
        }

        const page = this.pages.find(p => p.id === pageId);
        if (!page) return;

        // 显示确认弹窗
        ModalManager.showConfirm(
            `确定要删除页面"${page.name}"吗? 此操作无法撤销。`,
            '删除页面',
            () => {
                const pageIndex = this.pages.findIndex(p => p.id === pageId);
                if (pageIndex === -1) return;

                // 删除页面
                this.pages.splice(pageIndex, 1);

                // 如果删除的是当前页面,切换到其他页面
                if (pageId === this.currentPageId) {
                    // 切换到前一个页面,如果没有则切换到第一个
                    const newPageIndex = Math.max(0, pageIndex - 1);
                    this.switchPage(this.pages[newPageIndex].id);
                }

                this.renderTabs();
                PageLibrary.showHint('✅ 页面已删除');
            }
        );
    },

    // 切换页面
    switchPage(pageId) {
        const page = this.pages.find(p => p.id === pageId);
        if (!page) return;

        // 保存当前页面的视图状态、元素数据和使用计数
        const currentPage = this.getCurrentPage();
        if (currentPage && currentPage.id !== pageId) {
            // 只有当切换到不同页面时,才保存当前页面的状态
            // 避免页面加载时用默认状态覆盖刚加载的数据
            currentPage.view = CanvasView.getView();
            if (ElementManager.state.elements.length > 0) {
                currentPage.elements = ElementManager.getAllElements();
                currentPage.usageCount = ElementManager.getUsageCounts();
            }
        }

        // 切换到新页面
        this.currentPageId = pageId;

        // 直接清空画布DOM,不调用clearAll()
        const canvas = document.getElementById('canvas');
        const elements = canvas.querySelectorAll('.canvas-element');
        elements.forEach(el => el.remove());

        // 清空元素数组和选中状态
        ElementManager.state.elements = [];
        ElementManager.state.selectedElement = null;

        // 关键修复:先重置全局usageCount为空,避免显示旧页面的计数
        ElementManager.state.usageCount = {};
        // 初始化所有页面库页面的计数为0
        PageLibrary.getAllPageIds().forEach(pageId => {
            ElementManager.state.usageCount[pageId] = 0;
        });
        // 更新所有徽章为0(清空显示)
        PageLibrary.getAllPageIds().forEach(pageId => {
            PageLibrary.updateUsageBadge(pageId, 0);
        });

        // 加载新页面的元素(深拷贝,避免引用问题)
        if (page.elements && page.elements.length > 0) {
            page.elements.forEach(element => {
                // 深拷贝元素对象,避免修改影响原始数据
                const elementCopy = JSON.parse(JSON.stringify(element));
                ElementManager.state.elements.push(elementCopy);
                ElementManager.renderElement(elementCopy);
            });
        }

        // 恢复新页面的视图状态
        console.log('🔄 恢复视图状态:', page.view);
        console.log('🔍 CanvasView 当前状态 (恢复前):', CanvasView.state);
        console.log('🔍 MIN_ZOOM:', CanvasView.MIN_ZOOM, 'MAX_ZOOM:', CanvasView.MAX_ZOOM);

        CanvasView.setView(page.view.zoom, page.view.pan);

        console.log('✅ 视图状态已恢复, 当前zoom:', CanvasView.state.zoom, 'pan:', CanvasView.state.pan);

        // 恢复新页面的使用计数
        if (page.usageCount) {
            ElementManager.setUsageCounts(page.usageCount);
        }

        // 更新标签栏选中状态
        this.updateTabActive(pageId);

        // 更新状态栏
        ElementManager.updateStatusBar();

        console.log(`切换到页面: ${page.name}`, page);
    },

    // 重命名页面
    renamePage(pageId, newName) {
        const page = this.pages.find(p => p.id === pageId);
        if (!page) return;

        page.name = newName;
        this.renderTabs();
    },

    // 复制页面
    duplicatePage(pageId = null) {
        const sourcePageId = pageId || this.currentPageId;
        const sourcePage = this.pages.find(p => p.id === sourcePageId);
        if (!sourcePage) return;

        const pageNum = this.pages.length + 1;
        const newPage = {
            id: `page_${++this.pageCounter}`,
            name: `${sourcePage.name} 副本`,
            view: { ...sourcePage.view },
            // 深拷贝元素数组,并生成新的ID
            elements: sourcePage.elements.map(elem => ({
                ...elem,
                id: `elem_${ElementManager.state.nextId++}`
            })),
            usageCount: { ...sourcePage.usageCount }
        };

        this.pages.push(newPage);
        this.renderTabs();

        // 切换到新页面
        this.switchPage(newPage.id);

        PageLibrary.showHint(`✅ 已复制页面: ${sourcePage.name}`);
    },

    // 获取当前页面
    getCurrentPage() {
        return this.pages.find(p => p.id === this.currentPageId);
    },

    // 渲染页面列表
    renderTabs() {
        const pageList = document.getElementById('pageList');
        if (!pageList) return;

        // 保存pageList引用
        this.pageListEl = pageList;

        // 清空现有列表
        pageList.innerHTML = '';

        // 添加所有页面列表项
        this.pages.forEach((page, index) => {
            const item = document.createElement('div');
            item.className = `page-list-item ${page.id === this.currentPageId ? 'active' : ''}`;
            item.dataset.pageId = page.id;
            item.dataset.pageIndex = index; // 存储页面索引
            item.draggable = true; // 启用拖拽

            // 拖拽手柄图标
            const dragHandle = document.createElement('i');
            dragHandle.className = 'fas fa-grip-vertical page-drag-handle';
            item.appendChild(dragHandle);

            // 页面名称
            const nameSpan = document.createElement('span');
            nameSpan.className = 'page-name';
            nameSpan.textContent = page.name;
            item.appendChild(nameSpan);

            // 点击事件:切换页面
            item.addEventListener('click', () => {
                this.switchPage(page.id);
            });

            // 右键菜单事件
            item.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showContextMenu(e, page.id);
            });

            // 拖拽事件
            item.addEventListener('dragstart', (e) => {
                this.handleDragStart(e, index);
            });

            item.addEventListener('dragover', (e) => {
                this.handleDragOver(e);
            });

            item.addEventListener('drop', (e) => {
                this.handleDrop(e, index);
            });

            item.addEventListener('dragenter', (e) => {
                this.handleDragEnter(e, item);
            });

            item.addEventListener('dragleave', (e) => {
                this.handleDragLeave(e, item);
            });

            item.addEventListener('dragend', (e) => {
                this.handleDragEnd(e);
            });

            pageList.appendChild(item);
        });

        // 在容器上绑定拖放事件,支持在空白区域放置
        // 只绑定一次(通过检查是否已有标记)
        if (!pageList._dragEventsBound) {
            pageList.addEventListener('dragover', (e) => {
                this.handleContainerDragOver(e);
            });

            pageList.addEventListener('drop', (e) => {
                this.handleContainerDrop(e);
            });

            pageList._dragEventsBound = true;
        }
    },

    // ============ 拖拽排序相关方法 ============

    // 开始拖拽
    handleDragStart(event, fromIndex) {
        // 存储拖拽的起始索引
        this._dragFromIndex = fromIndex;

        // 关键修复: 保存拖拽元素的引用,而不是依赖索引
        this._draggingItem = event.target;

        // 设置拖拽效果
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/html', event.target.innerHTML);

        // 添加拖拽中的样式(通过CSS让元素看起来半透明)
        event.target.classList.add('dragging');

        // 简化方案: 不隐藏拖拽元素,让它保持可见但半透明
        // 这样不会中断HTML5拖拽,拖拽元素仍然占据空间

        // 清理之前的插入指示器
        this.hideInsertIndicator();

        console.log(`开始拖拽页面 ${fromIndex}`);
    },

    // 拖拽经过目标元素
    handleDragOver(event) {
        // 必须阻止默认行为才能允许 drop
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';

        // 获取拖拽元素
        const draggingItem = this._draggingItem;
        if (!draggingItem) return;

        // 获取鼠标位置对应的目标项
        const targetItem = event.target.closest('.page-list-item');
        if (!targetItem || targetItem === draggingItem) {
            return;
        }

        // 移除所有插入空间的类
        const items = this.pageListEl.querySelectorAll('.page-list-item');
        items.forEach(item => {
            item.classList.remove('insert-space-before', 'insert-space-after');
        });

        // 计算鼠标在目标元素中的位置
        const rect = targetItem.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const isInsertBefore = event.clientY < midY;

        // 显示插入指示器
        this.showInsertIndicator(targetItem, isInsertBefore);

        // 添加插入空间效果
        if (isInsertBefore) {
            targetItem.classList.add('insert-space-before');
        } else {
            targetItem.classList.add('insert-space-after');
        }
    },

    // 放置拖拽元素
    handleDrop(event, toIndex) {
        event.preventDefault();
        event.stopPropagation();

        // 获取目标项
        const targetItem = event.target.closest('.page-list-item');
        if (!targetItem) return;

        const draggingItem = this._draggingItem;
        if (!draggingItem || draggingItem === targetItem) {
            this.clearDragState();
            return;
        }

        // 计算插入位置
        const rect = targetItem.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const isInsertBefore = event.clientY < midY;

        // 移动拖拽元素到正确位置
        if (isInsertBefore) {
            this.pageListEl.insertBefore(draggingItem, targetItem);
        } else {
            this.pageListEl.insertBefore(draggingItem, targetItem.nextSibling);
        }

        // 隐藏插入指示器和移除所有插入空间效果
        this.hideInsertIndicator();
        this.clearInsertSpaces();
        this.clearAllTransforms();

        // 同步数据
        this.syncPageData();

        // 保存状态用于撤销(页面排序后)
        HistoryManager.saveState();

        console.log('拖拽放置完成');
    },

    // 清理拖拽状态
    clearDragState() {
        const items = document.querySelectorAll('.page-list-item');
        items.forEach(item => {
            item.classList.remove('dragging', 'drag-over', 'insert-space-before', 'insert-space-after');
        });
        this.hideInsertIndicator();
        this.clearAllTransforms();
    },

    // 同步页面数据
    syncPageData() {
        const items = Array.from(document.querySelectorAll('.page-list-item'));
        const newOrder = [];

        // 根据当前DOM顺序重新构建页面数组
        items.forEach(item => {
            const pageId = item.dataset.pageId;
            const page = this.pages.find(p => p.id === pageId);
            if (page) {
                newOrder.push(page);
            }
        });

        // 更新页面数组
        this.pages = newOrder;
    },

    // 拖拽进入目标元素
    handleDragEnter(event, targetItem) {
        event.preventDefault();
        // 不再添加静态的 drag-over 效果，改为在 handleDragOver 中实时处理
    },

    // 拖拽离开目标元素
    handleDragLeave(event, targetItem) {
        event.preventDefault();
        // 不再需要，因为位置是实时计算的
    },

    // 拖拽结束
    handleDragEnd(event) {
        // 使用统一的清理方法
        this.clearDragState();

        // 清理所有transform
        this.clearAllTransforms();

        // 清理临时变量
        delete this._dragFromIndex;
        delete this._draggingItem;

        console.log('拖拽结束');
    },

    // ============ 容器级别的拖放处理(支持空白区域) ============

    // 容器上的拖拽经过事件
    handleContainerDragOver(event) {
        // 必须阻止默认行为才能允许 drop
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';

        // 获取拖拽元素
        const draggingItem = this._draggingItem;
        if (!draggingItem) return;

        // 检查鼠标是否在某个页面项上
        const targetItem = event.target.closest('.page-list-item');

        if (targetItem && targetItem !== draggingItem) {
            // 如果在某个页面项上,使用原有的 handleDragOver 逻辑
            this.handleDragOver(event);
        } else {
            // 如果在空白区域,计算位置
            this.clearInsertSpaces();

            const containerRect = this.pageListEl.getBoundingClientRect();
            const mouseY = event.clientY;

            // 获取所有页面项
            const items = Array.from(this.pageListEl.querySelectorAll('.page-list-item'));
            if (items.length === 0) return;

            // 检测是在列表上方还是下方空白区域
            const firstItemRect = items[0].getBoundingClientRect();
            const lastItemRect = items[items.length - 1].getBoundingClientRect();

            if (mouseY < firstItemRect.top) {
                // 在第一个元素上方
                this.showInsertIndicator(items[0], true);
            } else if (mouseY > lastItemRect.bottom) {
                // 在最后一个元素下方
                this.showInsertIndicator(items[items.length - 1], false);
            }
        }
    },

    // 容器上的放置事件
    handleContainerDrop(event) {
        event.preventDefault();
        event.stopPropagation();

        const draggingItem = this._draggingItem;
        if (!draggingItem) return;

        // 获取所有页面项
        const items = Array.from(this.pageListEl.querySelectorAll('.page-list-item'));
        if (items.length === 0) return;

        const containerRect = this.pageListEl.getBoundingClientRect();
        const mouseY = event.clientY;

        // 检测是在列表上方还是下方空白区域
        const firstItemRect = items[0].getBoundingClientRect();
        const lastItemRect = items[items.length - 1].getBoundingClientRect();

        if (mouseY < firstItemRect.top) {
            // 插入到第一个元素之前
            this.pageListEl.insertBefore(draggingItem, items[0]);
        } else if (mouseY > lastItemRect.bottom) {
            // 插入到最后一个元素之后
            this.pageListEl.appendChild(draggingItem);
        }

        // 清理插入指示器和效果
        this.hideInsertIndicator();
        this.clearInsertSpaces();
        this.clearAllTransforms();

        // 同步数据
        this.syncPageData();

        // 保存状态用于撤销(页面排序后)
        HistoryManager.saveState();

        console.log('容器拖拽放置完成');
    },

    // 清理所有插入空间的样式
    clearInsertSpaces() {
        const items = this.pageListEl.querySelectorAll('.page-list-item');
        items.forEach(item => {
            item.classList.remove('insert-space-before', 'insert-space-after');
        });
    },

    // 更新所有页面项的pageIndex
    updatePageIndex() {
        const items = this.pageListEl.querySelectorAll('.page-list-item');
        items.forEach((item, index) => {
            item.dataset.pageIndex = index;
        });
    },

    // 清理所有transform效果
    clearAllTransforms() {
        const items = this.pageListEl.querySelectorAll('.page-list-item');
        items.forEach(item => {
            item.style.transform = '';
        });
    },

    // 移动页面位置（数组操作）
    movePage(fromIndex, toIndex) {
        if (fromIndex === toIndex) return;

        // 从数组中移除页面
        const [movedPage] = this.pages.splice(fromIndex, 1);

        // 在新位置插入页面
        this.pages.splice(toIndex, 0, movedPage);

        console.log(`页面已移动: ${fromIndex} -> ${toIndex}`);
        console.log('新的页面顺序:', this.pages.map(p => p.name));
    },

    // 更新页面列表选中状态
    updateTabActive(pageId) {
        const items = document.querySelectorAll('.page-list-item');
        items.forEach(item => {
            if (item.dataset.pageId === pageId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    },

    // 显示右键菜单
    showContextMenu(event, pageId) {
        const contextMenu = document.getElementById('pageContextMenu');
        if (!contextMenu) return;

        // 设置菜单位置
        contextMenu.style.left = `${event.clientX}px`;
        contextMenu.style.top = `${event.clientY}px`;
        contextMenu.style.display = 'block';

        // 动态存储当前操作的pageId
        contextMenu._currentPageId = pageId;

        // 只绑定一次事件监听器
        if (!contextMenu._eventsBound) {
            const menuItems = contextMenu.querySelectorAll('.context-menu-item');
            menuItems.forEach(item => {
                const action = item.dataset.action;
                item.addEventListener('click', () => {
                    // 使用动态存储的pageId,而不是闭包中的pageId
                    this.handleContextMenuAction(action, contextMenu._currentPageId);
                    contextMenu.style.display = 'none';
                });
            });
            contextMenu._eventsBound = true;
        }

        // 点击其他地方关闭菜单
        const closeMenu = (e) => {
            if (!contextMenu.contains(e.target)) {
                contextMenu.style.display = 'none';
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 0);
    },

    // 处理右键菜单操作
    handleContextMenuAction(action, pageId) {
        switch (action) {
            case 'rename':
                this.promptRename(pageId);
                break;
            case 'duplicate':
                this.duplicatePage(pageId);
                break;
            case 'delete':
                this.deletePage(pageId);
                break;
        }
    },

    // 提示重命名
    promptRename(pageId) {
        const page = this.pages.find(p => p.id === pageId);
        if (!page) return;

        ModalManager.showPrompt(
            '请输入新的页面名称:',
            page.name,
            '重命名页面',
            (newName) => {
                if (newName && newName.trim() && newName !== page.name) {
                    this.renamePage(pageId, newName.trim());
                    PageLibrary.showHint(`✅ 页面已重命名为: ${newName.trim()}`);
                }
            }
        );
    },

    // 获取所有页面数据(用于保存)
    getAllPagesData() {
        // 保存前先更新当前页面的视图状态、元素和使用计数
        const currentPage = this.getCurrentPage();
        if (currentPage) {
            // 🔍 调试:保存前检查CanvasView的实际状态
            console.log('💾 保存前 - CanvasView.state.zoom:', CanvasView.state.zoom);
            console.log('💾 保存前 - CanvasView.state.pan:', CanvasView.state.pan);

            const view = CanvasView.getView();
            console.log('💾 保存前 - getView() 返回:', view);
            console.log('💾 保存前 - 当前页面:', currentPage.name);

            currentPage.view = view;
            currentPage.elements = ElementManager.getAllElements();
            // 关键:只保存当前画布页面的usageCount,每个画布页面独立计数
            currentPage.usageCount = ElementManager.getUsageCounts();

            console.log('💾 保存后 - currentPage.view:', currentPage.view);
        }

        return {
            pages: this.pages,
            currentPageId: this.currentPageId,
            globalNextElementId: this.globalNextElementId  // 保存全局元素ID计数器
        };
    },

    // 设置页面数据(用于加载)
    setPagesData(data) {
        if (!data || !data.pages) return;

        this.pages = data.pages;
        this.currentPageId = data.currentPageId || data.pages[0].id;
        this.pageCounter = Math.max(...data.pages.map(p => parseInt(p.id.split('_')[1]) || 0));

        // 恢复全局元素ID计数器
        if (data.globalNextElementId) {
            this.globalNextElementId = data.globalNextElementId;
        } else {
            // 兼容旧数据: 从所有元素中计算最大的ID
            let maxId = 0;
            data.pages.forEach(page => {
                if (page.elements) {
                    page.elements.forEach(elem => {
                        const id = parseInt(elem.id.split('_')[1]) || 0;
                        if (id > maxId) maxId = id;
                    });
                }
            });
            this.globalNextElementId = maxId + 1;
        }

        // 渲染标签栏
        this.renderTabs();

        // 调试: 打印加载的视图状态
        const currentPage = this.pages.find(p => p.id === this.currentPageId);
        console.log('📖 准备恢复页面:', currentPage?.name);
        console.log('📖 视图状态:', currentPage?.view);

        // 加载当前页面(会恢复usageCount和视图状态)
        this.switchPage(this.currentPageId);
    },

    // 创建插入指示器
    createInsertIndicator() {
        if (this.insertIndicator) return;

        this.insertIndicator = document.createElement('div');
        this.insertIndicator.className = 'drag-insert-indicator';
        this.insertIndicator.style.display = 'none';
        document.body.appendChild(this.insertIndicator);
    },

    // 显示插入指示器
    showInsertIndicator(targetElement, insertBefore = true) {
        if (!this.insertIndicator) return;

        const rect = targetElement.getBoundingClientRect();
        this.insertIndicator.style.top = insertBefore ? rect.top : rect.bottom;
        this.insertIndicator.style.left = rect.left;
        this.insertIndicator.style.width = rect.width + 'px';
        this.insertIndicator.style.display = 'block';
    },

    // 隐藏插入指示器
    hideInsertIndicator() {
        if (!this.insertIndicator) return;
        this.insertIndicator.style.display = 'none';
    }
};
