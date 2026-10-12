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
                        Debug.warn(`⚠️ 跳过无效页面元素: ${element.pageId}`);
                        skippedCount++;
                        return;
                    }
                }

                const elementCopy = JSON.parse(JSON.stringify(element));
                ElementManager.state.elements.push(elementCopy);
                ElementManager.renderElement(elementCopy);
            });

            if (skippedCount > 0) {
                Debug.warn(`⚠️ 已跳过 ${skippedCount} 个无效页面引用`);
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

        Debug.log(`切换到页面: ${page.name}`, page);
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
            Debug.log('💾 保存前 - CanvasView.state.zoom:', CanvasView.state.zoom);
            Debug.log('💾 保存前 - CanvasView.state.pan:', CanvasView.state.pan);

            const view = CanvasView.getView();
            Debug.log('💾 保存前 - getView() 返回:', view);
            Debug.log('💾 保存前 - 当前页面:', currentPage.name);

            currentPage.view = view;
            let allElements = ElementManager.getAllElements();

            const cleanedElements = await this.cleanInvalidPageReferences(allElements);
            const undecidable = this.lastProbeUndecidable || [];

            if (cleanedElements.length !== allElements.length) {
                const removedCount = allElements.length - cleanedElements.length;
                Debug.warn(`⚠️ 保存时清理了 ${removedCount} 个无效页面引用`);
                PageLibrary.showHint(`⚠️ 已移除 ${removedCount} 个无效页面引用`);
            }

            if (undecidable.length > 0) {
                // 探测不出来 ≠ 文件不存在：已保留元素，但要告诉用户校验没跑通
                PageLibrary.showHint(`⚠️ ${undecidable.length} 个页面文件校验超时，已保留其画布元素（未删除）`);
            }

            currentPage.elements = cleanedElements;
            currentPage.usageCount = ElementManager.getUsageCounts();

            Debug.log('💾 保存后 - currentPage.view:', currentPage.view);
        }

        return {
            pages: this.pages,
            currentPageId: this.currentPageId,
            globalNextElementId: this.globalNextElementId
        };
    },

    // 清理无效的页面引用
    // 三点修复：
    //   1) 去重 —— 同一 filePath 只探测一次（画布上放 3 次"用户管理"也只发 1 个 HEAD）
    //   2) 并发 —— 总耗时由 Σ(往返) 降为 max(往返)
    //   3) 三态 —— 只有确认 404 才删除元素；超时/网络错误判为 unknown 一律保留，
    //      避免服务抖一下就把用户的画布元素静默删掉。
    async cleanInvalidPageReferences(elements) {
        // 先做不依赖网络的判定：启动期已确认无效(404)的直接剔除，不必再探测
        const candidates = [];
        for (const element of elements) {
            if (element.type !== 'page') {
                candidates.push({ element, info: null, status: 'exists' });
                continue;
            }
            const pageInfo = PageLibrary.getPageInfo(element.pageId);
            if (!pageInfo) {
                Debug.warn(`⚠️ 移除无效页面元素: ${element.pageId}（页面不在配置中）`);
                continue;
            }
            if (pageInfo.isValid === false) {
                Debug.warn(`⚠️ 移除无效页面元素: ${element.pageId} (${pageInfo.name})`);
                continue;
            }
            candidates.push({ element, info: pageInfo, status: null });
        }

        const pending = candidates.filter(c => c.status === null);
        let statuses = new Map();
        if (pending.length > 0) {
            statuses = await PageLibrary.probePages(pending.map(c => c.info.filePath));
            pending.forEach(c => { c.status = statuses.get(c.info.filePath) || 'unknown'; });
        }

        const validElements = [];
        const undecidable = new Set();
        for (const { element, info, status } of candidates) {
            if (status === 'missing') {
                Debug.warn(`⚠️ 移除无效页面元素: ${element.pageId} (${info?.name}) 文件已不存在`);
                continue;
            }
            if (status === 'unknown') {
                // 探测不出来 ≠ 文件不存在，保守保留
                undecidable.add(info?.name || element.pageId);
            }
            validElements.push(element);
        }

        this.lastProbeUndecidable = [...undecidable];
        if (undecidable.size > 0) {
            Debug.warn(`⚠️ ${undecidable.size} 个页面文件探测超时/失败，已保守保留其画布元素: ${[...undecidable].join(', ')}`);
        }

        return validElements;
    },

    // 重置为一个空白页面（供"清空浏览器缓存"使用）
    // 关键：必须重建一个默认页面。
    // 只把 pages 清空的话，getCurrentPage() 会返回 undefined，
    // 用户清空缓存后继续画的内容再保存时就会存成"零页面"的空画布。
    resetToEmpty() {
        this.pages = [];
        this.currentPageId = null;
        this.pageCounter = 0;
        this.globalNextElementId = 1;
        ElementManager.state.elements = [];
        ElementManager.state.usageCount = {};
        ElementManager.state.selectedElement = null;
        ElementManager.state.selectedElements = [];
        this.createPage('页面1');
        Debug.log('🧹 PageManager 已重置为空白状态');
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
        Debug.log('📖 准备恢复页面:', currentPage?.name);
        Debug.log('📖 视图状态:', currentPage?.view);

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
