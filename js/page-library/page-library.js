// 页面库核心模块
// 负责从项目配置文件加载页面数据、管理页面列表

const PageLibrary = {
    // 页面数据
    pages: [],

    // 项目配置
    projectConfig: null,

    // 分类展开状态(默认全部展开)
    categoryExpanded: {},

    // 初始化
    async init() {
        this.loadProjectConfig();
        await this.generatePageList();
        this.initializeCategoryExpanded();
        PageLibraryRender.render();
        PageLibraryDrag.setup();
    },

    // 初始化分类展开状态(默认全部展开)
    initializeCategoryExpanded() {
        const groupedPages = PageLibraryRender.groupPagesByCategory();
        Object.keys(groupedPages).forEach(categoryId => {
            if (!(categoryId in this.categoryExpanded)) {
                this.categoryExpanded[categoryId] = true; // 默认展开
            }
        });
    },

    // 加载项目配置 (config.js 已在页面顶部加载)
    loadProjectConfig() {
        if (window.PROJECT_CONFIG) {
            this.projectConfig = window.PROJECT_CONFIG;
            this.projectRootPath = window.PROJECT_CONFIG.projectRootPath || '';
            console.log(`✅ 已加载项目配置: ${this.projectConfig.projectName} (版本 ${this.projectConfig.version})`);
            if (this.projectRootPath) {
                console.log(`✅ 项目根路径: ${this.projectRootPath}`);
            }
        } else {
            console.warn('⚠️ 未找到配置，使用默认配置');
            this.projectConfig = this.getDefaultConfig();
            this.projectRootPath = '';
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
    async generatePageList() {
        if (!this.projectConfig || !this.projectConfig.pages) {
            console.warn('⚠️ 项目配置中没有页面数据');
            this.pages = [];
            return;
        }

        const canvasSize = this.projectConfig.canvasSize || { width: 320, height: 680 };

        // 并行验证所有页面文件是否存在
        const pageValidationPromises = this.projectConfig.pages.map(async pageConfig => {
            const filePath = pageConfig.path || `pages/${pageConfig.category}/${pageConfig.id}.html`;
            const isValid = await this.checkPageExists(filePath);

            return {
                id: pageConfig.id,
                name: pageConfig.name,
                filePath: filePath,
                icon: pageConfig.icon || 'fa-file',
                category: pageConfig.category || '未分类',
                originalSize: {
                    width: canvasSize.width,
                    height: canvasSize.height
                },
                isValid: isValid  // 标记页面文件是否有效
            };
        });

        this.pages = await Promise.all(pageValidationPromises);

        // 统计无效页面数量
        const invalidCount = this.pages.filter(p => !p.isValid).length;
        if (invalidCount > 0) {
            console.warn(`⚠️ 发现 ${invalidCount} 个页面文件不存在，已标记为无效`);
            const invalidNames = this.pages.filter(p => !p.isValid).map(p => p.name).join(', ');
            console.warn(`   无效页面: ${invalidNames}`);
        }

        console.log(`✅ 已生成 ${this.pages.length} 个页面列表 (${this.pages.length - invalidCount} 个有效)`);
    },

    // 检查页面文件是否存在
    async checkPageExists(filePath) {
        // file:// 协议下 fetch 会被 CORS 阻止，直接假设文件有效
        if (window.location.protocol === 'file:') {
            return true;
        }
        // HTTP/HTTPS 协议下正常验证
        try {
            const response = await fetch(filePath, { method: 'HEAD' });
            console.log(`🔍 [checkPageExists] ${filePath} - status: ${response.status}, ok: ${response.ok}`);
            return response.ok;
        } catch (error) {
            console.error(`❌ [checkPageExists] ${filePath} - error:`, error);
            return false;
        }
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
    },

    // 以下方法委托给子模块

    // 渲染页面库
    renderPageLibrary() {
        PageLibraryRender.render();
    },

    // 更新页面使用计数徽章
    updateUsageBadge(pageId, count) {
        PageLibraryRender.updateUsageBadge(pageId, count);
    },

    // 显示临时提示
    showHint(message) {
        PageLibraryRender.showHint(message);
    }
};
