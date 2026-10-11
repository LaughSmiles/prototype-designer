// 动态侧边栏菜单系统 - 主入口
// 协调 MenuData、MenuRender、MenuInteraction 三个子模块
// 参考 PageLibrary 的初始化模式

const SidebarMenu = {
    // 版本信息
    version: '1.0.0',

    // 初始化状态
    initialized: false,

    // 菜单统计信息
    stats: {
        totalMenus: 0,
        topLevelMenus: 0,
        maxLevel: 0,
        activeMenuId: null
    },

    // 初始化菜单系统
    async init(containerId) {
        if (this.initialized) {
            Debug.warn('⚠️ SidebarMenu 已经初始化');
            return;
        }

        Debug.log('🚀 初始化动态侧边栏菜单系统...');

        try {
            // 1. 初始化数据层
            await MenuData.init();

            // 2. 初始化渲染层
            MenuRender.init();

            // 3. 渲染菜单
            const menuTree = MenuData.getMenuTree();
            MenuRender.render(menuTree, containerId || 'sidebar-menu');

            // 4. 初始化交互层
            MenuInteraction.setup();

            // 5. 计算统计信息
            this.calculateStats();

            this.initialized = true;
            Debug.log(`✅ 动态侧边栏菜单系统初始化完成 (v${this.version})`);
            this.logStats();

        } catch (error) {
            Debug.error('❌ SidebarMenu 初始化失败:', error);
            throw error;
        }
    },

    // 重新渲染菜单
    refresh(containerId) {
        if (!this.initialized) {
            Debug.warn('⚠️ SidebarMenu 未初始化，无法刷新');
            return;
        }

        Debug.log('🔄 刷新菜单...');

        const menuTree = MenuData.getMenuTree();
        MenuRender.render(menuTree, containerId || 'sidebar-menu');
        MenuInteraction.highlightCurrentPage();

        this.calculateStats();
        Debug.log('✅ 菜单刷新完成');
    },

    // 计算统计信息
    calculateStats() {
        const menuTree = MenuData.getMenuTree();

        this.stats.totalMenus = this.countMenus(menuTree);
        this.stats.topLevelMenus = menuTree.length;
        this.stats.maxLevel = this.getMaxLevel(menuTree);
        this.stats.activeMenuId = MenuRender.activeMenuId;
    },

    // 递归统计菜单数量
    countMenus(menus) {
        let count = 0;
        menus.forEach(menu => {
            count++;
            if (menu.children && menu.children.length > 0) {
                count += this.countMenus(menu.children);
            }
        });
        return count;
    },

    // 获取最大层级
    getMaxLevel(menus, level = 1) {
        let maxLevel = level;
        menus.forEach(menu => {
            if (menu.children && menu.children.length > 0) {
                const childLevel = this.getMaxLevel(menu.children, level + 1);
                maxLevel = Math.max(maxLevel, childLevel);
            }
        });
        return maxLevel;
    },

    // 获取统计信息
    getStats() {
        return {
            ...this.stats,
            version: this.version,
            initialized: this.initialized
        };
    },

    // 记录统计信息到控制台
    logStats() {
        Debug.log(`📊 菜单统计:`, {
            总菜单数: this.stats.totalMenus,
            顶级菜单: this.stats.topLevelMenus,
            最大层级: this.stats.maxLevel,
            当前高亮: this.stats.activeMenuId || '无',
            版本: this.version
        });
    },

    // 展开所有菜单
    expandAll() {
        MenuRender.expandAll();
    },

    // 折叠所有菜单
    collapseAll() {
        MenuRender.collapseAll();
    },

    // 高亮指定菜单
    highlightMenu(menuId) {
        MenuRender.updateActiveItem(menuId);
    }
};

// 导出模块（如果需要）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SidebarMenu;
}
