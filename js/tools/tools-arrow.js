// 箭头工具模块
// 负责箭头的绘制、预览等操作

const ToolsArrow = {
    // 处理箭头左键点击（添加拐点）
    handleClick(e) {
        const canvasWrapper = document.getElementById('canvasWrapper');
        if (!canvasWrapper) return;

        const wrapperRect = canvasWrapper.getBoundingClientRect();
        const view = CanvasView.getView();

        // 计算画布内部坐标（考虑pan和zoom）
        const x = (e.clientX - wrapperRect.left - view.pan.x) / view.zoom;
        const y = (e.clientY - wrapperRect.top - view.pan.y) / view.zoom;

        if (!Tools.arrowState.isDrawing) {
            // 第一个点：开始绘制
            Tools.arrowState.points = [{ x, y }];
            Tools.arrowState.isDrawing = true;

            // 临时禁用所有iframe的交互，防止绘制时触发iframe滚动
            const iframes = document.querySelectorAll('.canvas-element.page-element iframe');
            iframes.forEach(iframe => {
                iframe.style.pointerEvents = 'none';
            });

            // 创建临时预览线
            this.createArrowPreview();

            PageLibrary.showHint('左键继续添加拐点，右键完成');
        } else {
            // 后续拐点
            Tools.arrowState.points.push({ x, y });
        }
    },

    // 处理箭头右键点击（完成绘制）
    handleRightClick(e) {
        const canvasWrapper = document.getElementById('canvasWrapper');
        if (!canvasWrapper) return;

        const wrapperRect = canvasWrapper.getBoundingClientRect();
        const view = CanvasView.getView();

        // 计算画布内部坐标（考虑pan和zoom）
        const x = (e.clientX - wrapperRect.left - view.pan.x) / view.zoom;
        const y = (e.clientY - wrapperRect.top - view.pan.y) / view.zoom;

        // 添加最后一个点
        Tools.arrowState.points.push({ x, y });

        // 创建箭头元素
        ElementManager.addArrowElement(Tools.arrowState.points);

        // 恢复所有iframe的交互
        const iframes = document.querySelectorAll('.canvas-element.page-element iframe');
        iframes.forEach(iframe => {
            iframe.style.pointerEvents = 'auto';
        });

        // 重置状态
        Tools.arrowState.points = [];
        Tools.arrowState.isDrawing = false;
        this.removeArrowPreview();

        // 切换回选择工具
        Tools.setTool('select');
        PageLibrary.showHint('箭头已添加');
    },

    // 创建箭头预览
    createArrowPreview() {
        const canvas = document.getElementById('canvas');
        const preview = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        preview.id = 'arrowPreview';
        preview.style.position = 'absolute';
        preview.style.pointerEvents = 'none';
        preview.style.zIndex = '999';
        preview.style.overflow = 'visible';
        canvas.appendChild(preview);
    },

    // 更新箭头预览
    updateArrowPreview(e) {
        const canvas = document.getElementById('canvas');
        const canvasWrapper = document.getElementById('canvasWrapper');
        if (!canvas || !canvasWrapper) return;

        const wrapperRect = canvasWrapper.getBoundingClientRect();
        const view = CanvasView.getView();

        // 关键修复：需要考虑canvas的变换
        // 1. 先计算鼠标相对于canvasWrapper的坐标
        const mouseXInWrapper = e.clientX - wrapperRect.left;
        const mouseYInWrapper = e.clientY - wrapperRect.top;

        // 2. 转换为画布内部坐标（考虑pan和zoom）
        // 画布内部坐标 = (鼠标在wrapper中的坐标 - pan偏移) / 缩放比例
        const mouseX = (mouseXInWrapper - view.pan.x) / view.zoom;
        const mouseY = (mouseYInWrapper - view.pan.y) / view.zoom;

        const points = Tools.arrowState.points;
        if (points.length === 0) return;

        // 所有要绘制的点（包括鼠标当前位置）
        const allPoints = [...points, { x: mouseX, y: mouseY }];

        const preview = document.getElementById('arrowPreview');
        if (!preview) return;

        // 计算SVG边界
        const allX = allPoints.map(p => p.x);
        const allY = allPoints.map(p => p.y);

        const minX = Math.min(...allX);
        const minY = Math.min(...allY);
        const maxX = Math.max(...allX);
        const maxY = Math.max(...allY);

        const padding = 50;

        // 使用画布坐标直接定位（因为preview是canvas的子元素）
        preview.style.left = `${minX - padding}px`;
        preview.style.top = `${minY - padding}px`;
        preview.style.width = `${maxX - minX + padding * 2}px`;
        preview.style.height = `${maxY - minY + padding * 2}px`;
        preview.setAttribute('viewBox', `${-padding} ${-padding} ${maxX - minX + padding * 2} ${maxY - minY + padding * 2}`);

        // 绘制预览路径
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const pathData = this.generateArrowPath(allPoints, minX, minY);

        preview.innerHTML = '';
        path.setAttribute('d', pathData);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', '#e74c3c');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('stroke-dasharray', '5,5');
        preview.appendChild(path);
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

    // 移除箭头预览
    removeArrowPreview() {
        const preview = document.getElementById('arrowPreview');
        if (preview) {
            preview.remove();
        }
    }
};
