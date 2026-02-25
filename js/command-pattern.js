// 命令模式实现
// 使用命令模式封装操作,支持撤销/重做和批量操作

/**
 * 命令基类
 * 所有命令都应继承此类
 */
class Command {
    constructor() {
        this.timestamp = Date.now();
        this.id = this.generateId();
    }

    /**
     * 生成唯一ID
     * @returns {string}
     */
    generateId() {
        return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 执行命令
     * 子类必须实现
     */
    execute() {
        throw new Error('子类必须实现 execute 方法');
    }

    /**
     * 撤销命令
     * 子类必须实现
     */
    undo() {
        throw new Error('子类必须实现 undo 方法');
    }

    /**
     * 重做命令
     * 默认实现与 execute 相同
     */
    redo() {
        this.execute();
    }

    /**
     * 判断命令是否可以合并
     * @param {Command} other - 另一个命令
     * @returns {boolean}
     */
    canMerge(other) {
        return false;
    }

    /**
     * 合并命令
     * @param {Command} other - 另一个命令
     * @returns {Command} 合并后的命令
     */
    merge(other) {
        throw new Error('子类必须实现 merge 方法');
    }
}

/**
 * 宏命令
 * 包含多个子命令的复合命令
 */
class MacroCommand extends Command {
    constructor(commands = []) {
        super();
        this.commands = commands;
        this.name = '宏命令';
    }

    execute() {
        this.commands.forEach(cmd => cmd.execute());
    }

    undo() {
        // 反向撤销
        for (let i = this.commands.length - 1; i >= 0; i--) {
            this.commands[i].undo();
        }
    }

    redo() {
        this.commands.forEach(cmd => cmd.redo());
    }

    addCommand(command) {
        this.commands.push(command);
    }

    removeCommand(commandId) {
        const index = this.commands.findIndex(cmd => cmd.id === commandId);
        if (index > -1) {
            this.commands.splice(index, 1);
        }
    }
}

/**
 * 批量命令
 * 优化多个连续操作的宏命令
 */
class BatchCommand extends MacroCommand {
    constructor(commands = []) {
        super(commands);
        this.name = '批量操作';
    }
}

/**
 * No-Op 命令(空操作命令)
 * 用于占位,不做任何操作
 */
class NoOpCommand extends Command {
    execute() {}
    undo() {}
    redo() {}
}

/**
 * 命令调用器
 * 负责执行命令、管理历史记录
 */
class CommandInvoker {
    constructor() {
        // 历史记录栈
        this.undoStack = [];
        this.redoStack = [];

        // 配置
        this.maxSteps = 50;
        this.isExecuting = false;

        // 监听器
        this.listeners = {
            execute: [],
            undo: [],
            redo: [],
            clear: []
        };
    }

    /**
     * 执行命令
     * @param {Command} command - 命令实例
     */
    execute(command) {
        if (this.isExecuting) {
            console.warn('正在执行命令,忽略嵌套调用');
            return;
        }

        this.isExecuting = true;

        try {
            // 执行命令
            command.execute();

            // 添加到撤销栈
            this.undoStack.push(command);

            // 清空重做栈
            this.redoStack = [];

            // 限制历史记录数量
            this.trimStack();

            // 触发事件
            this.notify('execute', command);
        } catch (error) {
            console.error('命令执行失败:', error);
        } finally {
            this.isExecuting = false;
        }
    }

    /**
     * 撤销
     */
    undo() {
        if (this.isExecuting) {
            console.warn('正在执行命令,忽略嵌套调用');
            return;
        }

        if (this.undoStack.length === 0) {
            console.warn('没有可撤销的操作');
            return;
        }

        this.isExecuting = true;

        try {
            const command = this.undoStack.pop();
            command.undo();

            // 添加到重做栈
            this.redoStack.push(command);

            // 触发事件
            this.notify('undo', command);
        } catch (error) {
            console.error('撤销失败:', error);
        } finally {
            this.isExecuting = false;
        }
    }

    /**
     * 重做
     */
    redo() {
        if (this.isExecuting) {
            console.warn('正在执行命令,忽略嵌套调用');
            return;
        }

        if (this.redoStack.length === 0) {
            console.warn('没有可重做的操作');
            return;
        }

        this.isExecuting = true;

        try {
            const command = this.redoStack.pop();
            command.redo();

            // 添加回撤销栈
            this.undoStack.push(command);

            // 触发事件
            this.notify('redo', command);
        } catch (error) {
            console.error('重做失败:', error);
        } finally {
            this.isExecuting = false;
        }
    }

    /**
     * 批量执行命令
     * @param {Command[]} commands - 命令数组
     */
    executeBatch(commands) {
        if (commands.length === 0) return;

        const macroCommand = new BatchCommand(commands);
        this.execute(macroCommand);
    }

    /**
     * 尝试合并命令
     * @param {Command} command - 新命令
     * @returns {boolean} 是否成功合并
     */
    tryMerge(command) {
        if (this.undoStack.length === 0) {
            return false;
        }

        const lastCommand = this.undoStack[this.undoStack.length - 1];

        if (lastCommand.canMerge(command)) {
            const merged = lastCommand.merge(command);
            this.undoStack[this.undoStack.length - 1] = merged;
            return true;
        }

        return false;
    }

