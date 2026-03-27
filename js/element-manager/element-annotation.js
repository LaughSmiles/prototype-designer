// 批注元素模块
// 负责批注元素的渲染和交互

const ElementAnnotation = {
    // 渲染批注元素
    renderAnnotationElement(div, element) {
        div.classList.add('annotation-element');

        const ANCHOR_SIZE = 10;
        const PADDING = 10;

        // 计算最小包围盒
        const minX = Math.min(element.anchorX, element.boxX);
        const maxX = Math.max(element.anchorX + ANCHOR_SIZE, element.boxX + element.boxWidth);
        const minY = Math.min(element.anchorY, element.boxY);
        const maxY = Math.max(element.anchorY + ANCHOR_SIZE, element.boxY + element.boxHeight);

        element.containerOffsetX = minX - PADDING;
        element.containerOffsetY = minY - PADDING;
        element.containerWidth = maxX - minX + PADDING * 2;
        element.containerHeight = maxY - minY + PADDING * 2;

        div.style.left = `${element.containerOffsetX}px`;
        div.style.top = `${element.containerOffsetY}px`;
        div.style.width = `${element.containerWidth}px`;
        div.style.height = `${element.containerHeight}px`;
        div.style.pointerEvents = 'none';

        // SVG容器
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('annotation-svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.style.position = 'absolute';
        svg.style.overflow = 'visible';
        svg.style.pointerEvents = 'none';
        svg.setAttribute('viewBox', `0 0 ${element.containerWidth} ${element.containerHeight}`);

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', element.anchorX - element.containerOffsetX + 5);
        line.setAttribute('y1', element.anchorY - element.containerOffsetY + 5);
        line.setAttribute('x2', element.boxX - element.containerOffsetX);
        line.setAttribute('y2', element.boxY - element.containerOffsetY + element.boxHeight / 2);
        line.setAttribute('stroke', '#FF9500');
        line.setAttribute('stroke-width', '1');
        line.classList.add('annotation-connection-line');
        svg.appendChild(line);
        div.appendChild(svg);

        // 锚点
        const anchor = this.createAnchor(element);
        div.appendChild(anchor);

        // 批注框
        const box = this.createAnnotationBox(element, div);
        div.appendChild(box);

        // 点击空白选中
        div.addEventListener('click', (e) => {
            if (e.target === div || e.target === svg) {
                e.stopPropagation();
                ElementManager.selectElement(element.id);
            }
        });

        document.getElementById('canvas').appendChild(div);
    },

    // 创建锚点
    createAnchor(element) {
        const anchor = document.createElement('div');
        anchor.className = 'annotation-anchor';
        anchor.style.position = 'absolute';
        anchor.style.left = `${element.anchorX - element.containerOffsetX}px`;
        anchor.style.top = `${element.anchorY - element.containerOffsetY}px`;
        anchor.style.width = '10px';
        anchor.style.height = '10px';
        anchor.style.borderRadius = '50%';
        anchor.style.backgroundColor = '#FF9500';
        anchor.style.cursor = 'move';
        anchor.style.pointerEvents = 'auto';
        anchor.dataset.elementId = element.id;
        anchor.dataset.part = 'anchor';

        this.setupAnnotationDrag(anchor, element, 'anchor');
        return anchor;
    },

    // 创建批注框
    createAnnotationBox(element, containerDiv) {
        const box = document.createElement('div');
        box.className = 'annotation-box';
        box.style.position = 'absolute';
        box.style.left = `${element.boxX - element.containerOffsetX}px`;
        box.style.top = `${element.boxY - element.containerOffsetY}px`;
        box.style.width = `${element.boxWidth}px`;
        box.style.height = `${element.boxHeight}px`;
        box.style.backgroundColor = '';
        box.style.border = '';
        box.style.borderRadius = '4px';
        box.style.padding = '8px';
        box.style.cursor = 'move';
        box.style.pointerEvents = 'auto';
        box.dataset.elementId = element.id;
        box.dataset.part = 'box';

        // 内容包装器
        const contentWrapper = this.createContentWrapper(element, box);
        box.appendChild(contentWrapper);

        // 拖拽
        this.setupAnnotationDrag(box, element, 'box');

        // 调整大小手柄
        this.addResizeHandles(box, element);

        // 尺寸显示
        const sizeDisplay = document.createElement('div');
        sizeDisplay.className = 'annotation-size-display';
        sizeDisplay.textContent = `${Math.round(element.boxWidth)} × ${Math.round(element.boxHeight)}`;
        box.appendChild(sizeDisplay);

        // 删除按钮
        const deleteBtn = document.createElement('div');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
        deleteBtn.style.pointerEvents = 'auto';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            ElementManager.deleteElement(element.id);
        });
        box.appendChild(deleteBtn);

        // 调整大小事件
        this.setupAnnotationResize(box, element);

        return box;
    },

    // 创建内容包装器
    createContentWrapper(element, box) {
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'annotation-content-wrapper';
        contentWrapper.style.width = '100%';
        contentWrapper.style.height = '100%';
        contentWrapper.style.display = 'flex';
        contentWrapper.style.flexDirection = 'column';

        // 工具栏
        const toolbar = document.createElement('div');
        toolbar.className = 'annotation-toolbar';
        toolbar.innerHTML = `
            <button class="annotation-mode-btn active" data-mode="edit" title="编辑模式">
                <i class="fas fa-edit"></i>
            </button>
            <button class="annotation-mode-btn" data-mode="preview" title="预览模式">
                <i class="fas fa-eye"></i>
            </button>
        `;

        // 编辑器
        const editor = document.createElement('textarea');
        editor.className = 'annotation-editor';
        editor.style.width = '100%';
        editor.style.flex = '1';
        editor.style.fontSize = '14px';
        editor.style.fontFamily = 'monospace';
        editor.style.color = '';
        editor.style.outline = 'none';
        editor.style.border = 'none';
        editor.style.resize = 'none';
        editor.style.backgroundColor = 'transparent';
        editor.style.padding = '4px';
        editor.value = element.content || '输入批注（支持 Markdown）';

        // 预览
        const preview = document.createElement('div');
        preview.className = 'annotation-preview';
        preview.style.width = '100%';
        preview.style.flex = '1';
        preview.style.fontSize = '14px';
        preview.style.overflow = 'auto';
        preview.style.display = 'none';
        preview.innerHTML = this.renderMarkdown(element.content || '输入批注（支持 Markdown）');

        // 模式切换
        let currentMode = 'edit';
        const switchMode = (mode) => {
            currentMode = mode;
            if (mode === 'edit') {
                editor.style.display = 'block';
                preview.style.display = 'none';
                toolbar.querySelector('[data-mode="edit"]').classList.add('active');
                toolbar.querySelector('[data-mode="preview"]').classList.remove('active');
            } else {
                editor.style.display = 'none';
                preview.style.display = 'block';
                toolbar.querySelector('[data-mode="edit"]').classList.remove('active');
                toolbar.querySelector('[data-mode="preview"]').classList.add('active');
                preview.innerHTML = this.renderMarkdown(editor.value);
            }
        };

        toolbar.querySelectorAll('.annotation-mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                switchMode(btn.dataset.mode);
            });
        });

        let originalContent = element.content || '';
        editor.addEventListener('input', (e) => {
            element.content = e.target.value;
            this.adjustAnnotationHeight(box, editor, element);
        });

        editor.addEventListener('blur', (e) => {
            const currentContent = e.target.value;
            if (currentContent.trim() && currentContent !== '输入批注（支持 Markdown）' && currentContent !== originalContent) {
                HistoryManager.saveState();
                originalContent = currentContent;
            }
            switchMode('preview');
        });

        editor.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                switchMode('preview');
                editor.blur();
            }
            if (e.key === ' ') {
                e.stopPropagation();
            }
        });

        const preventBubble = (el) => {
            el.addEventListener('wheel', (e) => {
                if (e.ctrlKey) return;
                e.stopPropagation();
            }, { passive: true });
        };
        preventBubble(editor);
        preventBubble(preview);

        box.addEventListener('click', (e) => {
            if (!e.target.closest('.annotation-toolbar') &&
                !e.target.closest('.delete-btn') &&
                !e.target.closest('.annotation-resize-handle')) {
                switchMode('edit');
                editor.focus();
            }
        });

        contentWrapper.appendChild(toolbar);
        contentWrapper.appendChild(editor);
        contentWrapper.appendChild(preview);

        return contentWrapper;
    },

    // 添加调整大小手柄
    addResizeHandles(box, element) {
        const corners = ['nw', 'ne', 'sw', 'se'];
        corners.forEach(corner => {
            const handle = document.createElement('div');
            handle.className = `annotation-resize-handle annotation-resize-${corner}`;
            handle.dataset.corner = corner;
            handle.dataset.elementId = element.id;
            box.appendChild(handle);
        });
    },

    // 调整批注框高度
    adjustAnnotationHeight(box, contentDiv, element) {
        const MIN_HEIGHT = 120;
        const FONT_SIZE = 14;
        const LINE_HEIGHT = 1.6;
        const oneLineHeight = FONT_SIZE * LINE_HEIGHT;

        const paddingTop = 8;
        const paddingBottom = 8;
        const scrollHeight = contentDiv.scrollHeight;
        const actualContentHeight = scrollHeight - paddingTop - paddingBottom;
        const remainingSpace = element.boxHeight - actualContentHeight;

        if (remainingSpace < oneLineHeight) {
            const newHeight = Math.max(element.boxHeight + oneLineHeight, MIN_HEIGHT);
            element.boxHeight = newHeight;
            box.style.height = `${newHeight}px`;

            const div = document.querySelector(`[data-element-id="${element.id}"]`);
            if (div) {
                const line = div.querySelector('.annotation-connection-line');
                if (line) {
                    line.setAttribute('y2', element.boxY + newHeight / 2);
                }
            }

            const sizeDisplay = box.querySelector('.annotation-size-display');
            if (sizeDisplay) {
                sizeDisplay.textContent = `${Math.round(element.boxWidth)} × ${Math.round(newHeight)}`;
            }
        }
    },

    // 渲染Markdown
    renderMarkdown(text) {
        if (!text || !text.trim()) {
            return '<p class="annotation-placeholder">输入批注（支持 Markdown）</p>';
        }
        try {
            if (typeof marked !== 'undefined') {
                let processedText = text.replace(/==([^=]+)==/g, '<mark>$1</mark>');
                return marked.parse(processedText, {
                    breaks: true,
                    gfm: true,
                    headerIds: false,
                    mangle: false
                });
            } else {
                return text.replace(/\n/g, '<br>');
            }
        } catch (e) {
            return text.replace(/\n/g, '<br>');
        }
    },

    // 设置批注拖拽
    setupAnnotationDrag(element, data, part) {
        let isDragging = false;
        let startX, startY;

        element.addEventListener('mousedown', (e) => {
            if (e.button === 1) return;
            if (e.target.classList.contains('annotation-editor') ||
                e.target.classList.contains('annotation-preview') ||
                e.target.closest('.annotation-content-wrapper')) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;

            ElementManager.selectElement(data.id);

            const iframes = document.querySelectorAll('.canvas-element.page-element iframe');
            iframes.forEach(iframe => {
                iframe.style.pointerEvents = 'none';
            });

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        const onMouseMove = (e) => {
            if (!isDragging) return;

            const view = CanvasView.getView();
            const deltaX = (e.clientX - startX) / view.zoom;
            const deltaY = (e.clientY - startY) / view.zoom;

            const div = document.querySelector(`[data-element-id="${data.id}"]`);
            if (!div) return;

            if (part === 'anchor') {
                data.anchorX += deltaX;
                data.anchorY += deltaY;

                const anchorEl = div.querySelector('.annotation-anchor');
                if (anchorEl) {
                    anchorEl.style.left = `${data.anchorX - data.containerOffsetX}px`;
                    anchorEl.style.top = `${data.anchorY - data.containerOffsetY}px`;
                }

                const line = div.querySelector('.annotation-connection-line');
                if (line) {
                    line.setAttribute('x1', data.anchorX - data.containerOffsetX + 5);
                    line.setAttribute('y1', data.anchorY - data.containerOffsetY + 5);
                }

                this.updateAnnotationContainerIfNeeded(div, data);
            } else if (part === 'box') {
                data.boxX += deltaX;
                data.boxY += deltaY;

                const boxEl = div.querySelector('.annotation-box');
                if (boxEl) {
                    boxEl.style.left = `${data.boxX - data.containerOffsetX}px`;
                    boxEl.style.top = `${data.boxY - data.containerOffsetY}px`;
                }

                const line = div.querySelector('.annotation-connection-line');
                if (line) {
                    line.setAttribute('x2', data.boxX - data.containerOffsetX);
                    line.setAttribute('y2', data.boxY - data.containerOffsetY + data.boxHeight / 2);
                }

                this.updateAnnotationContainerIfNeeded(div, data);
            }

            startX = e.clientX;
            startY = e.clientY;
        };

        const onMouseUp = () => {
            if (isDragging) {
                isDragging = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);

                const iframes = document.querySelectorAll('.canvas-element.page-element iframe');
                iframes.forEach(iframe => {
                    iframe.style.pointerEvents = 'auto';
                });

                HistoryManager.saveState();
            }
        };
    },

    // 聚焦批注内容
    focusAnnotationContent(elementId) {
        const div = document.querySelector(`[data-element-id="${elementId}"]`);
        if (!div) return;

        const editor = div.querySelector('.annotation-editor');
        if (editor) {
            editor.focus();
            editor.select();
        }
    },

    // 更新批注容器大小
    updateAnnotationContainerIfNeeded(div, element) {
        const ANCHOR_SIZE = 10;
        const PADDING = 10;

        const minX = Math.min(element.anchorX, element.boxX);
        const maxX = Math.max(element.anchorX + ANCHOR_SIZE, element.boxX + element.boxWidth);
        const minY = Math.min(element.anchorY, element.boxY);
        const maxY = Math.max(element.anchorY + ANCHOR_SIZE, element.boxY + element.boxHeight);

        const newContainerOffsetX = minX - PADDING;
        const newContainerOffsetY = minY - PADDING;
        const newContainerWidth = maxX - minX + PADDING * 2;
        const newContainerHeight = maxY - minY + PADDING * 2;

        const needUpdate =
            newContainerOffsetX < element.containerOffsetX ||
            newContainerOffsetY < element.containerOffsetY ||
            newContainerWidth > element.containerWidth ||
            newContainerHeight > element.containerHeight;

        if (needUpdate) {
            element.containerOffsetX = newContainerOffsetX;
            element.containerOffsetY = newContainerOffsetY;
            element.containerWidth = newContainerWidth;
            element.containerHeight = newContainerHeight;

            div.style.left = `${newContainerOffsetX}px`;
            div.style.top = `${newContainerOffsetY}px`;
            div.style.width = `${newContainerWidth}px`;
            div.style.height = `${newContainerHeight}px`;

            const svg = div.querySelector('.annotation-svg');
            if (svg) {
                svg.setAttribute('viewBox', `0 0 ${newContainerWidth} ${newContainerHeight}`);
            }

            const anchorEl = div.querySelector('.annotation-anchor');
            if (anchorEl) {
                anchorEl.style.left = `${element.anchorX - newContainerOffsetX}px`;
                anchorEl.style.top = `${element.anchorY - newContainerOffsetY}px`;
            }

            const boxEl = div.querySelector('.annotation-box');
            if (boxEl) {
                boxEl.style.left = `${element.boxX - newContainerOffsetX}px`;
                boxEl.style.top = `${element.boxY - newContainerOffsetY}px`;
            }

            const line = div.querySelector('.annotation-connection-line');
            if (line) {
                line.setAttribute('x1', element.anchorX - newContainerOffsetX + 5);
                line.setAttribute('y1', element.anchorY - newContainerOffsetY + 5);
                line.setAttribute('x2', element.boxX - newContainerOffsetX);
                line.setAttribute('y2', element.boxY - newContainerOffsetY + element.boxHeight / 2);
            }
        }
    },

    // 设置批注框调整大小
    setupAnnotationResize(box, element) {
        const resizeHandles = box.querySelectorAll('.annotation-resize-handle');
        const sizeDisplay = box.querySelector('.annotation-size-display');

        resizeHandles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const corner = handle.dataset.corner;
                const startX = e.clientX;
                const startY = e.clientY;
                const startWidth = element.boxWidth;
                const startHeight = element.boxHeight;
                const startBoxX = element.boxX;
                const startBoxY = element.boxY;
                const view = CanvasView.getView();

                const onMouseMove = (e) => {
                    const deltaX = (e.clientX - startX) / view.zoom;
                    const deltaY = (e.clientY - startY) / view.zoom;

                    let newWidth = startWidth;
                    let newHeight = startHeight;
                    let newBoxX = startBoxX;
                    let newBoxY = startBoxY;

                    if (corner.includes('e')) newWidth = startWidth + deltaX;
                    if (corner.includes('w')) {
                        newWidth = startWidth - deltaX;
                        newBoxX = startBoxX + deltaX;
                    }
                    if (corner.includes('s')) newHeight = startHeight + deltaY;
                    if (corner.includes('n')) {
                        newHeight = startHeight - deltaY;
                        newBoxY = startBoxY + deltaY;
                    }

                    const minWidth = 100;
                    const minHeight = 60;

                    if (newWidth < minWidth) {
                        newWidth = minWidth;
                        if (corner.includes('w')) {
                            newBoxX = startBoxX + startWidth - minWidth;
                        }
                    }
                    if (newHeight < minHeight) {
                        newHeight = minHeight;
                        if (corner.includes('n')) {
                            newBoxY = startBoxY + startHeight - minHeight;
                        }
                    }

                    element.boxWidth = newWidth;
                    element.boxHeight = newHeight;
                    element.boxX = newBoxX;
                    element.boxY = newBoxY;

                    box.style.width = `${newWidth}px`;
                    box.style.height = `${newHeight}px`;
                    box.style.left = `${newBoxX - element.containerOffsetX}px`;
                    box.style.top = `${newBoxY - element.containerOffsetY}px`;

                    const div = document.querySelector(`[data-element-id="${element.id}"]`);
                    if (div) {
                        const line = div.querySelector('.annotation-connection-line');
                        if (line) {
                            line.setAttribute('x2', newBoxX - element.containerOffsetX);
                            line.setAttribute('y2', newBoxY - element.containerOffsetY + newHeight / 2);
                        }
                        this.updateAnnotationContainerIfNeeded(div, element);
                    }

                    if (sizeDisplay) {
                        sizeDisplay.textContent = `${Math.round(newWidth)} × ${Math.round(newHeight)}`;
                    }
                };

                const onMouseUp = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                    HistoryManager.saveState();
                };

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        });
    }
};
