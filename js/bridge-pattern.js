// 桥接模式实现
// 分离抽象和实现,使两者可以独立变化

/**
 * 元素渲染器接口
 * 定义渲染元素的抽象接口
 */
class ElementRenderer {
    /**
     * 渲染元素
     * @param {Object} element - 元素数据
     * @param {HTMLElement} container - 容器元素
     */
    render(element, container) {
        throw new Error('子类必须实现 render 方法');
    }

    /**
     * 更新元素
     * @param {Object} element - 元素数据
     * @param {HTMLElement} domElement - DOM元素
     */
    update(element, domElement) {
        throw new Error('子类必须实现 update 方法');
    }

    /**
     * 销毁元素
     * @param {HTMLElement} domElement - DOM元素
     */
    destroy(domElement) {
        if (domElement && domElement.parentNode) {
            domElement.parentNode.removeChild(domElement);
        }
    }
}

/**
 * 页面元素渲染器
 */
class PageElementRenderer extends ElementRenderer {
    render(element, container) {
        const div = document.createElement('div');
        div.className = 'canvas-element page-element';
        div.dataset.elementId = element.id;

        div.style.left = `${element.position.x}px`;
        div.style.top = `${element.position.y}px`;
        div.style.width = `${element.width}px`;
        div.style.height = `${element.height}px`;

        // 添加拖拽手柄
        const dragHandle = this.createDragHandle(element);
        div.appendChild(dragHandle);

        // 添加iframe
        const iframe = this.createIframe(element);
        div.appendChild(iframe);

        container.appendChild(div);

        return div;
    }

    createDragHandle(element) {
        const dragHandle = document.createElement('div');
        dragHandle.className = 'page-drag-handle canvas-drag-handle';

        // 从PageLibrary获取页面名称
        const pageInfo = PageLibrary.getPageInfo(element.pageId);
        const pageName = pageInfo ? pageInfo.name : '页面';

        dragHandle.innerHTML = `<i class="fas fa-grip-vertical"></i> ${pageName}`;

        return dragHandle;
    }

    createIframe(element) {
        const pageInfo = PageLibrary.getPageInfo(element.pageId);
        const iframe = document.createElement('iframe');

        iframe.src = pageInfo ? pageInfo.filePath : `pages/${element.pageId}.html`;
        iframe.style.width = '100%';
        iframe.style.height = 'calc(100% - 30px)';
        iframe.style.marginTop = '30px';
        iframe.style.border = 'none';
        iframe.style.overflow = 'auto';
        iframe.style.pointerEvents = 'auto';

        // iframe加载完成后添加事件监听
        iframe.addEventListener('load', () => {
            this.setupIframeEvents(iframe);
        });

        return iframe;
    }

    setupIframeEvents(iframe) {
        try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

            iframeDoc.addEventListener('wheel', (e) => {
                if (e.ctrlKey) {
                    e.preventDefault();
                    e.stopPropagation();

                    // 重新分发事件到父文档
                    const newEvent = new WheelEvent('wheel', {
                        deltaX: e.deltaX,
                        deltaY: e.deltaY,
                        deltaZ: e.deltaZ,
                        deltaMode: e.deltaMode,
                        ctrlKey: e.ctrlKey,
                        shiftKey: e.shiftKey,
                        altKey: e.altKey,
                        metaKey: e.metaKey,
                        bubbles: true,
                        cancelable: true
                    });

                    iframe.dispatchEvent(newEvent);
                }
            }, { passive: false });
        } catch (error) {
            console.warn('无法访问iframe内部:', error);
        }
    }
}

/**
 * 箭头元素渲染器
 */
