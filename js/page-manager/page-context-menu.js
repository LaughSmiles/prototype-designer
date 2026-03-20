// 页面右键菜单模块
// 负责页面列表的右键菜单功能

const PageContextMenu = {
    // 显示右键菜单
    show(event, pageId, pageManager) {
        const contextMenu = document.getElementById('pageContextMenu');
        if (!contextMenu) return;

        // 设置菜单位置
        contextMenu.style.left = `${event.clientX}px`;
        contextMenu.style.top = `${event.clientY}px`;
        contextMenu.style.display = 'block';

        // 动态存储当前操作的pageId
        contextMenu._currentPageId = pageId;

        // 只绑定一次事件监听器
        if (!contextMenu._eventsBound) {
            const menuItems = contextMenu.querySelectorAll('.context-menu-item');
            menuItems.forEach(item => {
                const action = item.dataset.action;
                item.addEventListener('click', () => {
                    this.handleAction(action, contextMenu._currentPageId, pageManager);
                    contextMenu.style.display = 'none';
                });
            });
            contextMenu._eventsBound = true;
        }

        // 点击其他地方关闭菜单
        const closeMenu = (e) => {
            if (!contextMenu.contains(e.target)) {
                contextMenu.style.display = 'none';
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 0);
    },

    // 处理菜单操作
    handleAction(action, pageId, pageManager) {
        switch (action) {
            case 'rename':
                this.promptRename(pageId, pageManager);
                break;
            case 'duplicate':
                pageManager.duplicatePage(pageId);
                break;
            case 'delete':
                pageManager.deletePage(pageId);
                break;
        }
    },

    // 提示重命名
    promptRename(pageId, pageManager) {
        const page = pageManager.pages.find(p => p.id === pageId);
        if (!page) return;

        ModalManager.showPrompt(
            '请输入新的页面名称:',
            page.name,
            '重命名页面',
            (newName) => {
                if (newName && newName.trim() && newName !== page.name) {
                    pageManager.renamePage(pageId, newName.trim());
                    PageLibrary.showHint(`✅ 页面已重命名为: ${newName.trim()}`);
                }
            }
        );
    }
};
