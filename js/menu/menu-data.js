// 菜单数据模块 - MenuData
// 负责从 menu.js 配置文件读取菜单数据，构建三级树结构
// 参考 PageLibrary 模块的设计模式

const MenuData = {
    // 菜单数据
    menuData: [],

    // 菜单树结构
    menuTree: [],

    // 路径到菜单的映射（用于快速查找）
    pathToMenuMap: {},

    // 初始化
    async init() {
        await this.loadMenuConfig();
        this.buildMenuTree();
        console.log(`✅ MenuData 初始化完成，共 ${this.menuTree.length} 个顶级菜单`);
    },

    // 加载菜单配置
    loadMenuConfig() {
        // 检查配置文件是否存在
        if (!window.SIDEBAR_MENU) {
            console.warn('⚠️ 未找到菜单配置 window.SIDEBAR_MENU，使用兜底菜单');
            this.menuData = this.getFallbackMenu();
            return Promise.resolve();
        }

        // 加载配置数据
        this.menuData = window.SIDEBAR_MENU;
        console.log(`✅ 已加载菜单配置，共 ${this.menuData.length} 个菜单项`);
        return Promise.resolve();
    },

    // 构建菜单树
    // menu.js 使用混合结构：顶层平铺项 + 嵌套 children 数组
    // 需要递归展平所有嵌套项，统一建立映射和父子关系
    buildMenuTree() {
        if (!this.menuData || this.menuData.length === 0) {
            console.warn('⚠️ 菜单数据为空，无法构建树结构');
            this.menuTree = [];
            return;
        }

        // 第一步：递归展平所有菜单项（包括嵌套 children）
        const allItems = [];
        const flattenMenu = (items) => {
            items.forEach(item => {
                allItems.push(item);
                if (item.children && item.children.length > 0) {
                    flattenMenu(item.children);
                }
            });
        };
        flattenMenu(this.menuData);

        // 第二步：创建所有菜单项的映射 + 路径映射
        const menuMap = new Map();
        const rootMenus = [];

        allItems.forEach(menu => {
            if (!this.validateMenuItem(menu)) return;

            const menuItem = { ...menu, children: [] };
            menuMap.set(menu.id, menuItem);

            // 注册路径映射（支持选中状态高亮）
            if (menu.path) {
                this.pathToMenuMap[menu.path] = menuItem;
            }
        });

        // 第三步：建立父子关系
        allItems.forEach(menu => {
            const menuItem = menuMap.get(menu.id);
            if (!menuItem) return;

            if (menu.parentId === null || menu.parentId === undefined) {
                rootMenus.push(menuItem);
            } else {
                const parentMenu = menuMap.get(menu.parentId);
                if (parentMenu) {
                    parentMenu.children.push(menuItem);
                } else {
                    console.warn(`⚠️ 找不到父菜单: ${menu.parentId}，菜单 ${menu.id} 将作为顶级菜单`);
                    rootMenus.push(menuItem);
                }
            }
        });

        // 按 order 字段排序
        this.menuTree = this.sortMenus(rootMenus);

        console.log(`✅ 已构建菜单树，共 ${this.menuTree.length} 个顶级菜单，路径映射 ${Object.keys(this.pathToMenuMap).length} 条`);
    },

    // 递归排序菜单
    sortMenus(menus) {
        if (!menus || menus.length === 0) return [];

        // 按 order 排序
        const sorted = [...menus].sort((a, b) => {
            const orderA = a.order ?? 9999;
            const orderB = b.order ?? 9999;
            return orderA - orderB;
        });

        // 递归排序子菜单
        sorted.forEach(menu => {
            if (menu.children && menu.children.length > 0) {
                menu.children = this.sortMenus(menu.children);
            }
        });

        return sorted;
    },

    // 验证菜单项格式
    validateMenuItem(menu) {
        if (!menu.id || !menu.name) {
            console.error(`❌ 菜单项格式错误，缺少必需字段:`, menu);
            return false;
        }
        return true;
    },

    // 获取完整菜单树
    getMenuTree() {
        return this.menuTree;
    },

    // 根据路径查找菜单项
    findMenuItemByPath(path) {
        if (!path) return null;

        // 精确匹配
        if (this.pathToMenuMap[path]) {
            return this.pathToMenuMap[path];
        }

        // 尝试匹配相对路径
        const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
        if (this.pathToMenuMap[normalizedPath]) {
            return this.pathToMenuMap[normalizedPath];
        }

        return null;
    },

    // 根据 ID 查找菜单项
    findMenuItemById(id) {
        if (!id) return null;

        const findRecursive = (menus) => {
            for (const menu of menus) {
                if (menu.id === id) {
                    return menu;
                }
                if (menu.children && menu.children.length > 0) {
                    const found = findRecursive(menu.children);
                    if (found) return found;
                }
            }
            return null;
        };

        return findRecursive(this.menuTree);
    },

    // 获取菜单项的所有父级
    getParentMenuItems(menuItem) {
        if (!menuItem || !menuItem.parentId) {
            return [];
        }

        const parents = [];
        let currentParentId = menuItem.parentId;

        while (currentParentId) {
            const parentMenu = this.findMenuItemById(currentParentId);
            if (!parentMenu) break;

            parents.unshift(parentMenu);
            currentParentId = parentMenu.parentId;
        }

        return parents;
    },

    // 获取默认配置(降级方案)
    getFallbackMenu() {
        console.warn('⚠️ 使用兜底菜单配置');
        return [
            {
                id: "home",
                name: "首页",
                icon: "fa-home",
                path: "home.html",
                order: 0,
                parentId: null
            },
            {
                id: "system",
                name: "系统管理",
                icon: "fa-cog",
                path: null,
                order: 1,
                parentId: null,
                children: [
                    {
                        id: "system-user",
                        name: "用户管理",
                        icon: "fa-users",
                        path: "system/user.html",
                        order: 0,
                        parentId: "system"
                    }
                ]
            }
        ];
    }
};
