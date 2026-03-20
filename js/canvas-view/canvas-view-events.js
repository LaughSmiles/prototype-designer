// 画布视图事件监听器模块
// 负责处理画布上的鼠标、滚轮等事件

const CanvasViewEvents = {
    // 设置事件监听器
    setupEventListeners() {
        const canvasWrapper = document.getElementById('canvasWrapper');
        const canvas = document.getElementById('canvas');

        if (!canvasWrapper || !canvas) return;

        // 鼠标滚轮事件（视图拖动 + 缩放）
        canvasWrapper.addEventListener('wheel', (e) => {
            // 检查是否在iframe内部
            const isInsideIframe = e.target.closest('.canvas-element.page-element iframe');
            if (isInsideIframe) {
                return; // 由全局监听器处理
            }

            // 检查是否在批注标记内部（编辑器或预览区域）
            const isInsideAnnotation = e.target.closest('.annotation-content-wrapper') ||
                                        e.target.closest('.annotation-editor') ||
                                        e.target.closest('.annotation-preview');
            if (isInsideAnnotation) {
                return; // 让批注标记自己处理滚动
            }

            // 阻止默认行为
            e.preventDefault();
            e.stopPropagation();

            if (e.ctrlKey) {
                // Ctrl + 滚轮：缩放视图
                CanvasView.zoomAtPoint(e.clientX, e.clientY, e.deltaY > 0 ? 0.9 : 1.1);
            } else {
                // 普通滚轮：拖动视图
                CanvasView.state.pan.x -= e.deltaX;
                CanvasView.state.pan.y -= e.deltaY;
                CanvasView.updateView();
            }
        }, { passive: false });

        // 鼠标按下（开始拖动视图或元素）
        canvasWrapper.addEventListener('mousedown', (e) => {
            this.handleMouseDown(e, canvasWrapper);
        });

        // 鼠标移动
        document.addEventListener('mousemove', (e) => {
            this.handleMouseMove(e);
        });

        // 鼠标释放
        document.addEventListener('mouseup', () => {
            this.handleMouseUp(canvasWrapper);
        });

        // 全局滚轮事件监听器 - 处理画布视图操作
        document.addEventListener('wheel', (e) => {
            this.handleGlobalWheel(e);
        }, { passive: false, capture: true });

        // 额外的全局保护 - 捕获所有可能的缩放事件
        document.addEventListener('keydown', (e) => {
            // 阻止Ctrl+、Ctrl-、Ctrl0等浏览器缩放快捷键
            if (e.ctrlKey && (e.key === '+' || e.key === '=' || e.key === '-' || e.key === '0')) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
            }
        }, { capture: true });
    },

    // 处理鼠标按下事件
    handleMouseDown(e, canvasWrapper) {
        // 中键：优先触发画布拖动（即使在批注标记内部）
        if (e.button === 1) {
            CanvasView.isPanning = true;
            CanvasView.startPan = { x: e.clientX, y: e.clientY };
            canvasWrapper.style.cursor = 'grabbing';
            e.preventDefault();
            return;
        }

        // 检查是否点击了元素（包括箭头的SVG路径）
        let targetElement = e.target.closest('.canvas-element');
        let targetElementId = null;

        // 如果没有找到canvas-element,检查是否点击了箭头SVG路径
        if (!targetElement) {
            const arrowPath = e.target.closest('svg.arrow-svg path');
            if (arrowPath) {
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
        const isDragHandle = e.target.closest('.page-drag-handle');

        if (targetElement && targetElementId) {
            // 选中元素
            ElementManager.selectElement(targetElementId);

            // 判断元素类型
            const element = ElementManager.getElement(targetElementId);
            const isArrow = element && element.type === 'arrow';

            // 对于箭头:点击任意位置可拖拽;对于其他元素:只点击拖拽手柄时可拖拽
            if (e.button === 0 && (isArrow || isDragHandle)) {
                CanvasView.isDraggingElement = true;
                CanvasView.draggedElement = targetElement;

                const rect = targetElement.getBoundingClientRect();

                // 计算鼠标相对于元素左上角的偏移
                CanvasView.elementOffset = {
                    x: (e.clientX - rect.left) / CanvasView.state.zoom,
                    y: (e.clientY - rect.top) / CanvasView.state.zoom
                };

                // 初始化对齐检测（获取其他元素的位置）
                CanvasView.dragAlignments = [];
                if (element.type !== 'arrow') {
                    CanvasView.allElementBounds = alignmentManager.getAllElementBounds(targetElementId);
                } else {
                    CanvasView.allElementBounds = [];
                }

                // 临时禁用所有iframe的交互，防止拖拽时触发滚动
                const iframes = document.querySelectorAll('.canvas-element.page-element iframe');
                iframes.forEach(iframe => {
                    iframe.style.pointerEvents = 'none';
                });

                e.preventDefault();
                e.stopPropagation();
            }
        } else if (e.button === 0 && Tools.getCurrentTool() === 'select') {
            // 左键在选择工具模式下点击空白处
            this.handleBoxSelectionStart(e, canvasWrapper);
        }
    },

    // 开始框选
    handleBoxSelectionStart(e, canvasWrapper) {
        // 检查是否有已选中的元素
        const hasSelection = ElementManager.state.selectedElements.length > 0 ||
                            ElementManager.state.selectedElement !== null;

        if (hasSelection) {
            // 如果有选中元素,先取消选中
            ElementManager.deselectElement();
            return;
        }

        // 如果没有选中元素,则开始框选
        CanvasView.isBoxSelecting = true;

        const wrapperRect = canvasWrapper.getBoundingClientRect();
        CanvasView.boxSelectionStart = {
            x: e.clientX - wrapperRect.left,
            y: e.clientY - wrapperRect.top
        };

        // 临时禁用所有iframe的交互
        const iframes = document.querySelectorAll('.canvas-element.page-element iframe');
        iframes.forEach(iframe => {
            iframe.style.pointerEvents = 'none';
        });

        // 临时禁用所有批注元素的交互
        const annotationElements = document.querySelectorAll('.annotation-box, .annotation-anchor');
        annotationElements.forEach(element => {
            element.style.pointerEvents = 'none';
        });

        // 创建透明覆盖层和选择框
        CanvasViewBoxSelection.createBoxSelectionOverlay();
        CanvasViewBoxSelection.createBoxSelection();
    },

    // 处理鼠标移动事件
    handleMouseMove(e) {
        // 更新鼠标位置显示
        this.updateMousePosition(e);

        // 动态更新光标(仅在select工具且未拖拽时)
        if (Tools.getCurrentTool() === 'select' && !CanvasView.isDraggingElement && !CanvasView.isPanning) {
            this.updateCursorByElement(e);
        }

        if (CanvasView.isPanning) {
            // 拖动视图
            const dx = e.clientX - CanvasView.startPan.x;
            const dy = e.clientY - CanvasView.startPan.y;
            CanvasView.state.pan.x += dx;
            CanvasView.state.pan.y += dy;
            CanvasView.startPan = { x: e.clientX, y: e.clientY };
            CanvasView.updateView();
        } else if (CanvasView.isDraggingElement && CanvasView.draggedElement) {
            // 拖动元素(支持多选)
            this.handleElementDrag(e);
        } else if (CanvasView.isBoxSelecting) {
            // 更新框选
            CanvasViewBoxSelection.updateBoxSelection(e);
        }
    },

    // 处理元素拖动
    handleElementDrag(e) {
        const dx = e.movementX / CanvasView.state.zoom;
        const dy = e.movementY / CanvasView.state.zoom;

        const selectedElements = ElementManager.state.selectedElements;
        const elementsToMove = selectedElements.length > 0
            ? selectedElements.map(id => ElementManager.getElement(id)).filter(e => e)
            : [ElementManager.getElement(CanvasView.draggedElement.dataset.elementId)];

        if (elementsToMove.length > 0) {
            elementsToMove.forEach(element => {
                let newX = element.position.x + dx;
                let newY = element.position.y + dy;

                const currentBounds = {
                    left: newX,
                    top: newY,
                    right: newX + element.width,
                    bottom: newY + element.height,
                    width: element.width,
                    height: element.height
                };

                // 检测对齐关系（只有箭头除外）
                if (element.type !== 'arrow' && CanvasView.allElementBounds.length > 0) {
                    const alignments = alignmentManager.checkAlignment(currentBounds, CanvasView.allElementBounds);

                    if (alignments.length > 0) {
                        const snapped = alignmentManager.snapToAlignment(
                            newX, newY, element.width, element.height, alignments
                        );
                        newX = snapped.x;
                        newY = snapped.y;
                        alignmentManager.updateGuides(alignments);
                    } else {
                        alignmentManager.clearGuideLines();
                    }
                }

                element.position.x = newX;
                element.position.y = newY;

                const div = document.querySelector(`[data-element-id="${element.id}"]`);
                if (div) {
                    ElementManager.updateElementPosition(div, element);
                }

                if (element.type === 'page') {
                    ElementManager.updateConnectionsForElement(element.id);
                }
            });
        }
    },

    // 处理鼠标释放事件
    handleMouseUp(canvasWrapper) {
        if (CanvasView.isPanning) {
            CanvasView.isPanning = false;
            canvasWrapper.style.cursor = 'default';
        }

        if (CanvasView.isDraggingElement) {
            CanvasView.isDraggingElement = false;
            CanvasView.draggedElement = null;

            alignmentManager.clearGuideLines();
            CanvasView.allElementBounds = [];

            const iframes = document.querySelectorAll('.canvas-element.page-element iframe');
            iframes.forEach(iframe => {
                iframe.style.pointerEvents = 'auto';
            });

            HistoryManager.saveState();
        }

        if (CanvasView.isBoxSelecting) {
            CanvasView.isBoxSelecting = false;
            CanvasViewBoxSelection.finishBoxSelection();
        }
    },

    // 处理全局滚轮事件
    handleGlobalWheel(e) {
        const isInsideEditor = document.querySelector('.app-container')?.contains(e.target);

        if (!isInsideEditor) return;

        const isInsideIframe = e.target.closest('.canvas-element.page-element iframe');
        const isInsideCanvasWrapper = e.target.closest('#canvasWrapper');
        const isInsideAnnotation = e.target.closest('.annotation-content-wrapper') ||
                                   e.target.closest('.annotation-editor') ||
                                   e.target.closest('.annotation-preview');

        // 在批注标记内部：允许批注正常滚动，Ctrl+滚轮触发画布缩放
        if (isInsideAnnotation) {
            if (e.ctrlKey) {
                e.preventDefault();
                e.stopPropagation();
                CanvasView.zoomAtPoint(e.clientX, e.clientY, e.deltaY > 0 ? 0.9 : 1.1);
            }
            return;
        }

        if (e.ctrlKey) {
            if (isInsideCanvasWrapper && !isInsideIframe) {
                e.preventDefault();
                e.stopPropagation();
                CanvasView.zoomAtPoint(e.clientX, e.clientY, e.deltaY > 0 ? 0.9 : 1.1);
                return false;
            }
        } else {
            if (isInsideIframe) {
                return;
            } else if (isInsideCanvasWrapper && !isInsideIframe) {
                e.preventDefault();
                e.stopPropagation();
                CanvasView.state.pan.x -= e.deltaX;
                CanvasView.state.pan.y -= e.deltaY;
                CanvasView.updateView();
                return false;
            }
        }
    },

    // 更新鼠标位置显示
    updateMousePosition(e) {
        const canvasWrapper = document.getElementById('canvasWrapper');
        const display = document.getElementById('mousePos');

        if (!canvasWrapper || !display) return;

        const wrapperRect = canvasWrapper.getBoundingClientRect();
        const x = Math.round((e.clientX - wrapperRect.left - CanvasView.state.pan.x) / CanvasView.state.zoom);
        const y = Math.round((e.clientY - wrapperRect.top - CanvasView.state.pan.y) / CanvasView.state.zoom);

        display.textContent = `X: ${x}, Y: ${y}`;
    },

    // 根据鼠标下的元素动态更新光标
    updateCursorByElement(e) {
        const canvasWrapper = document.getElementById('canvasWrapper');
        if (!canvasWrapper) return;

        const targetElement = e.target.closest('.canvas-element');
        const dragHandle = e.target.closest('.page-drag-handle');
        const arrowPath = e.target.closest('svg.arrow-svg path');

        if (dragHandle) {
            canvasWrapper.style.cursor = 'move';
        } else if (targetElement || arrowPath) {
            canvasWrapper.style.cursor = 'grab';
        } else {
            canvasWrapper.style.cursor = 'default';
        }
    }
};
