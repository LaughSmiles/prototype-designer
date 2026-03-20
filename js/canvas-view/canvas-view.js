// 画布视图操作模块
// 负责视图的拖动、缩放等操作

const CanvasView = {
    // 视图状态
    state: {
        zoom: 0.5,
        pan: { x: 0, y: 0 }
    },

    // 拖拽状态
    isPanning: false,
    startPan: { x: 0, y: 0 },

    // 元素拖拽状态
    isDraggingElement: false,
    draggedElement: null,
    elementOffset: null,

    // 对齐相关
    dragAlignments: [],
    allElementBounds: [],

    // 框选状态
    isBoxSelecting: false,
    boxSelectionStart: { x: 0, y: 0 },
    boxSelectionEnd: { x: 0, y: 0 },

    // 缩放限制
    MIN_ZOOM: 0.1,
    MAX_ZOOM: 5.0,

    // 虚拟滚动条
    virtualScrollbars: {
        vertical: null,
        horizontal: null
    },

    // 初始化
    init() {
        this.disableBrowserZoom();
        CanvasViewEvents.setupEventListeners();
        this.initVirtualScrollbars();
        this.centerCanvas();
        this.updateView();
    },

    // 初始化虚拟滚动条
    initVirtualScrollbars() {
        const wrapper = document.getElementById('canvasWrapper');
        if (!wrapper) return;

        const wrapperRect = wrapper.getBoundingClientRect();

        // 画布固定尺寸(不随zoom变化)
        const canvasWidth = 2000;
        const canvasHeight = 2000;

        // 初始化垂直滚动条
        this.virtualScrollbars.vertical = new VirtualScrollbar({
            orientation: 'vertical',
            viewportSize: wrapperRect.height,
            contentSize: canvasHeight,
            container: document.getElementById('verticalScrollbar')
        });

        this.virtualScrollbars.vertical.onScroll((position) => {
            this.state.pan.y = -position;
            this.updateView();
        });

        // 初始化水平滚动条
        this.virtualScrollbars.horizontal = new VirtualScrollbar({
            orientation: 'horizontal',
            viewportSize: wrapperRect.width,
            contentSize: canvasWidth,
            container: document.getElementById('horizontalScrollbar')
        });

        this.virtualScrollbars.horizontal.onScroll((position) => {
            this.state.pan.x = -position;
            this.updateView();
        });
    },

    // 将画布居中显示在视口中
    centerCanvas() {
        const canvasWrapper = document.getElementById('canvasWrapper');
        const canvas = document.getElementById('canvas');

        if (!canvasWrapper || !canvas) return;

        const wrapperRect = canvasWrapper.getBoundingClientRect();
        const wrapperWidth = wrapperRect.width;
        const wrapperHeight = wrapperRect.height;

        const canvasWidth = 2000;
        const canvasHeight = 2000;

        // 计算居中所需的平移偏移
        this.state.pan.x = (wrapperWidth - canvasWidth * this.state.zoom) / 2;
        this.state.pan.y = (wrapperHeight - canvasHeight * this.state.zoom) / 2;
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

    // 在指定点缩放
    zoomAtPoint(clientX, clientY, factor) {
        const canvasWrapper = document.getElementById('canvasWrapper');
        const rect = canvasWrapper.getBoundingClientRect();

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        const newZoom = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, this.state.zoom * factor));

        // 调整平移以保持鼠标位置不变
        const scaleChange = newZoom / this.state.zoom;
        this.state.pan.x = x - (x - this.state.pan.x) * scaleChange;
        this.state.pan.y = y - (y - this.state.pan.y) * scaleChange;

        this.state.zoom = newZoom;
        this.updateView();
        this.updateZoomDisplay();
        this.showZoomHint();
    },

    // 更新视图变换
    updateView() {
        const canvas = document.getElementById('canvas');
        if (canvas) {
            canvas.style.transform = `translate(${this.state.pan.x}px, ${this.state.pan.y}px) scale(${this.state.zoom})`;
        }

        this.updateScrollbars();
    },

    // 更新滚动条
    updateScrollbars() {
        if (!this.virtualScrollbars.vertical || !this.virtualScrollbars.horizontal) return;

        const wrapper = document.getElementById('canvasWrapper');
        if (!wrapper) return;

        const wrapperRect = wrapper.getBoundingClientRect();

        const canvasWidth = 2000;
        const canvasHeight = 2000;

        // 更新垂直滚动条
        const maxScrollY = Math.max(0, canvasHeight - wrapperRect.height);
        const scrollY = Math.max(0, Math.min(-this.state.pan.y, maxScrollY));

        this.virtualScrollbars.vertical.updateMetrics(canvasHeight, wrapperRect.height);
        this.virtualScrollbars.vertical.updatePosition(scrollY);

        // 更新水平滚动条
        const maxScrollX = Math.max(0, canvasWidth - wrapperRect.width);
        const scrollX = Math.max(0, Math.min(-this.state.pan.x, maxScrollX));

        this.virtualScrollbars.horizontal.updateMetrics(canvasWidth, wrapperRect.width);
        this.virtualScrollbars.horizontal.updatePosition(scrollX);
    },

    // 更新缩放显示
    updateZoomDisplay() {
        const display = document.getElementById('zoomDisplay');
        if (display) {
            display.textContent = `缩放: ${Math.round(this.state.zoom * 100)}%`;
        }
    },

    // 显示缩放临时提示
    showZoomHint() {
        const existing = document.querySelector('.zoom-hint');
        if (existing) existing.remove();

        const hint = document.createElement('div');
        hint.className = 'zoom-hint';
        hint.textContent = `${Math.round(this.state.zoom * 100)}%`;
        document.body.appendChild(hint);

        setTimeout(() => {
            if (hint.parentNode) {
                hint.remove();
            }
        }, 800);
    },

    // 重置到50%缩放并居中
    zoomReset50() {
        this.state.zoom = 0.5;
        this.centerCanvas();
        this.updateView();
        this.updateZoomDisplay();
        this.showZoomHint();
        this.updateMousePositionDisplay();
    },

    // 更新鼠标位置显示（不依赖事件对象）
    updateMousePositionDisplay() {
        const canvasWrapper = document.getElementById('canvasWrapper');
        const display = document.getElementById('mousePos');

        if (!canvasWrapper || !display) return;

        const wrapperRect = canvasWrapper.getBoundingClientRect();
        const centerX = wrapperRect.left + wrapperRect.width / 2;
        const centerY = wrapperRect.top + wrapperRect.height / 2;

        const x = Math.round((centerX - wrapperRect.left - this.state.pan.x) / this.state.zoom);
        const y = Math.round((centerY - wrapperRect.top - this.state.pan.y) / this.state.zoom);

        display.textContent = `X: ${x}, Y: ${y}`;
    },

    // 禁用浏览器级别的Ctrl+滚轮缩放
    disableBrowserZoom() {
        document.addEventListener('wheel', (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
                return false;
            }
        }, { passive: false });
    }
};
