// 适配器模式实现
// 统一不同模块的接口,降低耦合度

/**
 * 元素管理器适配器
 * 封装 ElementManager 的接口
 */
class ElementManagerAdapter {
    constructor(elementManager) {
        this.elementManager = elementManager;
    }

    /**
     * 添加元素(统一接口)
     * @param {Object} elementData - 元素数据
     * @returns {string} 元素ID
     */
    addElement(elementData) {
        const type = elementData.type;

        switch (type) {
            case 'page':
                this.elementManager.addPageElement(
                    elementData.pageId,
                    elementData.x,
                    elementData.y
                );
                break;
            case 'arrow':
                this.elementManager.addArrowElement(elementData.points);
                break;
            case 'text':
                this.elementManager.addTextElement(elementData.text, elementData.x, elementData.y);
                break;
            case 'note':
                return this.elementManager.addNoteElement(elementData.text, elementData.x, elementData.y);
            case 'annotation':
                return this.elementManager.addAnnotationElement(elementData.x, elementData.y);
            default:
                throw new Error(`未知的元素类型: ${type}`);
        }
    }

    /**
     * 删除元素
     * @param {string} elementId - 元素ID
     */
    removeElement(elementId) {
        this.elementManager.deleteElement(elementId);
    }

    /**
     * 选中元素
     * @param {string} elementId - 元素ID
     */
    selectElement(elementId) {
        this.elementManager.selectElement(elementId);
    }

    /**
     * 取消选中
     * @param {string} elementId - 元素ID(可选)
     */
    deselectElement(elementId) {
        this.elementManager.deselectElement(elementId);
    }

    /**
     * 获取元素
     * @param {string} elementId - 元素ID
     * @returns {Object|null}
     */
    getElement(elementId) {
        return this.elementManager.getElement(elementId);
    }

    /**
     * 获取所有元素
     * @returns {Array}
     */
    getAllElements() {
        return this.elementManager.getAllElements();
    }

    /**
     * 清空所有元素
     * @param {boolean} silent - 是否静默
     */
    clearAll(silent = false) {
        this.elementManager.clearAll(silent);
    }
}

/**
 * 视图管理器适配器
 * 封装 CanvasView 的接口
 */
class ViewManagerAdapter {
    constructor(canvasView) {
        this.canvasView = canvasView;
    }

    /**
     * 缩放视图
     * @param {number} zoom - 缩放比例
     */
    zoom(zoom) {
        this.canvasView.setZoom(zoom);
    }

    /**
     * 平移视图
     * @param {number} x - X轴偏移
     * @param {number} y - Y轴偏移
     */
    pan(x, y) {
        this.canvasView.setPan(x, y);
    }

    /**
     * 重置视图
     */
    reset() {
        this.canvasView.reset();
    }

    /**
     * 获取视图状态
     * @returns {Object}
     */
    getViewState() {
        return this.canvasView.getView();
    }
}

/**
 * 工具管理器适配器
 * 封装 Tools 的接口
 */
class ToolManagerAdapter {
    constructor(tools) {
        this.tools = tools;
    }

    /**
     * 设置工具
     * @param {string} toolName - 工具名称
     */
    setTool(toolName) {
        this.tools.setTool(toolName);
    }

    /**
     * 获取当前工具
     * @returns {string}
     */
    getCurrentTool() {
        return this.tools.getCurrentTool();
    }
}

/**
 * 页面库适配器
 * 封装 PageLibrary 的接口
 */
class PageLibraryAdapter {
    constructor(pageLibrary) {
        this.pageLibrary = pageLibrary;
    }

    /**
     * 获取页面信息
     * @param {string} pageId - 页面ID
     * @returns {Object|null}
     */
    getPageInfo(pageId) {
        return this.pageLibrary.getPageInfo(pageId);
    }

    /**
     * 获取所有页面ID
     * @returns {string[]}
     */
    getAllPageIds() {
        return this.pageLibrary.getAllPageIds();
    }

    /**
     * 更新使用徽章
     * @param {string} pageId - 页面ID
     * @param {number} count - 使用次数
     */
    updateUsageBadge(pageId, count) {
        this.pageLibrary.updateUsageBadge(pageId, count);
    }

    /**
     * 显示提示
     * @param {string} message - 提示消息
     */
    showHint(message) {
        this.pageLibrary.showHint(message);
    }
}

