// 画布视图操作模块
// 负责视图的拖动、缩放等操作

const CanvasView = {
    // 视图状态
    state: {
        zoom: 1.0,
        pan: { x: 0, y: 0 }
    },

    // 拖拽状态
    isPanning: false,
    startPan: { x: 0, y: 0 },

    // 元素拖拽状态
    isDraggingElement: false,
    draggedElement: null,
    dragStart: { x: 0, y: 0 },

    // 缩放限制
    MIN_ZOOM: 0.1,
    MAX_ZOOM: 5.0,

    // 初始化
    init() {
        this.setupEventListeners();
        this.updateView();
    },

    // 获取当前视图状态
    getView() {
        return { ...this.state };
    },

    // 设置视图状态
    setView(zoom, pan) {
        this.state.zoom = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, zoom));
        this.state.pan = { ...pan };
        this.updateView();
        this.updateZoomDisplay();
    },

    // 设置事件监听器
    setupEventListeners() {
        const canvasWrapper = document.getElementById('canvasWrapper');
        const canvas = document.getElementById('canvas');

        if (!canvasWrapper || !canvas) return;

        // 鼠标滚轮事件（视图拖动 + 缩放）
        canvasWrapper.addEventListener('wheel', (e) => {
            e.preventDefault();

            if (e.ctrlKey) {
                // Ctrl + 滚轮：缩放视图
                this.zoomAtPoint(e.clientX, e.clientY, e.deltaY > 0 ? 0.9 : 1.1);
            } else {
                // 普通滚轮：拖动视图
                this.state.pan.x -= e.deltaX;
                this.state.pan.y -= e.deltaY;
                this.updateView();
            }
        }, { passive: false });

        // 鼠标按下（开始拖动视图或元素）
        canvasWrapper.addEventListener('mousedown', (e) => {
            // 检查是否点击了元素
            const targetElement = e.target.closest('.canvas-element');

            if (targetElement) {
                // 选中元素
                ElementManager.selectElement(targetElement.dataset.elementId);

                // 检查是否点击了调整大小手柄
                if (e.target.classList.contains('resize-handle')) {
                    this.isResizingElement = true;
                    this.resizedElement = targetElement;
                    this.resizeStart = { x: e.clientX, y: e.clientY };
                    this.resizeStartSize = {
                        width: parseFloat(targetElement.style.width),
                        height: parseFloat(targetElement.style.height)
                    };
                    return;
                }

                // 开始拖拽元素
                if (e.button === 0) {
                    this.isDraggingElement = true;
                    this.draggedElement = targetElement;

                    const rect = targetElement.getBoundingClientRect();
                    const canvasRect = canvas.getBoundingClientRect();

                    // 计算鼠标相对于元素左上角的偏移
                    this.elementOffset = {
                        x: (e.clientX - rect.left) / this.state.zoom,
                        y: (e.clientY - rect.top) / this.state.zoom
                    };
                }
            } else if (e.button === 1) {
                // 中键（且未点击元素）：拖动视图
                this.isPanning = true;
                this.startPan = { x: e.clientX, y: e.clientY };
                canvasWrapper.classList.add('grabbing');
            }
        });

        // 鼠标移动
        document.addEventListener('mousemove', (e) => {
            // 更新鼠标位置显示
            this.updateMousePosition(e);

            if (this.isPanning) {
                // 拖动视图
                const dx = e.clientX - this.startPan.x;
                const dy = e.clientY - this.startPan.y;
                this.state.pan.x += dx;
                this.state.pan.y += dy;
                this.startPan = { x: e.clientX, y: e.clientY };
                this.updateView();
            } else if (this.isDraggingElement && this.draggedElement) {
                // 拖动元素
                const dx = e.movementX / this.state.zoom;
                const dy = e.movementY / this.state.zoom;

                const element = ElementManager.getElement(this.draggedElement.dataset.elementId);
                if (element) {
                    element.position.x += dx;
                    element.position.y += dy;
                    ElementManager.updateElementPosition(this.draggedElement, element);
                }
            } else if (this.isResizingElement && this.resizedElement) {
                // 调整元素大小
                const dx = (e.clientX - this.resizeStart.x) / this.state.zoom;
                const dy = (e.clientY - this.resizeStart.y) / this.state.zoom;

                const element = ElementManager.getElement(this.resizedElement.dataset.elementId);
                if (element && element.type === 'page') {
                    // 等比缩放
                    const newWidth = this.resizeStartSize.width + dx;
                    const scale = newWidth / element.originalWidth;

                    element.width = newWidth;
                    element.height = element.originalHeight * scale;
                    element.scale = scale;

                    ElementManager.updateElementSize(this.resizedElement, element);
                }
            }
        });

        // 鼠标释放
        document.addEventListener('mouseup', () => {
            if (this.isPanning) {
                this.isPanning = false;
                canvasWrapper.classList.remove('grabbing');
            }
            if (this.isDraggingElement) {
                this.isDraggingElement = false;
                this.draggedElement = null;
            }
            if (this.isResizingElement) {
                this.isResizingElement = false;
                this.resizedElement = null;
            }
        });

        // 元素上的滚轮事件（缩放元素）
        canvasWrapper.addEventListener('wheel', (e) => {
            const targetElement = e.target.closest('.canvas-element');
            if (targetElement && e.ctrlKey) {
                e.preventDefault();
                const element = ElementManager.getElement(targetElement.dataset.elementId);
                if (element) {
                    const delta = e.deltaY > 0 ? 0.9 : 1.1;
                    const newScale = Math.max(0.1, Math.min(3, element.scale * delta));

                    // 等比缩放
                    element.scale = newScale;
                    element.width = element.originalWidth * newScale;
                    element.height = element.originalHeight * newScale;

                    ElementManager.updateElementSize(targetElement, element);
                    this.showHint(`缩放: ${Math.round(newScale * 100)}%`);
                }
            }
        }, { passive: false });
    },

    // 在指定点缩放
    zoomAtPoint(clientX, clientY, factor) {
        const canvasWrapper = document.getElementById('canvasWrapper');
        const rect = canvasWrapper.getBoundingClientRect();

        // 计算相对于画布的坐标
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        // 新的缩放值
        const newZoom = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, this.state.zoom * factor));

        // 调整平移以保持鼠标位置不变
        const scaleChange = newZoom / this.state.zoom;
        this.state.pan.x = x - (x - this.state.pan.x) * scaleChange;
        this.state.pan.y = y - (y - this.state.pan.y) * scaleChange;

        this.state.zoom = newZoom;
        this.updateView();
        this.updateZoomDisplay();
    },

    // 更新视图变换
    updateView() {
        const canvas = document.getElementById('canvas');
        if (canvas) {
            canvas.style.transform = `translate(${this.state.pan.x}px, ${this.state.pan.y}px) scale(${this.state.zoom})`;
        }
    },

    // 更新缩放显示
    updateZoomDisplay() {
        const display = document.getElementById('zoomDisplay');
        if (display) {
            display.textContent = `${Math.round(this.state.zoom * 100)}%`;
        }
    },

    // 更新鼠标位置显示
    updateMousePosition(e) {
        const canvas = document.getElementById('canvas');
        const display = document.getElementById('mousePos');

        if (!canvas || !display) return;

        const rect = canvas.getBoundingClientRect();
        const x = Math.round((e.clientX - rect.left - this.state.pan.x) / this.state.zoom);
        const y = Math.round((e.clientY - rect.top - this.state.pan.y) / this.state.zoom);

        display.textContent = `X: ${x}, Y: ${y}`;
    },

    // 缩放控制按钮
    zoomIn() {
        this.state.zoom = Math.min(this.MAX_ZOOM, this.state.zoom * 1.2);
        this.updateView();
        this.updateZoomDisplay();
    },

    zoomOut() {
        this.state.zoom = Math.max(this.MIN_ZOOM, this.state.zoom / 1.2);
        this.updateView();
        this.updateZoomDisplay();
    },

    zoomReset() {
        this.state.zoom = 1.0;
        this.state.pan = { x: 0, y: 0 };
        this.updateView();
        this.updateZoomDisplay();
    },

    // 显示临时提示
    showHint(message) {
        const existing = document.querySelector('.temp-hint');
        if (existing) existing.remove();

        const hint = document.createElement('div');
        hint.className = 'temp-hint';
        hint.textContent = message;
        document.body.appendChild(hint);

        setTimeout(() => hint.remove(), 1500);
    }
};