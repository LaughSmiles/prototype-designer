// 菜单交互模块 - MenuInteraction
// 负责处理菜单的用户交互事件
// 参考 PageLibraryDrag 的事件处理模式

const MenuInteraction = {
    // 初始化事件监听
    setup() {
        // 页面加载时自动高亮当前页面
        this.highlightCurrentPage();

        // 监听页面路径变化（处理 SPA 路由）
        window.addEventListener('popstate', () => {
            this.highlightCurrentPage();
        });

        console.log('✅ MenuInteraction 初始化完成');
    },

    // 高亮当前页面
    highlightCurrentPage() {
        const currentPath = window.location.pathname;

        // 从路径中提取 pages/ 之后的部分作为菜单路径
        let menuPath = currentPath;
        const pagesIndex = menuPath.indexOf('/pages/');
        if (pagesIndex !== -1) {
            menuPath = menuPath.substring(pagesIndex + 7); // 跳过 '/pages/'
        } else if (menuPath.startsWith('/')) {
            menuPath = menuPath.slice(1);
        }

        // 查找匹配的菜单项
        let menuItem = MenuData.findMenuItemByPath(menuPath);

        // 如果未找到，尝试去掉目录前缀匹配文件名
        if (!menuItem) {
            const parts = menuPath.split('/');
            if (parts.length > 1) {
                // 尝试用目录+文件名匹配（如 system/user.html）
                for (let i = 0; i < parts.length - 1; i++) {
                    const partialPath = parts.slice(i).join('/');
                    menuItem = MenuData.findMenuItemByPath(partialPath);
                    if (menuItem) break;
                }
            }
        }

        if (menuItem) {
            MenuRender.updateActiveItem(menuItem.id);
            console.log(`✅ 高亮菜单: ${menuItem.name} (${menuItem.id})`);
        } else {
            console.debug(`ℹ️ 当前页面未匹配到菜单: ${menuPath}`);
        }
    },

    // 处理菜单项点击
    handleMenuItemClick(event, menuItem) {
        if (!menuItem || !menuItem.path) {
            return;
        }

        // 更新高亮状态
        MenuRender.updateActiveItem(menuItem.id);

        // 页面跳转：根据当前页面深度计算正确的相对路径
        try {
            const targetPath = this.resolveRelativePath(menuItem.path);
            window.location.href = targetPath;
        } catch (error) {
            console.error('❌ 页面跳转失败:', error);
        }
    },

    // 根据当前页面深度，计算到 pages/ 根目录的相对路径
    resolveRelativePath(targetPath) {
        const currentPath = window.location.pathname;
        const pagesIndex = currentPath.indexOf('/pages/');
        if (pagesIndex === -1) {
            // 不在 pages 目录下，直接使用目标路径
            return targetPath;
        }
        // 提取 pages/ 之后的部分，例如 "system/user.html" 或 "mall/order.html"
        const afterPages = currentPath.substring(pagesIndex + 7);
        // 计算目录深度：system/user.html → depth=1, home.html → depth=0
        const depth = afterPages.split('/').length - 1;
        // 用 ../ 回退到 pages/ 根目录，再拼接目标路径
        const prefix = '../'.repeat(depth);
        return prefix + targetPath;
    },

    // 处理折叠/展开点击（已由 MenuRender.toggleMenu 处理，此方法保留供扩展）
    handleToggleClick(event, menuId) {
        event.preventDefault();
        event.stopPropagation();
        MenuRender.toggleMenu(menuId);
    },

    // 根据路径自动高亮（供外部调用）
    autoHighlightByPath(currentPath) {
        if (!currentPath) return;

        let normalizedPath = currentPath;
        if (normalizedPath.startsWith('/')) {
            normalizedPath = normalizedPath.slice(1);
        }

        const menuItem = MenuData.findMenuItemByPath(normalizedPath);
        if (menuItem) {
            MenuRender.updateActiveItem(menuItem.id);
            return true;
        }
        return false;
    },

    // 获取当前高亮的菜单项
    getActiveMenuItem() {
        if (!MenuRender.activeMenuId) return null;
        return MenuData.findMenuItemById(MenuRender.activeMenuId);
    }
};