class ArrowElementRenderer extends ElementRenderer {
    render(element, container) {
        const div = document.createElement('div');
        div.className = 'canvas-element arrow-element';
        div.dataset.elementId = element.id;

        // 计算边界
        const points = element.points;
        const allX = points.map(p => p.x);
        const allY = points.map(p => p.y);

        const minX = Math.min(...allX);
        const minY = Math.min(...allY);
        const maxX = Math.max(...allX);
        const maxY = Math.max(...allY);

        const padding = 50;

        div.style.left = `${minX - padding}px`;
        div.style.top = `${minY - padding}px`;
        div.style.width = `${maxX - minX + padding * 2}px`;
        div.style.height = `${maxY - minY + padding * 2}px`;
        div.style.pointerEvents = 'auto';

        // 创建SVG
        const svg = this.createArrowSVG(element, minX, minY, padding);
        div.appendChild(svg);

        // 添加点击事件
        div.addEventListener('click', (e) => {
            e.stopPropagation();
            ElementManager.selectElement(element.id);
        });

        container.appendChild(div);

        return div;
    }

    createArrowSVG(element, minX, minY, padding) {
        const points = element.points;
        const maxX = Math.max(...points.map(p => p.x));
        const maxY = Math.max(...points.map(p => p.y));

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('arrow-svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('viewBox', `${-padding} ${-padding} ${maxX - minX + padding * 2} ${maxY - minY + padding * 2}`);
        svg.style.overflow = 'visible';

        // 创建路径
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const pathData = this.generateArrowPath(points, minX, minY);

        path.setAttribute('d', pathData);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', '#e74c3c');
        path.setAttribute('stroke-width', '3');
        path.style.pointerEvents = 'stroke';

        // 创建箭头标记
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const markerId = `arrowhead_${element.id}`;
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');

        marker.setAttribute('id', markerId);
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '10');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '3');
        marker.setAttribute('orient', 'auto');

        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '10 3, 0 0, 0 6');
        polygon.setAttribute('fill', '#e74c3c');

        marker.appendChild(polygon);
        defs.appendChild(marker);
        svg.appendChild(defs);

        path.setAttribute('marker-end', `url(#${markerId})`);
        svg.appendChild(path);

        return svg;
    }

    generateArrowPath(points, offsetX, offsetY) {
        if (points.length < 2) return '';

        let path = '';
        path += `M ${points[0].x - offsetX} ${points[0].y - offsetY}`;

        for (let i = 1; i < points.length; i++) {
            const x = points[i].x - offsetX;
            const y = points[i].y - offsetY;
            path += ` L ${x} ${y}`;
        }

        return path;
    }
}

/**
 * 批注标记元素渲染器
 */
class AnnotationElementRenderer extends ElementRenderer {
    render(element, container) {
        const div = document.createElement('div');
        div.className = 'canvas-element annotation-element';
        div.dataset.elementId = element.id;

        // 计算容器边界
        const ANCHOR_SIZE = 10;
        const PADDING = 10;

        const anchorLeft = element.anchorX;
        const anchorRight = element.anchorX + ANCHOR_SIZE;
        const anchorTop = element.anchorY;
        const anchorBottom = element.anchorY + ANCHOR_SIZE;

        const boxLeft = element.boxX;
        const boxRight = element.boxX + element.boxWidth;
        const boxTop = element.boxY;
        const boxBottom = element.boxY + element.boxHeight;

        const minX = Math.min(anchorLeft, boxLeft);
        const maxX = Math.max(anchorRight, boxRight);
        const minY = Math.min(anchorTop, boxTop);
        const maxY = Math.max(anchorBottom, boxBottom);

        div.style.left = `${minX - PADDING}px`;
        div.style.top = `${minY - PADDING}px`;
        div.style.width = `${maxX - minX + PADDING * 2}px`;
        div.style.height = `${maxY - minY + PADDING * 2}px`;
        div.style.pointerEvents = 'none';

        // 创建SVG
        const svg = this.createSVG(element);
        div.appendChild(svg);

        // 创建锚点
        const anchor = this.createAnchor(element);
        div.appendChild(anchor);

        // 创建批注框
        const box = this.createBox(element);
        div.appendChild(box);

        // 添加点击事件
        div.addEventListener('click', (e) => {
            if (e.target === div || e.target === svg) {
                e.stopPropagation();
                ElementManager.selectElement(element.id);
            }
        });

        container.appendChild(div);

        return div;
    }

