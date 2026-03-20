// 页面库拖拽模块
// 负责页面和分类的拖拽功能

const PageLibraryDrag = {
    // 设置拖拽事件
    setup() {
        const canvasWrapper = document.getElementById('canvasWrapper');
        const canvas = document.getElementById('canvas');
        if (!canvasWrapper || !canvas) return;

        // 拖拽经过
        canvasWrapper.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            canvasWrapper.classList.add('drag-over');
        });

        // 拖拽离开
        canvasWrapper.addEventListener('dragleave', (e) => {
            if (e.target === canvasWrapper) {
                canvasWrapper.classList.remove('drag-over');
            }
        });

        // 放置
        canvasWrapper.addEventListener('drop', (e) => {
            e.preventDefault();
            canvasWrapper.classList.remove('drag-over');

            // 优先检查是否是分类拖拽(批量添加)
            const categoryId = e.dataTransfer.getData('categoryId');
            if (categoryId) {
                // 获取放置位置（考虑视图变换）
                const rect = canvasWrapper.getBoundingClientRect();
                const view = CanvasView.getView();

                // 计算相对于画布的坐标
                const x = (e.clientX - rect.left - view.pan.x) / view.zoom;
                const y = (e.clientY - rect.top - view.pan.y) / view.zoom;

                // 批量添加该分类下的所有页面
                this.addCategoryPages(categoryId, x, y);
                return;
            }

            // 单个页面添加(原有逻辑)
            const pageId = e.dataTransfer.getData('pageId');
            if (pageId) {
                // 获取放置位置（考虑视图变换）
                const rect = canvasWrapper.getBoundingClientRect();
                const view = CanvasView.getView();

                // 计算相对于画布的坐标
                // 1. 先计算相对于 canvasWrapper 的坐标
                // 2. 减去视图平移偏移
                // 3. 除以缩放比例
                const x = (e.clientX - rect.left - view.pan.x) / view.zoom;
                const y = (e.clientY - rect.top - view.pan.y) / view.zoom;

                // 创建元素
                ElementManager.addPageElement(pageId, x, y);

                // 显示提示(从页面信息获取名称)
                const pageInfo = PageLibrary.getPageInfo(pageId);
                const pageName = pageInfo ? pageInfo.name : pageId;
                PageLibraryRender.showHint(`已添加: ${pageName}`);
            }
        });

        // 添加拖拽到折叠分类时自动展开的功能
        this.setupCategoryExpandOnDrag();
    },

    // 设置拖拽时自动展开折叠分类
    setupCategoryExpandOnDrag() {
        const pageLibrary = document.getElementById('pageLibrary');
        if (!pageLibrary) return;

        let expandTimeout = null;

        // 监听拖拽经过分类标题
        pageLibrary.addEventListener('dragover', (e) => {
            const groupHeader = e.target.closest('.page-group-header');
            if (!groupHeader) {
                // 清除定时器
                if (expandTimeout) {
                    clearTimeout(expandTimeout);
                    expandTimeout = null;
                }
                return;
            }

            const groupDiv = groupHeader.closest('.page-group');
            if (!groupDiv) return;

            const categoryId = groupDiv.dataset.categoryId;
            if (!categoryId) return;

            // 检查该分类是否折叠
            if (PageLibrary.categoryExpanded[categoryId] === false) {
                // 清除之前的定时器
                if (expandTimeout) {
                    clearTimeout(expandTimeout);
                }

                // 延迟500ms后自动展开(避免快速滑动时误触发)
                expandTimeout = setTimeout(() => {
                    PageLibrary.categoryExpanded[categoryId] = true;
                    PageLibraryRender.render();
                    console.log(`拖拽时自动展开分类: ${categoryId}`);
                }, 500);
            }
        });

        // 拖拽离开时清除定时器
        pageLibrary.addEventListener('dragleave', () => {
            if (expandTimeout) {
                clearTimeout(expandTimeout);
                expandTimeout = null;
            }
        });

        // 拖拽结束时清除定时器
        pageLibrary.addEventListener('drop', () => {
            if (expandTimeout) {
                clearTimeout(expandTimeout);
                expandTimeout = null;
            }
        });
    },

    // 处理分类拖拽开始
    handleCategoryDragStart(e, group) {
        const categoryId = group.id;
        const pages = PageLibrary.getPagesInCategory(categoryId);

        // 传递分类ID和页面ID列表
        e.dataTransfer.setData('categoryId', categoryId);
        e.dataTransfer.setData('pageIds', JSON.stringify(pages.map(p => p.id)));
        e.dataTransfer.effectAllowed = 'copy';

        e.target.classList.add('dragging');
        console.log(`开始拖拽分类: ${group.name} (${pages.length}个页面)`);
    },

    // 处理单个页面项拖拽开始
    handleItemDragStart(e, page) {
        e.dataTransfer.setData('pageId', page.id);
        e.dataTransfer.effectAllowed = 'copy';
        e.target.classList.add('dragging');
    },

    // 批量添加分类下的所有页面到画布
    addCategoryPages(categoryId, startX, startY) {
        const pages = PageLibrary.getPagesInCategory(categoryId);

        if (pages.length === 0) {
            console.warn(`分类 ${categoryId} 下没有页面`);
            return;
        }

        const pageWidth = 320;  // 页面宽度
        const gap = 50;         // 页面间距

        // 批量添加前保存状态(用于撤销整个批量操作)
        HistoryManager.saveState();

        // 所有的页面放在一行,横向排列
        pages.forEach((page, index) => {
            const x = startX + index * (pageWidth + gap);
            const y = startY;  // 所有页面y坐标相同

            // 传入 false,不单独保存状态
            ElementManager.addPageElement(page.id, x, y, false);
        });

        // 批量添加后再保存状态
        HistoryManager.saveState();

        // 获取分类名称
        const groupedPages = PageLibraryRender.groupPagesByCategory();
        const categoryName = groupedPages[categoryId]?.name || categoryId;

        // 显示提示
        PageLibraryRender.showHint(`已添加 ${pages.length} 个页面(${categoryName})`);

        console.log(`批量添加完成: ${categoryName} (${pages.length}个页面)`);
    }
};
