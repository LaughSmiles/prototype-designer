// 元素管理模块
// 负责画布上所有元素的创建、更新、删除等操作

const ElementManager = {
    // 画布状态
    state: {
        elements: [],
        selectedElement: null,
        nextId: 1
    },

    // 初始化
    init() {
        this.setupKeyboardEvents();
    },

    // 添加页面元素
    addPageElement(pageId, x, y) {
        const pageInfo = PageLibrary.getPageInfo(pageId);
        if (!pageInfo) return;

        const element = {
            id: `elem_${this.state.nextId++}`,
            type: 'page',
            pageId: pageId,
            position: { x, y },
            width: pageInfo.originalSize.width,
            height: pageInfo.originalSize.height
        };

        this.state.elements.push(element);
        this.renderElement(element);
        this.updateStatusBar();
    },

    // 添加箭头元素
    addArrowElement(startPoint, endPoint) {
        const element = {
            id: `elem_${this.state.nextId++}`,
            type: 'arrow',
            points: [startPoint, endPoint],
            position: { x: 0, y: 0 },
            width: Math.abs(endPoint.x - startPoint.x),
            height: Math.abs(endPoint.y - startPoint.y)
        };

        this.state.elements.push(element);
        this.renderElement(element);
        this.updateStatusBar();
    },

    // 添加文字元素
    addTextElement(text, x, y) {
        const element = {
            id: `elem_${this.state.nextId++}`,
            type: 'text',
            text: text,
            position: { x, y },
            fontSize: 16,
            color: '#2c3e50',
            width: 150,
            height: 30
        };

        this.state.elements.push(element);
        this.renderElement(element);
        this.updateStatusBar();
    },

    // 渲染元素
    renderElement(element) {
        const canvas = document.getElementById('canvas');
        if (!canvas) return;

        const div = document.createElement('div');
        div.className = `canvas-element ${element.type}-element`;
        div.dataset.elementId = element.id;

        if (element.type === 'page') {
            // 页面元素
            div.style.left = `${element.position.x}px`;
            div.style.top = `${element.position.y}px`;
            div.style.width = `${element.width}px`;
            div.style.height = `${element.height}px`;

            // 添加拖拽手柄（顶部标题栏）
            const dragHandle = document.createElement('div');
            dragHandle.className = 'page-drag-handle';
            dragHandle.innerHTML = `<i class="fas fa-grip-vertical"></i> ${PageLibrary.pageMap[element.pageId] || '页面'}`;
            div.appendChild(dragHandle);

            // 使用 iframe 显示页面预览（支持滚动）
            const iframe = document.createElement('iframe');
            iframe.src = `pages/${element.pageId}.html`;
            iframe.style.width = '100%';
            iframe.style.height = 'calc(100% - 30px)'; // 减去手柄高度
            iframe.style.marginTop = '30px'; // 为手柄留出空间
            iframe.style.border = 'none';
            iframe.style.overflow = 'auto'; // 启用滚动
            iframe.style.pointerEvents = 'auto'; // 允许iframe内交互

            // 添加沙箱属性，限制iframe的某些行为
            // 注意：由于是同域页面，可以使用allow-scripts等权限
            iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-forms allow-popups allow-modals');

            // 防止iframe内部的缩放行为
            iframe.setAttribute('allowfullscreen', 'false');

            // 在iframe加载完成后，注入脚本阻止内部的缩放行为
            iframe.addEventListener('load', function() {
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

                    // 向iframe内部注入滚轮事件阻止脚本
                    const script = iframeDoc.createElement('script');
                    script.textContent = `
                        // 阻止iframe内部的浏览器缩放
                        document.addEventListener('wheel', function(e) {
                            if (e.ctrlKey) {
                                e.preventDefault();
                                e.stopPropagation();
                                e.stopImmediatePropagation();
                                return false;
                            }
                        }, { passive: false });

                        // 阻止iframe内部的键盘缩放快捷键
                        document.addEventListener('keydown', function(e) {
                            if (e.ctrlKey && (e.key === '+' || e.key === '=' || e.key === '-' || e.key === '0')) {
                                e.preventDefault();
                                e.stopPropagation();
                                e.stopImmediatePropagation();
                                return false;
                            }
                        }, true);

                        // 阻止触摸手势缩放
                        document.addEventListener('touchmove', function(e) {
                            if (e.scale && e.scale !== 1) {
                                e.preventDefault();
                                return false;
                            }
                        }, { passive: false });
                    `;
                    iframeDoc.head.appendChild(script);
                } catch (err) {
                    // 跨域iframe无法访问，但已通过sandbox限制
                    console.log('无法注入iframe脚本（可能是跨域限制）');
                }
            });

            div.appendChild(iframe);

        } else if (element.type === 'arrow') {
            // 箭头元素
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.classList.add('arrow-svg');
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');

            const points = element.points;
            const minX = Math.min(points[0].x, points[1].x);
            const minY = Math.min(points[0].y, points[1].y);
            const maxX = Math.max(points[0].x, points[1].x);
            const maxY = Math.max(points[0].y, points[1].y);

            div.style.left = `${minX}px`;
            div.style.top = `${minY}px`;
            div.style.width = `${maxX - minX}px`;
            div.style.height = `${maxY - minY}px`;

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', points[0].x - minX);
            line.setAttribute('y1', points[0].y - minY);
            line.setAttribute('x2', points[1].x - minX);
            line.setAttribute('y2', points[1].y - minY);
            line.setAttribute('stroke', '#e74c3c');
            line.setAttribute('stroke-width', '3');
            line.setAttribute('marker-end', 'url(#arrowhead)');

            // 箭头标记
            const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
            marker.setAttribute('id', 'arrowhead');
            marker.setAttribute('markerWidth', '10');
            marker.setAttribute('markerHeight', '10');
            marker.setAttribute('refX', '9');
            marker.setAttribute('refY', '3');
            marker.setAttribute('orient', 'auto');

            const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            polygon.setAttribute('points', '0 0, 10 3, 0 6');
            polygon.setAttribute('fill', '#e74c3c');

            marker.appendChild(polygon);
            defs.appendChild(marker);
            svg.appendChild(defs);
            svg.appendChild(line);
            div.appendChild(svg);

        } else if (element.type === 'text') {
            // 文字元素
            div.style.left = `${element.position.x}px`;
            div.style.top = `${element.position.y}px`;
            div.style.width = `${element.width}px`;
            div.style.height = `${element.height}px`;
            div.style.fontSize = `${element.fontSize}px`;
            div.style.color = element.color;
            div.textContent = element.text;
            div.contentEditable = true;

            // 文字编辑事件
            div.addEventListener('input', (e) => {
                element.text = e.target.textContent;
            });

            div.addEventListener('blur', (e) => {
                if (!e.target.textContent.trim()) {
                    this.deleteElement(element.id);
                }
            });
        }


        // 添加删除按钮
        const deleteBtn = document.createElement('div');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteElement(element.id);
        });
        div.appendChild(deleteBtn);

        // 双击取消选择
        div.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.deselectElement();
        });

        canvas.appendChild(div);
    },

    // 获取元素
    getElement(id) {
        return this.state.elements.find(e => e.id === id);
    },

    // 选中元素
    selectElement(id) {
        // 移除之前的选中状态
        this.deselectElement();

        const element = this.getElement(id);
        if (!element) return;

        this.state.selectedElement = id;

        const div = document.querySelector(`[data-element-id="${id}"]`);
        if (div) {
            div.classList.add('selected');
        }

        this.updateStatusBar();
    },

    // 取消选中
    deselectElement() {
        if (this.state.selectedElement) {
            const div = document.querySelector(`[data-element-id="${this.state.selectedElement}"]`);
            if (div) {
                div.classList.remove('selected');
            }
            this.state.selectedElement = null;
            this.updateStatusBar();
        }
    },

    // 更新元素位置
    updateElementPosition(div, element) {
        div.style.left = `${element.position.x}px`;
        div.style.top = `${element.position.y}px`;
    },

    // 更新元素大小
    updateElementSize(div, element) {
        div.style.width = `${element.width}px`;
        div.style.height = `${element.height}px`;

        // 对于页面元素，需要调整iframe大小
        if (element.type === 'page') {
            const iframe = div.querySelector('iframe');
            if (iframe) {
                iframe.style.width = '100%';
                iframe.style.height = '100%';
            }
        }

        // 对于箭头元素，需要重新绘制
        if (element.type === 'arrow') {
            const svg = div.querySelector('svg');
            if (svg) {
                const points = element.points;
                const minX = Math.min(points[0].x, points[1].x);
                const minY = Math.min(points[0].y, points[1].y);
                const maxX = Math.max(points[0].x, points[1].x);
                const maxY = Math.max(points[0].y, points[1].y);

                div.style.left = `${minX}px`;
                div.style.top = `${minY}px`;
                div.style.width = `${maxX - minX}px`;
                div.style.height = `${maxY - minY}px`;

                const line = svg.querySelector('line');
                if (line) {
                    line.setAttribute('x1', points[0].x - minX);
                    line.setAttribute('y1', points[0].y - minY);
                    line.setAttribute('x2', points[1].x - minX);
                    line.setAttribute('y2', points[1].y - minY);
                }
            }
        }
    },

    // 删除元素
    deleteElement(id) {
        const index = this.state.elements.findIndex(e => e.id === id);
        if (index === -1) return;

        this.state.elements.splice(index, 1);

        const div = document.querySelector(`[data-element-id="${id}"]`);
        if (div) {
            div.remove();
        }

        if (this.state.selectedElement === id) {
            this.state.selectedElement = null;
        }

        this.updateStatusBar();
        PageLibrary.showHint('元素已删除');
    },

    // 删除所有元素
    clearAll() {
        if (this.state.elements.length === 0) return;

        if (!confirm(`确定要清空画布上的 ${this.state.elements.length} 个元素吗？`)) {
            return;
        }

        this.state.elements = [];
        this.state.selectedElement = null;

        const canvas = document.getElementById('canvas');
        const elements = canvas.querySelectorAll('.canvas-element');
        elements.forEach(el => el.remove());

        this.updateStatusBar();
        PageLibrary.showHint('画布已清空');
    },

    // 设置键盘事件
    setupKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            // Delete 键：删除选中元素
            if (e.key === 'Delete' && this.state.selectedElement) {
                this.deleteElement(this.state.selectedElement);
            }

            // Esc 键：取消选择
            if (e.key === 'Escape') {
                this.deselectElement();
                Tools.setTool('select');
            }

            // Ctrl+S：保存
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                Storage.save();
            }

            // 快捷键切换工具
            if (e.key === 's' && !e.ctrlKey) {
                Tools.setTool('select');
            } else if (e.key === 'a' && !e.ctrlKey) {
                Tools.setTool('arrow');
            } else if (e.key === 't' && !e.ctrlKey) {
                Tools.setTool('text');
            }
        });
    },

    // 更新状态栏
    updateStatusBar() {
        const countSpan = document.getElementById('elementCount');
        const selectedSpan = document.getElementById('selectedInfo');

        if (countSpan) {
            countSpan.textContent = `元素: ${this.state.elements.length}`;
        }

        if (selectedSpan) {
            if (this.state.selectedElement) {
                const element = this.getElement(this.state.selectedElement);
                let info = '';
                if (element.type === 'page') {
                    info = `选中: ${PageLibrary.pageMap[element.pageId]} (拖拽手柄移动)`;
                } else if (element.type === 'arrow') {
                    info = `选中: 箭头`;
                } else if (element.type === 'text') {
                    info = `选中: 文字`;
                }
                selectedSpan.textContent = info;
            } else {
                selectedSpan.textContent = '未选择';
            }
        }
    },

    // 获取所有元素数据（用于保存）
    getAllElements() {
        return JSON.parse(JSON.stringify(this.state.elements));
    },

    // 设置元素数据（用于加载）
    setAllElements(elements) {
        // 清空现有元素
        const canvas = document.getElementById('canvas');
        const existing = canvas.querySelectorAll('.canvas-element');
        existing.forEach(el => el.remove());

        // 设置新元素
        this.state.elements = JSON.parse(JSON.stringify(elements));
        this.state.nextId = Math.max(...elements.map(e => parseInt(e.id.split('_')[1])), 0) + 1;

        // 渲染所有元素
        this.state.elements.forEach(element => {
            this.renderElement(element);
        });

        this.updateStatusBar();
    },

    // 获取选中元素ID
    getSelectedElementId() {
        return this.state.selectedElement;
    }
};