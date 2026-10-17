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

    // ================================================================
    // 页面自适应高度 → 锚点缓存重算（修「position:fixed 的元素没有锚点」）
    // ================================================================
    //
    // ⚠️ 根因：锚点内部宿主缓存的键 `${id}@${declaredW}x${declaredH}` 只含**声明**尺寸，
    //    而自适应只写 div.style.height，声明尺寸永远不变 → 缓存永不失效。
    //    而 iframe 里的 `position:fixed` 元素（移动端 tabbar、pc 顶栏、toast）
    //    锚点是**相对 iframe 视口**计算的：首次预热时 iframe 还只有一屏高，
    //    缓存下来的 tabbar 停在 y=843；自适应把 iframe 撑到 1699 后，
    //    它其实已经在 y=1777 —— 偏差 934px，锚点全部落到鼠标够不到的地方。
    //
    // 对策：实测高度**真的变了**就丢掉该元素的内部宿主缓存并重新预热。
    // 去抖是因为 page-autofit.js 在内容稳定前会连着报好几次（ResizeObserver + rAF）。

    /** @type {Object<string, number>} elementId -> 定时器 id */
    _anchorRefreshTimers: Object.create(null),

    /** 自适应尺寸变化后重算某页面元素的内部锚点宿主（去抖） */
    scheduleAnchorRefresh(elementId, iframeEl) {
        if (!elementId || typeof AnchorSession === 'undefined') return;

        const prevTimer = this._anchorRefreshTimers[elementId];
        if (prevTimer) clearTimeout(prevTimer);

        this._anchorRefreshTimers[elementId] = setTimeout(() => {
            delete this._anchorRefreshTimers[elementId];
            if (!iframeEl || !iframeEl.isConnected) return;

            AnchorSession.invalidate(elementId);

            const el = (typeof ElementManager !== 'undefined' && ElementManager.getElement)
                ? ElementManager.getElement(elementId) : null;
            if (!el) return;

            AnchorSession.primeInnerHosts(el, iframeEl, () => {
                // 只有用户此刻正悬停在这个元素上才补绘，否则下一帧画布本就无锚点
                const hovering = typeof ToolsConnector !== 'undefined'
                    && ToolsConnector.hoverElementId === elementId;
                if (hovering && typeof ElementManager !== 'undefined' && ElementManager.renderAnchors) {
                    ElementManager.renderAnchors([elementId], ToolsConnector.state && ToolsConnector.state.cursor);
                }
            });
        }, 120);
    },

    // 初始化
    init() {
        const projectName = this.getProjectName();
        Debug.log(`🎨 ${projectName}画布编辑器正在初始化...`);

        // 按顺序初始化各模块
        this.initModules()
            .then(() => {
                Debug.log('✅ 所有模块初始化完成');
                this.showWelcome();
            })
            .catch(error => {
                Debug.error('❌ 初始化失败:', error);
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
            Debug.log('✅ 页面库初始化完成');

            // 2. 画布视图
            CanvasView.init();
            Debug.log('✅ 画布视图初始化完成');

            // 3. 元素管理
            ElementManager.init();
            Debug.log('✅ 元素管理初始化完成');

            // 4. 工具系统
            Tools.init();
            Debug.log('✅ 工具系统初始化完成');

            // 5. 弹窗管理器
            ModalManager.init();
            Debug.log('✅ 弹窗管理器初始化完成');

            // 6. 数据持久化 (必须在页面库之后,因为恢复数据需要页面信息)
            Storage.init();
            Debug.log('✅ 数据持久化初始化完成');

            // 7. 页面管理器 (必须在Storage之后,因为需要加载数据)
            PageManager.init();
            Debug.log('✅ 页面管理器初始化完成');

            // 8. 历史记录管理器
            HistoryManager.init();
            Debug.log('✅ 历史记录管理器初始化完成');

            // 9. 初始化侧边栏拖动功能
            this.initSidebarResizer();
            Debug.log('✅ 侧边栏拖动功能初始化完成');

            // 10. 初始化主题切换
            this.initThemeToggle();
            Debug.log('✅ 主题切换功能初始化完成');

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

            // Ctrl+E: 导出 JSON（与顶部按钮一致）
            if (e.ctrlKey && e.key === 'e') {
                e.preventDefault();
                Storage.export();
            }

            // Ctrl+I: 导入 JSON（与顶部按钮一致）
            if (e.ctrlKey && e.key === 'i') {
                e.preventDefault();
                const fileInput = document.getElementById('fileInput');
                if (fileInput) fileInput.click();
            }
        }, true); // 捕获阶段，优先于浏览器默认行为（全屏下也能拦截）

        // 监听 iframe 内页面发来的两类消息
        //   ① canvas-save        —— 页面全屏时拦截 Ctrl+S，转交给画布保存
        //   ② proto-page-height  —— 页面报告真实内容高度（见 js/page-autofit.js）
        window.addEventListener('message', (e) => {
            const data = e.data;
            if (!data) return;

            if (data.type === 'canvas-save') {
                Storage.save();
                return;
            }

            if (data.type === 'proto-page-height') {
                // key 形如 proto-canvas-<elementId>，由 element-renderer 写进 iframe.name
                const height = Math.round(Number(data.height));
                const width = Math.round(Number(data.width));
                if (!data.key || !isFinite(height) || height <= 0 || height > 30000) return;
                if (!isFinite(width) || width <= 0 || width > 12000) return;

                let iframe = null;
                const named = document.querySelectorAll('iframe[name]');
                for (let i = 0; i < named.length; i++) {
                    if (named[i].name === data.key) { iframe = named[i]; break; }
                }
                if (!iframe) return;

                const div = iframe.closest('.canvas-element');
                if (!div) return;

                // 只写样式，不改 element.width/height：自适应是渲染表现，不是画布数据
                const elementId = div.dataset.elementId;
                const prev = window.ProtoAutoFit._cache[elementId];
                window.ProtoAutoFit.remember(elementId, { h: height, w: width });
                window.ProtoAutoFit.apply(elementId, div);

                // 收到高度 = 这个框量完了。若它此前因为「高度未知」被藏着
                // （该页面有史以来第一次出现），现在让它以完整高度显形。
                // ⚠️ 必须放在 apply 之后 —— 先显形再改高度就会露出那一下跳变。
                window.ProtoAutoFit.reveal(elementId);

                if (window.Debug) Debug.log('[autofit] 页面框尺寸 →', width + '×' + height, div.dataset.elementId);

                // 实测高度真的变了 → iframe 视口变了 → 内部宿主几何全部作废。
                // ⚠️ 必须比较**实测高度**：这是 fixed 元素锚点唯一的失效信号
                //    （声明尺寸不变，缓存键永远不会失效）。
                if (!prev || prev.h !== height || prev.w !== width) {
                    this.scheduleAnchorRefresh(elementId, iframe);
                }
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

        Debug.log(message);
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
            Debug.warn('侧边栏拖动功能初始化失败：找不到必要元素');
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

    // 主题切换（点击切换 dark / light）
    initThemeToggle() {
        const STORAGE_KEY = 'canvasEditor_theme';
        const themeBtn = document.getElementById('themeToggleBtn');
        if (!themeBtn) return;

        const iconMap = {
            'dark': 'fas fa-sun',
            'light': 'fas fa-moon'
        };

        const iconStyleMap = {
            'dark': '#e74c3c',
            'light': '#3498db'
        };

        // ⚠️ 默认改成 light（白）。canvas-editor.html 的 <html> 上也写死了
        //    data-theme="light" —— 两处必须一致，否则首帧会闪一下暗色。
        //    用户手动切过的选择仍然优先（读得到 localStorage 就用它）。
        let currentTheme = localStorage.getItem(STORAGE_KEY) || 'light';
        // 兼容旧的 classic 值
        if (currentTheme === 'classic') currentTheme = 'light';

        function applyTheme(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            const icon = themeBtn.querySelector('i');
            if (icon) {
                icon.className = iconMap[theme] || 'fas fa-sun';
                icon.style.color = iconStyleMap[theme] || '';
            }
            themeBtn.title = theme === 'dark' ? '切换到亮色主题' : '切换到暗色主题';
        }

        // 初始化
        applyTheme(currentTheme);

        // 点击切换
        themeBtn.addEventListener('click', () => {
            currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
            localStorage.setItem(STORAGE_KEY, currentTheme);
            applyTheme(currentTheme);
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