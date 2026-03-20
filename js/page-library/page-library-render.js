// 页面库渲染模块
// 负责页面列表的渲染、分组、分类折叠等

const PageLibraryRender = {
    // 渲染页面库
    render() {
        const container = document.getElementById('pageLibrary');
        const countSpan = document.getElementById('pageCount');

        if (!container) return;

        container.innerHTML = '';

        if (PageLibrary.pages.length === 0) {
            container.innerHTML = '<div class="no-pages-hint">未找到页面配置</div>';
            countSpan.textContent = '0';
            return;
        }

        countSpan.textContent = PageLibrary.pages.length;

        // 按分类分组
        const groupedPages = this.groupPagesByCategory();

        // 渲染分组
        Object.keys(groupedPages).forEach(categoryId => {
            const group = groupedPages[categoryId];
            const groupElement = this.createGroupElement(group);
            container.appendChild(groupElement);
        });
    },

    // 按分类分组页面
    groupPagesByCategory() {
        const groups = {};

        PageLibrary.pages.forEach(page => {
            const categoryId = page.category || 'uncategorized';
            if (!groups[categoryId]) {
                groups[categoryId] = {
                    id: categoryId,
                    name: this.getCategoryName(categoryId),
                    pages: []
                };
            }
            groups[categoryId].pages.push(page);
        });

        return groups;
    },

    // 获取分类名称
    getCategoryName(categoryId) {
        if (!PageLibrary.projectConfig || !PageLibrary.projectConfig.categories) {
            return categoryId === 'uncategorized' ? '未分类' : categoryId;
        }

        const category = PageLibrary.projectConfig.categories.find(c => c.id === categoryId);
        return category ? category.name : (categoryId === 'uncategorized' ? '未分类' : categoryId);
    },

    // 创建分组元素
    createGroupElement(group) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'page-group';
        groupDiv.dataset.categoryId = group.id;

        // 分组标题(可点击,可拖拽)
        const header = document.createElement('div');
        header.className = 'page-group-header';
        header.style.cursor = 'pointer';
        header.draggable = true; // 添加拖拽支持
        header.dataset.categoryId = group.id;

        // 获取展开状态
        const isExpanded = PageLibrary.categoryExpanded[group.id] !== false;

        header.innerHTML = `
            <span class="group-name">${group.name}</span>
            <div class="group-header-right">
                <span class="group-count">${group.pages.length}</span>
                <span class="category-toggle-icon ${isExpanded ? 'expanded' : 'collapsed'}">
                    <i class="fas fa-chevron-down"></i>
                </span>
            </div>
        `;

        // 点击标题切换折叠/展开
        header.addEventListener('click', () => {
            this.toggleCategory(group.id);
        });

        // 拖拽开始(批量添加分类下所有页面) - 委托给 PageLibraryDrag
        header.addEventListener('dragstart', (e) => {
            PageLibraryDrag.handleCategoryDragStart(e, group);
        });

        // 拖拽结束
        header.addEventListener('dragend', () => {
            header.classList.remove('dragging');
        });

        groupDiv.appendChild(header);

        // 分组内容(支持折叠)
        const content = document.createElement('div');
        content.className = `page-group-content ${isExpanded ? '' : 'collapsed'}`;

        group.pages.forEach(page => {
            const item = this.createPageItem(page);
            content.appendChild(item);
        });

        groupDiv.appendChild(content);

        return groupDiv;
    },

    // 创建页面项
    createPageItem(page) {
        const item = document.createElement('div');
        item.className = 'page-item';

        // 根据页面有效性添加样式类
        if (!page.isValid) {
            item.classList.add('page-item-invalid');
            item.draggable = false;  // 禁用拖拽
            item.title = '页面文件不存在，无法拖拽';
        } else {
            item.draggable = true;
        }

        item.dataset.pageId = page.id;

        // 根据有效性显示不同的图标
        const iconClass = page.isValid ? page.icon : 'fa-exclamation-triangle';
        const nameSuffix = page.isValid ? '' : ' [文件缺失]';

        item.innerHTML = `
            <i class="fas ${iconClass}"></i>
            <div class="page-item-info">
                <div class="page-item-name">${page.name}${nameSuffix}</div>
                <div class="page-item-id">${page.id}</div>
            </div>
            ${page.isValid ? `<div class="page-usage-badge" id="badge-${page.id}">0</div>` : ''}
        `;

        // 只为有效页面添加拖拽事件 - 委托给 PageLibraryDrag
        if (page.isValid) {
            item.addEventListener('dragstart', (e) => {
                PageLibraryDrag.handleItemDragStart(e, page);
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
            });
        }

        // 添加右键菜单事件
        item.addEventListener('contextmenu', (e) => {
            e.preventDefault(); // 阻止浏览器默认右键菜单
            // 显示自定义右键菜单（传递page对象,支持保存长截图）
            ElementManager.showContextMenu(e.clientX, e.clientY, null, null, page);
        });

        return item;
    },

    // 切换分类折叠/展开状态
    toggleCategory(categoryId) {
        // 切换状态
        PageLibrary.categoryExpanded[categoryId] = !PageLibrary.categoryExpanded[categoryId];

        // 重新渲染页面库
        this.render();

        console.log(`${PageLibrary.categoryExpanded[categoryId] ? '展开' : '折叠'}分类: ${categoryId}`);
    },

    // 更新页面使用计数徽章
    updateUsageBadge(pageId, count) {
        const badge = document.getElementById(`badge-${pageId}`);
        if (badge) {
            badge.textContent = count;
            // 如果计数为0，可以隐藏或显示0
            if (count === 0) {
                badge.style.display = 'none';
            } else {
                badge.style.display = 'flex';
            }
        }
    },

    // 显示临时提示
    showHint(message) {
        const existing = document.querySelector('.temp-hint');
        if (existing) existing.remove();

        const hint = document.createElement('div');
        hint.className = 'temp-hint';
        hint.textContent = message;
        document.body.appendChild(hint);

        setTimeout(() => hint.remove(), 2000);
    }
};