    /**
     * 清空历史记录
     */
    clear() {
        this.undoStack = [];
        this.redoStack = [];
        this.notify('clear', null);
    }

    /**
     * 限制历史记录数量
     */
    trimStack() {
        if (this.undoStack.length > this.maxSteps) {
            const removed = this.undoStack.splice(0, this.undoStack.length - this.maxSteps);
            console.log(`历史记录已裁剪,移除 ${removed.length} 条记录`);
        }
    }

    /**
     * 获取撤销栈信息
     * @returns {Object}
     */
    getUndoStackInfo() {
        return {
            length: this.undoStack.length,
            commands: this.undoStack.map(cmd => ({
                id: cmd.id,
                name: cmd.name || cmd.constructor.name,
                timestamp: cmd.timestamp
            }))
        };
    }

    /**
     * 获取重做栈信息
     * @returns {Object}
     */
    getRedoStackInfo() {
        return {
            length: this.redoStack.length,
            commands: this.redoStack.map(cmd => ({
                id: cmd.id,
                name: cmd.name || cmd.constructor.name,
                timestamp: cmd.timestamp
            }))
        };
    }

    /**
     * 订阅事件
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    on(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
    }

    /**
     * 取消订阅
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    off(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    }

    /**
     * 触发事件
     * @param {string} event - 事件名称
     * @param {*} data - 事件数据
     */
    notify(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`事件 ${event} 的回调执行出错:`, error);
                }
            });
        }
    }

    /**
     * 设置最大历史记录数
     * @param {number} max - 最大数量
     */
    setMaxSteps(max) {
        this.maxSteps = max;
        this.trimStack();
    }
}

/**
 * 具体命令实现示例
 * 这些命令封装具体的业务操作
 */

/**
 * 添加元素命令
 */
class AddElementCommand extends Command {
    constructor(elementManager, elementData) {
        super();
        this.name = '添加元素';
        this.elementManager = elementManager;
        this.elementData = elementData;
        this.elementId = elementData.id;
    }

    execute() {
        this.elementManager.state.elements.push(this.elementData);
        this.elementManager.renderElement(this.elementData);
        this.elementManager.updateStatusBar();
    }

    undo() {
        const index = this.elementManager.state.elements.findIndex(e => e.id === this.elementId);
        if (index > -1) {
            this.elementManager.state.elements.splice(index, 1);
            const div = document.querySelector(`[data-element-id="${this.elementId}"]`);
            if (div) div.remove();
            this.elementManager.updateStatusBar();
        }
    }
}

/**
 * 删除元素命令
 */
class DeleteElementCommand extends Command {
    constructor(elementManager, elementId) {
        super();
        this.name = '删除元素';
        this.elementManager = elementManager;
        this.elementId = elementId;
        this.elementData = null;
        this.index = -1;
    }

    execute() {
        this.index = this.elementManager.state.elements.findIndex(e => e.id === this.elementId);
        if (this.index === -1) return;

        // 保存元素数据
        this.elementData = { ...this.elementManager.state.elements[this.index] };

        // 执行删除
        this.elementManager.state.elements.splice(this.index, 1);
        const div = document.querySelector(`[data-element-id="${this.elementId}"]`);
        if (div) div.remove();

        this.elementManager.updateStatusBar();
    }

    undo() {
        if (!this.elementData) return;

        // 恢复元素
        this.elementManager.state.elements.splice(this.index, 0, this.elementData);
        this.elementManager.renderElement(this.elementData);
        this.elementManager.updateStatusBar();
    }
}

/**
 * 移动元素命令
 */
class MoveElementCommand extends Command {
    constructor(elementManager, elementId, oldPosition, newPosition) {
        super();
        this.name = '移动元素';
        this.elementManager = elementManager;
        this.elementId = elementId;
        this.oldPosition = { ...oldPosition };
        this.newPosition = { ...newPosition };
    }

    execute() {
        const element = this.elementManager.getElement(this.elementId);
        if (!element) return;

        element.position = { ...this.newPosition };

        const div = document.querySelector(`[data-element-id="${this.elementId}"]`);
        if (div) {
            div.style.left = `${this.newPosition.x}px`;
            div.style.top = `${this.newPosition.y}px`;
        }
    }

    undo() {
        const element = this.elementManager.getElement(this.elementId);
        if (!element) return;

        element.position = { ...this.oldPosition };

        const div = document.querySelector(`[data-element-id="${this.elementId}"]`);
        if (div) {
            div.style.left = `${this.oldPosition.x}px`;
            div.style.top = `${this.oldPosition.y}px`;
        }
    }

    canMerge(other) {
        return other instanceof MoveElementCommand && other.elementId === this.elementId;
    }

    merge(other) {
        const merged = new MoveElementCommand(
            this.elementManager,
            this.elementId,
            this.oldPosition,
            other.newPosition
        );
        return merged;
    }
}

// 创建全局命令调用器实例
const commandInvoker = new CommandInvoker();

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Command,
        MacroCommand,
        BatchCommand,
        NoOpCommand,
        CommandInvoker,
        AddElementCommand,
        DeleteElementCommand,
        MoveElementCommand,
        commandInvoker
    };
}
