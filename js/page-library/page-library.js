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
            Debug.log(`✅ 已加载项目配置: ${this.projectConfig.projectName} (版本 ${this.projectConfig.version})`);
            if (this.projectRootPath) {
                Debug.log(`✅ 项目根路径: ${this.projectRootPath}`);
            }
        } else {
            Debug.warn('⚠️ 未找到配置，使用默认配置');
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

    // 解析页面的画布尺寸
    // 优先级: category 所属 device 的 canvasSize > 全局 canvasSize > 默认值
    getCanvasSizeForPage(pageConfig) {
        const globalSize = this.projectConfig.canvasSize || { width: 320, height: 680 };
        const devices = this.projectConfig.devices || [];

        // 查找所属分类
        const categoryId = pageConfig.category;
        const category = this.projectConfig.categories?.find(c => c.id === categoryId);

        // 查找分类所属设备的 canvasSize
        if (category?.device) {
            const device = devices.find(d => d.id === category.device);
            if (device?.canvasSize) return device.canvasSize;
        }

        return globalSize;
    },

    // 生成页面列表(从配置文件读取)
    async generatePageList() {
        if (!this.projectConfig || !this.projectConfig.pages) {
            Debug.warn('⚠️ 项目配置中没有页面数据');
            this.pages = [];
            return;
        }

        // 一次性并发探测所有页面文件是否存在（去重 + 超时，避免对同一文件重复发请求）
        const filePaths = this.projectConfig.pages.map(pageConfig =>
            pageConfig.path || `pages/${pageConfig.category}/${pageConfig.id}.html`
        );
        const statuses = await this.probePages(filePaths);

        this.pages = this.projectConfig.pages.map(pageConfig => {
            const filePath = pageConfig.path || `pages/${pageConfig.category}/${pageConfig.id}.html`;
            const pageSize = this.getCanvasSizeForPage(pageConfig);

            return {
                id: pageConfig.id,
                name: pageConfig.name,
                filePath: filePath,
                icon: pageConfig.icon || 'fa-file',
                category: pageConfig.category || '未分类',
                originalSize: {
                    width: pageSize.width,
                    height: pageSize.height
                },
                isValid: statuses.get(filePath) === 'exists'  // 标记页面文件是否有效
            };
        });

        // 统计无效页面数量
        const invalidCount = this.pages.filter(p => !p.isValid).length;
        if (invalidCount > 0) {
            Debug.warn(`⚠️ 发现 ${invalidCount} 个页面文件不存在，已标记为无效`);
            const invalidNames = this.pages.filter(p => !p.isValid).map(p => p.name).join(', ');
            Debug.warn(`   无效页面: ${invalidNames}`);
        }

        Debug.log(`✅ 已生成 ${this.pages.length} 个页面列表 (${this.pages.length - invalidCount} 个有效)`);
    },

    // 生成兼容旧调用方的布尔版探测结果（内部走三态 probePage）
    async checkPageExists(filePath, options = {}) {
        const status = await this.probePage(filePath, options);
        return status === 'exists';
    },

    // 单页面文件探测（带超时 + 三态返回）
    // 返回:
    //   'exists'  —— 已确认存在
    //   'missing' —— 已确认不存在(HTTP 404)
    //   'unknown' —— 无法判定(超时 / 网络错误 / 非 404 的异常响应)
    // 之所以要区分 unknown：保存时若把 unknown 当 missing 处理，网络抖一下就会静默删掉用户的画布元素。
    async probePage(filePath, { timeout = 3000 } = {}) {
        // file:// 协议下 fetch 会被 CORS 阻止，直接假设文件有效（本地双击打开的常用路径）
        if (window.location.protocol === 'file:') {
            return 'exists';
        }
        try {
            const response = await fetch(filePath, {
                method: 'HEAD',
                cache: 'no-cache',
                signal: this._timeoutSignal(timeout)
            });
            if (response.ok) return 'exists';
            if (response.status === 404) return 'missing';
            // 其他状态码(403/5xx 等)无法证明文件不存在，按 unknown 保守处理
            return 'unknown';
        } catch (error) {
            Debug.warn(`⚠️ 页面探测失败（判为 unknown，不删除画布元素）: ${filePath}`, error);
            return 'unknown';
        }
    },

    // 批量探测：按 filePath 去重 + 并发执行
    // 修复前保存路径是 for..of + 逐个 await，同一个页面在画布上放 N 次就发 N 次串行 HEAD。
    async probePages(filePaths, { timeout = 3000 } = {}) {
        const unique = [...new Set(filePaths.filter(Boolean))];
        const result = new Map();

        if (window.location.protocol === 'file:') {
            unique.forEach(p => result.set(p, 'exists'));
            Debug.log(`🔍 file:// 协议，跳过 ${unique.length} 个页面文件探测`);
            return result;
        }
        if (unique.length === 0) return result;

        const entries = await Promise.all(unique.map(async (path) => {
            const status = await this.probePage(path, { timeout });
            return [path, status];
        }));
        entries.forEach(([path, status]) => result.set(path, status));

        const missing = [...result.values()].filter(v => v === 'missing').length;
        const unknown = [...result.values()].filter(v => v === 'unknown').length;
        Debug.log(`🔍 页面探测完成: 共 ${unique.length} 个(去重后), 缺失 ${missing}, 无法判定 ${unknown}`);
        return result;
    },

    // 构造带超时的 AbortSignal（旧浏览器回退到 AbortController）
    _timeoutSignal(ms) {
        if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
            return AbortSignal.timeout(ms);
        }
        const controller = new AbortController();
        setTimeout(() => controller.abort(), ms);
        return controller.signal;
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
        Debug.warn('⚠️ 未配置 projectRootPath,返回相对路径');
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
    // 注意：必须透传 duration。
    // 之前只转发 message，导致"常驻提示"(duration=0) 在这一层被吞成 undefined，
    // 保存失败提示 2 秒后就消失 —— 等于没提示。
    showHint(message, duration) {
        PageLibraryRender.showHint(message, duration);
    }
};
