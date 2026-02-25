// 事件总线模块
// 使用观察者模式(发布订阅模式)解耦模块间通信
// 避免模块间直接依赖,降低耦合度

const EventBus = {
    // 事件监听器存储
    events: {},

    /**
     * 订阅事件
     * @param {string} eventName - 事件名称
     * @param {Function} callback - 回调函数
     * @returns {Function} 取消订阅的函数
     */
    on(eventName, callback) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }

        this.events[eventName].push(callback);

        // 返回取消订阅函数
        return () => {
            this.off(eventName, callback);
        };
    },

    /**
     * 订阅事件(只执行一次)
     * @param {string} eventName - 事件名称
     * @param {Function} callback - 回调函数
     */
    once(eventName, callback) {
        const onceCallback = (...args) => {
            callback(...args);
            this.off(eventName, onceCallback);
        };
        this.on(eventName, onceCallback);
    },

    /**
     * 取消订阅事件
     * @param {string} eventName - 事件名称
     * @param {Function} callback - 回调函数(可选,不传则清空该事件所有监听器)
     */
    off(eventName, callback) {
        if (!this.events[eventName]) {
            return;
        }

        if (callback) {
            // 移除特定回调
            this.events[eventName] = this.events[eventName].filter(cb => cb !== callback);
        } else {
            // 清空该事件的所有监听器
            delete this.events[eventName];
        }
    },

    /**
     * 发布事件
     * @param {string} eventName - 事件名称
     * @param {*} data - 事件数据
     */
    emit(eventName, data) {
        if (!this.events[eventName]) {
            return;
        }

        this.events[eventName].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`事件 ${eventName} 的回调执行出错:`, error);
            }
        });
    },

    /**
     * 清空所有事件监听器
     */
    clear() {
        this.events = {};
    },

    /**
     * 获取事件监听器数量
     * @param {string} eventName - 事件名称
     * @returns {number}
     */
    listenerCount(eventName) {
        return this.events[eventName] ? this.events[eventName].length : 0;
    }
};

// 定义所有事件名称常量,避免硬编码字符串
const EventNames = {
    // 元素相关事件
    ELEMENT_ADDED: 'element:added',
    ELEMENT_REMOVED: 'element:removed',
    ELEMENT_SELECTED: 'element:selected',
    ELEMENT_DESELECTED: 'element:deselected',
    ELEMENT_UPDATED: 'element:updated',
    ELEMENT_MOVED: 'element:moved',
    ELEMENT_RESIZED: 'element:resized',

    // 工具相关事件
    TOOL_CHANGED: 'tool:changed',

    // 视图相关事件
    VIEW_ZOOMED: 'view:zoomed',
    VIEW_PANNED: 'view:panned',
    VIEW_RESET: 'view:reset',

    // 历史记录相关事件
    HISTORY_SAVED: 'history:saved',
    HISTORY_UNDO: 'history:undo',
    HISTORY_REDO: 'history:redo',

    // 数据相关事件
    DATA_SAVED: 'data:saved',
    DATA_LOADED: 'data:loaded',
    DATA_CLEARED: 'data:cleared',

    // 页面相关事件
    PAGE_ADDED: 'page:added',
    PAGE_REMOVED: 'page:removed',
    PAGE_SWITCHED: 'page:switched',

    // 提示消息事件
    HINT_SHOW: 'hint:show',

    // 模态框事件
    MODAL_OPEN: 'modal:open',
    MODAL_CLOSE: 'modal:close'
};

// 事件总线工具方法
const EventBusUtils = {
    /**
     * 批量订阅事件
     * @param {Object} eventMap - 事件映射 { eventName: callback }
     * @returns {Function} 取消所有订阅的函数
     */
    subscribeAll(eventMap) {
        const unsubscribers = [];

        Object.entries(eventMap).forEach(([eventName, callback]) => {
            const unsubscribe = EventBus.on(eventName, callback);
            unsubscribers.push(unsubscribe);
        });

        // 返回取消所有订阅的函数
        return () => {
            unsubscribers.forEach(unsubscribe => unsubscribe());
        };
    },

    /**
     * 创建命名空间的事件名称
     * @param {string} namespace - 命名空间
     * @param {string} eventName - 事件名称
     * @returns {string}
     */
    namespacedEvent(namespace, eventName) {
        return `${namespace}:${eventName}`;
    }
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EventBus, EventNames, EventBusUtils };
}
