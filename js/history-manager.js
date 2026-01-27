// 历史记录管理器 - 命令模式实现撤销/重做功能
// 支持多级撤销,记录所有可逆操作

const HistoryManager = {
    // 撤销栈 - 存储已执行的命令
    undoStack: [],

    // 重做栈 - 存储已撤销的命令
    redoStack: [],

    // 最大历史记录数量
    maxHistory: 50,

    // 是否正在执行命令(防止循环记录)
    isExecutingCommand: false,

    // 初始化
    init() {
        console.log('✅ 历史记录管理器初始化完成');
    },

    // 执行命令
    execute(command) {
        // 如果正在撤销/重做操作,不记录到历史
        if (this.isExecutingCommand) {
            command.execute();
            return;
        }

        // 执行命令
        command.execute();

        // 添加到撤销栈
        this.undoStack.push(command);

        // 清空重做栈(新操作使之前的重做链失效)
        this.redoStack = [];

        // 限制历史记录数量
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }

        console.log(`📝 操作已记录: ${command.description}, 可撤销步数: ${this.undoStack.length}`);
    },

    // 撤销
    undo() {
        if (this.undoStack.length === 0) {
            PageLibrary.showHint('没有可撤销的操作');
            return false;
        }

        // 从撤销栈弹出最后一个命令
        const command = this.undoStack.pop();

        // 标记正在执行命令
        this.isExecutingCommand = true;

        // 执行撤销
        try {
            command.undo();
            // 添加到重做栈
            this.redoStack.push(command);

            PageLibrary.showHint(`已撤销: ${command.description}`);
            console.log(`↩️ 撤销操作: ${command.description}, 剩余: ${this.undoStack.length}`);

            return true;
        } catch (error) {
            console.error('❌ 撤销失败:', error);
            // 撤销失败,放回撤销栈
            this.undoStack.push(command);
            return false;
        } finally {
            this.isExecutingCommand = false;
        }
    },

    // 重做
    redo() {
        if (this.redoStack.length === 0) {
            PageLibrary.showHint('没有可重做的操作');
            return false;
        }

        // 从重做栈弹出最后一个命令
        const command = this.redoStack.pop();

        // 标记正在执行命令
        this.isExecutingCommand = true;

        // 执行重做
        try {
            command.execute();
            // 添加回撤销栈
            this.undoStack.push(command);

            PageLibrary.showHint(`已重做: ${command.description}`);
            console.log(`↪️ 重做操作: ${command.description}, 可重做: ${this.redoStack.length}`);

            return true;
        } catch (error) {
            console.error('❌ 重做失败:', error);
            // 重做失败,放回重做栈
            this.redoStack.push(command);
            return false;
        } finally {
            this.isExecutingCommand = false;
        }
    },

    // 清空历史
    clear() {
        this.undoStack = [];
        this.redoStack = [];
        console.log('🗑️ 历史记录已清空');
    },

    // 获取历史状态
    getStatus() {
        return {
            canUndo: this.undoStack.length > 0,
            canRedo: this.redoStack.length > 0,
            undoCount: this.undoStack.length,
            redoCount: this.redoStack.length
        };
    }
};

// ====== 命令类定义 ======

// 添加元素命令
class AddElementCommand {
    constructor(elementManager, element) {
        this.elementManager = elementManager;
        this.element = element;
        this.description = `添加${this.getElementTypeName(element.type)}`;
    }

    execute() {
        // 元素已经在execute()调用前添加到state.elements中了
        // 这里只需要渲染
        this.elementManager.renderElement(this.element);
        this.elementManager.updateStatusBar();
    }

    undo() {
        // 删除元素
        this.elementManager.deleteElement(this.element.id, false); // false = 不记录历史

        // 从elements数组中移除
        const index = this.elementManager.state.elements.findIndex(e => e.id === this.element.id);
        if (index !== -1) {
            this.elementManager.state.elements.splice(index, 1);
        }
    }

    getElementTypeName(type) {
        const names = {
            'page': '页面',
            'arrow': '箭头',
            'note': '注释'
        };
        return names[type] || '元素';
    }
}

// 删除元素命令
class DeleteElementCommand {
    constructor(elementManager, element) {
        this.elementManager = elementManager;
        this.element = element;
        this.description = `删除${this.getElementTypeName(element.type)}`;
    }

    execute() {
        // 从DOM移除
        const div = document.querySelector(`[data-element-id="${this.element.id}"]`);
        if (div) {
            div.remove();
        }

        // 从数组移除
        const index = this.elementManager.state.elements.findIndex(e => e.id === this.element.id);
        if (index !== -1) {
            this.elementManager.state.elements.splice(index, 1);
        }

        this.elementManager.updateStatusBar();
    }

