// 弹窗管理器 - 统一管理确认弹窗和输入弹窗
const ModalManager = {
    // 回调函数存储
    confirmCallback: null,
    promptCallback: null,

    // 初始化
    init() {
        this.setupConfirmModal();
        this.setupPromptModal();
    },

    // 设置确认弹窗事件
    setupConfirmModal() {
        const modal = document.getElementById('confirmModal');
        const overlay = modal.querySelector('.help-modal-overlay');
        const confirmBtn = document.getElementById('confirmModalConfirm');
        const cancelBtn = document.getElementById('confirmModalCancel');

        // 点击遮罩层关闭
        overlay.addEventListener('click', () => {
            this.hideConfirm();
        });

        // 点击取消按钮
        cancelBtn.addEventListener('click', () => {
            this.hideConfirm();
        });

        // 点击确定按钮
        confirmBtn.addEventListener('click', () => {
            if (this.confirmCallback) {
                this.confirmCallback();
            }
            this.hideConfirm();
        });
    },

    // 设置输入弹窗事件
    setupPromptModal() {
        const modal = document.getElementById('promptModal');
        const overlay = modal.querySelector('.help-modal-overlay');
        const input = document.getElementById('promptModalInput');
        const confirmBtn = document.getElementById('promptModalConfirm');
        const cancelBtn = document.getElementById('promptModalCancel');

        // 点击遮罩层关闭
        overlay.addEventListener('click', () => {
            this.hidePrompt();
        });

        // 点击取消按钮
        cancelBtn.addEventListener('click', () => {
            this.hidePrompt();
        });

        // 点击确定按钮
        confirmBtn.addEventListener('click', () => {
            const value = input.value.trim();
            if (this.promptCallback) {
                this.promptCallback(value);
            }
            this.hidePrompt();
        });

        // 支持回车键确认
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                confirmBtn.click();
            }
        });
    },

    // 显示确认弹窗
    showConfirm(message, title = '确认操作', onConfirm = null) {
        const modal = document.getElementById('confirmModal');
        const messageEl = document.getElementById('confirmModalMessage');
        const titleEl = document.getElementById('confirmModalTitle');

        messageEl.textContent = message;
        titleEl.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${title}`;
        this.confirmCallback = onConfirm;

        modal.classList.add('active');
    },

    // 隐藏确认弹窗
    hideConfirm() {
        const modal = document.getElementById('confirmModal');
        modal.classList.remove('active');
        this.confirmCallback = null;
    },

    // 显示输入弹窗
    showPrompt(message, defaultValue = '', title = '输入内容', onConfirm = null) {
        const modal = document.getElementById('promptModal');
        const messageEl = document.getElementById('promptModalMessage');
        const titleEl = document.getElementById('promptModalTitle');
        const input = document.getElementById('promptModalInput');

        messageEl.textContent = message;
        titleEl.innerHTML = `<i class="fas fa-edit"></i> ${title}`;
        input.value = defaultValue;
        this.promptCallback = onConfirm;

        modal.classList.add('active');

        // 自动聚焦并选中文本
        setTimeout(() => {
            input.focus();
            input.select();
        }, 100);
    },

    // 隐藏输入弹窗
    hidePrompt() {
        const modal = document.getElementById('promptModal');
        modal.classList.remove('active');
        this.promptCallback = null;
    }
};
