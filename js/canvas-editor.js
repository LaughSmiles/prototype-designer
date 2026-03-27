// 画布编辑器主控制器
// 负责初始化所有模块和协调各模块工作

const CanvasEditor = {
    // 侧边栏拖动状态
    sidebarResizer: {
        isResizingLeft: false,
        isResizingRight: false,
        startX: 0,
        startWidthLeft: 0,
        startWidthRight: 0,
        minWidth: 15,
        maxWidth: 500
    },

    // 初始化
    init() {
        const projectName = this.getProjectName();
        console.log(`🎨 ${projectName}画布编辑器正在初始化...`);

        // 按顺序初始化各模块
        this.initModules()
            .then(() => {
                console.log('✅ 所有模块初始化完成');
                this.showWelcome();
            })
            .catch(error => {
                console.error('❌ 初始化失败:', error);
                alert('初始化失败：' + error.message);
            });
    },

    // 获取项目名称 (config.js 已在页面顶部加载)
    getProjectName() {
        return window.PROJECT_CONFIG?.projectName || '画布编辑器';
    },

    // 初始化所有模块
    async initModules() {
        try {
            // 1. 页面库 (必须等待加载完成,因为其他模块依赖它)
            await PageLibrary.init();
            console.log('✅ 页面库初始化完成');

            // 2. 画布视图
            CanvasView.init();
            console.log('✅ 画布视图初始化完成');

            // 3. 元素管理
            ElementManager.init();
            console.log('✅ 元素管理初始化完成');

            // 4. 工具系统
            Tools.init();
            console.log('✅ 工具系统初始化完成');

            // 5. 弹窗管理器
            ModalManager.init();
            console.log('✅ 弹窗管理器初始化完成');

            // 6. 数据持久化 (必须在页面库之后,因为恢复数据需要页面信息)
            Storage.init();
            console.log('✅ 数据持久化初始化完成');

            // 7. 页面管理器 (必须在Storage之后,因为需要加载数据)
            PageManager.init();
            console.log('✅ 页面管理器初始化完成');

            // 8. 历史记录管理器
            HistoryManager.init();
            console.log('✅ 历史记录管理器初始化完成');

            // 9. 初始化侧边栏拖动功能
            this.initSidebarResizer();
            console.log('✅ 侧边栏拖动功能初始化完成');

            // 10. 初始化主题切换
            this.initThemeToggle();
            console.log('✅ 主题切换功能初始化完成');

            // 11. 绑定全局快捷键
            this.bindGlobalShortcuts();

            // 注意: 不在初始化时保存空状态
            // 第一次操作时会自动保存初始状态

        } catch (error) {
            throw error;
        }
    },

    // 绑定全局快捷键
    bindGlobalShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+S: 保存
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                Storage.save();
            }

            // Ctrl+Z: 撤销
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                HistoryManager.undo();
            }

            // Ctrl+Y 或 Ctrl+Shift+Z: 重做
            if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
                e.preventDefault();
                HistoryManager.redo();
            }
        });
    },

    // 显示欢迎信息
    showWelcome() {
        const projectName = this.getProjectName();
        const message = `
🎨 ${projectName}画布编辑器已就绪！

📌 快速开始：
1. 从右侧页面库拖拽页面到画布
2. 使用左侧工具添加箭头或文字标注
3. Ctrl+滚轮：缩放视图
4. 滚轮：拖动视图
5. Ctrl+S：保存进度

💡 提示：
- 选中元素后，Delete键删除
- 选中元素后，Ctrl+滚轮缩放元素
- 双击元素取消选择
        `;

        console.log(message);
        PageLibrary.showHint(`${projectName}画布编辑器已就绪！`);
    },

    // 显示帮助
    showHelp() {
        const modal = document.getElementById('helpModal');
        if (modal) {
            modal.classList.add('active');

            // 初始化Tab切换功能
            this.initHelpTabs();

            // 设置关闭事件
            const overlay = document.getElementById('helpModalOverlay');
            const closeBtn = document.getElementById('helpModalClose');

            // 点击遮罩层关闭
            const closeOverlay = () => {
                modal.classList.remove('active');
                overlay.removeEventListener('click', closeOverlay);
            };
            overlay.addEventListener('click', closeOverlay);

            // 点击关闭按钮
            const closeBtnHandler = () => {
                modal.classList.remove('active');
                closeBtn.removeEventListener('click', closeBtnHandler);
            };
            closeBtn.addEventListener('click', closeBtnHandler);

            // ESC键关闭
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    modal.classList.remove('active');
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
        }
    },

    // 初始化帮助Tab切换
    initHelpTabs() {
        const tabs = document.querySelectorAll('.help-tab');
        const panes = document.querySelectorAll('.help-tab-pane');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;

                // 移除所有active状态
                tabs.forEach(t => t.classList.remove('active'));
                panes.forEach(p => p.classList.remove('active'));

                // 添加active状态到当前Tab
                tab.classList.add('active');
                const targetPane = document.getElementById(`tab-${tabName}`);
                if (targetPane) {
                    targetPane.classList.add('active');
                }
            });
        });
    },

    // 初始化侧边栏拖动功能
    initSidebarResizer() {
        const sidebarLeft = document.getElementById('sidebarLeft');
        const sidebarRight = document.getElementById('sidebarRight');
        const resizerLeft = document.getElementById('resizerLeft');
        const resizerRight = document.getElementById('resizerRight');
        const expanderLeft = document.getElementById('expanderLeft');
        const expanderRight = document.getElementById('expanderRight');

        if (!sidebarLeft || !sidebarRight || !resizerLeft || !resizerRight) {
            console.warn('侧边栏拖动功能初始化失败：找不到必要元素');
            return;
        }

        // 更新展开按钮显示状态的函数
        const updateExpanderVisibility = () => {
            if (expanderLeft) {
                expanderLeft.style.display = sidebarLeft.classList.contains('collapsed') ? 'flex' : 'none';
            }
            if (expanderRight) {
                expanderRight.style.display = sidebarRight.classList.contains('collapsed') ? 'flex' : 'none';
            }
        };

        // 监听侧边栏类变化，同步更新展开按钮显示
        const observer = new MutationObserver(updateExpanderVisibility);
        observer.observe(sidebarLeft, { attributes: true, attributeFilter: ['class'] });
        observer.observe(sidebarRight, { attributes: true, attributeFilter: ['class'] });

        // 左侧边栏拖动
        resizerLeft.addEventListener('mousedown', (e) => {
            this.sidebarResizer.isResizingLeft = true;
            this.sidebarResizer.startX = e.clientX;
            this.sidebarResizer.startWidthLeft = sidebarLeft.offsetWidth;
            resizerLeft.classList.add('resizing');

            // 禁用文本选择
            document.body.style.userSelect = 'none';
        });

        // 右侧边栏拖动
        resizerRight.addEventListener('mousedown', (e) => {
            this.sidebarResizer.isResizingRight = true;
            this.sidebarResizer.startX = e.clientX;
            this.sidebarResizer.startWidthRight = sidebarRight.offsetWidth;
            resizerRight.classList.add('resizing');

            // 禁用文本选择
            document.body.style.userSelect = 'none';
        });

        // 鼠标移动事件
        document.addEventListener('mousemove', (e) => {
            // 处理左侧边栏拖动
            if (this.sidebarResizer.isResizingLeft) {
                const deltaX = e.clientX - this.sidebarResizer.startX;
                const newWidth = this.sidebarResizer.startWidthLeft + deltaX;

                // 限制宽度范围
                const clampedWidth = Math.max(
                    this.sidebarResizer.minWidth,
                    Math.min(this.sidebarResizer.maxWidth, newWidth)
                );

                sidebarLeft.style.width = clampedWidth + 'px';

                // 检查是否需要隐藏
                if (clampedWidth <= this.sidebarResizer.minWidth) {
                    sidebarLeft.classList.add('collapsed');
                } else {
                    sidebarLeft.classList.remove('collapsed');
                }
            }

            // 处理右侧边栏拖动
            if (this.sidebarResizer.isResizingRight) {
                const deltaX = this.sidebarResizer.startX - e.clientX;
                const newWidth = this.sidebarResizer.startWidthRight + deltaX;

                // 限制宽度范围
                const clampedWidth = Math.max(
                    this.sidebarResizer.minWidth,
                    Math.min(this.sidebarResizer.maxWidth, newWidth)
                );

                sidebarRight.style.width = clampedWidth + 'px';

                // 检查是否需要隐藏
                if (clampedWidth <= this.sidebarResizer.minWidth) {
                    sidebarRight.classList.add('collapsed');
                } else {
                    sidebarRight.classList.remove('collapsed');
                }
            }
        });

        // 鼠标释放事件
        document.addEventListener('mouseup', () => {
            if (this.sidebarResizer.isResizingLeft) {
                this.sidebarResizer.isResizingLeft = false;
                resizerLeft.classList.remove('resizing');
                document.body.style.userSelect = '';
            }

            if (this.sidebarResizer.isResizingRight) {
                this.sidebarResizer.isResizingRight = false;
                resizerRight.classList.remove('resizing');
                document.body.style.userSelect = '';
            }
        });

        // 左侧展开按钮
        if (expanderLeft) {
            expanderLeft.addEventListener('click', () => {
                sidebarLeft.classList.remove('collapsed');
                sidebarLeft.style.width = '180px'; // 恢复默认宽度
            });
        }

        // 右侧展开按钮
        if (expanderRight) {
            expanderRight.addEventListener('click', () => {
                sidebarRight.classList.remove('collapsed');
                sidebarRight.style.width = '280px'; // 恢复默认宽度
            });
        }
    },

    // 主题切换（下拉菜单 + 悬浮预览 + 点击确认）
    initThemeToggle() {
        const STORAGE_KEY = 'canvasEditor_theme';
        const dropdown = document.getElementById('themeDropdown');
        const menu = document.getElementById('themeDropdownMenu');
        const themeBtn = document.getElementById('themeToggleBtn');
        if (!dropdown || !menu || !themeBtn) return;

        // 状态：currentTheme = 真正保存的主题，previewTheme = 悬浮预览的主题
        let currentTheme = localStorage.getItem(STORAGE_KEY) || 'dark';
        let previewTheme = null;
        let isMenuOpen = false;

        const iconMap = {
            'dark': 'fas fa-sun',
            'light': 'fas fa-moon',
            'classic': 'fas fa-th-large',
            'ocean': 'fas fa-water',
            'forest': 'fas fa-tree',
            'sunset': 'fas fa-cloud-sun',
            'nord': 'fas fa-snowflake'
        };

        // 更新选中标记（始终反映 currentTheme）
        function updateActiveMark() {
            const items = menu.querySelectorAll('.theme-dropdown-item');
            items.forEach(item => {
                const t = item.getAttribute('data-theme');
                item.classList.toggle('active', t === currentTheme);
            });
        }

        // 应用主题到 DOM（按钮图标始终反映 currentTheme）
        function applyThemeToDOM(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            const icon = themeBtn.querySelector('i');
            if (icon) {
                icon.className = iconMap[currentTheme] || 'fas fa-sun';
            }
        }

        // 打开菜单
        function openMenu() {
            isMenuOpen = true;
            menu.classList.add('open');
            updateActiveMark();
        }

        // 关闭菜单并恢复到真正的主题
        function closeMenu() {
            isMenuOpen = false;
            menu.classList.remove('open');
            previewTheme = null;
            // 恢复到真正的主题
            applyThemeToDOM(currentTheme);
        }

        // 初始化主题
        applyThemeToDOM(currentTheme);
        updateActiveMark();

        // 点击按钮 → 切换菜单
        themeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isMenuOpen) {
                closeMenu();
            } else {
                openMenu();
            }
        });

        // 菜单项交互：悬浮预览 + 点击确认
        menu.querySelectorAll('.theme-dropdown-item').forEach(item => {
            // 悬浮 → 临时预览该主题
            item.addEventListener('mouseenter', () => {
                const t = item.getAttribute('data-theme');
                previewTheme = t;
                applyThemeToDOM(t);
            });

            // 移开 → 恢复到真正的主题
            item.addEventListener('mouseleave', () => {
                previewTheme = null;
                applyThemeToDOM(currentTheme);
            });

            // 点击 → 真正切换并保存
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const t = item.getAttribute('data-theme');
                currentTheme = t;
                previewTheme = null;
                localStorage.setItem(STORAGE_KEY, t);
                applyThemeToDOM(t);
                updateActiveMark();
                closeMenu();
            });
        });

        // 点击页面其他区域 → 关闭菜单
        document.addEventListener('click', (e) => {
            if (isMenuOpen && !dropdown.contains(e.target)) {
                closeMenu();
            }
        });

        // ESC → 关闭菜单
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isMenuOpen) {
                closeMenu();
            }
        });
    },

    applyTheme(theme) {
        // 保留兼容性，供外部调用
        document.documentElement.setAttribute('data-theme', theme);
    }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    CanvasEditor.init();
});