    undo() {
        // 恢复元素
        this.elementManager.state.elements.push(this.element);
        this.elementManager.renderElement(this.element);
        this.elementManager.updateStatusBar();
    }

    getElementTypeName(type) {
        const names = {
            'page': '页面',
            'arrow': '箭头',
            'note': '注释'
        };
        return names[type] || '元素';
    }
}

// 移动元素命令
class MoveElementCommand {
    constructor(elementManager, elementId, oldPosition, newPosition) {
        this.elementManager = elementManager;
        this.elementId = elementId;
        this.oldPosition = { ...oldPosition };
        this.newPosition = { ...newPosition };
        this.description = '移动元素';
    }

    execute() {
        const element = this.elementManager.getElement(this.elementId);
        if (element) {
            element.position = { ...this.newPosition };
            const div = document.querySelector(`[data-element-id="${this.elementId}"]`);
            if (div) {
                this.elementManager.updateElementPosition(div, element);
            }
        }
    }

    undo() {
        const element = this.elementManager.getElement(this.elementId);
        if (element) {
            element.position = { ...this.oldPosition };
            const div = document.querySelector(`[data-element-id="${this.elementId}"]`);
            if (div) {
                this.elementManager.updateElementPosition(div, element);
            }
        }
    }
}

// 调整元素大小命令
class ResizeElementCommand {
    constructor(elementManager, elementId, oldSize, oldPosition, newSize, newPosition) {
        this.elementManager = elementManager;
        this.elementId = elementId;
        this.oldSize = { ...oldSize };
        this.oldPosition = { ...oldPosition };
        this.newSize = { ...newSize };
        this.newPosition = { ...newPosition };
        this.description = '调整大小';
    }

    execute() {
        const element = this.elementManager.getElement(this.elementId);
        if (element) {
            element.width = this.newSize.width;
            element.height = this.newSize.height;
            element.position = { ...this.newPosition };

            const div = document.querySelector(`[data-element-id="${this.elementId}"]`);
            if (div) {
                div.style.left = `${this.newPosition.x}px`;
                div.style.top = `${this.newPosition.y}px`;
                div.style.width = `${this.newSize.width}px`;
                div.style.height = `${this.newSize.height}px`;

                // 更新尺寸显示
                const sizeDisplay = div.querySelector('.note-size-display');
                if (sizeDisplay) {
                    sizeDisplay.textContent = `${Math.round(this.newSize.width)}×${Math.round(this.newSize.height)}`;
                }
            }
        }
    }

    undo() {
        const element = this.elementManager.getElement(this.elementId);
        if (element) {
            element.width = this.oldSize.width;
            element.height = this.oldSize.height;
            element.position = { ...this.oldPosition };

            const div = document.querySelector(`[data-element-id="${this.elementId}"]`);
            if (div) {
                div.style.left = `${this.oldPosition.x}px`;
                div.style.top = `${this.oldPosition.y}px`;
                div.style.width = `${this.oldSize.width}px`;
                div.style.height = `${this.oldSize.height}px`;

                // 更新尺寸显示
                const sizeDisplay = div.querySelector('.note-size-display');
                if (sizeDisplay) {
                    sizeDisplay.textContent = `${Math.round(this.oldSize.width)}×${Math.round(this.oldSize.height)}`;
                }
            }
        }
    }
}

// 更新注释文本命令
class UpdateNoteTextCommand {
    constructor(elementManager, elementId, oldText, newText) {
        this.elementManager = elementManager;
        this.elementId = elementId;
        this.oldText = oldText;
        this.newText = newText;
        this.description = '编辑注释';
    }

    execute() {
        const element = this.elementManager.getElement(this.elementId);
        if (element) {
            element.text = this.newText;
            const div = document.querySelector(`[data-element-id="${this.elementId}"]`);
            if (div) {
                const contentDiv = div.querySelector('.note-content');
                if (contentDiv) {
                    contentDiv.textContent = this.newText;
                }
            }
        }
    }

    undo() {
        const element = this.elementManager.getElement(this.elementId);
        if (element) {
            element.text = this.oldText;
            const div = document.querySelector(`[data-element-id="${this.elementId}"]`);
            if (div) {
                const contentDiv = div.querySelector('.note-content');
                if (contentDiv) {
                    contentDiv.textContent = this.oldText;
                }
            }
        }
    }
}
