// 页面库管理模块
// 负责从项目配置文件加载页面数据,生成页面列表,处理拖拽逻辑

const PageLibrary = {
    // 页面数据
    pages: [],

    // 项目配置
    projectConfig: null,

    // 分类展开状态(默认全部展开)
    categoryExpanded: {},

    // 初始化(改为异步)
    async init() {
        await this.loadProjectConfig();
        this.generatePageList();
        this.initializeCategoryExpanded(); // 初始化分类展开状态
        this.renderPageLibrary();
        this.setupDragAndDrop();
    },

    // 初始化分类展开状态(默认全部展开)
    initializeCategoryExpanded() {
        const groupedPages = this.groupPagesByCategory();
        Object.keys(groupedPages).forEach(categoryId => {
            if (!(categoryId in this.categoryExpanded)) {
                this.categoryExpanded[categoryId] = true; // 默认展开
            }
        });
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

            // 读取项目根路径配置
            this.projectRootPath = config.projectRootPath || '';

            console.log(`✅ 已加载项目配置: ${config.projectName} (版本 ${config.version})`);
            if (this.projectRootPath) {
                console.log(`✅ 项目根路径: ${this.projectRootPath}`);
            }
        } catch (error) {
            console.error('❌ 加载项目配置失败:', error);
            // 提供默认配置以确保框架能正常运行
            this.projectConfig = this.getDefaultConfig();
            this.projectRootPath = '';
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
        groupDiv.dataset.categoryId = group.id;

        // 分组标题(可点击,可拖拽)
        const header = document.createElement('div');
        header.className = 'page-group-header';
        header.style.cursor = 'pointer';
        header.draggable = true; // 添加拖拽支持
        header.dataset.categoryId = group.id;

        // 获取展开状态
        const isExpanded = this.categoryExpanded[group.id] !== false;

        header.innerHTML = `
            <span class="group-name">${group.name}</span>
            <div class="group-header-right">
                <span class="group-count">${group.pages.length}</span>
                <span class="category-toggle-icon ${isExpanded ? 'expanded' : 'collapsed'}">
                    <i class="fas fa-chevron-down"></i>
                </span>
            </div>
        `;

        // 点击标题切换折叠/展开
        header.addEventListener('click', () => {
            this.toggleCategory(group.id);
        });

        // 拖拽开始(批量添加分类下所有页面)
        header.addEventListener('dragstart', (e) => {
            const categoryId = group.id;
            const pages = this.getPagesInCategory(categoryId);

            // 传递分类ID和页面ID列表
            e.dataTransfer.setData('categoryId', categoryId);
            e.dataTransfer.setData('pageIds', JSON.stringify(pages.map(p => p.id)));
            e.dataTransfer.effectAllowed = 'copy';

            header.classList.add('dragging');
            console.log(`开始拖拽分类: ${group.name} (${pages.length}个页面)`);
        });

        // 拖拽结束
        header.addEventListener('dragend', () => {
            header.classList.remove('dragging');
        });

        groupDiv.appendChild(header);

        // 分组内容(支持折叠)
        const content = document.createElement('div');
        content.className = `page-group-content ${isExpanded ? '' : 'collapsed'}`;

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

        // 添加右键菜单事件
        item.addEventListener('contextmenu', (e) => {
            e.preventDefault(); // 阻止浏览器默认右键菜单

            // 显示自定义右键菜单（传递page对象,支持保存长截图）
            ElementManager.showContextMenu(e.clientX, e.clientY, null, null, page);
        });

        return item;
    },

    // 切换分类折叠/展开状态
    toggleCategory(categoryId) {
        // 切换状态
        this.categoryExpanded[categoryId] = !this.categoryExpanded[categoryId];

        // 重新渲染页面库
        this.renderPageLibrary();

        console.log(`${this.categoryExpanded[categoryId] ? '展开' : '折叠'}分类: ${categoryId}`);
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

            // 优先检查是否是分类拖拽(批量添加)
            const categoryId = e.dataTransfer.getData('categoryId');
            if (categoryId) {
                // 获取放置位置（考虑视图变换）
                const rect = canvasWrapper.getBoundingClientRect();
                const view = CanvasView.getView();

                // 计算相对于画布的坐标
                const x = (e.clientX - rect.left - view.pan.x) / view.zoom;
                const y = (e.clientY - rect.top - view.pan.y) / view.zoom;

                // 批量添加该分类下的所有页面
                this.addCategoryPages(categoryId, x, y);
                return;
            }

            // 单个页面添加(原有逻辑)
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

        // 添加拖拽到折叠分类时自动展开的功能
        this.setupCategoryExpandOnDrag();
    },

    // 设置拖拽时自动展开折叠分类
    setupCategoryExpandOnDrag() {
        const pageLibrary = document.getElementById('pageLibrary');
        if (!pageLibrary) return;

        let expandTimeout = null;

        // 监听拖拽经过分类标题
        pageLibrary.addEventListener('dragover', (e) => {
            const groupHeader = e.target.closest('.page-group-header');
            if (!groupHeader) {
                // 清除定时器
                if (expandTimeout) {
                    clearTimeout(expandTimeout);
                    expandTimeout = null;
                }
                return;
            }

            const groupDiv = groupHeader.closest('.page-group');
            if (!groupDiv) return;

            const categoryId = groupDiv.dataset.categoryId;
            if (!categoryId) return;

            // 检查该分类是否折叠
            if (this.categoryExpanded[categoryId] === false) {
                // 清除之前的定时器
                if (expandTimeout) {
                    clearTimeout(expandTimeout);
                }

                // 延迟500ms后自动展开(避免快速滑动时误触发)
                expandTimeout = setTimeout(() => {
                    this.categoryExpanded[categoryId] = true;
                    this.renderPageLibrary();
                    console.log(`拖拽时自动展开分类: ${categoryId}`);
                }, 500);
            }
        });

        // 拖拽离开时清除定时器
        pageLibrary.addEventListener('dragleave', () => {
            if (expandTimeout) {
                clearTimeout(expandTimeout);
                expandTimeout = null;
            }
        });

        // 拖拽结束时清除定时器
        pageLibrary.addEventListener('drop', () => {
            if (expandTimeout) {
                clearTimeout(expandTimeout);
                expandTimeout = null;
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

    // 获取分类下的所有页面
    getPagesInCategory(categoryId) {
        return this.pages.filter(p => p.category === categoryId);
    },

    // 批量添加分类下的所有页面到画布
    addCategoryPages(categoryId, startX, startY) {
        const pages = this.getPagesInCategory(categoryId);

        if (pages.length === 0) {
            console.warn(`分类 ${categoryId} 下没有页面`);
            return;
        }

        const pageWidth = 320;  // 页面宽度
        const gap = 50;         // 页面间距

        // 批量添加前保存状态(用于撤销整个批量操作)
        HistoryManager.saveState();

        // 所有的页面放在一行,横向排列
        pages.forEach((page, index) => {
            const x = startX + index * (pageWidth + gap);
            const y = startY;  // 所有页面y坐标相同

            // 传入 false,不单独保存状态
            ElementManager.addPageElement(page.id, x, y, false);
        });

        // 批量添加后再保存状态
        HistoryManager.saveState();

        // 获取分类名称
        const groupedPages = this.groupPagesByCategory();
        const categoryName = groupedPages[categoryId]?.name || categoryId;

        // 显示提示
        this.showHint(`已添加 ${pages.length} 个页面(${categoryName})`);

        console.log(`批量添加完成: ${categoryName} (${pages.length}个页面)`);
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
    },

    // 获取绝对路径(用于右键菜单复制文件路径)
    getAbsolutePath(relativePath) {
        if (!relativePath) return '';

        // 如果配置了项目根路径,使用配置的路径
        if (this.projectRootPath) {
            // 确保根路径以反斜杠结尾
            let rootPath = this.projectRootPath;
            if (!rootPath.endsWith('\\')) {
                rootPath += '\\';
            }

            // 将相对路径的正斜杠转换为反斜杠
            const normalizedRelativePath = relativePath.replace(/\//g, '\\');

            // 拼接完整路径
            return rootPath + normalizedRelativePath;
        }

        // 如果没有配置项目根路径,返回相对路径
        console.warn('⚠️ 未配置 projectRootPath,返回相对路径');
        return relativePath;
    }
};
