// 画布编辑器主控制器
// 负责初始化所有模块和协调各模块工作

const CanvasEditor = {
    // 初始化
    async init() {
        const projectName = await this.getProjectName();
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

    // 获取项目名称
    async getProjectName() {
        try {
            const response = await fetch('project-config.json');
            const config = await response.json();
            return config.projectName || '画布编辑器';
        } catch (error) {
            return '画布编辑器';
        }
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

            // 9. 绑定全局快捷键
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
    async showWelcome() {
        const projectName = await this.getProjectName();
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
    }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    CanvasEditor.init();
});