/**
 * 存储管理器适配器
 * 封装 Storage 的接口
 */
class StorageManagerAdapter {
    constructor(storage) {
        this.storage = storage;
    }

    /**
     * 保存数据
     */
    save() {
        this.storage.save();
    }

    /**
     * 加载数据
     */
    load() {
        this.storage.load();
    }

    /**
     * 导出数据
     */
    export() {
        this.storage.export();
    }

    /**
     * 导入数据
     * @param {File} file - 文件对象
     */
    import(file) {
        this.storage.import(file);
    }
}

/**
 * 统一API接口
 * 提供一个统一的入口点访问所有功能
 */
class UnifiedAPI {
    constructor() {
        this.adapters = {};
    }

    /**
     * 注册适配器
     * @param {string} name - 适配器名称
     * @param {Object} adapter - 适配器实例
     */
    registerAdapter(name, adapter) {
        this.adapters[name] = adapter;
    }

    /**
     * 获取适配器
     * @param {string} name - 适配器名称
     * @returns {Object|null}
     */
    getAdapter(name) {
        return this.adapters[name] || null;
    }

    /**
     * 元素操作
     */
    get elements() {
        return this.adapters.elements;
    }

    /**
     * 视图操作
     */
    get view() {
        return this.adapters.view;
    }

    /**
     * 工具操作
     */
    get tools() {
        return this.adapters.tools;
    }

    /**
     * 页面库操作
     */
    get pages() {
        return this.adapters.pages;
    }

    /**
     * 存储操作
     */
    get storage() {
        return this.adapters.storage;
    }
}

/**
 * 门面模式
 * 提供简化的高层接口
 */
class Facade {
    constructor() {
        this.api = new UnifiedAPI();
    }

    /**
     * 初始化所有适配器
     * @param {Object} modules - 模块集合
     */
    init(modules) {
        // 注册所有适配器
        this.api.registerAdapter('elements', new ElementManagerAdapter(modules.ElementManager));
        this.api.registerAdapter('view', new ViewManagerAdapter(modules.CanvasView));
        this.api.registerAdapter('tools', new ToolManagerAdapter(modules.Tools));
        this.api.registerAdapter('pages', new PageLibraryAdapter(modules.PageLibrary));
        this.api.registerAdapter('storage', new StorageManagerAdapter(modules.Storage));
    }

    /**
     * 快捷方法:添加页面元素
     * @param {string} pageId - 页面ID
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     */
    addPage(pageId, x, y) {
        return this.api.elements.addElement({ type: 'page', pageId, x, y });
    }

    /**
     * 快捷方法:添加箭头
     * @param {Array} points - 点数组
     */
    addArrow(points) {
        return this.api.elements.addElement({ type: 'arrow', points });
    }

    /**
     * 快捷方法:添加文字卡片
     * @param {string} text - 文本内容
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     */
    addNote(text, x, y) {
        return this.api.elements.addElement({ type: 'note', text, x, y });
    }

    /**
     * 快捷方法:删除元素
     * @param {string} elementId - 元素ID
     */
    remove(elementId) {
        this.api.elements.removeElement(elementId);
    }

    /**
     * 快捷方法:选中元素
     * @param {string} elementId - 元素ID
     */
    select(elementId) {
        this.api.elements.selectElement(elementId);
    }

    /**
     * 快捷方法:切换工具
     * @param {string} toolName - 工具名称
     */
    useTool(toolName) {
        this.api.tools.setTool(toolName);
    }

    /**
     * 快捷方法:缩放视图
     * @param {number} zoom - 缩放比例
     */
    zoom(zoom) {
        this.api.view.zoom(zoom);
    }

    /**
     * 快捷方法:保存
     */
    save() {
        this.api.storage.save();
    }

    /**
     * 快捷方法:清空
     * @param {boolean} silent - 是否静默
     */
    clear(silent = false) {
        this.api.elements.clearAll(silent);
    }

    /**
     * 快捷方法:显示提示
     * @param {string} message - 提示消息
     */
    hint(message) {
        this.api.pages.showHint(message);
    }
}

// 创建全局门面实例
const facade = new Facade();

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ElementManagerAdapter,
        ViewManagerAdapter,
        ToolManagerAdapter,
        PageLibraryAdapter,
        StorageManagerAdapter,
        UnifiedAPI,
        Facade,
        facade
    };
}
