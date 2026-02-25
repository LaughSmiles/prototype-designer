// 工具策略模式实现
// 使用策略模式替代if-else判断,提高可扩展性

/**
 * 工具策略基类
 * 所有工具策略都应该继承此类
 */
class ToolStrategy {
    constructor(name) {
        this.name = name;
        this.isInitialized = false;
    }

    /**
     * 初始化工具
     * @param {Object} context - 工具上下文
     */
    init(context) {
        this.context = context;
        this.isInitialized = true;
        this.onInit();
    }

    /**
     * 工具初始化钩子(子类实现)
     */
    onInit() {
        // 子类实现
    }

    /**
     * 激活工具
     */
    activate() {
        this.onActivate();
    }

    /**
     * 工具激活钩子(子类实现)
     */
    onActivate() {
        // 子类实现
    }

    /**
     * 处理点击事件
     * @param {MouseEvent} e - 鼠标事件
     */
    handleClick(e) {
        // 子类实现
    }

    /**
     * 处理鼠标移动事件
     * @param {MouseEvent} e - 鼠标事件
     */
    handleMouseMove(e) {
        // 子类实现
    }

    /**
     * 处理右键点击事件
     * @param {MouseEvent} e - 鼠标事件
     */
    handleContextMenu(e) {
        // 子类实现
    }

    /**
     * 停用工具
     */
    deactivate() {
        this.onDeactivate();
    }

    /**
     * 工具停用钩子(子类实现)
     */
    onDeactivate() {
        // 子类实现
    }

    /**
     * 获取光标样式
     * @returns {string}
     */
    getCursor() {
        return 'default';
    }

    /**
     * 获取工具显示名称
     * @returns {string}
     */
    getDisplayName() {
        return this.name;
    }
}

/**
 * 选择工具策略
 */
class SelectToolStrategy extends ToolStrategy {
    constructor() {
        super('select');
    }

    getCursor() {
        return 'default';
    }

    getDisplayName() {
        return '选择工具';
    }
}

/**
 * 箭头工具策略
 */
class ArrowToolStrategy extends ToolStrategy {
    constructor() {
        super('arrow');
        this.points = [];
        this.isDrawing = false;
        this.previewElement = null;
    }

    onActivate() {
        this.points = [];
        this.isDrawing = false;
        this.previewElement = null;
    }

    handleClick(e) {
        const canvasWrapper = document.getElementById('canvasWrapper');
        if (!canvasWrapper) return;

        const wrapperRect = canvasWrapper.getBoundingClientRect();
        const view = this.context.CanvasView.getView();

        // 计算画布内部坐标
        const x = (e.clientX - wrapperRect.left - view.pan.x) / view.zoom;
        const y = (e.clientY - wrapperRect.top - view.pan.y) / view.zoom;

        if (!this.isDrawing) {
            // 第一个点：开始绘制
            this.points = [{ x, y }];
            this.isDrawing = true;

            // 临时禁用所有iframe的交互
            this.disableAllIframes();

            // 创建预览
            this.createPreview();

            this.context.PageLibrary.showHint('左键继续添加拐点，右键完成');
        } else {
            // 后续拐点
            this.points.push({ x, y });
        }
    }

    handleMouseMove(e) {
        if (!this.isDrawing) return;
        this.updatePreview(e);
    }

    handleContextMenu(e) {
        if (!this.isDrawing) return;

        e.preventDefault();

        const canvasWrapper = document.getElementById('canvasWrapper');
        if (!canvasWrapper) return;

        const wrapperRect = canvasWrapper.getBoundingClientRect();
        const view = this.context.CanvasView.getView();

        const x = (e.clientX - wrapperRect.left - view.pan.x) / view.zoom;
        const y = (e.clientY - wrapperRect.top - view.pan.y) / view.zoom;

        // 添加最后一个点
        this.points.push({ x, y });

        // 创建箭头元素
        this.context.ElementManager.addArrowElement(this.points);

        // 恢复iframe交互
        this.enableAllIframes();

        // 重置状态
        this.reset();
        this.removePreview();

        // 切换回选择工具
        this.context.Tools.setTool('select');
        this.context.PageLibrary.showHint('箭头已添加');
    }

    onDeactivate() {
        this.reset();
        this.removePreview();
        this.enableAllIframes();
    }

    disableAllIframes() {
        const iframes = document.querySelectorAll('.canvas-element.page-element iframe');
        iframes.forEach(iframe => {
            iframe.style.pointerEvents = 'none';
        });
    }

    enableAllIframes() {
        const iframes = document.querySelectorAll('.canvas-element.page-element iframe');
        iframes.forEach(iframe => {
            iframe.style.pointerEvents = 'auto';
        });
    }

    createPreview() {
        const canvas = document.getElementById('canvas');
        const preview = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        preview.id = 'arrowPreview';
        preview.style.position = 'absolute';
        preview.style.pointerEvents = 'none';
        preview.style.zIndex = '999';
        preview.style.overflow = 'visible';
        canvas.appendChild(preview);
        this.previewElement = preview;
    }

