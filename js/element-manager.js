// 元素管理模块
// 负责画布上所有元素的创建、更新、删除等操作

const ElementManager = {
    // 画布状态
    state: {
        elements: [],
        selectedElement: null,
        nextId: 1,
        // 页面使用计数器
        usageCount: {}
    },

    // 初始化
    init() {
        this.setupKeyboardEvents();
        // 初始化所有页面的计数为0
        this.initializeUsageCount();
    },

    // 初始化使用计数器(从PageLibrary获取页面ID)
    initializeUsageCount() {
        const pageIds = PageLibrary.getAllPageIds();
        pageIds.forEach(id => {
            this.state.usageCount[id] = 0;
        });
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

        // 增加页面使用计数
        this.incrementUsageCount(pageId);

        this.updateStatusBar();
    },

    // 增加页面使用计数
    incrementUsageCount(pageId) {
        if (!this.state.usageCount.hasOwnProperty(pageId)) {
            this.state.usageCount[pageId] = 0;
        }
        this.state.usageCount[pageId]++;
        // 更新页面库显示
        PageLibrary.updateUsageBadge(pageId, this.state.usageCount[pageId]);
    },

    // 减少页面使用计数
    decrementUsageCount(pageId) {
        if (this.state.usageCount.hasOwnProperty(pageId) && this.state.usageCount[pageId] > 0) {
            this.state.usageCount[pageId]--;
            // 更新页面库显示
            PageLibrary.updateUsageBadge(pageId, this.state.usageCount[pageId]);
        }
    },

    // 获取页面使用计数
    getUsageCount(pageId) {
        return this.state.usageCount[pageId] || 0;
    },

    // 设置所有使用计数（用于导入数据）
    setUsageCounts(counts) {
        this.state.usageCount = { ...counts };
        // 更新所有徽章显示
        Object.keys(this.state.usageCount).forEach(pageId => {
            PageLibrary.updateUsageBadge(pageId, this.state.usageCount[pageId]);
        });
    },

    // 获取所有使用计数（用于导出数据）
    getUsageCounts() {
        return { ...this.state.usageCount };
    },

    // 添加箭头元素
    addArrowElement(points) {
        const element = {
            id: `elem_${this.state.nextId++}`,
            type: 'arrow',
            points: points,  // 所有点的数组
            position: { x: 0, y: 0 },
            width: 0,
            height: 0
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

    // 添加卡片注释元素
    addNoteElement(text, x, y) {
        const element = {
            id: `elem_${this.state.nextId++}`,
            type: 'note',
            text: text,
            position: { x, y },
            width: 200,
            height: 120
        };

        this.state.elements.push(element);
        this.renderElement(element);
        this.updateStatusBar();

        // 返回元素ID,用于后续聚焦
        return element.id;
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

            // 添加拖拽手柄(顶部标题栏)
            const dragHandle = document.createElement('div');
            dragHandle.className = 'page-drag-handle';
            const pageName = PageLibrary.getPageName(element.pageId);
            dragHandle.innerHTML = `<i class="fas fa-grip-vertical"></i> ${pageName || '页面'}`;
            div.appendChild(dragHandle);

            // 使用 iframe 显示页面预览（支持滚动）
            const iframe = document.createElement('iframe');
            // 从 PageLibrary 获取正确的文件路径
            const pageInfo = PageLibrary.getPageInfo(element.pageId);
            iframe.src = pageInfo ? pageInfo.filePath : `pages/${element.pageId}.html`;
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
            const points = element.points;
            if (points.length < 2) return;

            // 计算所有点的边界
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

            // 关键修改：让div不响应鼠标事件,只有SVG路径响应
            div.style.pointerEvents = 'none';

            // 创建SVG
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.classList.add('arrow-svg');
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
            svg.setAttribute('viewBox', `${-padding} ${-padding} ${maxX - minX + padding * 2} ${maxY - minY + padding * 2}`);
            svg.style.overflow = 'visible';

            // 生成路径（带微微弯曲）
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const pathData = this.generateArrowPath(points, minX, minY);

            path.setAttribute('d', pathData);
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke', '#e74c3c');
            path.setAttribute('stroke-width', '3');

            // 关键修改：让路径响应鼠标事件（只有点击线条本身才触发）
            path.style.pointerEvents = 'stroke';

            // 箭头标记
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
            polygon.setAttribute('points', '0 0, 10 3, 0 6');
            polygon.setAttribute('fill', '#e74c3c');

            marker.appendChild(polygon);
            defs.appendChild(marker);
            svg.appendChild(defs);

            path.setAttribute('marker-end', `url(#${markerId})`);
            svg.appendChild(path);
            div.appendChild(svg);

            // 更新元素的位置和大小
            element.position = { x: minX - padding, y: minY - padding };
            element.width = maxX - minX + padding * 2;
            element.height = maxY - minY + padding * 2;

        } else if (element.type === 'note') {
            // 卡片注释元素
            div.style.left = `${element.position.x}px`;
            div.style.top = `${element.position.y}px`;
            div.style.width = `${element.width}px`;
            div.style.height = `${element.height}px`;
            div.classList.add('note-element');

            // 卡片内容容器
            const contentDiv = document.createElement('div');
            contentDiv.className = 'note-content';
            contentDiv.contentEditable = true;
            contentDiv.textContent = element.text || '输入注释'; // 默认文字

            // 卡片编辑事件
            contentDiv.addEventListener('input', (e) => {
                element.text = e.target.textContent;
                // 自动调整卡片高度以适应内容
                this.adjustNoteHeight(div, contentDiv, element);
            });

            // 失焦时如果内容为空则删除卡片
            contentDiv.addEventListener('blur', (e) => {
                if (!e.target.textContent.trim() || e.target.textContent === '输入注释') {
                    this.deleteElement(element.id);
                }
            });

            div.appendChild(contentDiv);

            // 添加拖拽手柄
            const dragHandle = document.createElement('div');
            dragHandle.className = 'note-drag-handle';
            dragHandle.innerHTML = '<i class="fas fa-grip-vertical"></i> 注释';
            div.appendChild(dragHandle);

            // 添加分辨率显示
            const sizeDisplay = document.createElement('div');
            sizeDisplay.className = 'note-size-display';
            sizeDisplay.textContent = `${element.width}×${element.height}`;
            div.appendChild(sizeDisplay);

            // 添加四个角的resize手柄
            const corners = ['nw', 'ne', 'sw', 'se'];
            corners.forEach(corner => {
                const resizeHandle = document.createElement('div');
                resizeHandle.className = `note-resize-handle note-resize-${corner}`;
                resizeHandle.dataset.corner = corner;
                resizeHandle.dataset.elementId = element.id;
                div.appendChild(resizeHandle);
            });
        }

        // 添加删除按钮
        const deleteBtn = document.createElement('div');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
        // 关键修复：让删除按钮可以响应鼠标事件(覆盖父元素的pointerEvents: 'none')
        deleteBtn.style.pointerEvents = 'auto';
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

        const element = this.state.elements[index];

        // 如果是页面元素，减少使用计数
        if (element.type === 'page') {
            this.decrementUsageCount(element.pageId);
        }

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

        // 重置所有页面使用计数
        this.initializeUsageCount();
        // 更新所有徽章显示
        Object.keys(this.state.usageCount).forEach(pageId => {
            PageLibrary.updateUsageBadge(pageId, 0);
        });

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

            // 空格键：重置视图到50%（但不在编辑注释时）
            if ((e.code === 'Space' || e.key === ' ') && !e.target.closest('.note-content')) {
                e.preventDefault();
                CanvasView.zoomReset50();
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
            } else if (e.key === 'n' && !e.ctrlKey) {
                Tools.setTool('note');
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
                    const pageName = PageLibrary.getPageName(element.pageId);
                    info = `选中: ${pageName} (拖拽手柄移动)`;
                } else if (element.type === 'arrow') {
                    info = `选中: 箭头`;
                } else if (element.type === 'text') {
                    info = `选中: 文字`;
                } else if (element.type === 'note') {
                    info = `选中: 卡片注释 (拖拽手柄移动)`;
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

        // 重新计算使用计数
        this.recalculateUsageCounts();

        this.updateStatusBar();
    },

    // 重新计算使用计数（从当前元素统计）
    recalculateUsageCounts() {
        // 重置计数
        this.initializeUsageCount();

        // 统计每个页面的使用次数
        this.state.elements.forEach(element => {
            if (element.type === 'page') {
                this.state.usageCount[element.pageId]++;
            }
        });

        // 更新所有徽章显示
        Object.keys(this.state.usageCount).forEach(pageId => {
            PageLibrary.updateUsageBadge(pageId, this.state.usageCount[pageId]);
        });
    },

    // 获取选中元素ID
    getSelectedElementId() {
        return this.state.selectedElement;
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

    // 聚焦到卡片注释内容区域
    focusNoteContent(elementId) {
        const div = document.querySelector(`[data-element-id="${elementId}"]`);
        if (!div) return;

        const contentDiv = div.querySelector('.note-content');
        if (contentDiv) {
            contentDiv.focus();
            // 选中所有文字,方便用户直接替换
            document.execCommand('selectAll', false, null);
        }
    },

    // 自动调整卡片注释高度以适应内容(简化版:精准控制)
    adjustNoteHeight(div, contentDiv, element) {
        const MIN_HEIGHT = 120; // 最小高度
        const FONT_SIZE = 14; // 字体大小
        const LINE_HEIGHT = 1.6; // 行高倍数

        // 计算一行文字的实际高度
        const oneLineHeight = FONT_SIZE * LINE_HEIGHT; // = 22.4px

        // 获取内容的实际高度(需要减去padding)
        const paddingTop = 38; // .note-content 的 padding-top
        const paddingBottom = 12; // .note-content 的 padding-bottom
        const scrollHeight = contentDiv.scrollHeight;
        const actualContentHeight = scrollHeight - paddingTop - paddingBottom;

        // 计算剩余空间
        const remainingSpace = element.height - actualContentHeight;

        // 当剩余空间少于1行文字时,提前增加1行
        if (remainingSpace < oneLineHeight) {
            // 每次只增加1行高度,保持平滑
            const newHeight = Math.max(element.height + oneLineHeight, MIN_HEIGHT);

            // 更新元素数据
            element.height = newHeight;

            // 更新DOM样式
            div.style.height = `${newHeight}px`;

            // 更新分辨率显示
            const sizeDisplay = div.querySelector('.note-size-display');
            if (sizeDisplay) {
                sizeDisplay.textContent = `${Math.round(element.width)}×${Math.round(newHeight)}`;
            }
        }
    },

    // 更新连接线(占位函数,避免报错)
    updateConnectionsForElement(elementId) {
        // 这个函数用于连接线功能
        // 当前不需要实现,留空避免报错
        // 如果后续需要连接线功能,可以在这里实现
    }
};