// 全局状态管理器
// 使用单例模式统一管理应用状态,避免状态分散

/**
 * 状态管理器单例类
 */
class StateManager {
    constructor() {
        if (StateManager.instance) {
            return StateManager.instance;
        }

        // 状态存储
        this.state = {
            // 元素状态
            elements: [],
            selectedElement: null,
            selectedElements: [],

            // 页面使用计数
            usageCount: {},

            // 工具状态
            currentTool: 'select',

            // 视图状态
            view: {
                zoom: 0.5,
                pan: { x: 0, y: 0 }
            },

            // 多页面状态
            pages: [],
            currentPageId: null,
            pageCounter: 0,
            nextElementId: 1,

            // 历史记录状态
            history: {
                stack: [],
                currentIndex: -1,
                maxSteps: 50,
                isUndoingOrRedoing: false
            },

            // UI状态
            ui: {
                hints: [],
                modals: []
            }
        };

        // 状态变更监听器
        this.listeners = {};

        StateManager.instance = this;
    }

    /**
     * 获取状态值
     * @param {string} path - 状态路径(支持点号分隔,如 'elements.0.id')
     * @returns {*}
     */
    get(path) {
        if (!path) {
            return this.state;
        }

        const keys = path.split('.');
        let value = this.state;

        for (const key of keys) {
            if (value && typeof value === 'object') {
                value = value[key];
            } else {
                return undefined;
            }
        }

        return value;
    }

    /**
     * 设置状态值
     * @param {string} path - 状态路径
     * @param {*} value - 新值
     * @param {boolean} silent - 是否静默(不触发监听器)
     */
    set(path, value, silent = false) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        let target = this.state;

        // 导航到父对象
        for (const key of keys) {
            if (!(key in target)) {
                target[key] = {};
            }
            target = target[key];
        }

        // 检查值是否真的变化
        if (target[lastKey] === value) {
            return;
        }

        // 保存旧值
        const oldValue = target[lastKey];

        // 设置新值
        target[lastKey] = value;

        // 触发监听器
        if (!silent) {
            this.notify(path, value, oldValue);
        }
    }

    /**
     * 批量更新状态
     * @param {Object} updates - 状态更新对象 { path: value }
     * @param {boolean} silent - 是否静默
     */
    setMultiple(updates, silent = false) {
        Object.entries(updates).forEach(([path, value]) => {
            this.set(path, value, true);
        });

        if (!silent) {
            // 批量更新只触发一次通知
            this.notify('batch', updates);
        }
    }

    /**
     * 更新对象的部分属性
     * @param {string} path - 状态路径
     * @param {Object} updates - 要更新的属性
     * @param {boolean} silent - 是否静默
     */
    update(path, updates, silent = false) {
        const target = this.get(path);
        if (!target || typeof target !== 'object') {
            console.warn(`状态路径 ${path} 不存在或不是对象`);
            return;
        }

        const oldValues = { ...target };

        // 更新属性
        Object.assign(target, updates);

        if (!silent) {
            this.notify(path, target, oldValues);
        }
    }

    /**
     * 删除状态
     * @param {string} path - 状态路径
     * @param {boolean} silent - 是否静默
     */
    delete(path, silent = false) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        let target = this.state;

        for (const key of keys) {
            if (!(key in target)) {
                return;
            }
            target = target[key];
        }

        const oldValue = target[lastKey];
        delete target[lastKey];

        if (!silent) {
            this.notify(path, undefined, oldValue);
        }
    }

    /**
     * 重置状态
     * @param {string} path - 状态路径(可选,不传则重置所有)
     * @param {*} value - 重置值(可选)
     */
    reset(path, value) {
        if (path) {
            this.set(path, value !== undefined ? value : {});
        } else {
            this.state = {
                elements: [],
                selectedElement: null,
                selectedElements: [],
                usageCount: {},
                currentTool: 'select',
                view: { zoom: 0.5, pan: { x: 0, y: 0 } },
                pages: [],
                currentPageId: null,
                pageCounter: 0,
                nextElementId: 1,
                history: {
                    stack: [],
                    currentIndex: -1,
                    maxSteps: 50,
                    isUndoingOrRedoing: false
                },
                ui: { hints: [], modals: [] }
            };
            this.notify('reset', this.state);
        }
    }

    /**
     * 订阅状态变化
     * @param {string} path - 状态路径(支持通配符 *)
     * @param {Function} callback - 回调函数 (newValue, oldValue, path)
     * @returns {Function} 取消订阅函数
     */
    subscribe(path, callback) {
        if (!this.listeners[path]) {
            this.listeners[path] = [];
        }

        this.listeners[path].push(callback);

        // 返回取消订阅函数
        return () => {
            this.listeners[path] = this.listeners[path].filter(cb => cb !== callback);
        };
    }

    /**
     * 取消订阅
     * @param {string} path - 状态路径
     * @param {Function} callback - 回调函数(可选)
     */
    unsubscribe(path, callback) {
        if (!this.listeners[path]) {
            return;
        }

        if (callback) {
            this.listeners[path] = this.listeners[path].filter(cb => cb !== callback);
        } else {
            delete this.listeners[path];
        }
    }

    /**
     * 通知状态变化
     * @param {string} path - 状态路径
     * @param {*} newValue - 新值
     * @param {*} oldValue - 旧值
     */
    notify(path, newValue, oldValue) {
        // 精确匹配
        if (this.listeners[path]) {
            this.listeners[path].forEach(callback => {
                try {
                    callback(newValue, oldValue, path);
                } catch (error) {
                    console.error(`状态 ${path} 的监听器执行出错:`, error);
                }
            });
        }

        // 通配符匹配
        Object.keys(this.listeners).forEach(key => {
            if (key.includes('*')) {
                const pattern = key.replace(/\*/g, '.*');
                const regex = new RegExp(`^${pattern}$`);
                if (regex.test(path)) {
                    this.listeners[key].forEach(callback => {
                        try {
                            callback(newValue, oldValue, path);
                        } catch (error) {
                            console.error(`状态 ${path} 的通配符监听器执行出错:`, error);
                        }
                    });
                }
            }
        });
    }

    /**
     * 获取整个状态树的快照
     * @returns {Object}
     */
    getSnapshot() {
        return JSON.parse(JSON.stringify(this.state));
    }

    /**
     * 从快照恢复状态
     * @param {Object} snapshot - 状态快照
     * @param {boolean} silent - 是否静默
     */
    restoreSnapshot(snapshot, silent = false) {
        this.state = JSON.parse(JSON.stringify(snapshot));

        if (!silent) {
            this.notify('restore', this.state);
        }
    }

    /**
     * 清空所有监听器
     */
    clearListeners() {
        this.listeners = {};
    }

    /**
     * 获取状态路径的所有监听器数量
     * @param {string} path - 状态路径
     * @returns {number}
     */
    getListenerCount(path) {
        return this.listeners[path] ? this.listeners[path].length : 0;
    }
}

// 创建单例实例
const stateManager = new StateManager();

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StateManager, stateManager };
}
