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
    dragStart: { x: 0, y: 0 },

    // 卡片resize状态
    isResizingNote: false,
    resizingNote: null,
    resizeCorner: null,
    resizeStart: { x: 0, y: 0 },
    resizeStartSize: { width: 0, height: 0 },
    resizeStartPos: { x: 0, y: 0 },

    // 框选状态
    isBoxSelecting: false,
    boxSelectionStart: { x: 0, y: 0 },
    boxSelectionEnd: { x: 0, y: 0 },

    // 缩放限制
    MIN_ZOOM: 0.1,
    MAX_ZOOM: 5.0,

    // 卡片最小尺寸
    MIN_NOTE_WIDTH: 100,
    MIN_NOTE_HEIGHT: 60,

    // 虚拟滚动条
    virtualScrollbars: {
        vertical: null,
        horizontal: null
    },

    // 初始化
    init() {
        this.disableBrowserZoom();
        this.setupEventListeners();
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

        // 获取画布容器的尺寸
        const wrapperRect = canvasWrapper.getBoundingClientRect();
        const wrapperWidth = wrapperRect.width;
        const wrapperHeight = wrapperRect.height;

        // 获取画布的原始尺寸
        const canvasWidth = 2000;  // canvas 元素的定义宽度
        const canvasHeight = 2000; // canvas 元素的定义高度

        // 计算居中所需的平移偏移
        // 公式: pan = (viewport尺寸 - canvas尺寸 × zoom) / 2
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

    // 设置事件监听器
    setupEventListeners() {
        const canvasWrapper = document.getElementById('canvasWrapper');
        const canvas = document.getElementById('canvas');

        if (!canvasWrapper || !canvas) return;

        // 鼠标滚轮事件（视图拖动 + 缩放）- 现在由全局监听器统一处理
        // 保留此监听器作为备用，但主要逻辑在全局监听器中
        canvasWrapper.addEventListener('wheel', (e) => {
            // 检查是否在iframe内部
            const isInsideIframe = e.target.closest('.canvas-element.page-element iframe');
            if (isInsideIframe) {
                return; // 由全局监听器处理
            }

            // 阻止默认行为
            e.preventDefault();
            e.stopPropagation();

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
            // 首先检查是否点击了卡片注释的resize手柄
            const resizeHandle = e.target.closest('.note-resize-handle');
            if (resizeHandle && e.button === 0) {
                // 开始调整卡片大小
                const elementId = resizeHandle.dataset.elementId;
                const corner = resizeHandle.dataset.corner;
                const targetElement = resizeHandle.closest('.canvas-element');

                if (targetElement && elementId) {
                    ElementManager.selectElement(elementId);

                    this.isResizingNote = true;
                    this.resizingNote = targetElement;
                    this.resizeCorner = corner;
                    this.resizeStart = { x: e.clientX, y: e.clientY };

                    // 记录初始尺寸和位置
                    const element = ElementManager.getElement(elementId);
                    if (element) {
                        this.resizeStartSize = { width: element.width, height: element.height };
                        this.resizeStartPos = { x: element.position.x, y: element.position.y };
                    }

                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
            }

            // 检查是否点击了元素（包括箭头的SVG路径）
            let targetElement = e.target.closest('.canvas-element');
            let targetElementId = null;

            // 如果没有找到canvas-element,检查是否点击了箭头SVG路径
            if (!targetElement) {
                // 检查是否点击了箭头元素的SVG路径
                const arrowPath = e.target.closest('svg.arrow-svg path');
                if (arrowPath) {
                    // 从SVG找到父级div元素
                    const arrowDiv = arrowPath.closest('.canvas-element.arrow-element');
                    if (arrowDiv) {
                        targetElement = arrowDiv;
                        targetElementId = arrowDiv.dataset.elementId;
                    }
                }
            } else {
                targetElementId = targetElement.dataset.elementId;
            }

            // 检查是否点击了拖拽手柄（仅手柄可拖拽）
            const isDragHandle = e.target.closest('.page-drag-handle') || e.target.closest('.note-drag-handle');

            if (targetElement && targetElementId) {
                // 选中元素
                ElementManager.selectElement(targetElementId);

                // 判断元素类型
                const element = ElementManager.getElement(targetElementId);
                const isArrow = element && element.type === 'arrow';

                // 对于箭头:点击任意位置可拖拽;对于其他元素:只点击拖拽手柄时可拖拽
                if (e.button === 0 && (isArrow || isDragHandle)) {
                    this.isDraggingElement = true;
                    this.draggedElement = targetElement;

                    const rect = targetElement.getBoundingClientRect();
                    const canvasRect = canvas.getBoundingClientRect();

                    // 计算鼠标相对于元素左上角的偏移
                    this.elementOffset = {
                        x: (e.clientX - rect.left) / this.state.zoom,
                        y: (e.clientY - rect.top) / this.state.zoom
                    };

                    // 初始化对齐检测（获取其他元素的位置）
                    this.dragAlignments = [];
                    this.allElementBounds = alignmentManager.getAllElementBounds(targetElementId);

                    // 临时禁用所有iframe的交互，防止拖拽时触发滚动
                    const iframes = document.querySelectorAll('.canvas-element.page-element iframe');
                    iframes.forEach(iframe => {
                        iframe.style.pointerEvents = 'none';
                    });

                    e.preventDefault(); // 防止影响iframe
                    e.stopPropagation(); // 防止事件冒泡
                }
            } else if (e.button === 0 && Tools.getCurrentTool() === 'select') {
                // 左键在选择工具模式下点击空白处

                // 检查是否有已选中的元素
                const hasSelection = ElementManager.state.selectedElements.length > 0 ||
                                    ElementManager.state.selectedElement !== null;

                if (hasSelection) {
                    // 如果有选中元素,先取消选中
                    ElementManager.deselectElement();
                    // 不开始框选,只是取消选中
                    return;
                }

                // 如果没有选中元素,则开始框选
                this.isBoxSelecting = true;

                // 关键修复：转换为canvasWrapper相对坐标
                // 选择框是canvasWrapper的子元素，需要使用相对坐标定位
                const wrapperRect = canvasWrapper.getBoundingClientRect();
                this.boxSelectionStart = {
                    x: e.clientX - wrapperRect.left,
                    y: e.clientY - wrapperRect.top
                };

                // 临时禁用所有iframe的交互，防止框选时鼠标移动被iframe拦截
                const iframes = document.querySelectorAll('.canvas-element.page-element iframe');
                iframes.forEach(iframe => {
                    iframe.style.pointerEvents = 'none';
                });

                // 创建选择框元素
                this.createBoxSelection();
            } else if (e.button === 1) {
                // 中键（且未点击元素）：拖动视图
                this.isPanning = true;
                this.startPan = { x: e.clientX, y: e.clientY };
                // 设置光标为grabbing(抓取中)
                canvasWrapper.style.cursor = 'grabbing';
            }
        });

        // 鼠标移动
        document.addEventListener('mousemove', (e) => {
            // 更新鼠标位置显示
            this.updateMousePosition(e);

            // 动态更新光标(仅在select工具且未拖拽时)
            if (Tools.getCurrentTool() === 'select' && !this.isDraggingElement && !this.isPanning && !this.isResizingNote) {
                this.updateCursorByElement(e);
            }

            if (this.isPanning) {
                // 拖动视图
                const dx = e.clientX - this.startPan.x;
                const dy = e.clientY - this.startPan.y;
                this.state.pan.x += dx;
                this.state.pan.y += dy;
                this.startPan = { x: e.clientX, y: e.clientY };
                this.updateView();
            } else if (this.isDraggingElement && this.draggedElement) {
                // 拖动元素(支持多选)
                const dx = e.movementX / this.state.zoom;
                const dy = e.movementY / this.state.zoom;

                // 获取所有选中的元素
                const selectedElements = ElementManager.state.selectedElements;
                const elementsToMove = selectedElements.length > 0
                    ? selectedElements.map(id => ElementManager.getElement(id)).filter(e => e)
                    : [ElementManager.getElement(this.draggedElement.dataset.elementId)];

                if (elementsToMove.length > 0) {
                    elementsToMove.forEach(element => {
                        // 计算新的位置
                        let newX = element.position.x + dx;
                        let newY = element.position.y + dy;

                        // 获取当前元素的位置信息
                        const currentBounds = {
                            left: newX,
                            top: newY,
                            right: newX + element.width,
                            bottom: newY + element.height,
                            width: element.width,
                            height: element.height
                        };

                        // 检测对齐关系
                        const alignments = alignmentManager.checkAlignment(currentBounds, this.allElementBounds);

                        // 如果检测到对齐，吸附到对齐位置
                        if (alignments.length > 0) {
                            const snapped = alignmentManager.snapToAlignment(
                                newX,
                                newY,
                                element.width,
                                element.height,
                                alignments
                            );
                            newX = snapped.x;
                            newY = snapped.y;

                            // 显示辅助线
                            alignmentManager.updateGuides(alignments);
                        } else {
                            // 没有对齐时清除辅助线
                            alignmentManager.clearGuideLines();
                        }

                        // 更新元素位置
                        element.position.x = newX;
                        element.position.y = newY;

                        const div = document.querySelector(`[data-element-id="${element.id}"]`);
                        if (div) {
                            ElementManager.updateElementPosition(div, element);
                        }

                        // 如果是页面元素，更新相关的连接线
                        if (element.type === 'page') {
                            ElementManager.updateConnectionsForElement(element.id);
                        }
                    });
                }
            } else if (this.isResizingNote && this.resizingNote) {
                // 调整卡片大小
                this.handleNoteResize(e);
            } else if (this.isBoxSelecting) {
                // 更新框选
                this.updateBoxSelection(e);
            }
        });

        // 鼠标释放
        document.addEventListener('mouseup', () => {
            if (this.isPanning) {
                this.isPanning = false;
                // 恢复光标为默认状态
                canvasWrapper.style.cursor = 'default';
            }
            if (this.isDraggingElement) {
                this.isDraggingElement = false;
                this.draggedElement = null;

                // 清除对齐辅助线
                alignmentManager.clearGuideLines();
                this.allElementBounds = [];

                // 恢复所有iframe的交互
                const iframes = document.querySelectorAll('.canvas-element.page-element iframe');
                iframes.forEach(iframe => {
                    iframe.style.pointerEvents = 'auto';
                });

                // 保存状态用于撤销(拖拽移动完成后)
                HistoryManager.saveState();
            }
            if (this.isResizingNote) {
                this.isResizingNote = false;
                this.resizingNote = null;
                this.resizeCorner = null;

                // 保存状态用于撤销(缩放完成后)
                HistoryManager.saveState();
            }
            if (this.isBoxSelecting) {
                // 完成框选
                this.isBoxSelecting = false;
                this.finishBoxSelection();
            }
        });

        // 全局滚轮事件监听器 - 处理画布视图操作
        // 注意：头部脚本已经阻止了浏览器缩放，这里只处理画布功能
        document.addEventListener('wheel', (e) => {
            // 检查是否在画布编辑器区域内
            const isInsideEditor = document.querySelector('.app-container')?.contains(e.target);

            if (isInsideEditor) {
                // 检查具体位置
                const isInsideIframe = e.target.closest('.canvas-element.page-element iframe');
                const isInsideCanvasWrapper = e.target.closest('#canvasWrapper');

                if (e.ctrlKey) {
                    // Ctrl+滚轮：画布缩放
                    if (isInsideCanvasWrapper && !isInsideIframe) {
                        // 在canvasWrapper内但不在iframe内：执行画布缩放
                        // 浏览器缩放已被头部脚本阻止
                        e.preventDefault();
                        e.stopPropagation();
                        this.zoomAtPoint(e.clientX, e.clientY, e.deltaY > 0 ? 0.9 : 1.1);
                        return false;
                    }
                } else {
                    // 普通滚轮：处理画布拖动
                    if (isInsideIframe) {
                        // 在iframe内部：允许iframe正常滚动
                        return;
                    } else if (isInsideCanvasWrapper && !isInsideIframe) {
                        // 在canvasWrapper内但不在iframe内：拖动画布视图
                        e.preventDefault();
                        e.stopPropagation();
                        this.state.pan.x -= e.deltaX;
                        this.state.pan.y -= e.deltaY;
                        this.updateView();
                        return false;
                    }
                }
            }
        }, { passive: false, capture: true }); // 使用捕获阶段

        // 额外的全局保护 - 捕获所有可能的缩放事件
        document.addEventListener('keydown', (e) => {
            // 阻止Ctrl+、Ctrl-、Ctrl0等浏览器缩放快捷键
            if (e.ctrlKey && (e.key === '+' || e.key === '=' || e.key === '-' || e.key === '0')) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
            }
        }, { capture: true }); // 捕获阶段执行，优先于其他监听器

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
        this.showZoomHint();  // 用户主动缩放,显示提示
    },

    // 更新视图变换
    updateView() {
        const canvas = document.getElementById('canvas');
        if (canvas) {
            canvas.style.transform = `translate(${this.state.pan.x}px, ${this.state.pan.y}px) scale(${this.state.zoom})`;
        }

        // 更新滚动条位置和尺寸
        this.updateScrollbars();
    },

    // 更新滚动条
    updateScrollbars() {
        if (!this.virtualScrollbars.vertical || !this.virtualScrollbars.horizontal) return;

        const wrapper = document.getElementById('canvasWrapper');
        if (!wrapper) return;

        const wrapperRect = wrapper.getBoundingClientRect();

        // 画布固定尺寸(不随zoom变化)
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

        // 不再自动显示临时缩放提示
        // 只在用户主动缩放时调用showZoomHint()
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

    // 更新鼠标位置显示
    updateMousePosition(e) {
        const canvasWrapper = document.getElementById('canvasWrapper');
        const display = document.getElementById('mousePos');

        if (!canvasWrapper || !display) return;

        const wrapperRect = canvasWrapper.getBoundingClientRect();
        const x = Math.round((e.clientX - wrapperRect.left - this.state.pan.x) / this.state.zoom);
        const y = Math.round((e.clientY - wrapperRect.top - this.state.pan.y) / this.state.zoom);

        display.textContent = `X: ${x}, Y: ${y}`;
    },

    // 缩放控制按钮
    zoomIn() {
        this.state.zoom = Math.min(this.MAX_ZOOM, this.state.zoom * 1.2);
        this.updateView();
        this.updateZoomDisplay();
        this.showZoomHint();  // 用户主动缩放,显示提示
    },

    zoomOut() {
        this.state.zoom = Math.max(this.MIN_ZOOM, this.state.zoom / 1.2);
        this.updateView();
        this.updateZoomDisplay();
        this.showZoomHint();  // 用户主动缩放,显示提示
    },

    zoomReset() {
        this.state.zoom = 1.0;
        this.state.pan = { x: 0, y: 0 };
        this.updateView();
        this.updateZoomDisplay();
    },

    // 重置到50%缩放并居中
    zoomReset50() {
        this.state.zoom = 0.5;
        this.centerCanvas();  // 调用居中方法计算正确的平移偏移
        this.updateView();
        this.updateZoomDisplay();
        this.showZoomHint();  // 用户主动重置,显示提示

        // 立即更新鼠标位置显示（使用视口中心点作为参考）
        this.updateMousePositionDisplay();
    },

    // 更新鼠标位置显示（不依赖事件对象）
    updateMousePositionDisplay() {
        const canvasWrapper = document.getElementById('canvasWrapper');
        const display = document.getElementById('mousePos');

        if (!canvasWrapper || !display) return;

        const wrapperRect = canvasWrapper.getBoundingClientRect();
        // 使用视口中心点作为鼠标位置的参考点
        const centerX = wrapperRect.left + wrapperRect.width / 2;
        const centerY = wrapperRect.top + wrapperRect.height / 2;

        const x = Math.round((centerX - wrapperRect.left - this.state.pan.x) / this.state.zoom);
        const y = Math.round((centerY - wrapperRect.top - this.state.pan.y) / this.state.zoom);

        display.textContent = `X: ${x}, Y: ${y}`;
    },

    // 根据鼠标下的元素动态更新光标
    updateCursorByElement(e) {
        const canvasWrapper = document.getElementById('canvasWrapper');
        if (!canvasWrapper) return;

        // 检查鼠标下是否在元素上
        const targetElement = e.target.closest('.canvas-element');
        const dragHandle = e.target.closest('.page-drag-handle') || e.target.closest('.note-drag-handle');
        const arrowPath = e.target.closest('svg.arrow-svg path');
        const noteContent = e.target.closest('.note-content');

        if (dragHandle) {
            // 在拖拽手柄上：显示move光标
            canvasWrapper.style.cursor = 'move';
        } else if (noteContent) {
            // 在卡片注释内容区：显示text光标
            canvasWrapper.style.cursor = 'text';
        } else if (targetElement || arrowPath) {
            // 在元素上(包括箭头路径)：显示grab光标
            canvasWrapper.style.cursor = 'grab';
        } else {
            // 在空白区域：显示默认箭头
            canvasWrapper.style.cursor = 'default';
        }
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
    },

    // 处理卡片注释resize
    handleNoteResize(e) {
        const elementId = this.resizingNote.dataset.elementId;
        const element = ElementManager.getElement(elementId);
        if (!element) return;

        // 计算鼠标移动的距离（考虑zoom）
        const dx = (e.clientX - this.resizeStart.x) / this.state.zoom;
        const dy = (e.clientY - this.resizeStart.y) / this.state.zoom;

        let newWidth = this.resizeStartSize.width;
        let newHeight = this.resizeStartSize.height;
        let newX = this.resizeStartPos.x;
        let newY = this.resizeStartPos.y;

        // 根据拖拽的角落计算新的尺寸和位置
        switch (this.resizeCorner) {
            case 'se': // 右下角
                newWidth = Math.max(this.MIN_NOTE_WIDTH, this.resizeStartSize.width + dx);
                newHeight = Math.max(this.MIN_NOTE_HEIGHT, this.resizeStartSize.height + dy);
                break;
            case 'sw': // 左下角
                newWidth = Math.max(this.MIN_NOTE_WIDTH, this.resizeStartSize.width - dx);
                newHeight = Math.max(this.MIN_NOTE_HEIGHT, this.resizeStartSize.height + dy);
                newX = this.resizeStartPos.x + (this.resizeStartSize.width - newWidth);
                break;
            case 'ne': // 右上角
                newWidth = Math.max(this.MIN_NOTE_WIDTH, this.resizeStartSize.width + dx);
                newHeight = Math.max(this.MIN_NOTE_HEIGHT, this.resizeStartSize.height - dy);
                newY = this.resizeStartPos.y + (this.resizeStartSize.height - newHeight);
                break;
            case 'nw': // 左上角
                newWidth = Math.max(this.MIN_NOTE_WIDTH, this.resizeStartSize.width - dx);
                newHeight = Math.max(this.MIN_NOTE_HEIGHT, this.resizeStartSize.height - dy);
                newX = this.resizeStartPos.x + (this.resizeStartSize.width - newWidth);
                newY = this.resizeStartPos.y + (this.resizeStartSize.height - newHeight);
                break;
        }

        // 更新元素数据
        element.width = newWidth;
        element.height = newHeight;
        element.position.x = newX;
        element.position.y = newY;

        // 更新DOM样式
        this.resizingNote.style.left = `${newX}px`;
        this.resizingNote.style.top = `${newY}px`;
        this.resizingNote.style.width = `${newWidth}px`;
        this.resizingNote.style.height = `${newHeight}px`;

        // 更新分辨率显示
        const sizeDisplay = this.resizingNote.querySelector('.note-size-display');
        if (sizeDisplay) {
            sizeDisplay.textContent = `${Math.round(newWidth)}×${Math.round(newHeight)}`;
        }
    },

    // 创建框选矩形
    createBoxSelection() {
        const canvasWrapper = document.getElementById('canvasWrapper');
        if (!canvasWrapper) return;

        // 创建选择框div
        const selectionBox = document.createElement('div');
        selectionBox.id = 'boxSelection';
        selectionBox.className = 'box-selection';
        selectionBox.style.position = 'absolute';
        selectionBox.style.border = '2px dashed #3498db';
        selectionBox.style.backgroundColor = 'rgba(52, 152, 219, 0.1)';
        selectionBox.style.pointerEvents = 'none'; // 不拦截鼠标事件
        selectionBox.style.zIndex = '999';
        selectionBox.style.display = 'none';

        canvasWrapper.appendChild(selectionBox);
    },

    // 更新框选矩形
    updateBoxSelection(e) {
        const selectionBox = document.getElementById('boxSelection');
        if (!selectionBox) return;

        // 关键修复：转换为canvasWrapper相对坐标
        const canvasWrapper = document.getElementById('canvasWrapper');
        const wrapperRect = canvasWrapper.getBoundingClientRect();

        this.boxSelectionEnd = {
            x: e.clientX - wrapperRect.left,
            y: e.clientY - wrapperRect.top
        };

        // 计算选择框的位置和大小(基于canvasWrapper相对坐标)
        const x = Math.min(this.boxSelectionStart.x, this.boxSelectionEnd.x);
        const y = Math.min(this.boxSelectionStart.y, this.boxSelectionEnd.y);
        const width = Math.abs(this.boxSelectionEnd.x - this.boxSelectionStart.x);
        const height = Math.abs(this.boxSelectionEnd.y - this.boxSelectionStart.y);

        // 只有当拖动距离超过5px时才显示选择框
        if (width > 5 || height > 5) {
            selectionBox.style.display = 'block';
            selectionBox.style.left = `${x}px`;
            selectionBox.style.top = `${y}px`;
            selectionBox.style.width = `${width}px`;
            selectionBox.style.height = `${height}px`;
        } else {
            selectionBox.style.display = 'none';
        }
    },

    // 完成框选
    finishBoxSelection() {
        const selectionBox = document.getElementById('boxSelection');
        if (!selectionBox) return;

        // 检查是否有有效的选择区域
        if (selectionBox.style.display === 'none') {
            selectionBox.remove();

            // 恢复所有iframe的交互
            const iframes = document.querySelectorAll('.canvas-element.page-element iframe');
            iframes.forEach(iframe => {
                iframe.style.pointerEvents = 'auto';
            });

            return;
        }

        // 获取选择框的位置和大小(canvasWrapper相对坐标)
        const boxRect = {
            left: parseFloat(selectionBox.style.left),
            top: parseFloat(selectionBox.style.top),
            width: parseFloat(selectionBox.style.width),
            height: parseFloat(selectionBox.style.height)
        };

        const view = this.getView();

        // 关键修复:选择框已经是canvasWrapper相对坐标
        // 需要转换为canvas坐标系统(考虑pan和zoom)
        // canvas坐标 = (canvasWrapper坐标 - pan) / zoom
        const canvasBox = {
            x: (boxRect.left - view.pan.x) / view.zoom,
            y: (boxRect.top - view.pan.y) / view.zoom,
            width: boxRect.width / view.zoom,
            height: boxRect.height / view.zoom
        };

        // 选择框内的所有元素
        const selectedElements = this.getElementsInBox(canvasBox);

        // 移除选择框
        selectionBox.remove();

        // 恢复所有iframe的交互
        const iframes = document.querySelectorAll('.canvas-element.page-element iframe');
        iframes.forEach(iframe => {
            iframe.style.pointerEvents = 'auto';
        });

        // 选中框内的所有元素
        if (selectedElements.length > 0) {
            ElementManager.deselectElement(); // 先清除之前的选择
            selectedElements.forEach((element, index) => {
                ElementManager.selectElement(element.id, index > 0); // 第一个直接选中,后续的添加到多选
            });
            PageLibrary.showHint(`已选中 ${selectedElements.length} 个元素`);
        }
    },

    // 获取选择框内的所有元素
    getElementsInBox(box) {
        const elements = ElementManager.state.elements;
        const selected = [];

        elements.forEach(element => {
            if (this.isElementInBox(element, box)) {
                selected.push(element);
            }
        });

        return selected;
    },

    // 判断元素是否在选择框内
    isElementInBox(element, box) {
        // 元素的边界
        const elemLeft = element.position.x;
        const elemTop = element.position.y;
        const elemRight = elemLeft + element.width;
        const elemBottom = elemTop + element.height;

        // 选择框的边界
        const boxLeft = box.x;
        const boxTop = box.y;
        const boxRight = boxLeft + box.width;
        const boxBottom = boxTop + box.height;

        // 判断是否有交集(元素任何部分在选择框内)
        return !(
            elemRight < boxLeft ||
            elemLeft > boxRight ||
            elemBottom < boxTop ||
            elemTop > boxBottom
        );
    },

    // 禁用浏览器级别的Ctrl+滚轮缩放
    disableBrowserZoom() {
        // 在document级别监听wheel事件
        // 当检测到Ctrl键时,阻止浏览器默认的缩放行为
        document.addEventListener('wheel', (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
                return false;
            }
        }, { passive: false });
    }
};