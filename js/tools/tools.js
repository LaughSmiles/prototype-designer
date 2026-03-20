// 工具系统核心模块
// 负责工具切换和事件分发

const Tools = {
    // 当前工具
    currentTool: 'select',

    // 箭头工具状态
    arrowState: {
        points: [],  // 存储所有拐点
        isDrawing: false
    },

    // 批注标记工具状态
    annotationState: {
    },

    // 初始化
    init() {
        this.setupToolButtons();
        this.setupCanvasEvents();
    },

    // 设置工具按钮
    setupToolButtons() {
        const buttons = document.querySelectorAll('.tool-icon-btn');
        buttons.forEach(btn => {
            const tool = btn.dataset.tool;
            if (tool) {
                btn.addEventListener('click', () => {
                    this.setTool(tool);
                });
            }
        });
    },

    // 设置当前工具
    setTool(tool) {
        // 如果正在绘制箭头时切换工具,需要先清理状态并恢复iframe
        if (this.arrowState.isDrawing) {
            ToolsArrow.removeArrowPreview();
            this.arrowState.points = [];
            this.arrowState.isDrawing = false;

            // 恢复所有iframe的交互
            const iframes = document.querySelectorAll('.canvas-element.page-element iframe');
            iframes.forEach(iframe => {
                iframe.style.pointerEvents = 'auto';
            });
        }

        // 更新状态
        this.currentTool = tool;

        // 重置工具状态
        this.arrowState = { points: [], isDrawing: false };
        this.annotationState = { };

        // 更新UI
        const buttons = document.querySelectorAll('.tool-icon-btn');
        buttons.forEach(btn => {
            const btnTool = btn.dataset.tool;
            if (btnTool && btnTool === tool) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // 更新光标
        const canvasWrapper = document.getElementById('canvasWrapper');
        if (canvasWrapper) {
            if (tool === 'select') {
                canvasWrapper.style.cursor = 'default';  // 空白区域显示箭头
            } else if (tool === 'arrow') {
                canvasWrapper.style.cursor = 'crosshair';
            } else if (tool === 'annotation') {
                canvasWrapper.style.cursor = 'text';  // 批注标记工具
            }
        }

        // 更新 iframe 交互状态
        // 箭头/批注工具需要禁用iframe交互，让点击穿透到canvasWrapper
        // 选择工具需要恢复iframe交互，允许用户与页面元素交互
        const iframes = document.querySelectorAll('.canvas-element.page-element iframe');
        if (tool === 'arrow' || tool === 'annotation') {
            iframes.forEach(iframe => {
                iframe.style.pointerEvents = 'none';
            });
        } else {
            iframes.forEach(iframe => {
                iframe.style.pointerEvents = 'auto';
            });
        }

        // 显示提示
        const toolNames = {
            'select': '选择工具',
            'arrow': '箭头工具',
            'annotation': '批注标记'
        };
        PageLibrary.showHint(`切换到: ${toolNames[tool]}`);
    },

    // 设置画布事件
    setupCanvasEvents() {
        const canvasWrapper = document.getElementById('canvasWrapper');
        if (!canvasWrapper) return;

        // 点击事件（用于箭头和批注标记工具）
        // 关键修复：在canvas-wrapper上监听,而不是canvas
        // 这样可以避免iframe拦截事件,确保工具在iframe上方也能正常工作
        canvasWrapper.addEventListener('click', (e) => {
            // 只在选择工具模式下才防止点击元素时触发
            // 工具模式(箭头/批注标记)需要在元素上方也能正常工作
            if (this.currentTool === 'select' && e.target.closest('.canvas-element')) {
                return;
            }

            if (this.currentTool === 'arrow') {
                ToolsArrow.handleClick(e);
            } else if (this.currentTool === 'annotation') {
                ToolsAnnotation.handleClick(e);
            }
        });

        // 鼠标移动（用于箭头预览）
        // 也在canvas-wrapper上监听,确保箭头预览在iframe上方正常工作
        canvasWrapper.addEventListener('mousemove', (e) => {
            if (this.currentTool === 'arrow' && this.arrowState.isDrawing) {
                ToolsArrow.updateArrowPreview(e);
            }
        });

        // 右键事件（用于完成箭头绘制）
        // 也在canvas-wrapper上监听,确保右键完成在iframe上方正常工作
        canvasWrapper.addEventListener('contextmenu', (e) => {
            if (this.currentTool === 'arrow' && this.arrowState.isDrawing) {
                e.preventDefault();  // 阻止默认右键菜单
                ToolsArrow.handleRightClick(e);
            }
        });
    },

    // 获取当前工具
    getCurrentTool() {
        return this.currentTool;
    }
};
