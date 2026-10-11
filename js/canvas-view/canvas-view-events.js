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
            // 预览模式：不拦截滚轮事件，让iframe自然滚动，但仍需阻止Ctrl+滚轮缩放浏览器
            if (CanvasView.isPreviewMode) {
                if (e.ctrlKey) {
                    e.preventDefault();
                }
                return;
            }

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
            // 预览模式：不拦截鼠标事件，让iframe自然交互
            if (CanvasView.isPreviewMode) {
                return;
            }
            this.handleMouseDown(e, canvasWrapper);
        });

        // 鼠标移动
        document.addEventListener('mousemove', (e) => {
            this.handleMouseMove(e);
        });

        // 鼠标释放
        document.addEventListener('mouseup', (e) => {
            this.handleMouseUp(canvasWrapper);
        });

        // 全局滚轮事件监听器 - 处理画布视图操作
        document.addEventListener('wheel', (e) => {
            this.handleGlobalWheel(e);
        }, { passive: false, capture: true });

        // 阻止浏览器缩放快捷键
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && (e.key === '+' || e.key === '=' || e.key === '-' || e.key === '0')) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
            }
            // Q键：进入/退出预览
            if (e.key === 'q' || e.key === 'Q') {
                if (CanvasView.isPreviewMode) {
                    this.closePreview();
                } else {
                    const selectedId = ElementManager.state.selectedElement ||
                        (ElementManager.state.selectedElements.length > 0 ? ElementManager.state.selectedElements[0] : null);
                    if (selectedId) {
                        const element = ElementManager.getElement(selectedId);
                        if (element && element.type === 'page') {
                            const name = PageLibrary.getPageName(element.pageId);
                            this.openPreview(name, selectedId);
                        }
                    }
                }
            }
            // Esc键：退出预览
            if (e.key === 'Escape' && CanvasView.isPreviewMode) {
                this.closePreview();
            }
        }, { capture: true });

        // 监听来自iframe的退出预览消息（焦点在iframe内时Q键无法冒泡到父页面）
        window.addEventListener('message', (e) => {
            if (e.data && e.data.type === 'prototype-escape-preview') {
                this.closePreview();
            }
        });

        // ========== 禁止移动端双指缩放和双击缩放 ==========

        // 禁止双指缩放
        document.addEventListener('touchmove', function (e) {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });

        // 禁止双击缩放
        let lastTouchEnd = 0;
        document.addEventListener('touchend', function (e) {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
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
            if (isInsideCanvasWrapper) {
                e.preventDefault();
                e.stopPropagation();
                CanvasView.zoomAtPoint(e.clientX, e.clientY, e.deltaY > 0 ? 0.9 : 1.1);
                return false;
            }
        } else {
            if (isInsideIframe) {
                return;
            } else if (isInsideCanvasWrapper) {
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
    },

    // ========== 原位预览功能 ==========

    // 保存预览前的状态，用于恢复
    _previewElementId: null,

    // 进入原位预览模式（保持原样，只去掉overlay让iframe可交互）
    openPreview(pageTitle, elementId) {
        // 如果已经在预览模式，先关闭
        if (CanvasView.isPreviewMode) {
            this.closePreview();
            return;
        }

        const pageDiv = document.querySelector(`[data-element-id="${elementId}"]`);
        if (!pageDiv) return;

        // 1. 进入预览模式
        CanvasView.isPreviewMode = true;
        this._previewElementId = elementId;

        // 2. 不改变 zoom/pan，只隐藏 overlay 让 iframe 可交互
        const overlay = pageDiv.querySelector('.page-click-overlay');
        if (overlay) overlay.style.display = 'none';
        const iframe = pageDiv.querySelector('iframe');
        if (iframe) {
            iframe.focus();

            // 在 iframe 内容文档上监听 ESC/Q 键，解决焦点在 iframe 内时父文档收不到键盘事件的问题
            const onIframeKeydown = (e) => {
                if (e.key === 'Escape' || e.key === 'q' || e.key === 'Q') {
                    e.preventDefault();
                    e.stopPropagation();
                    window.postMessage({ type: 'prototype-escape-preview' }, '*');
                }
            };
            // 保存引用以便退出时移除
            this._previewIframeKeydownHandler = onIframeKeydown;
            this._previewIframe = iframe;
            try {
                iframe.contentDocument?.addEventListener('keydown', onIframeKeydown, true);
            } catch (err) {
                // 跨域 iframe 无法访问 contentDocument，忽略
            }
        }

        // 3. 隐藏预览按钮和删除按钮（预览中不需要）
        pageDiv.querySelectorAll('.preview-btn, .delete-btn').forEach(btn => {
            btn.style.display = 'none';
        });

        // 4. 显示预览工具栏
        this._showPreviewToolbar(pageTitle);
    },

    // 显示预览工具栏
    _showPreviewToolbar(pageTitle) {
        // 如果已存在则移除
        document.getElementById('preview-toolbar')?.remove();

        const toolbar = document.createElement('div');
        toolbar.id = 'preview-toolbar';
        toolbar.style.cssText = `
            position: fixed; top: 12px; left: 50%; transform: translateX(-50%);
            background: #fff; padding: 6px 20px; border-radius: 20px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.15); z-index: 10000;
            display: flex; align-items: center; gap: 12px; font-size: 13px;
        `;

        const label = document.createElement('span');
        label.style.color = '#333';
        label.innerHTML = `<i class="fas fa-eye" style="color:#409EFF;margin-right:4px;"></i>预览: ${pageTitle || '页面'}`;

        const closeBtn = document.createElement('button');
        closeBtn.style.cssText = `
            border: none; background: #f56c6c; color: #fff; padding: 4px 14px;
            border-radius: 12px; cursor: pointer; font-size: 12px;
        `;
        closeBtn.textContent = '退出预览';
        closeBtn.addEventListener('click', () => this.closePreview());

        toolbar.appendChild(label);
        toolbar.appendChild(closeBtn);
        document.body.appendChild(toolbar);
    },

    // 退出原位预览模式
    closePreview() {
        if (!CanvasView.isPreviewMode) return;

        const pageDiv = document.querySelector(`[data-element-id="${this._previewElementId}"]`);

        // 1. 退出预览模式
        CanvasView.isPreviewMode = false;

        // 2. 恢复 overlay 和 iframe 的交互状态
        if (pageDiv) {
            const overlay = pageDiv.querySelector('.page-click-overlay');
            if (overlay) overlay.style.display = '';

            // 恢复按钮
            pageDiv.querySelectorAll('.preview-btn, .delete-btn').forEach(btn => {
                btn.style.display = '';
            });
        }

        // 3. 移除 iframe 内的键盘监听器
        if (this._previewIframeKeydownHandler && this._previewIframe) {
            try {
                this._previewIframe.contentDocument?.removeEventListener(
                    'keydown', this._previewIframeKeydownHandler, true
                );
            } catch (err) {
                // 跨域 iframe 忽略
            }
            this._previewIframeKeydownHandler = null;
            this._previewIframe = null;
        }

        // 4. 移除预览工具栏
        document.getElementById('preview-toolbar')?.remove();

        // 5. 清理状态
        this._previewElementId = null;
    }
};