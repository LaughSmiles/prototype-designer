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

    // 初始化
    init() {
        this.createInsertIndicator();

        // 如果没有页面,创建默认页面
        if (this.pages.length === 0) {
            this.createPage('页面1');
        }

        this.renderTabs();

        // 设置新增按钮事件
        const addPageBtn = document.getElementById('addPageBtn');
        if (addPageBtn && !addPageBtn._clickBound) {
            addPageBtn.addEventListener('click', () => {
                const newPage = this.createPage();
                PageLibrary.showHint(`✅ 已创建新页面: ${newPage.name}`);
            });
            addPageBtn._clickBound = true;
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
            usageCount: {}
        };

        this.pages.push(page);

        if (this.pages.length === 1) {
            this.currentPageId = pageId;
        }

        this.renderTabs();
        this.switchPage(page.id);

        return page;
    },

    // 删除页面
    deletePage(pageId) {
        if (this.pages.length <= 1) {
            PageLibrary.showHint('⚠️ 至少需要保留一个页面');
            return;
        }

        const page = this.pages.find(p => p.id === pageId);
        if (!page) return;

        ModalManager.showConfirm(
            `确定要删除页面"${page.name}"吗? 此操作无法撤销。`,
            '删除页面',
            () => {
                const pageIndex = this.pages.findIndex(p => p.id === pageId);
                if (pageIndex === -1) return;

                this.pages.splice(pageIndex, 1);

                if (pageId === this.currentPageId) {
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

        // 保存当前页面的状态
        const currentPage = this.getCurrentPage();
        if (currentPage && currentPage.id !== pageId) {
            currentPage.view = CanvasView.getView();
            if (ElementManager.state.elements.length > 0) {
                currentPage.elements = ElementManager.getAllElements();
                currentPage.usageCount = ElementManager.getUsageCounts();
            }
        }

        // 切换到新页面
        this.currentPageId = pageId;

        // 清空画布
        const canvas = document.getElementById('canvas');
        const elements = canvas.querySelectorAll('.canvas-element');
        elements.forEach(el => el.remove());

        ElementManager.state.elements = [];
        ElementManager.state.selectedElement = null;

        // 重置使用计数
        ElementManager.state.usageCount = {};
        PageLibrary.getAllPageIds().forEach(id => {
            ElementManager.state.usageCount[id] = 0;
            PageLibrary.updateUsageBadge(id, 0);
        });

        // 加载新页面的元素
        if (page.elements && page.elements.length > 0) {
            let skippedCount = 0;

            page.elements.forEach(element => {
                if (element.type === 'page') {
                    const pageInfo = PageLibrary.getPageInfo(element.pageId);
                    if (!pageInfo || pageInfo.isValid === false) {
                        console.warn(`⚠️ 跳过无效页面元素: ${element.pageId}`);
                        skippedCount++;
                        return;
                    }
                }

                const elementCopy = JSON.parse(JSON.stringify(element));
                ElementManager.state.elements.push(elementCopy);
                ElementManager.renderElement(elementCopy);
            });

            if (skippedCount > 0) {
                console.warn(`⚠️ 已跳过 ${skippedCount} 个无效页面引用`);
                PageLibrary.showHint(`⚠️ 已跳过 ${skippedCount} 个无效页面引用`);
            }
        }

        // 恢复视图状态
        CanvasView.setView(page.view.zoom, page.view.pan);

        // 重新计算使用计数
        const actualUsageCount = {};
        PageLibrary.getAllPageIds().forEach(id => {
            actualUsageCount[id] = 0;
        });

        ElementManager.state.elements.forEach(element => {
            if (element.type === 'page' && element.pageId) {
                if (actualUsageCount.hasOwnProperty(element.pageId)) {
                    actualUsageCount[element.pageId]++;
                }
            }
        });

        ElementManager.state.usageCount = actualUsageCount;

        PageLibrary.getAllPageIds().forEach(id => {
            PageLibrary.updateUsageBadge(id, actualUsageCount[id] || 0);
        });

        this.updateTabActive(pageId);
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

        const newPage = {
            id: `page_${++this.pageCounter}`,
            name: `${sourcePage.name} 副本`,
            view: { ...sourcePage.view },
            elements: sourcePage.elements.map(elem => ({
                ...elem,
                id: `elem_${ElementManager.state.nextId++}`
            })),
            usageCount: { ...sourcePage.usageCount }
        };

        this.pages.push(newPage);
        this.renderTabs();
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

        this.pageListEl = pageList;
        pageList.innerHTML = '';

        this.pages.forEach((page, index) => {
            const item = document.createElement('div');
            item.className = `page-list-item ${page.id === this.currentPageId ? 'active' : ''}`;
            item.dataset.pageId = page.id;
            item.dataset.pageIndex = index;
            item.draggable = true;

            // 拖拽手柄
            const dragHandle = document.createElement('i');
            dragHandle.className = 'fas fa-grip-vertical page-drag-handle';
            item.appendChild(dragHandle);

            // 页面名称
            const nameSpan = document.createElement('span');
            nameSpan.className = 'page-name';
            nameSpan.textContent = page.name;
            item.appendChild(nameSpan);

            // 点击事件
            item.addEventListener('click', () => {
                this.switchPage(page.id);
            });

            // 右键菜单事件
            item.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                PageContextMenu.show(e, page.id, this);
            });

            // 拖拽事件
            PageDragSort.bindItemEvents(item, index, this);

            pageList.appendChild(item);
        });

        // 设置容器级拖拽事件
        PageDragSort.setupDragEvents(pageList, this);
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

    // 获取所有页面数据(用于保存)
    async getAllPagesData() {
        const currentPage = this.getCurrentPage();
        if (currentPage) {
            console.log('💾 保存前 - CanvasView.state.zoom:', CanvasView.state.zoom);
            console.log('💾 保存前 - CanvasView.state.pan:', CanvasView.state.pan);

            const view = CanvasView.getView();
            console.log('💾 保存前 - getView() 返回:', view);
            console.log('💾 保存前 - 当前页面:', currentPage.name);

            currentPage.view = view;
            let allElements = ElementManager.getAllElements();

            const cleanedElements = await this.cleanInvalidPageReferences(allElements);

            if (cleanedElements.length !== allElements.length) {
                const removedCount = allElements.length - cleanedElements.length;
                console.warn(`⚠️ 保存时清理了 ${removedCount} 个无效页面引用`);
                PageLibrary.showHint(`⚠️ 已移除 ${removedCount} 个无效页面引用`);
            }

            currentPage.elements = cleanedElements;
            currentPage.usageCount = ElementManager.getUsageCounts();

            console.log('💾 保存后 - currentPage.view:', currentPage.view);
        }

        return {
            pages: this.pages,
            currentPageId: this.currentPageId,
            globalNextElementId: this.globalNextElementId
        };
    },

    // 清理无效的页面引用
    async cleanInvalidPageReferences(elements) {
        const validElements = [];
        let invalidCount = 0;

        for (const element of elements) {
            if (element.type === 'page') {
                const pageInfo = PageLibrary.getPageInfo(element.pageId);
                if (pageInfo && pageInfo.isValid !== false) {
                    const exists = await PageLibrary.checkPageExists(pageInfo.filePath);
                    if (exists) {
                        validElements.push(element);
                    } else {
                        console.warn(`⚠️ 移除无效页面元素: ${element.pageId} (${pageInfo.name})`);
                        invalidCount++;
                    }
                } else {
                    console.warn(`⚠️ 移除无效页面元素: ${element.pageId}`);
                    invalidCount++;
                }
            } else {
                validElements.push(element);
            }
        }

        return validElements;
    },

    // 设置页面数据(用于加载)
    setPagesData(data) {
        if (!data || !data.pages) return;

        this.pages = data.pages;
        this.currentPageId = data.currentPageId || data.pages[0].id;
        this.pageCounter = Math.max(...data.pages.map(p => parseInt(p.id.split('_')[1]) || 0));

        if (data.globalNextElementId) {
            this.globalNextElementId = data.globalNextElementId;
        } else {
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

        this.renderTabs();

        const currentPage = this.pages.find(p => p.id === this.currentPageId);
        console.log('📖 准备恢复页面:', currentPage?.name);
        console.log('📖 视图状态:', currentPage?.view);

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
