// 页面管理器 - 多页面/多画布管理
// 负责页面的创建、切换、删除等操作

const PageManager = {
    // 页面列表
    pages: [],

    // 当前激活页面ID
    currentPageId: null,

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

        // 保存当前页面的视图状态
        const currentPage = this.getCurrentPage();
        if (currentPage) {
            currentPage.view = CanvasView.getView();
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
        CanvasView.setView(page.view.zoom, page.view.pan);

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
    },

    // ============ 拖拽排序相关方法 ============

    // 开始拖拽
    handleDragStart(event, fromIndex) {
        // 存储拖拽的起始索引
        this._dragFromIndex = fromIndex;

        // 设置拖拽效果
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/html', event.target.innerHTML);

        // 添加拖拽中的样式
        event.target.classList.add('dragging');

        console.log(`开始拖拽页面 ${fromIndex}`);
    },

    // 拖拽经过目标元素
    handleDragOver(event) {
        // 必须阻止默认行为才能允许 drop
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    },

    // 放置拖拽元素
    handleDrop(event, toIndex) {
        event.preventDefault();
        event.stopPropagation();

        // 如果拖拽到相同位置，不做任何操作
        if (this._dragFromIndex === toIndex) {
            return;
        }

        console.log(`从位置 ${this._dragFromIndex} 移动到位置 ${toIndex}`);

        // 移动页面
        this.movePage(this._dragFromIndex, toIndex);

        // 重新渲染页面列表
        this.renderTabs();
    },

    // 拖拽进入目标元素
    handleDragEnter(event, targetItem) {
        event.preventDefault();
        // 添加视觉反馈
        targetItem.classList.add('drag-over');
    },

    // 拖拽离开目标元素
    handleDragLeave(event, targetItem) {
        event.preventDefault();
        // 移除视觉反馈
        targetItem.classList.remove('drag-over');
    },

    // 拖拽结束
    handleDragEnd(event) {
        // 移除所有拖拽相关的样式
        const items = document.querySelectorAll('.page-list-item');
        items.forEach(item => {
            item.classList.remove('dragging');
            item.classList.remove('drag-over');
        });

        // 清理临时变量
        delete this._dragFromIndex;

        console.log('拖拽结束');
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
            currentPage.view = CanvasView.getView();
            currentPage.elements = ElementManager.getAllElements();
            // 关键:只保存当前画布页面的usageCount,每个画布页面独立计数
            currentPage.usageCount = ElementManager.getUsageCounts();
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

        // 加载当前页面(会恢复usageCount)
        this.switchPage(this.currentPageId);
    }
};
