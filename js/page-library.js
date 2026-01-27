// 页面库管理模块
// 负责从项目配置文件加载页面数据,生成页面列表,处理拖拽逻辑

const PageLibrary = {
    // 页面数据
    pages: [],

    // 项目配置
    projectConfig: null,

    // 初始化(改为异步)
    async init() {
        await this.loadProjectConfig();
        this.generatePageList();
        this.renderPageLibrary();
        this.setupDragAndDrop();
    },

    // 加载项目配置文件
    async loadProjectConfig() {
        try {
            const response = await fetch('project-config.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const config = await response.json();
            this.projectConfig = config;
            console.log(`✅ 已加载项目配置: ${config.projectName} (版本 ${config.version})`);
        } catch (error) {
            console.error('❌ 加载项目配置失败:', error);
            // 提供默认配置以确保框架能正常运行
            this.projectConfig = this.getDefaultConfig();
            console.warn('⚠️ 使用默认配置');
        }
    },

    // 获取默认配置(降级方案)
    getDefaultConfig() {
        return {
            projectName: '画布编辑器',
            projectTitle: '画布编辑器',
            version: '1.0.0',
            canvasSize: { width: 320, height: 680 },
            pages: []
        };
    },

    // 生成页面列表(从配置文件读取)
    generatePageList() {
        if (!this.projectConfig || !this.projectConfig.pages) {
            console.warn('⚠️ 项目配置中没有页面数据');
            this.pages = [];
            return;
        }

        const canvasSize = this.projectConfig.canvasSize || { width: 320, height: 680 };

        this.pages = this.projectConfig.pages.map(pageConfig => ({
            id: pageConfig.id,
            name: pageConfig.name,
            filePath: pageConfig.path || `pages/${pageConfig.category}/${pageConfig.id}.html`,
            icon: pageConfig.icon || 'fa-file',
            category: pageConfig.category || '未分类',
            originalSize: {
                width: canvasSize.width,
                height: canvasSize.height
            }
        }));

        console.log(`✅ 已生成 ${this.pages.length} 个页面列表`);
    },

    // 渲染页面库
    renderPageLibrary() {
        const container = document.getElementById('pageLibrary');
        const countSpan = document.getElementById('pageCount');

        if (!container) return;

        container.innerHTML = '';

        if (this.pages.length === 0) {
            container.innerHTML = '<div class="no-pages-hint">未找到页面配置</div>';
            countSpan.textContent = '0';
            return;
        }

        countSpan.textContent = this.pages.length;

        // 按分类分组
        const groupedPages = this.groupPagesByCategory();

        // 渲染分组
        Object.keys(groupedPages).forEach(categoryId => {
            const group = groupedPages[categoryId];
            const groupElement = this.createGroupElement(group);
            container.appendChild(groupElement);
        });
    },

    // 按分类分组页面
    groupPagesByCategory() {
        const groups = {};

        this.pages.forEach(page => {
            const categoryId = page.category || 'uncategorized';
            if (!groups[categoryId]) {
                groups[categoryId] = {
                    id: categoryId,
                    name: this.getCategoryName(categoryId),
                    pages: []
                };
            }
            groups[categoryId].pages.push(page);
        });

        return groups;
    },

    // 获取分类名称
    getCategoryName(categoryId) {
        if (!this.projectConfig || !this.projectConfig.categories) {
            return categoryId === 'uncategorized' ? '未分类' : categoryId;
        }

        const category = this.projectConfig.categories.find(c => c.id === categoryId);
        return category ? category.name : (categoryId === 'uncategorized' ? '未分类' : categoryId);
    },

    // 创建分组元素
    createGroupElement(group) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'page-group';

        // 分组标题
        const header = document.createElement('div');
        header.className = 'page-group-header';
        header.innerHTML = `
            <span class="group-name">${group.name}</span>
            <span class="group-count">${group.pages.length}</span>
        `;
        groupDiv.appendChild(header);

        // 分组内容
        const content = document.createElement('div');
        content.className = 'page-group-content';

        group.pages.forEach(page => {
            const item = this.createPageItem(page);
            content.appendChild(item);
        });

        groupDiv.appendChild(content);

        return groupDiv;
    },

    // 创建页面项
    createPageItem(page) {
        const item = document.createElement('div');
        item.className = 'page-item';
        item.draggable = true;
        item.dataset.pageId = page.id;

        item.innerHTML = `
            <i class="fas ${page.icon}"></i>
            <div class="page-item-info">
                <div class="page-item-name">${page.name}</div>
                <div class="page-item-id">${page.id}</div>
            </div>
            <div class="page-usage-badge" id="badge-${page.id}">0</div>
        `;

        // 拖拽开始
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('pageId', page.id);
            e.dataTransfer.effectAllowed = 'copy';
            item.classList.add('dragging');
        });

        // 拖拽结束
        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
        });

        return item;
    },

    // 设置拖拽事件
    setupDragAndDrop() {
        const canvasWrapper = document.getElementById('canvasWrapper');
        const canvas = document.getElementById('canvas');
        if (!canvasWrapper || !canvas) return;

        // 拖拽经过
        canvasWrapper.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            canvasWrapper.classList.add('drag-over');
        });

        // 拖拽离开
        canvasWrapper.addEventListener('dragleave', (e) => {
            if (e.target === canvasWrapper) {
                canvasWrapper.classList.remove('drag-over');
            }
        });

        // 放置
        canvasWrapper.addEventListener('drop', (e) => {
            e.preventDefault();
            canvasWrapper.classList.remove('drag-over');

            const pageId = e.dataTransfer.getData('pageId');
            if (pageId) {
                // 获取放置位置（考虑视图变换）
                const rect = canvasWrapper.getBoundingClientRect();
                const view = CanvasView.getView();

                // 计算相对于画布的坐标
                // 1. 先计算相对于 canvasWrapper 的坐标
                // 2. 减去视图平移偏移
                // 3. 除以缩放比例
                const x = (e.clientX - rect.left - view.pan.x) / view.zoom;
                const y = (e.clientY - rect.top - view.pan.y) / view.zoom;

                // 创建元素
                ElementManager.addPageElement(pageId, x, y);

                // 显示提示(从页面信息获取名称)
                const pageInfo = this.getPageInfo(pageId);
                const pageName = pageInfo ? pageInfo.name : pageId;
                this.showHint(`已添加: ${pageName}`);
            }
        });
    },

    // 获取页面信息
    getPageInfo(pageId) {
        return this.pages.find(p => p.id === pageId);
    },

    // 获取页面名称(兼容旧代码)
    getPageName(pageId) {
        const pageInfo = this.getPageInfo(pageId);
        return pageInfo ? pageInfo.name : pageId;
    },

    // 显示临时提示
    showHint(message) {
        const existing = document.querySelector('.temp-hint');
        if (existing) existing.remove();

        const hint = document.createElement('div');
        hint.className = 'temp-hint';
        hint.textContent = message;
        document.body.appendChild(hint);

        setTimeout(() => hint.remove(), 2000);
    },

    // 更新页面使用计数徽章
    updateUsageBadge(pageId, count) {
        const badge = document.getElementById(`badge-${pageId}`);
        if (badge) {
            badge.textContent = count;
            // 如果计数为0，可以隐藏或显示0
            if (count === 0) {
                badge.style.display = 'none';
            } else {
                badge.style.display = 'flex';
            }
        }
    },

    // 获取所有页面ID(供ElementManager使用)
    getAllPageIds() {
        return this.pages.map(p => p.id);
    }
};
