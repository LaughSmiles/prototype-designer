// 元素管理模块
// 负责画布上所有元素的创建、更新、删除等操作

const ElementManager = {
    // 画布状态
    state: {
        elements: [],
        selectedElement: null,  // 单选时的选中元素(向后兼容)
        selectedElements: [],   // 多选时的选中元素数组
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
    // saveState: 是否保存状态用于撤销(默认为true,批量操作时设为false)
    addPageElement(pageId, x, y, saveState = true) {
        const pageInfo = PageLibrary.getPageInfo(pageId);
        if (!pageInfo) return;

        const element = {
            id: PageManager.generateElementId(),
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

        // 只保存一次:操作后的状态
        if (saveState) {
            HistoryManager.saveState();
        }
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
            id: PageManager.generateElementId(),
            type: 'arrow',
            points: points,  // 所有点的数组
            position: { x: 0, y: 0 },
            width: 0,
            height: 0
        };

        this.state.elements.push(element);
        this.renderElement(element);
        this.updateStatusBar();

        // 在添加元素之后保存状态用于撤销
        HistoryManager.saveState();
    },

    // 添加文字元素
    addTextElement(text, x, y) {
        const element = {
            id: PageManager.generateElementId(),
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

        // 在添加元素之后保存状态用于撤销
        HistoryManager.saveState();
    },

    // 添加文字卡片元素
    addNoteElement(text, x, y) {
        const element = {
            id: PageManager.generateElementId(),
            type: 'note',
            text: text,
            position: { x, y },
            width: 200,
            height: 120
        };

        this.state.elements.push(element);
        this.renderElement(element);
        this.updateStatusBar();

        // 在添加元素之后保存状态用于撤销
        HistoryManager.saveState();

        // 返回元素ID,用于后续聚焦
        return element.id;
    },

    // 添加批注标记元素
    addAnnotationElement(anchorX, anchorY) {
        // 批注框默认在锚点右侧60px处
        const boxX = anchorX + 60;
        // 垂直居中对齐:锚点中心(anchorY + 5)与批注框中心(boxY + 60)对齐
        // anchorY + 5 = boxY + 60
        // 因此: boxY = anchorY - 55
        const boxY = anchorY - 55;

        const element = {
            id: PageManager.generateElementId(),
            type: 'annotation',
            anchorX: anchorX,
            anchorY: anchorY,
            boxX: boxX,
            boxY: boxY,
            boxWidth: 200,  // 批注框实际宽度
            boxHeight: 120, // 批注框实际高度
            width: 10000,   // 容器宽度(用于容纳锚点和框)
            height: 10000,  // 容器高度
            content: ''
        };

        this.state.elements.push(element);
        this.renderElement(element);
        this.updateStatusBar();

        // 在添加元素之后保存状态用于撤销
        HistoryManager.saveState();

        // 返回元素ID,用于后续聚焦
        return element.id;
    },

    // 渲染元素(不更新计数,用于撤销/重做)
    renderElementWithoutCount(element) {
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
            dragHandle.className = 'page-drag-handle canvas-drag-handle';
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

            div.appendChild(iframe);

            // 在 iframe 加载完成后,禁止 Ctrl+滚轮 的浏览器默认缩放行为
            iframe.addEventListener('load', () => {
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

                    iframeDoc.addEventListener('wheel', (e) => {
                        if (e.ctrlKey) {
                            // 阻止浏览器默认缩放行为
                            e.preventDefault();
                            e.stopPropagation();

                            // 将事件重新分发到父文档,让画布能够正常缩放
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

                            // 在 iframe 元素上分发事件,让它冒泡到父文档
                            iframe.dispatchEvent(newEvent);
                        }
                    }, { passive: false }); // 必须使用 passive: false 才能调用 preventDefault()

                    console.log('✅ iframe缩放保护已启用');
                } catch (error) {
                    console.warn('⚠️ 无法访问iframe内部(跨域限制):', error);
                }
            });

            // 添加右键菜单事件
            div.addEventListener('contextmenu', (e) => {
                e.preventDefault(); // 阻止浏览器默认右键菜单

                // 如果箭头工具正在绘制,不显示右键菜单,让箭头工具处理
                const currentTool = Tools.getCurrentTool();
                if (currentTool === 'arrow' && Tools.arrowState.isDrawing) {
                    return;
                }

                // 获取页面信息
                const pageInfo = PageLibrary.getPageInfo(element.pageId);
                const filePath = pageInfo ? pageInfo.filePath : '';

                // 显示自定义右键菜单(传递 element, iframe, pageInfo)
                this.showContextMenu(e.clientX, e.clientY, element, iframe, pageInfo);
            });

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

            // 关键修改：让div响应鼠标事件,确保箭头在iframe上方时能被拖动
            div.style.pointerEvents = 'auto';

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
            // 关键修复：箭头头部应该指向右侧(正X轴方向)
            // 尖端在(10,3),底边在左侧,orient='auto'会自动旋转指向正确方向
            polygon.setAttribute('points', '10 3, 0 0, 0 6');
            polygon.setAttribute('fill', '#e74c3c');

            marker.appendChild(polygon);
            defs.appendChild(marker);
            svg.appendChild(defs);

            path.setAttribute('marker-end', `url(#${markerId})`);
            svg.appendChild(path);
            div.appendChild(svg);

            // 添加点击选中事件
            div.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectElement(element.id);
            });

            // 更新元素的位置和大小
            element.position = { x: minX - padding, y: minY - padding };
            element.width = maxX - minX + padding * 2;
            element.height = maxY - minY + padding * 2;

        } else if (element.type === 'note') {
            // 文字卡片元素
            div.style.left = `${element.position.x}px`;
            div.style.top = `${element.position.y}px`;
            div.style.width = `${element.width}px`;
            div.style.height = `${element.height}px`;
            div.classList.add('note-element');

            // 关键修复：让div响应鼠标事件,确保文字卡片在iframe上方时能被点击和编辑
            div.style.pointerEvents = 'auto';

            // 卡片内容容器
            const contentDiv = document.createElement('div');
            contentDiv.className = 'note-content';
            contentDiv.contentEditable = true;
            contentDiv.textContent = element.text || '输入文字'; // 默认文字

            // 卡片编辑事件
            let originalText = element.text || '';
            contentDiv.addEventListener('input', (e) => {
                element.text = e.target.textContent;
                // 自动调整卡片高度以适应内容
                this.adjustNoteHeight(div, contentDiv, element);
            });

            // 失焦时保存状态（如果内容不为空）
            contentDiv.addEventListener('blur', (e) => {
                const currentText = e.target.textContent;
                // 只有当内容不为空，且内容真正变化了，才保存状态
                if (currentText.trim() && currentText !== '输入文字' && currentText !== originalText) {
                    HistoryManager.saveState();
                    originalText = currentText; // 更新原始文本
                }
            });

            div.appendChild(contentDiv);

            // 添加拖拽手柄
            const dragHandle = document.createElement('div');
            dragHandle.className = 'note-drag-handle';
            dragHandle.innerHTML = '<i class="fas fa-grip-vertical"></i> 文字';
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

            // 添加点击选中事件
            div.addEventListener('click', (e) => {
                // 如果点击的是可编辑内容区域,不触发选中(让用户正常编辑)
                if (e.target.classList.contains('note-content')) {
                    return;
                }
                // 如果点击的是删除按钮,不触发选中(删除按钮有自己的逻辑)
                if (e.target.classList.contains('delete-btn') || e.target.closest('.delete-btn')) {
                    return;
                }

                e.stopPropagation();
                this.selectElement(element.id);
            });

        } else if (element.type === 'annotation') {
            // 批注标记元素
            this.renderAnnotationElement(div, element);
        }

        // 添加删除按钮(批注元素已经在renderAnnotationElement中添加了,跳过)
        if (element.type !== 'annotation') {
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
        }

        // 双击取消选择
        div.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.deselectElement();
        });

        canvas.appendChild(div);
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
            dragHandle.className = 'page-drag-handle canvas-drag-handle';
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

            div.appendChild(iframe);

            // 在 iframe 加载完成后,禁止 Ctrl+滚轮 的浏览器默认缩放行为
            iframe.addEventListener('load', () => {
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

                    iframeDoc.addEventListener('wheel', (e) => {
                        if (e.ctrlKey) {
                            // 阻止浏览器默认缩放行为
                            e.preventDefault();
                            e.stopPropagation();

                            // 将事件重新分发到父文档,让画布能够正常缩放
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

                            // 在 iframe 元素上分发事件,让它冒泡到父文档
                            iframe.dispatchEvent(newEvent);
                        }
                    }, { passive: false }); // 必须使用 passive: false 才能调用 preventDefault()

                    console.log('✅ iframe缩放保护已启用');
                } catch (error) {
                    console.warn('⚠️ 无法访问iframe内部(跨域限制):', error);
                }
            });

            // 添加右键菜单事件
            div.addEventListener('contextmenu', (e) => {
                e.preventDefault(); // 阻止浏览器默认右键菜单

                // 如果箭头工具正在绘制,不显示右键菜单,让箭头工具处理
                const currentTool = Tools.getCurrentTool();
                if (currentTool === 'arrow' && Tools.arrowState.isDrawing) {
                    return;
                }

                // 获取页面信息
                const pageInfo = PageLibrary.getPageInfo(element.pageId);
                const filePath = pageInfo ? pageInfo.filePath : '';

                // 显示自定义右键菜单(传递 element, iframe, pageInfo)
                this.showContextMenu(e.clientX, e.clientY, element, iframe, pageInfo);
            });

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

            // 关键修改：让div响应鼠标事件,确保箭头在iframe上方时能被拖动
            div.style.pointerEvents = 'auto';

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
            // 关键修复：箭头头部应该指向右侧(正X轴方向)
            // 尖端在(10,3),底边在左侧,orient='auto'会自动旋转指向正确方向
            polygon.setAttribute('points', '10 3, 0 0, 0 6');
            polygon.setAttribute('fill', '#e74c3c');

            marker.appendChild(polygon);
            defs.appendChild(marker);
            svg.appendChild(defs);

            path.setAttribute('marker-end', `url(#${markerId})`);
            svg.appendChild(path);
            div.appendChild(svg);

            // 添加点击选中事件
            div.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectElement(element.id);
            });

            // 更新元素的位置和大小
            element.position = { x: minX - padding, y: minY - padding };
            element.width = maxX - minX + padding * 2;
            element.height = maxY - minY + padding * 2;

        } else if (element.type === 'note') {
            // 文字卡片元素
            div.style.left = `${element.position.x}px`;
            div.style.top = `${element.position.y}px`;
            div.style.width = `${element.width}px`;
            div.style.height = `${element.height}px`;
            div.classList.add('note-element');

            // 关键修复：让div响应鼠标事件,确保文字卡片在iframe上方时能被点击和编辑
            div.style.pointerEvents = 'auto';

            // 卡片内容容器
            const contentDiv = document.createElement('div');
            contentDiv.className = 'note-content';
            contentDiv.contentEditable = true;
            contentDiv.textContent = element.text || '输入文字'; // 默认文字

            // 卡片编辑事件
            let originalText = element.text || '';
            contentDiv.addEventListener('input', (e) => {
                element.text = e.target.textContent;
                // 自动调整卡片高度以适应内容
                this.adjustNoteHeight(div, contentDiv, element);
            });

            // 失焦时保存状态（如果内容不为空）
            contentDiv.addEventListener('blur', (e) => {
                const currentText = e.target.textContent;
                // 只有当内容不为空，且内容真正变化了，才保存状态
                if (currentText.trim() && currentText !== '输入文字' && currentText !== originalText) {
                    HistoryManager.saveState();
                    originalText = currentText; // 更新原始文本
                }
            });

            div.appendChild(contentDiv);

            // 添加拖拽手柄
            const dragHandle = document.createElement('div');
            dragHandle.className = 'note-drag-handle';
            dragHandle.innerHTML = '<i class="fas fa-grip-vertical"></i> 文字';
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

            // 添加点击选中事件
            div.addEventListener('click', (e) => {
                // 如果点击的是可编辑内容区域,不触发选中(让用户正常编辑)
                if (e.target.classList.contains('note-content')) {
                    return;
                }
                // 如果点击的是删除按钮,不触发选中(删除按钮有自己的逻辑)
                if (e.target.classList.contains('delete-btn') || e.target.closest('.delete-btn')) {
                    return;
                }

                e.stopPropagation();
                this.selectElement(element.id);
            });

        } else if (element.type === 'annotation') {
            // 批注标记元素
            this.renderAnnotationElement(div, element);
        }

        // 添加删除按钮(批注元素已经在renderAnnotationElement中添加了,跳过)
        if (element.type !== 'annotation') {
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
        }

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
    selectElement(id, addToSelection = false) {
        const element = this.getElement(id);
        if (!element) return;

        if (addToSelection) {
            // 添加到多选(如果还未选中)
            if (!this.state.selectedElements.includes(id)) {
                this.state.selectedElements.push(id);
            }
        } else {
            // 单选模式:先清除所有选择
            this.deselectElement();
            this.state.selectedElement = id;
            this.state.selectedElements = [id];
        }

        // 添加选中样式
        const div = document.querySelector(`[data-element-id="${id}"]`);
        if (div) {
            div.classList.add('selected');
        }

        this.updateStatusBar();
    },

    // 取消选中
    deselectElement(id = null) {
        if (id) {
            // 取消指定元素的选中状态
            const index = this.state.selectedElements.indexOf(id);
            if (index > -1) {
                this.state.selectedElements.splice(index, 1);
            }

            if (this.state.selectedElement === id) {
                this.state.selectedElement = null;
            }

            const div = document.querySelector(`[data-element-id="${id}"]`);
            if (div) {
                div.classList.remove('selected');
            }
        } else {
            // 取消所有选中状态
            this.state.selectedElements.forEach(elementId => {
                const div = document.querySelector(`[data-element-id="${elementId}"]`);
                if (div) {
                    div.classList.remove('selected');
                }
            });
            this.state.selectedElements = [];
            this.state.selectedElement = null;
        }

        this.updateStatusBar();
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

        // 在删除元素之后保存状态用于撤销
        HistoryManager.saveState();

        PageLibrary.showHint('元素已删除');
    },

    // 删除所有元素
    // silent: 是否静默删除(不弹出确认框),默认为false
    clearAll(silent = false) {
        if (this.state.elements.length === 0) return;

        // 如果不是静默模式,弹出确认框
        if (!silent) {
            ModalManager.showConfirm(
                `确定要清空画布上的 ${this.state.elements.length} 个元素吗? 此操作无法撤销。`,
                '清空画布',
                () => {
                    this.executeClearAll(false);
                }
            );
            return;
        }

        this.executeClearAll(silent);
    },

    // 执行清空操作
    executeClearAll(silent) {
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

        // 只有在非静默模式下才显示提示
        if (!silent) {
            PageLibrary.showHint('✅ 画布已清空');
        }
    },

    // 设置键盘事件
    setupKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            // Delete 键：删除选中元素(支持多选)
            if (e.key === 'Delete') {
                if (this.state.selectedElements.length > 0) {
                    // 删除所有选中的元素
                    const idsToDelete = [...this.state.selectedElements];
                    idsToDelete.forEach(id => this.deleteElement(id));
                    PageLibrary.showHint(`已删除 ${idsToDelete.length} 个元素`);
                } else if (this.state.selectedElement) {
                    // 兼容旧的单选逻辑
                    this.deleteElement(this.state.selectedElement);
                }
            }

            // Esc 键：取消选择
            if (e.key === 'Escape') {
                this.deselectElement();
                Tools.setTool('select');
            }

            // 空格键：重置视图到50%（但不在编辑文字卡片或批注时）
            if ((e.code === 'Space' || e.key === ' ') &&
                !e.target.closest('.note-content') &&
                !e.target.closest('.annotation-content')) {
                e.preventDefault();
                CanvasView.zoomReset50();
            }

            // 注意: Ctrl+S 保存快捷键已在 canvas-editor.js 的 bindGlobalShortcuts() 中统一管理
            // 这里不再重复绑定,避免触发两次保存

            // 快捷键切换工具
            // 只有当焦点不在文字卡片内容区域时才触发
            if (!e.target.closest('.note-content') && !e.target.closest('.annotation-content')) {
                if (e.key === '1' && !e.ctrlKey) {
                    Tools.setTool('select');
                } else if (e.key === '2' && !e.ctrlKey) {
                    Tools.setTool('arrow');
                } else if (e.key === '3' && !e.ctrlKey) {
                    Tools.setTool('note');
                } else if (e.key === '4' && !e.ctrlKey) {
                    Tools.setTool('annotation');
                }
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
                    info = `选中: 箭头 (点击任意位置拖动)`;
                } else if (element.type === 'text') {
                    info = `选中: 文字`;
                } else if (element.type === 'note') {
                    info = `选中: 文字卡片 (拖拽手柄移动)`;
                } else if (element.type === 'annotation') {
                    info = `选中: 批注标记 (拖动锚点或框)`;
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

        // 更新PageManager的全局元素ID计数器
        if (elements.length > 0) {
            const maxId = Math.max(...elements.map(e => parseInt(e.id.split('_')[1])), 0);
            PageManager.setGlobalNextElementId(maxId + 1);
        }

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

    // 聚焦到文字卡片内容区域
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

    // 自动调整文字卡片高度以适应内容(简化版:精准控制)
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

    // 自动调整批注框高度以适应内容
    adjustAnnotationHeight(box, contentDiv, element) {
        const MIN_HEIGHT = 120; // 最小高度
        const FONT_SIZE = 14; // 字体大小
        const LINE_HEIGHT = 1.6; // 行高倍数

        // 计算一行文字的实际高度
        const oneLineHeight = FONT_SIZE * LINE_HEIGHT; // = 22.4px

        // 获取内容的实际高度(需要减去padding)
        // 批注框的 padding 是 8px (上下各8px)
        const paddingTop = 8;
        const paddingBottom = 8;
        const scrollHeight = contentDiv.scrollHeight;
        const actualContentHeight = scrollHeight - paddingTop - paddingBottom;

        // 计算剩余空间
        const remainingSpace = element.boxHeight - actualContentHeight;

        // 当剩余空间少于1行文字时,提前增加1行
        if (remainingSpace < oneLineHeight) {
            // 每次只增加1行高度,保持平滑
            const newHeight = Math.max(element.boxHeight + oneLineHeight, MIN_HEIGHT);

            // 更新元素数据
            element.boxHeight = newHeight;

            // 更新DOM样式
            box.style.height = `${newHeight}px`;

            // 更新连接线终点(批注框左边缘中心)
            const div = document.querySelector(`[data-element-id="${element.id}"]`);
            if (div) {
                const line = div.querySelector('.annotation-connection-line');
                if (line) {
                    line.setAttribute('y2', element.boxY + newHeight / 2);
                }
            }

            // 更新尺寸显示
            const sizeDisplay = box.querySelector('.annotation-size-display');
            if (sizeDisplay) {
                sizeDisplay.textContent = `${Math.round(element.boxWidth)} × ${Math.round(newHeight)}`;
            }
        }
    },

    // 更新连接线(占位函数,避免报错)
    updateConnectionsForElement(elementId) {
        // 这个函数用于连接线功能
        // 当前不需要实现,留空避免报错
        // 如果后续需要连接线功能,可以在这里实现
    },

    // 显示右键菜单
    showContextMenu(x, y, element, iframe, pageInfo) {
        // 移除已存在的菜单
        const existingMenu = document.querySelector('.context-menu');
        if (existingMenu) existingMenu.remove();

        // 创建菜单
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;

        // 获取文件路径并转换为绝对路径
        let filePath = '';
        if (pageInfo && pageInfo.filePath) {
            // 从 pageInfo 获取 filePath 并转换为绝对路径
            filePath = PageLibrary.getAbsolutePath(pageInfo.filePath);
        }

        // 1. 复制文件路径菜单项
        const copyItem = document.createElement('div');
        copyItem.className = 'context-menu-item';
        copyItem.innerHTML = '<i class="fas fa-copy"></i><span>复制文件路径</span>';
        copyItem.addEventListener('click', () => {
            this.copyToClipboard(filePath);
            menu.remove();
        });

        menu.appendChild(copyItem);

        // 2. 保存长截图菜单项(只在有 pageInfo 时显示)
        if (pageInfo) {
            const screenshotItem = document.createElement('div');
            screenshotItem.className = 'context-menu-item';
            screenshotItem.innerHTML = '<i class="fas fa-camera"></i><span>保存长截图</span>';
            screenshotItem.addEventListener('click', () => {
                // 如果是从页面库调用(没有iframe),需要先加载页面
                if (!iframe) {
                    this.capturePageLibraryScreenshot(pageInfo);
                } else {
                    this.captureIframeScreenshot(iframe, pageInfo);
                }
                menu.remove();
            });

            menu.appendChild(screenshotItem);
        }

        document.body.appendChild(menu);

        // 点击其他地方关闭菜单
        setTimeout(() => {
            const closeMenu = (e) => {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            };
            document.addEventListener('click', closeMenu);
        }, 0);
    },

    // 复制到剪贴板
    copyToClipboard(text) {
        if (!text) {
            PageLibrary.showHint('⚠️ 无效的路径');
            return;
        }

        // 使用现代 Clipboard API
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text)
                .then(() => {
                    PageLibrary.showHint(`✅ 已复制: ${text}`);
                })
                .catch(err => {
                    console.error('复制失败:', err);
                    this.fallbackCopy(text);
                });
        } else {
            // 降级方案
            this.fallbackCopy(text);
        }
    },

    // 降级复制方案（兼容旧浏览器）
    fallbackCopy(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();

        try {
            const successful = document.execCommand('copy');
            if (successful) {
                PageLibrary.showHint(`✅ 已复制: ${text}`);
            } else {
                PageLibrary.showHint('❌ 复制失败');
            }
        } catch (err) {
            console.error('复制失败:', err);
            PageLibrary.showHint('❌ 复制失败');
        }

        document.body.removeChild(textarea);
    },

    // 捕获 iframe 长截图
    async captureIframeScreenshot(iframe, pageInfo) {
        if (!iframe || !pageInfo) {
            PageLibrary.showHint('⚠️ 无法获取页面信息');
            return;
        }

        try {
            // 显示加载提示
            PageLibrary.showHint('📸 正在生成截图,请稍候...');

            // 访问 iframe 内部文档
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

            if (!iframeDoc) {
                throw new Error('无法访问 iframe 内部文档');
            }

            // 检查是否安装了 html2canvas
            if (typeof html2canvas === 'undefined') {
                throw new Error('html2canvas 库未加载');
            }

            // 获取页面名称(用于文件名)
            const pageName = pageInfo.name || pageInfo.id || 'screenshot';

            // 使用 html2canvas 截图
            // scale: 2 提高清晰度
            // useCORS: true 允许跨域图片
            // allowTaint: true 允许跨域内容
            const canvas = await html2canvas(iframeDoc.body, {
                scale: 2, // 2倍清晰度
                useCORS: true, // 支持跨域图片
                allowTaint: true, // 允许被污染的 canvas
                backgroundColor: '#ffffff', // 白色背景
                logging: false, // 关闭日志
                width: iframeDoc.body.scrollWidth, // 宽度等于内容宽度
                height: iframeDoc.body.scrollHeight, // 高度等于内容高度
                windowWidth: iframeDoc.body.scrollWidth,
                windowHeight: iframeDoc.body.scrollHeight
            });

            // 转换为图片并下载
            canvas.toBlob((blob) => {
                if (!blob) {
                    PageLibrary.showHint('❌ 生成图片失败');
                    return;
                }

                // 创建下载链接
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${pageName}_${Date.now()}.png`;

                // 触发下载
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // 释放 URL 对象
                URL.revokeObjectURL(url);

                // 显示成功提示
                PageLibrary.showHint(`✅ 截图已保存: ${pageName}.png`);

            }, 'image/png', 1.0); // 质量: 最高

        } catch (error) {
            console.error('截图失败:', error);
            PageLibrary.showHint(`❌ 截图失败: ${error.message}`);
        }
    },

    // 从页面库捕获截图(不需要iframe)
    async capturePageLibraryScreenshot(pageInfo) {
        if (!pageInfo) {
            PageLibrary.showHint('⚠️ 无法获取页面信息');
            return;
        }

        try {
            // 显示加载提示
            PageLibrary.showHint('📸 正在加载页面并生成截图,请稍候...');

            // 创建临时iframe加载页面
            const tempIframe = document.createElement('iframe');
            tempIframe.style.position = 'fixed';
            tempIframe.style.left = '-9999px';
            tempIframe.style.top = '0';
            tempIframe.style.width = '320px';
            tempIframe.style.height = '680px';
            tempIframe.style.border = 'none';

            document.body.appendChild(tempIframe);

            // 等待iframe加载完成
            await new Promise((resolve, reject) => {
                tempIframe.onload = resolve;
                tempIframe.onerror = reject;
                tempIframe.src = pageInfo.filePath;
            });

            // 等待额外时间确保页面完全渲染
            await new Promise(resolve => setTimeout(resolve, 500));

            // 使用现有的截图方法
            await this.captureIframeScreenshot(tempIframe, pageInfo);

            // 清理临时iframe
            document.body.removeChild(tempIframe);

        } catch (error) {
            console.error('截图失败:', error);
            PageLibrary.showHint(`❌ 截图失败: ${error.message}`);
        }
    },

    // 渲染批注标记元素(提取为独立函数以便复用)
    renderAnnotationElement(div, element) {
        div.classList.add('annotation-element');

        // 不使用包围盒,直接设置容器为固定大小,足够容纳锚点和批注框
        // 容器大小设为画布大小,通过绝对定位来放置元素
        div.style.left = `0px`;
        div.style.top = `0px`;
        div.style.width = `100%`;
        div.style.height = `100%`;
        div.style.pointerEvents = 'none'; // 容器本身不响应事件

        // 创建SVG容器用于绘制连接线(覆盖整个画布)
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('annotation-svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.style.position = 'absolute';
        svg.style.left = '0';
        svg.style.top = '0';
        svg.style.overflow = 'visible';
        svg.style.pointerEvents = 'none';

        // 关键修复: SVG需要与canvas元素的坐标系统对齐
        // 因为div是canvas的子元素,SVG的(0,0)对应canvas的(0,0)
        // 所以直接使用canvas坐标即可
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', element.anchorX + 5); // 锚点中心
        line.setAttribute('y1', element.anchorY + 5);
        line.setAttribute('x2', element.boxX); // 批注框左边缘
        line.setAttribute('y2', element.boxY + element.boxHeight / 2); // 批注框垂直中心
        line.setAttribute('stroke', '#FF9500');
        line.setAttribute('stroke-width', '1');
        line.setAttribute('class', 'annotation-connection-line'); // 添加class方便选择
        svg.appendChild(line);

        div.appendChild(svg);

        // 创建锚点(橙色圆点) - 使用绝对定位
        const anchor = document.createElement('div');
        anchor.className = 'annotation-anchor';
        anchor.style.position = 'absolute';
        anchor.style.left = `${element.anchorX}px`;
        anchor.style.top = `${element.anchorY}px`;
        anchor.style.width = '10px';
        anchor.style.height = '10px';
        anchor.style.borderRadius = '50%';
        anchor.style.backgroundColor = '#FF9500';
        anchor.style.cursor = 'move';
        anchor.style.pointerEvents = 'auto';
        anchor.dataset.elementId = element.id;
        anchor.dataset.part = 'anchor';

        // 锚点拖拽事件
        this.setupAnnotationDrag(anchor, element, 'anchor');
        div.appendChild(anchor);

        // 创建批注框 - 使用绝对定位
        const box = document.createElement('div');
        box.className = 'annotation-box';
        box.style.position = 'absolute';
        box.style.left = `${element.boxX}px`;
        box.style.top = `${element.boxY}px`;
        box.style.width = `${element.boxWidth}px`;   // 使用boxWidth
        box.style.height = `${element.boxHeight}px`; // 使用boxHeight
        box.style.backgroundColor = '#FDEEB5';
        box.style.border = '2px solid #E8D5A3';
        box.style.borderRadius = '4px';
        box.style.padding = '8px';
        box.style.cursor = 'move';
        box.style.pointerEvents = 'auto';
        box.dataset.elementId = element.id;
        box.dataset.part = 'box';

        // 批注框内容(可编辑)
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

        // 批注框编辑事件
        let originalContent = element.content || '';
        content.addEventListener('input', (e) => {
            element.content = e.target.textContent;
            // 自动调整批注框高度以适应内容
            this.adjustAnnotationHeight(box, content, element);
        });

        // 失焦时保存状态
        content.addEventListener('blur', (e) => {
            const currentContent = e.target.textContent;
            if (currentContent.trim() && currentContent !== '输入批注' && currentContent !== originalContent) {
                HistoryManager.saveState();
                originalContent = currentContent;
            }
        });

        // 阻止空格键触发全局快捷键(防止视图复位)
        // 使用捕获阶段确保在其他监听器之前拦截
        content.addEventListener('keydown', (e) => {
            if (e.key === ' ') {
                e.stopPropagation();
                e.stopImmediatePropagation(); // 阻止其他监听器
                // 不阻止默认行为,让空格正常输入
            }
        }, true); // true = 捕获阶段

        box.appendChild(content);
        div.appendChild(box);

        // 批注框拖拽事件
        this.setupAnnotationDrag(box, element, 'box');

        // 添加四个角的resize手柄
        const corners = ['nw', 'ne', 'sw', 'se'];
        corners.forEach(corner => {
            const resizeHandle = document.createElement('div');
            resizeHandle.className = `annotation-resize-handle annotation-resize-${corner}`;
            resizeHandle.dataset.corner = corner;
            resizeHandle.dataset.elementId = element.id;
            box.appendChild(resizeHandle);
        });

        // 添加尺寸显示
        const sizeDisplay = document.createElement('div');
        sizeDisplay.className = 'annotation-size-display';
        sizeDisplay.textContent = `${Math.round(element.boxWidth)} × ${Math.round(element.boxHeight)}`;
        box.appendChild(sizeDisplay);

        // 添加删除按钮(相对于批注框定位)
        const deleteBtn = document.createElement('div');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
        deleteBtn.style.pointerEvents = 'auto';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteElement(element.id);
        });

        // 将删除按钮添加到批注框内
        box.style.position = 'relative';
        box.appendChild(deleteBtn);

        // 批注框resize事件
        this.setupAnnotationResize(box, element);

        // 点击空白区域选中事件
        div.addEventListener('click', (e) => {
            if (e.target === div || e.target === svg) {
                e.stopPropagation();
                this.selectElement(element.id);
            }
        });
    },

    // 设置批注元素的拖拽逻辑(锚点和框分离拖动)
    setupAnnotationDrag(element, data, part) {
        let isDragging = false;
        let startX, startY;

        element.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('annotation-content')) {
                return; // 如果点击的是可编辑内容区域,不拖拽
            }

            e.preventDefault();
            e.stopPropagation();

            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;

            // 选中元素
            this.selectElement(data.id);

            // 临时禁用所有iframe的交互,防止拖动时触发iframe事件导致阻尼感
            const iframes = document.querySelectorAll('.canvas-element.page-element iframe');
            iframes.forEach(iframe => {
                iframe.style.pointerEvents = 'none';
            });

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        const onMouseMove = (e) => {
            if (!isDragging) return;

            const canvasWrapper = document.getElementById('canvasWrapper');
            if (!canvasWrapper) return;

            const view = CanvasView.getView();
            const wrapperRect = canvasWrapper.getBoundingClientRect();

            // 计算画布内部坐标的增量(考虑zoom)
            const deltaX = (e.clientX - startX) / view.zoom;
            const deltaY = (e.clientY - startY) / view.zoom;

            const div = document.querySelector(`[data-element-id="${data.id}"]`);
            if (!div) return;

            if (part === 'anchor') {
                // 拖动锚点:只更新锚点位置和连接线
                data.anchorX += deltaX;
                data.anchorY += deltaY;

                // 直接更新锚点DOM位置
                const anchorEl = div.querySelector('.annotation-anchor');
                if (anchorEl) {
                    anchorEl.style.left = `${data.anchorX}px`;
                    anchorEl.style.top = `${data.anchorY}px`;
                }

                // 更新连接线起点(锚点中心)
                const line = div.querySelector('.annotation-connection-line');
                if (line) {
                    line.setAttribute('x1', data.anchorX + 5);
                    line.setAttribute('y1', data.anchorY + 5);
                }

            } else if (part === 'box') {
                // 拖动批注框:只更新批注框位置和连接线
                data.boxX += deltaX;
                data.boxY += deltaY;

                // 直接更新批注框DOM位置
                const boxEl = div.querySelector('.annotation-box');
                if (boxEl) {
                    boxEl.style.left = `${data.boxX}px`;
                    boxEl.style.top = `${data.boxY}px`;
                }

                // 更新连接线终点(批注框左边缘中心)
                const line = div.querySelector('.annotation-connection-line');
                if (line) {
                    line.setAttribute('x2', data.boxX);
                    // 使用boxHeight计算中心点
                    line.setAttribute('y2', data.boxY + data.boxHeight / 2);
                }
            }

            startX = e.clientX;
            startY = e.clientY;
        };

        const onMouseUp = () => {
            if (isDragging) {
                isDragging = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);

                // 恢复所有iframe的交互
                const iframes = document.querySelectorAll('.canvas-element.page-element iframe');
                iframes.forEach(iframe => {
                    iframe.style.pointerEvents = 'auto';
                });

                // 拖拽完成后保存状态
                HistoryManager.saveState();
            }
        };
    },

    // 聚焦到批注框内容区域
    focusAnnotationContent(elementId) {
        const div = document.querySelector(`[data-element-id="${elementId}"]`);
        if (!div) return;

        const contentDiv = div.querySelector('.annotation-content');
        if (contentDiv) {
            contentDiv.focus();
            // 选中所有文字,方便用户直接替换
            document.execCommand('selectAll', false, null);
        }
    },

    // 设置批注框的缩放逻辑
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
                const startWidth = element.boxWidth;   // 使用boxWidth
                const startHeight = element.boxHeight; // 使用boxHeight
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

                    // 根据拖动的角调整尺寸和位置
                    if (corner.includes('e')) {
                        // 右侧拖动:只改变宽度
                        newWidth = startWidth + deltaX;
                    }
                    if (corner.includes('w')) {
                        // 左侧拖动:改变宽度并调整X位置
                        newWidth = startWidth - deltaX;
                        newBoxX = startBoxX + deltaX;
                    }
                    if (corner.includes('s')) {
                        // 底部拖动:只改变高度
                        newHeight = startHeight + deltaY;
                    }
                    if (corner.includes('n')) {
                        // 顶部拖动:改变高度并调整Y位置
                        newHeight = startHeight - deltaY;
                        newBoxY = startBoxY + deltaY;
                    }

                    // 最小尺寸限制
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

                    // 更新数据
                    element.boxWidth = newWidth;
                    element.boxHeight = newHeight;
                    element.boxX = newBoxX;
                    element.boxY = newBoxY;

                    // 更新DOM
                    box.style.width = `${newWidth}px`;
                    box.style.height = `${newHeight}px`;
                    box.style.left = `${newBoxX}px`;
                    box.style.top = `${newBoxY}px`;

                    // 更新连接线终点(批注框左边缘中心)
                    const div = document.querySelector(`[data-element-id="${element.id}"]`);
                    if (div) {
                        const line = div.querySelector('.annotation-connection-line');
                        if (line) {
                            line.setAttribute('x2', newBoxX);
                            line.setAttribute('y2', newBoxY + newHeight / 2);
                        }
                    }

                    // 更新尺寸显示
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