    createSVG(element) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('annotation-svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.style.position = 'absolute';
        svg.style.left = '0';
        svg.style.top = '0';
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
        line.setAttribute('class', 'annotation-connection-line');

        svg.appendChild(line);

        return svg;
    }

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

        return anchor;
    }

    createBox(element) {
        const box = document.createElement('div');
        box.className = 'annotation-box';
        box.style.position = 'absolute';
        box.style.left = `${element.boxX - element.containerOffsetX}px`;
        box.style.top = `${element.boxY - element.containerOffsetY}px`;
        box.style.width = `${element.boxWidth}px`;
        box.style.height = `${element.boxHeight}px`;
        box.style.backgroundColor = '#FDEEB5';
        box.style.border = '2px solid #E8D5A3';
        box.style.borderRadius = '4px';
        box.style.padding = '8px';
        box.style.cursor = 'move';
        box.style.pointerEvents = 'auto';
        box.dataset.elementId = element.id;
        box.dataset.part = 'box';

        // 添加内容
        const content = document.createElement('div');
        content.className = 'annotation-content';
        content.contentEditable = true;
        content.style.width = '100%';
        content.style.height = '100%';
        content.style.fontSize = '14px';
        content.style.fontFamily = 'inherit';
        content.style.color = '#333';
        content.style.outline = 'none';
        content.textContent = element.content || '输入批注';

        let originalContent = element.content || '';

        content.addEventListener('input', (e) => {
            element.content = e.target.textContent;
            ElementManager.adjustAnnotationHeight(box, content, element);
        });

        content.addEventListener('blur', (e) => {
            const currentContent = e.target.textContent;
            if (currentContent.trim() && currentContent !== '输入批注' && currentContent !== originalContent) {
                HistoryManager.saveState();
                originalContent = currentContent;
            }
        });

        box.appendChild(content);

        // 添加尺寸显示
        const sizeDisplay = document.createElement('div');
        sizeDisplay.className = 'annotation-size-display';
        sizeDisplay.textContent = `${Math.round(element.boxWidth)} × ${Math.round(element.boxHeight)}`;
        box.appendChild(sizeDisplay);

        // 添加调整大小手柄
        const corners = ['nw', 'ne', 'sw', 'se'];
        corners.forEach(corner => {
            const resizeHandle = document.createElement('div');
            resizeHandle.className = `annotation-resize-handle annotation-resize-${corner}`;
            resizeHandle.dataset.corner = corner;
            resizeHandle.dataset.elementId = element.id;
            box.appendChild(resizeHandle);
        });

        // 添加删除按钮
        const deleteBtn = document.createElement('div');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
        deleteBtn.style.pointerEvents = 'auto';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            ElementManager.deleteElement(element.id);
        });

        box.style.position = 'relative';
        box.appendChild(deleteBtn);

        return box;
    }
}

/**
 * 渲染器工厂
 * 使用工厂模式创建渲染器
 */
const RendererFactory = {
    renderers: {},

    /**
     * 注册渲染器
     * @param {string} type - 元素类型
     * @param {ElementRenderer} renderer - 渲染器实例
     */
    register(type, renderer) {
        this.renderers[type] = renderer;
    },

    /**
     * 获取渲染器
     * @param {string} type - 元素类型
     * @returns {ElementRenderer|null}
     */
    getRenderer(type) {
        return this.renderers[type] || null;
    },

    /**
     * 渲染元素
     * @param {Object} element - 元素数据
     * @param {HTMLElement} container - 容器元素
     * @returns {HTMLElement|null}
     */
    render(element, container) {
        const renderer = this.getRenderer(element.type);
        if (!renderer) {
            console.error(`未找到类型为 ${element.type} 的渲染器`);
            return null;
        }

        return renderer.render(element, container);
    },

    /**
     * 初始化所有渲染器
     */
    init() {
        this.register('page', new PageElementRenderer());
        this.register('arrow', new ArrowElementRenderer());
        this.register('annotation', new AnnotationElementRenderer());
    }
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ElementRenderer,
        PageElementRenderer,
        ArrowElementRenderer,
        AnnotationElementRenderer,
        RendererFactory
    };
}
