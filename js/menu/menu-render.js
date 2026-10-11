// 菜单渲染模块 - MenuRender
// 负责将菜单数据递归渲染为 HTML 元素
// 参考 PageLibraryRender 的渲染模式

const MenuRender = {
    // 菜单容器 ID
    containerId: 'sidebar-menu',

    // 展开状态持久化键名
    storageKey: 'sidebarMenuExpanded',

    // 当前展开状态
    expandedState: {},

    // 当前高亮的菜单 ID
    activeMenuId: null,

    // 初始化
    init() {
        this.loadExpandedState();
        Debug.log('✅ MenuRender 初始化完成');
    },

    // 加载展开状态
    loadExpandedState() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                this.expandedState = JSON.parse(saved);
                Debug.log('✅ 已加载菜单展开状态');
            }
        } catch (error) {
            Debug.warn('⚠️ 加载展开状态失败:', error);
            this.expandedState = {};
        }
    },

    // 保存展开状态
    saveExpandedState() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.expandedState));
        } catch (error) {
            Debug.warn('⚠️ 保存展开状态失败:', error);
        }
    },

    // 主渲染方法
    render(menuData, containerId) {
        if (!menuData || menuData.length === 0) {
            Debug.warn('⚠️ 菜单数据为空，无法渲染');
            return;
        }

        if (containerId) {
            this.containerId = containerId;
        }

        const container = document.getElementById(this.containerId);
        if (!container) {
            Debug.error(`❌ 找不到菜单容器: #${this.containerId}`);
            return;
        }

        // 清空容器
        container.innerHTML = '';
        container.className = 'sidebar-menu';

        // 渲染所有顶级菜单
        menuData.forEach(menuItem => {
            const menuElement = this.renderMenuItem(menuItem, 0);
            container.appendChild(menuElement);
        });

        Debug.log(`✅ 菜单渲染完成，共 ${menuData.length} 个顶级菜单`);
    },

    // 递归渲染菜单项
    renderMenuItem(menuItem, level) {
        const hasChildren = menuItem.children && menuItem.children.length > 0;
        const isExpanded = this.expandedState[menuItem.id] !== false;

        // 创建菜单项容器
        const itemDiv = document.createElement('div');
        itemDiv.className = `menu-item level-${level}`;
        itemDiv.dataset.menuId = menuItem.id;
        itemDiv.dataset.level = level;

        // 创建菜单内容
        const contentDiv = document.createElement('div');
        contentDiv.className = 'menu-content';

        // 图标
        if (menuItem.icon) {
            const icon = document.createElement('i');
            icon.className = `menu-icon fas ${menuItem.icon}`;
            contentDiv.appendChild(icon);
        }

        // 名称
        const nameSpan = document.createElement('span');
        nameSpan.className = 'menu-name';
        nameSpan.textContent = menuItem.name;
        contentDiv.appendChild(nameSpan);

        // 展开/折叠图标（有子菜单时）
        if (hasChildren) {
            const toggleIcon = document.createElement('i');
            toggleIcon.className = `menu-toggle-icon fas ${isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'}`;
            toggleIcon.dataset.expanded = isExpanded;
            contentDiv.appendChild(toggleIcon);
        }

        itemDiv.appendChild(contentDiv);

        // 绑定点击事件
        if (menuItem.path) {
            // 有路径的菜单项：点击跳转
            itemDiv.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                MenuInteraction.handleMenuItemClick(e, menuItem);
            });
            itemDiv.style.cursor = 'pointer';
        } else if (hasChildren) {
            // 有子菜单的父菜单：点击展开/折叠
            itemDiv.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleMenu(menuItem.id);
            });
            itemDiv.style.cursor = 'pointer';
        }

        // 渲染子菜单
        if (hasChildren) {
            const childrenContainer = this.createChildrenContainer(menuItem, level);

            // 递归渲染子菜单
            menuItem.children.forEach(child => {
                const childElement = this.renderMenuItem(child, level + 1);
                childrenContainer.appendChild(childElement);
            });

            itemDiv.appendChild(childrenContainer);
        }

        return itemDiv;
    },

    // 创建子菜单容器
    createChildrenContainer(menuItem, level) {
        const container = document.createElement('div');
        container.className = 'menu-children';
        container.dataset.parentId = menuItem.id;
        container.dataset.level = level;

        const isExpanded = this.expandedState[menuItem.id] !== false;
        if (!isExpanded) {
            container.classList.add('collapsed');
        }

        return container;
    },

    // 切换菜单展开/折叠
    toggleMenu(menuId) {
        const currentState = this.expandedState[menuId] !== false;
        this.expandedState[menuId] = !currentState;
        this.saveExpandedState();

        // 重新渲染菜单
        this.render(MenuData.getMenuTree(), this.containerId);

        // 只恢复高亮样式，不触发自动展开父级菜单
        if (this.activeMenuId) {
            const activeItem = document.querySelector(`.menu-item[data-menu-id="${this.activeMenuId}"]`);
            if (activeItem) {
                activeItem.classList.add('active');
            }
        }

        Debug.log(`${!currentState ? '展开' : '折叠'}菜单: ${menuId}`);
    },

    // 更新当前高亮项
    updateActiveItem(menuId) {
        this.activeMenuId = menuId;

        // 移除所有高亮
        document.querySelectorAll('.menu-item.active').forEach(el => {
            el.classList.remove('active');
        });

        if (!menuId) return;

        // 高亮当前菜单项
        const activeItem = document.querySelector(`.menu-item[data-menu-id="${menuId}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }

        // 展开所有父级菜单
        const menuItem = MenuData.findMenuItemById(menuId);
        if (menuItem) {
            const parents = MenuData.getParentMenuItems(menuItem);
            parents.forEach(parent => {
                this.expandedState[parent.id] = true;
                this.saveExpandedState();
            });

            // 重新渲染以显示父级菜单
            this.render(MenuData.getMenuTree(), this.containerId);

            // 重新应用高亮
            const newActiveItem = document.querySelector(`.menu-item[data-menu-id="${menuId}"]`);
            if (newActiveItem) {
                newActiveItem.classList.add('active');
            }
        }
    },

    // 展开指定菜单
    expandMenu(menuId) {
        this.expandedState[menuId] = true;
        this.saveExpandedState();
        this.render(MenuData.getMenuTree(), this.containerId);
    },

    // 折叠指定菜单
    collapseMenu(menuId) {
        this.expandedState[menuId] = false;
        this.saveExpandedState();
        this.render(MenuData.getMenuTree(), this.containerId);
    },

    // 展开所有菜单
    expandAll() {
        const expandAllRecursive = (menus) => {
            menus.forEach(menu => {
                this.expandedState[menu.id] = true;
                if (menu.children && menu.children.length > 0) {
                    expandAllRecursive(menu.children);
                }
            });
        };
        expandAllRecursive(MenuData.getMenuTree());
        this.saveExpandedState();
        this.render(MenuData.getMenuTree(), this.containerId);
    },

    // 折叠所有菜单
    collapseAll() {
        const collapseAllRecursive = (menus) => {
            menus.forEach(menu => {
                if (menu.children && menu.children.length > 0) {
                    this.expandedState[menu.id] = false;
                    collapseAllRecursive(menu.children);
                }
            });
        };
        collapseAllRecursive(MenuData.getMenuTree());
        this.saveExpandedState();
        this.render(MenuData.getMenuTree(), this.containerId);
    }
};