    updatePreview(e) {
        if (!this.previewElement) return;

        const canvasWrapper = document.getElementById('canvasWrapper');
        const canvas = document.getElementById('canvas');
        if (!canvas || !canvasWrapper) return;

        const wrapperRect = canvasWrapper.getBoundingClientRect();
        const view = this.context.CanvasView.getView();

        const mouseX = (e.clientX - wrapperRect.left - view.pan.x) / view.zoom;
        const mouseY = (e.clientY - wrapperRect.top - view.pan.y) / view.zoom;

        if (this.points.length === 0) return;

        const allPoints = [...this.points, { x: mouseX, y: mouseY }];

        const allX = allPoints.map(p => p.x);
        const allY = allPoints.map(p => p.y);

        const minX = Math.min(...allX);
        const minY = Math.min(...allY);
        const maxX = Math.max(...allX);
        const maxY = Math.max(...allY);

        const padding = 50;

        this.previewElement.style.left = `${minX - padding}px`;
        this.previewElement.style.top = `${minY - padding}px`;
        this.previewElement.style.width = `${maxX - minX + padding * 2}px`;
        this.previewElement.style.height = `${maxY - minY + padding * 2}px`;
        this.previewElement.setAttribute('viewBox', `${-padding} ${-padding} ${maxX - minX + padding * 2} ${maxY - minY + padding * 2}`);

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const pathData = this.generatePath(allPoints, minX, minY);

        this.previewElement.innerHTML = '';
        path.setAttribute('d', pathData);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', '#e74c3c');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('stroke-dasharray', '5,5');
        this.previewElement.appendChild(path);
    }

    generatePath(points, offsetX, offsetY) {
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

    removePreview() {
        if (this.previewElement) {
            this.previewElement.remove();
            this.previewElement = null;
        }
    }

    reset() {
        this.points = [];
        this.isDrawing = false;
    }

    getCursor() {
        return 'crosshair';
    }

    getDisplayName() {
        return '箭头工具';
    }
}

/**
 * 文字卡片工具策略
 */
class NoteToolStrategy extends ToolStrategy {
    constructor() {
        super('note');
    }

    handleClick(e) {
        const canvasWrapper = document.getElementById('canvasWrapper');
        if (!canvasWrapper) return;

        const wrapperRect = canvasWrapper.getBoundingClientRect();
        const view = this.context.CanvasView.getView();

        const x = (e.clientX - wrapperRect.left - view.pan.x) / view.zoom;
        const y = (e.clientY - wrapperRect.top - view.pan.y) / view.zoom;

        // 临时禁用所有iframe的交互
        this.disableAllIframes();

        // 创建空白卡片
        const elementId = this.context.ElementManager.addNoteElement('', x, y);

        // 自动聚焦并恢复iframe交互
        setTimeout(() => {
            this.context.ElementManager.focusNoteContent(elementId);
            this.enableAllIframes();
        }, 0);

        // 切换回选择工具
        this.context.Tools.setTool('select');
        this.context.PageLibrary.showHint('文字卡片已添加,可直接输入内容');
    }

    disableAllIframes() {
        const iframes = document.querySelectorAll('.canvas-element.page-element iframe');
        iframes.forEach(iframe => {
            iframe.style.pointerEvents = 'none';
        });
    }

    enableAllIframes() {
        const iframes = document.querySelectorAll('.canvas-element.page-element iframe');
        iframes.forEach(iframe => {
            iframe.style.pointerEvents = 'auto';
        });
    }

    getCursor() {
        return 'cell';
    }

    getDisplayName() {
        return '文字卡片';
    }
}

/**
 * 批注标记工具策略
 */
class AnnotationToolStrategy extends ToolStrategy {
    constructor() {
        super('annotation');
    }

    handleClick(e) {
        const canvasWrapper = document.getElementById('canvasWrapper');
        if (!canvasWrapper) return;

        const wrapperRect = canvasWrapper.getBoundingClientRect();
        const view = this.context.CanvasView.getView();

        const boxX = (e.clientX - wrapperRect.left - view.pan.x) / view.zoom;
        const boxY = (e.clientY - wrapperRect.top - view.pan.y) / view.zoom;

        // 临时禁用所有iframe的交互
        this.disableAllIframes();

        // 创建批注元素
        const elementId = this.context.ElementManager.addAnnotationElement(boxX, boxY);

        // 自动聚焦并恢复iframe交互
        setTimeout(() => {
            this.context.ElementManager.focusAnnotationContent(elementId);
            this.enableAllIframes();
        }, 0);

        // 切换回选择工具
        this.context.Tools.setTool('select');
        this.context.PageLibrary.showHint('批注标记已添加,可直接输入内容');
    }

    disableAllIframes() {
        const iframes = document.querySelectorAll('.canvas-element.page-element iframe');
        iframes.forEach(iframe => {
            iframe.style.pointerEvents = 'none';
        });
    }

    enableAllIframes() {
        const iframes = document.querySelectorAll('.canvas-element.page-element iframe');
        iframes.forEach(iframe => {
            iframe.style.pointerEvents = 'auto';
        });
    }

    getCursor() {
        return 'text';
    }

    getDisplayName() {
        return '批注标记';
    }
}

/**
 * 工具策略工厂
 */
const ToolStrategyFactory = {
    strategies: {},

    /**
     * 注册工具策略
     * @param {string} name - 工具名称
     * @param {ToolStrategy} strategy - 工具策略实例
     */
    register(name, strategy) {
        this.strategies[name] = strategy;
    },

    /**
     * 获取工具策略
     * @param {string} name - 工具名称
     * @returns {ToolStrategy|null}
     */
    get(name) {
        return this.strategies[name] || null;
    },

    /**
     * 初始化所有策略
     * @param {Object} context - 工具上下文
     */
    initAll(context) {
        const strategies = [
            new SelectToolStrategy(),
            new ArrowToolStrategy(),
            new NoteToolStrategy(),
            new AnnotationToolStrategy()
        ];

        strategies.forEach(strategy => {
            strategy.init(context);
            this.register(strategy.name, strategy);
        });
    }
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ToolStrategy,
        SelectToolStrategy,
        ArrowToolStrategy,
        NoteToolStrategy,
        AnnotationToolStrategy,
        ToolStrategyFactory
    };
}
