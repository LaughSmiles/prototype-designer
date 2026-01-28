// 工具系统模块
// 负责箭头、文字等工具的切换和操作

const Tools = {
    // 当前工具
    currentTool: 'select',

    // 箭头工具状态
    arrowState: {
        points: [],  // 存储所有拐点
        isDrawing: false
    },

    // 卡片注释工具状态
    noteState: {
        isAdding: false
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
            this.removeArrowPreview();
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
        this.noteState = { isAdding: false };

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
            } else if (tool === 'note') {
                canvasWrapper.style.cursor = 'cell';  // 卡片注释工具
            }
        }

        // 显示提示
        const toolNames = {
            'select': '选择工具',
            'arrow': '箭头工具',
            'note': '卡片注释'
        };
        PageLibrary.showHint(`切换到: ${toolNames[tool]}`);
    },

    // 设置画布事件
    setupCanvasEvents() {
        const canvasWrapper = document.getElementById('canvasWrapper');
        if (!canvasWrapper) return;

        // 点击事件（用于箭头和卡片注释工具）
        // 关键修复：在canvas-wrapper上监听,而不是canvas
        // 这样可以避免iframe拦截事件,确保工具在iframe上方也能正常工作
        canvasWrapper.addEventListener('click', (e) => {
            // 只在选择工具模式下才防止点击元素时触发
            // 工具模式(箭头/注释)需要在元素上方也能正常工作
            if (this.currentTool === 'select' && e.target.closest('.canvas-element')) {
                return;
            }

            if (this.currentTool === 'arrow') {
                this.handleArrowClick(e);
            } else if (this.currentTool === 'note') {
                this.handleNoteClick(e);
            }
        });

        // 鼠标移动（用于箭头预览）
        // 也在canvas-wrapper上监听,确保箭头预览在iframe上方正常工作
        canvasWrapper.addEventListener('mousemove', (e) => {
            if (this.currentTool === 'arrow' && this.arrowState.isDrawing) {
                this.updateArrowPreview(e);
            }
        });

        // 右键事件（用于完成箭头绘制）
        // 也在canvas-wrapper上监听,确保右键完成在iframe上方正常工作
        canvasWrapper.addEventListener('contextmenu', (e) => {
            if (this.currentTool === 'arrow' && this.arrowState.isDrawing) {
                e.preventDefault();  // 阻止默认右键菜单
                this.handleArrowRightClick(e);
            }
        });
    },

    // 处理箭头左键点击（添加拐点）
    handleArrowClick(e) {
        const canvasWrapper = document.getElementById('canvasWrapper');
        if (!canvasWrapper) return;

        const wrapperRect = canvasWrapper.getBoundingClientRect();
        const view = CanvasView.getView();

        // 计算画布内部坐标（考虑pan和zoom）
        const x = (e.clientX - wrapperRect.left - view.pan.x) / view.zoom;
        const y = (e.clientY - wrapperRect.top - view.pan.y) / view.zoom;

        if (!this.arrowState.isDrawing) {
            // 第一个点：开始绘制
            this.arrowState.points = [{ x, y }];
            this.arrowState.isDrawing = true;

            // 临时禁用所有iframe的交互，防止绘制时触发iframe滚动
            const iframes = document.querySelectorAll('.canvas-element.page-element iframe');
            iframes.forEach(iframe => {
                iframe.style.pointerEvents = 'none';
            });

            // 创建临时预览线
            this.createArrowPreview();

            PageLibrary.showHint('左键继续添加拐点，右键完成');
        } else {
            // 后续拐点
            this.arrowState.points.push({ x, y });
        }
    },

    // 处理箭头右键点击（完成绘制）
    handleArrowRightClick(e) {
        const canvasWrapper = document.getElementById('canvasWrapper');
        if (!canvasWrapper) return;

        const wrapperRect = canvasWrapper.getBoundingClientRect();
        const view = CanvasView.getView();

        // 计算画布内部坐标（考虑pan和zoom）
        const x = (e.clientX - wrapperRect.left - view.pan.x) / view.zoom;
        const y = (e.clientY - wrapperRect.top - view.pan.y) / view.zoom;

        // 添加最后一个点
        this.arrowState.points.push({ x, y });

        // 创建箭头元素
        ElementManager.addArrowElement(this.arrowState.points);

        // 恢复所有iframe的交互
        const iframes = document.querySelectorAll('.canvas-element.page-element iframe');
        iframes.forEach(iframe => {
            iframe.style.pointerEvents = 'auto';
        });

        // 重置状态
        this.arrowState.points = [];
        this.arrowState.isDrawing = false;
        this.removeArrowPreview();

        // 切换回选择工具
        this.setTool('select');
        PageLibrary.showHint('箭头已添加');
    },

    // 创建箭头预览
    createArrowPreview() {
        const canvas = document.getElementById('canvas');
        const preview = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        preview.id = 'arrowPreview';
        preview.style.position = 'absolute';
        preview.style.pointerEvents = 'none';
        preview.style.zIndex = '999';
        preview.style.overflow = 'visible';
        canvas.appendChild(preview);
    },

    // 更新箭头预览
    updateArrowPreview(e) {
        const canvas = document.getElementById('canvas');
        const canvasWrapper = document.getElementById('canvasWrapper');
        if (!canvas || !canvasWrapper) return;

        const wrapperRect = canvasWrapper.getBoundingClientRect();
        const view = CanvasView.getView();

        // 关键修复：需要考虑canvas的变换
        // 1. 先计算鼠标相对于canvasWrapper的坐标
        const mouseXInWrapper = e.clientX - wrapperRect.left;
        const mouseYInWrapper = e.clientY - wrapperRect.top;

        // 2. 转换为画布内部坐标（考虑pan和zoom）
        // 画布内部坐标 = (鼠标在wrapper中的坐标 - pan偏移) / 缩放比例
        const mouseX = (mouseXInWrapper - view.pan.x) / view.zoom;
        const mouseY = (mouseYInWrapper - view.pan.y) / view.zoom;

        const points = this.arrowState.points;
        if (points.length === 0) return;

        // 所有要绘制的点（包括鼠标当前位置）
        const allPoints = [...points, { x: mouseX, y: mouseY }];

        const preview = document.getElementById('arrowPreview');
        if (!preview) return;

        // 计算SVG边界
        const allX = allPoints.map(p => p.x);
        const allY = allPoints.map(p => p.y);

        const minX = Math.min(...allX);
        const minY = Math.min(...allY);
        const maxX = Math.max(...allX);
        const maxY = Math.max(...allY);

        const padding = 50;

        // 使用画布坐标直接定位（因为preview是canvas的子元素）
        preview.style.left = `${minX - padding}px`;
        preview.style.top = `${minY - padding}px`;
        preview.style.width = `${maxX - minX + padding * 2}px`;
        preview.style.height = `${maxY - minY + padding * 2}px`;
        preview.setAttribute('viewBox', `${-padding} ${-padding} ${maxX - minX + padding * 2} ${maxY - minY + padding * 2}`);

        // 绘制预览路径
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const pathData = this.generateArrowPath(allPoints, minX, minY);

        preview.innerHTML = '';
        path.setAttribute('d', pathData);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', '#e74c3c');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('stroke-dasharray', '5,5');
        preview.appendChild(path);
    },

    // 生成箭头路径（全部使用直线）
    generateArrowPath(points, offsetX, offsetY) {
        if (points.length < 2) return '';

        // 所有点之间都使用直线
        let path = '';
        path += `M ${points[0].x - offsetX} ${points[0].y - offsetY}`;

        for (let i = 1; i < points.length; i++) {
            const x = points[i].x - offsetX;
            const y = points[i].y - offsetY;
            path += ` L ${x} ${y}`;
        }

        return path;
    },

    // 移除箭头预览
    removeArrowPreview() {
        const preview = document.getElementById('arrowPreview');
        if (preview) {
            preview.remove();
        }
    },

    // 处理卡片注释点击
    handleNoteClick(e) {
        const canvasWrapper = document.getElementById('canvasWrapper');
        if (!canvasWrapper) return;

        const wrapperRect = canvasWrapper.getBoundingClientRect();
        const view = CanvasView.getView();

        // 计算画布内部坐标（考虑pan和zoom）
        const x = (e.clientX - wrapperRect.left - view.pan.x) / view.zoom;
        const y = (e.clientY - wrapperRect.top - view.pan.y) / view.zoom;

        // 临时禁用所有iframe的交互，防止点击时触发iframe事件
        const iframes = document.querySelectorAll('.canvas-element.page-element iframe');
        iframes.forEach(iframe => {
            iframe.style.pointerEvents = 'none';
        });

        // 直接创建空白卡片,不需要弹窗
        const elementId = ElementManager.addNoteElement('', x, y);

        // 自动聚焦到内容区域并选中文字,同时恢复iframe交互
        setTimeout(() => {
            ElementManager.focusNoteContent(elementId);

            // 恢复所有iframe的交互
            const iframes = document.querySelectorAll('.canvas-element.page-element iframe');
            iframes.forEach(iframe => {
                iframe.style.pointerEvents = 'auto';
            });
        }, 0);

        // 切换回选择工具
        this.setTool('select');
        PageLibrary.showHint('卡片注释已添加,可直接输入内容');
    },

    // 获取当前工具
    getCurrentTool() {
        return this.currentTool;
    }
};