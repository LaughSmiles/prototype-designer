// 工具系统模块
// 负责箭头、文字等工具的切换和操作

const Tools = {
    // 当前工具
    currentTool: 'select',

    // 箭头工具状态
    arrowState: {
        startPoint: null,
        isDrawing: false
    },

    // 文字工具状态
    textState: {
        isAdding: false
    },

    // 初始化
    init() {
        this.setupToolButtons();
        this.setupCanvasEvents();
    },

    // 设置工具按钮
    setupToolButtons() {
        const buttons = document.querySelectorAll('.tool-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tool = btn.dataset.tool;
                this.setTool(tool);
            });
        });
    },

    // 设置当前工具
    setTool(tool) {
        // 更新状态
        this.currentTool = tool;

        // 重置工具状态
        this.arrowState = { startPoint: null, isDrawing: false };
        this.textState = { isAdding: false };

        // 更新UI
        const buttons = document.querySelectorAll('.tool-btn');
        buttons.forEach(btn => {
            if (btn.dataset.tool === tool) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // 更新光标
        const canvasWrapper = document.getElementById('canvasWrapper');
        if (canvasWrapper) {
            if (tool === 'select') {
                canvasWrapper.style.cursor = 'grab';
            } else if (tool === 'arrow') {
                canvasWrapper.style.cursor = 'crosshair';
            } else if (tool === 'text') {
                canvasWrapper.style.cursor = 'text';
            }
        }

        // 显示提示
        const toolNames = {
            'select': '选择工具',
            'arrow': '箭头工具',
            'text': '文字工具'
        };
        PageLibrary.showHint(`切换到: ${toolNames[tool]}`);
    },

    // 设置画布事件
    setupCanvasEvents() {
        const canvas = document.getElementById('canvas');
        if (!canvas) return;

        // 点击事件（用于箭头和文字工具）
        canvas.addEventListener('click', (e) => {
            // 防止点击到元素时触发
            if (e.target.closest('.canvas-element')) return;

            if (this.currentTool === 'arrow') {
                this.handleArrowClick(e);
            } else if (this.currentTool === 'text') {
                this.handleTextClick(e);
            }
        });

        // 鼠标移动（用于箭头预览）
        canvas.addEventListener('mousemove', (e) => {
            if (this.currentTool === 'arrow' && this.arrowState.isDrawing) {
                this.updateArrowPreview(e);
            }
        });
    },

    // 处理箭头点击
    handleArrowClick(e) {
        const canvas = document.getElementById('canvas');
        const rect = canvas.getBoundingClientRect();
        const view = CanvasView.getView();

        const x = (e.clientX - rect.left - view.pan.x) / view.zoom;
        const y = (e.clientY - rect.top - view.pan.y) / view.zoom;

        if (!this.arrowState.startPoint) {
            // 第一点
            this.arrowState.startPoint = { x, y };
            this.arrowState.isDrawing = true;

            // 创建临时预览线
            this.createArrowPreview();

        } else {
            // 第二点，完成箭头
            const endPoint = { x, y };
            ElementManager.addArrowElement(this.arrowState.startPoint, endPoint);

            // 重置状态
            this.arrowState.startPoint = null;
            this.arrowState.isDrawing = false;
            this.removeArrowPreview();

            PageLibrary.showHint('箭头已添加');
        }
    },

    // 创建箭头预览
    createArrowPreview() {
        const canvas = document.getElementById('canvas');
        const preview = document.createElement('div');
        preview.id = 'arrowPreview';
        preview.style.position = 'absolute';
        preview.style.pointerEvents = 'none';
        preview.style.zIndex = '999';
        preview.style.borderTop = '2px dashed #e74c3c';
        preview.style.transformOrigin = '0 0';
        canvas.appendChild(preview);
    },

    // 更新箭头预览
    updateArrowPreview(e) {
        const canvas = document.getElementById('canvas');
        const rect = canvas.getBoundingClientRect();
        const view = CanvasView.getView();

        const x = (e.clientX - rect.left - view.pan.x) / view.zoom;
        const y = (e.clientY - rect.top - view.pan.y) / view.zoom;

        const start = this.arrowState.startPoint;
        const preview = document.getElementById('arrowPreview');

        if (preview && start) {
            const dx = x - start.x;
            const dy = y - start.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;

            preview.style.left = `${start.x}px`;
            preview.style.top = `${start.y}px`;
            preview.style.width = `${length}px`;
            preview.style.transform = `rotate(${angle}deg)`;
        }
    },

    // 移除箭头预览
    removeArrowPreview() {
        const preview = document.getElementById('arrowPreview');
        if (preview) {
            preview.remove();
        }
    },

    // 处理文字点击
    handleTextClick(e) {
        const canvas = document.getElementById('canvas');
        const rect = canvas.getBoundingClientRect();
        const view = CanvasView.getView();

        const x = (e.clientX - rect.left - view.pan.x) / view.zoom;
        const y = (e.clientY - rect.top - view.pan.y) / view.zoom;

        // 弹出输入框
        const text = prompt('请输入文字内容：');
        if (text && text.trim()) {
            ElementManager.addTextElement(text.trim(), x, y);
            PageLibrary.showHint('文字已添加');
        }

        // 切换回选择工具
        this.setTool('select');
    },

    // 获取当前工具
    getCurrentTool() {
        return this.currentTool;
    }
};