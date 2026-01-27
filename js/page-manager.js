// 页面管理器 - 多页面/多画布管理
// 负责页面的创建、切换、删除等操作

const PageManager = {
    // 页面列表
    pages: [],

    // 当前激活页面ID
    currentPageId: null,

    // 页面计数器(用于生成唯一ID)
    pageCounter: 0,

    // 初始化
    init() {
        // 如果没有页面,创建默认页面
        if (this.pages.length === 0) {
            this.createPage('页面1');
        }

        // 渲染标签栏
        this.renderTabs();
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

        // 如果是第一个页面,自动设置为当前页面
        if (this.pages.length === 1) {
            this.currentPageId = pageId;
        }

        this.renderTabs();

        return page;
    },

    // 删除页面
    deletePage(pageId) {
        // 至少保留一个页面
        if (this.pages.length <= 1) {
            PageLibrary.showHint('⚠️ 至少需要保留一个页面');
            return;
        }

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

        // 清空当前画布元素
        ElementManager.clearAll(false);

        // 加载新页面的元素
        if (page.elements && page.elements.length > 0) {
            page.elements.forEach(element => {
                ElementManager.state.elements.push(element);
                ElementManager.renderElement(element);
            });
        }

        // 恢复新页面的视图状态
        CanvasView.setView(page.view.zoom, page.view.pan);

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

    // 渲染页面选择器
    renderTabs() {
        const pageSelect = document.getElementById('pageSelect');
        if (!pageSelect) return;

        // 清空现有选项
        pageSelect.innerHTML = '';

        // 添加所有页面选项
        this.pages.forEach(page => {
            const option = document.createElement('option');
            option.value = page.id;
            option.textContent = page.name;
            option.selected = page.id === this.currentPageId;
            pageSelect.appendChild(option);
        });

        // 绑定change事件
        pageSelect.onchange = (e) => {
            this.switchPage(e.target.value);
        };
    },

    // 更新页面选择器选中状态
    updateTabActive(pageId) {
        const pageSelect = document.getElementById('pageSelect');
        if (pageSelect) {
            pageSelect.value = pageId;
        }
    },

    // 提示重命名
    promptRename(pageId) {
        const page = this.pages.find(p => p.id === pageId);
        if (!page) return;

        const newName = prompt('请输入新的页面名称:', page.name);
        if (newName && newName.trim() && newName !== page.name) {
            this.renamePage(pageId, newName.trim());
            PageLibrary.showHint(`✅ 页面已重命名为: ${newName.trim()}`);
        }
    },

    // 获取所有页面数据(用于保存)
    getAllPagesData() {
        // 保存前先更新当前页面的视图状态
        const currentPage = this.getCurrentPage();
        if (currentPage) {
            currentPage.view = CanvasView.getView();
            currentPage.elements = ElementManager.getAllElements();
            currentPage.usageCount = ElementManager.getUsageCounts();
        }

        return {
            pages: this.pages,
            currentPageId: this.currentPageId
        };
    },

    // 设置页面数据(用于加载)
    setPagesData(data) {
        if (!data || !data.pages) return;

        this.pages = data.pages;
        this.currentPageId = data.currentPageId || data.pages[0].id;
        this.pageCounter = Math.max(...data.pages.map(p => parseInt(p.id.split('_')[1]) || 0));

        // 渲染标签栏
        this.renderTabs();

        // 加载当前页面
        this.switchPage(this.currentPageId);
    }
};
