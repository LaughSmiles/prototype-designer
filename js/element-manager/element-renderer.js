// 元素渲染模块
// 负责画布上所有元素的渲染

const ElementRenderer = {
    // 渲染元素(不更新计数,用于撤销/重做)
    renderElementWithoutCount(element) {
        const canvas = document.getElementById('canvas');
        if (!canvas) return;

        const div = document.createElement('div');
        div.className = `canvas-element ${element.type}-element`;
        div.dataset.elementId = element.id;

        if (element.type === 'page') {
            this.renderPageElement(div, element, canvas);
        } else if (element.type === 'arrow') {
            this.renderArrowElement(div, element, canvas);
        } else if (element.type === 'annotation') {
            ElementAnnotation.renderAnnotationElement(div, element);
            return; // 批注元素有自己的返回处理
        }

        // 添加删除按钮(批注元素已经在renderAnnotationElement中添加了,跳过)
        const deleteBtn = document.createElement('div');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
        deleteBtn.style.pointerEvents = 'auto';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            ElementManager.deleteElement(element.id);
        });
        div.appendChild(deleteBtn);

        canvas.appendChild(div);

        // 选中状态
        if (ElementManager.state.selectedElements.includes(element.id) ||
            ElementManager.state.selectedElement === element.id) {
            div.classList.add('selected');
        }
    },

    // 渲染元素
    renderElement(element) {
        this.renderElementWithoutCount(element);
        ElementManager.updateStatusBar();
    },

    // 渲染页面元素
    renderPageElement(div, element, canvas) {
        div.style.left = `${element.position.x}px`;
        div.style.top = `${element.position.y}px`;
        div.style.width = `${element.width}px`;
        div.style.height = `${element.height}px`;

        // 拖拽手柄
        const dragHandle = document.createElement('div');
        dragHandle.className = 'page-drag-handle canvas-drag-handle';
        const pageName = PageLibrary.getPageName(element.pageId);
        dragHandle.innerHTML = `<i class="fas fa-grip-vertical"></i> ${pageName || '页面'}`;
        div.appendChild(dragHandle);

        // iframe预览
        const iframe = document.createElement('iframe');
        const pageInfo = PageLibrary.getPageInfo(element.pageId);
        iframe.src = pageInfo ? pageInfo.filePath : `pages/${element.pageId}.html`;
        iframe.style.width = '100%';
        iframe.style.height = 'calc(100% - 30px)';
        iframe.style.marginTop = '30px';
        iframe.style.border = 'none';
        iframe.style.overflow = 'auto';
        div.appendChild(iframe);

        // 透明点击遮罩层：覆盖在 iframe 上方，捕获鼠标事件并正常冒泡
        const clickOverlay = document.createElement('div');
        clickOverlay.className = 'page-click-overlay';
        clickOverlay.style.position = 'absolute';
        clickOverlay.style.left = '0';
        clickOverlay.style.top = '30px';
        clickOverlay.style.width = '100%';
        clickOverlay.style.height = 'calc(100% - 30px)';
        clickOverlay.style.cursor = 'inherit';
        div.appendChild(clickOverlay);

        // 预览按钮（悬停时显示，点击打开全屏预览）
        const previewBtn = document.createElement('div');
        previewBtn.className = 'preview-btn';
        previewBtn.innerHTML = '<i class="fas fa-eye"></i>';
        previewBtn.title = '全屏预览此页面';
        previewBtn.style.pointerEvents = 'auto';
        previewBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            ev.preventDefault();
            const name = PageLibrary.getPageName(element.pageId);
            CanvasViewEvents.openPreview(name, element.id);
        });
        div.appendChild(previewBtn);

        // 右键菜单
        div.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const currentTool = Tools.getCurrentTool();
            if (currentTool === 'arrow' && Tools.arrowState.isDrawing) {
                return;
            }
            const pageInfo = PageLibrary.getPageInfo(element.pageId);
            ElementManager.showContextMenu(e.clientX, e.clientY, element, iframe, pageInfo);
        });

        // 不在这里appendChild，由调用者统一添加
    },

    // 渲染箭头元素
    renderArrowElement(div, element, canvas) {
        const points = element.points;
        if (points.length < 2) return;

        const allX = points.map(p => p.x);
        const allY = points.map(p => p.y);
        const minX = Math.min(...allX);
        const maxX = Math.max(...allX);
        const minY = Math.min(...allY);
        const maxY = Math.max(...allY);

        element.position = { x: minX, y: minY };
        element.width = maxX - minX;
        element.height = maxY - minY;

        const padding = 10;

        div.style.left = `${minX - padding}px`;
        div.style.top = `${minY - padding}px`;
        div.style.width = `${element.width + padding * 2}px`;
        div.style.height = `${element.height + padding * 2}px`;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'arrow-svg');
        svg.setAttribute('viewBox', `${-padding} ${-padding} ${element.width + padding * 2} ${element.height + padding * 2}`);
        svg.style.position = 'absolute';
        svg.style.left = '0';
        svg.style.top = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';

        const pathData = ElementManager.generateArrowPath(points, minX, minY);
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', '#e74c3c');
        path.setAttribute('stroke-width', '3');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');

        const arrowHead = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arrowHead.setAttribute('d', this.getArrowHeadPath(points[points.length - 2], points[points.length - 1], minX, minY));
        arrowHead.setAttribute('fill', '#e74c3c');

        svg.appendChild(path);
        svg.appendChild(arrowHead);
        div.appendChild(svg);

        // 不在这里appendChild，由调用者统一添加
    },

    // 生成箭头头部路径
    getArrowHeadPath(fromPoint, toPoint, offsetX, offsetY) {
        const angle = Math.atan2(toPoint.y - fromPoint.y, toPoint.x - fromPoint.x);
        const headLength = 15;
        const headAngle = Math.PI / 6;

        const x1 = toPoint.x - offsetX;
        const y1 = toPoint.y - offsetY;
        const x2 = x1 - headLength * Math.cos(angle - headAngle);
        const y2 = y1 - headLength * Math.sin(angle - headAngle);
        const x3 = x1 - headLength * Math.cos(angle + headAngle);
        const y3 = y1 - headLength * Math.sin(angle + headAngle);

        return `M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} Z`;
    }
};
