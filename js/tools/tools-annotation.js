// 批注工具模块
// 负责批注标记的创建

const ToolsAnnotation = {
    // 处理批注标记点击
    handleClick(e) {
        const canvasWrapper = document.getElementById('canvasWrapper');
        if (!canvasWrapper) return;

        const wrapperRect = canvasWrapper.getBoundingClientRect();
        const view = CanvasView.getView();

        // 计算画布内部坐标（考虑pan和zoom）
        // 点击位置作为批注框左上角坐标
        const boxX = (e.clientX - wrapperRect.left - view.pan.x) / view.zoom;
        const boxY = (e.clientY - wrapperRect.top - view.pan.y) / view.zoom;

        // 临时禁用所有iframe的交互，防止点击时触发iframe事件
        const iframes = document.querySelectorAll('.canvas-element.page-element iframe');
        iframes.forEach(iframe => {
            iframe.style.pointerEvents = 'none';
        });

        // 创建批注元素,批注框左上角在点击位置
        const elementId = ElementManager.addAnnotationElement(boxX, boxY);

        // 自动聚焦到批注框内容区域,同时恢复iframe交互
        setTimeout(() => {
            ElementManager.focusAnnotationContent(elementId);

            // 恢复所有iframe的交互
            const iframes = document.querySelectorAll('.canvas-element.page-element iframe');
            iframes.forEach(iframe => {
                iframe.style.pointerEvents = 'auto';
            });
        }, 0);

        // 切换回选择工具
        Tools.setTool('select');
        PageLibrary.showHint('批注标记已添加,可直接输入内容');
    }
};
