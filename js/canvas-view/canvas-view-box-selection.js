// 画布视图框选功能模块
// 负责画布上的框选（多选）功能

const CanvasViewBoxSelection = {
    // 框选状态（由 CanvasView 共享）
    // isBoxSelecting: false,
    // boxSelectionStart: { x: 0, y: 0 },
    // boxSelectionEnd: { x: 0, y: 0 },

    // 创建框选矩形
    createBoxSelection() {
        const canvasWrapper = document.getElementById('canvasWrapper');
        if (!canvasWrapper) return;

        // 创建选择框div
        const selectionBox = document.createElement('div');
        selectionBox.id = 'boxSelection';
        selectionBox.className = 'box-selection';
        selectionBox.style.position = 'absolute';
        selectionBox.style.pointerEvents = 'none'; // 不拦截鼠标事件
        selectionBox.style.zIndex = '10002'; // 在覆盖层(10001)上方显示
        selectionBox.style.display = 'none';

        canvasWrapper.appendChild(selectionBox);
    },

    // 创建框选透明覆盖层
    createBoxSelectionOverlay() {
        const canvasWrapper = document.getElementById('canvasWrapper');
        if (!canvasWrapper) return;

        // 创建透明覆盖层div，覆盖整个canvasWrapper
        const overlay = document.createElement('div');
        overlay.id = 'boxSelectionOverlay';
        overlay.className = 'box-selection-overlay';
        overlay.style.position = 'absolute';
        overlay.style.left = '0';
        overlay.style.top = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.zIndex = '10001'; // 必须高于批注元素的z-index (10000),确保覆盖层能拦截鼠标事件
        overlay.style.pointerEvents = 'auto'; // 拦截所有鼠标事件
        overlay.style.backgroundColor = 'transparent';
        overlay.style.cursor = 'crosshair';

        canvasWrapper.appendChild(overlay);
    },

    // 移除框选透明覆盖层
    removeBoxSelectionOverlay() {
        const overlay = document.getElementById('boxSelectionOverlay');
        if (overlay) {
            overlay.remove();
        }
    },

    // 更新框选矩形
    updateBoxSelection(e) {
        const selectionBox = document.getElementById('boxSelection');
        if (!selectionBox) return;

        // 关键修复：转换为canvasWrapper相对坐标
        const canvasWrapper = document.getElementById('canvasWrapper');
        const wrapperRect = canvasWrapper.getBoundingClientRect();

        CanvasView.boxSelectionEnd = {
            x: e.clientX - wrapperRect.left,
            y: e.clientY - wrapperRect.top
        };

        // 计算选择框的位置和大小(基于canvasWrapper相对坐标)
        const x = Math.min(CanvasView.boxSelectionStart.x, CanvasView.boxSelectionEnd.x);
        const y = Math.min(CanvasView.boxSelectionStart.y, CanvasView.boxSelectionEnd.y);
        const width = Math.abs(CanvasView.boxSelectionEnd.x - CanvasView.boxSelectionStart.x);
        const height = Math.abs(CanvasView.boxSelectionEnd.y - CanvasView.boxSelectionStart.y);

        // 只有当拖动距离超过5px时才显示选择框
        if (width > 5 || height > 5) {
            selectionBox.style.display = 'block';
            selectionBox.style.left = `${x}px`;
            selectionBox.style.top = `${y}px`;
            selectionBox.style.width = `${width}px`;
            selectionBox.style.height = `${height}px`;
        } else {
            selectionBox.style.display = 'none';
        }
    },

    // 完成框选
    finishBoxSelection() {
        const selectionBox = document.getElementById('boxSelection');
        if (!selectionBox) return;

        // 检查是否有有效的选择区域
        if (selectionBox.style.display === 'none') {
            selectionBox.remove();

            // 移除透明覆盖层
            this.removeBoxSelectionOverlay();

            // 恢复所有iframe的交互
            const iframes = document.querySelectorAll('.canvas-element.page-element iframe');
            iframes.forEach(iframe => {
                iframe.style.pointerEvents = 'auto';
            });

            // 恢复所有批注元素的交互
            const annotationElements = document.querySelectorAll('.annotation-box, .annotation-anchor');
            annotationElements.forEach(element => {
                element.style.pointerEvents = 'auto';
            });

            return;
        }

        // 获取选择框的位置和大小(canvasWrapper相对坐标)
        const boxRect = {
            left: parseFloat(selectionBox.style.left),
            top: parseFloat(selectionBox.style.top),
            width: parseFloat(selectionBox.style.width),
            height: parseFloat(selectionBox.style.height)
        };

        const view = CanvasView.getView();

        // 关键修复:选择框已经是canvasWrapper相对坐标
        // 需要转换为canvas坐标系统(考虑pan和zoom)
        // canvas坐标 = (canvasWrapper坐标 - pan) / zoom
        const canvasBox = {
            x: (boxRect.left - view.pan.x) / view.zoom,
            y: (boxRect.top - view.pan.y) / view.zoom,
            width: boxRect.width / view.zoom,
            height: boxRect.height / view.zoom
        };

        // 选择框内的所有元素
        const selectedElements = this.getElementsInBox(canvasBox);

        // 移除选择框
        selectionBox.remove();

        // 移除透明覆盖层
        this.removeBoxSelectionOverlay();

        // 恢复所有iframe的交互
        const iframes = document.querySelectorAll('.canvas-element.page-element iframe');
        iframes.forEach(iframe => {
            iframe.style.pointerEvents = 'auto';
        });

        // 恢复所有批注元素的交互
        const annotationElements = document.querySelectorAll('.annotation-box, .annotation-anchor');
        annotationElements.forEach(element => {
            element.style.pointerEvents = 'auto';
        });

        // 选中框内的所有元素
        if (selectedElements.length > 0) {
            ElementManager.deselectElement(); // 先清除之前的选择
            selectedElements.forEach((element, index) => {
                ElementManager.selectElement(element.id, index > 0); // 第一个直接选中,后续的添加到多选
            });
            PageLibrary.showHint(`已选中 ${selectedElements.length} 个元素`);
        }
    },

    // 获取选择框内的所有元素
    getElementsInBox(box) {
        const elements = ElementManager.state.elements;
        const selected = [];

        elements.forEach(element => {
            if (this.isElementInBox(element, box)) {
                selected.push(element);
            }
        });

        return selected;
    },

    // 判断元素是否在选择框内
    isElementInBox(element, box) {
        let elemLeft, elemTop, elemRight, elemBottom;

        // 根据元素类型获取边界
        if (element.type === 'annotation') {
            // 批注元素使用boxX, boxY, boxWidth, boxHeight
            elemLeft = element.boxX;
            elemTop = element.boxY;
            elemRight = elemLeft + element.boxWidth;
            elemBottom = elemTop + element.boxHeight;
        } else {
            // 其他元素使用position.x, position.y, width, height
            elemLeft = element.position.x;
            elemTop = element.position.y;
            elemRight = elemLeft + element.width;
            elemBottom = elemTop + element.height;
        }

        // 选择框的边界
        const boxLeft = box.x;
        const boxTop = box.y;
        const boxRight = boxLeft + box.width;
        const boxBottom = boxTop + box.height;

        // 判断是否有交集(元素任何部分在选择框内)
        return !(
            elemRight < boxLeft ||
            elemLeft > boxRight ||
            elemBottom < boxTop ||
            elemTop > boxBottom
        );
    }
};
