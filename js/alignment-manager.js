// 对齐管理器 - 处理元素拖拽时的智能对齐功能
class AlignmentManager {
    constructor() {
        this.SNAP_THRESHOLD = 5; // 吸附阈值（像素）
        this.activeGuides = []; // 当前显示的辅助线
    }

    // 获取所有画布元素的位置信息（排除指定元素）
    getAllElementBounds(excludeElementId) {
        const canvas = document.getElementById('canvas');
        if (!canvas) return [];

        const elements = canvas.querySelectorAll('.canvas-element');
        const bounds = [];

        elements.forEach(element => {
            // 排除当前拖拽的元素
            if (element.id === excludeElementId) return;

            const rect = element.getBoundingClientRect();
            const canvasRect = canvas.getBoundingClientRect();

            // 计算相对于画布的位置
            bounds.push({
                id: element.id,
                left: parseInt(element.style.left) || 0,
                top: parseInt(element.style.top) || 0,
                width: rect.width,
                height: rect.height,
                right: (parseInt(element.style.left) || 0) + rect.width,
                bottom: (parseInt(element.style.top) || 0) + rect.height
            });
        });

        return bounds;
    }

    // 检测对齐关系
    checkAlignment(currentBounds, allElements) {
        const alignments = [];

        allElements.forEach(element => {
            // 左边缘对齐
            if (Math.abs(currentBounds.left - element.left) <= this.SNAP_THRESHOLD) {
                alignments.push({
                    type: 'left',
                    axis: 'x',
                    value: element.left,
                    targetElement: element.id
                });
            }

            // 右边缘对齐
            if (Math.abs(currentBounds.right - element.right) <= this.SNAP_THRESHOLD) {
                alignments.push({
                    type: 'right',
                    axis: 'x',
                    value: element.right - currentBounds.width,
                    targetElement: element.id
                });
            }

            // 顶边缘对齐
            if (Math.abs(currentBounds.top - element.top) <= this.SNAP_THRESHOLD) {
                alignments.push({
                    type: 'top',
                    axis: 'y',
                    value: element.top,
                    targetElement: element.id
                });
            }

            // 底边缘对齐
            if (Math.abs(currentBounds.bottom - element.bottom) <= this.SNAP_THRESHOLD) {
                alignments.push({
                    type: 'bottom',
                    axis: 'y',
                    value: element.bottom - currentBounds.height,
                    targetElement: element.id
                });
            }
        });

        return alignments;
    }

    // 显示辅助线
    showGuideLine(type, position) {
        const canvas = document.getElementById('canvas');
        if (!canvas) return;

        const guide = document.createElement('div');
        guide.className = `alignment-guide ${type === 'left' || type === 'right' ? 'vertical' : 'horizontal'}`;

        if (type === 'left' || type === 'right') {
            guide.style.left = `${position}px`;
            guide.style.top = '0';
        } else {
            guide.style.top = `${position}px`;
            guide.style.left = '0';
        }

        canvas.appendChild(guide);
        this.activeGuides.push(guide);
    }

    // 清除所有辅助线
    clearGuideLines() {
        this.activeGuides.forEach(guide => {
            if (guide.parentNode) {
                guide.parentNode.removeChild(guide);
            }
        });
        this.activeGuides = [];
    }

    // 根据对齐信息吸附到对齐位置
    snapToAlignment(x, y, width, height, alignments) {
        let snappedX = x;
        let snappedY = y;

        // 按照对齐类型分组（水平和垂直）
        const horizontalAlignments = alignments.filter(a => a.axis === 'x');
        const verticalAlignments = alignments.filter(a => a.axis === 'y');

        // 找到最近的水平对齐位置
        if (horizontalAlignments.length > 0) {
            // 优先选择距离最小的对齐
            horizontalAlignments.sort((a, b) => {
                const distA = Math.abs(x - a.value);
                const distB = Math.abs(x - b.value);
                return distA - distB;
            });
            snappedX = horizontalAlignments[0].value;
        }

        // 找到最近的垂直对齐位置
        if (verticalAlignments.length > 0) {
            verticalAlignments.sort((a, b) => {
                const distA = Math.abs(y - a.value);
                const distB = Math.abs(y - b.value);
                return distA - distB;
            });
            snappedY = verticalAlignments[0].value;
        }

        return { x: snappedX, y: snappedY };
    }

    // 更新辅助线显示
    updateGuides(alignments) {
        // 先清除旧的辅助线
        this.clearGuideLines();

        // 显示新的辅助线
        alignments.forEach(alignment => {
            this.showGuideLine(alignment.type, alignment.value);
        });
    }
}

// 创建全局对齐管理器实例
const alignmentManager = new AlignmentManager();
