// 页面库管理模块
// 负责扫描pages目录，生成页面列表，处理拖拽逻辑

const PageLibrary = {
    // 页面数据
    pages: [],

    // 页面映射（ID到名称）
    pageMap: {
        'home': '首页',
        'search': '搜索页面',
        'rental-detail': '租赁详情',
        'select-rental-period': '选择租期',
        'payment-result': '支付结果',
        'store-info': '门店信息',
        'comment-list': '评论列表',
        'rental-list': '租赁列表',
        'works': '作品首页',
        'video-work-detail': '视频作品详情',
        'image-work-detail': '图文作品详情',
        'publish-work-select': '发布作品(选择)',
        'publish-video': '发布视频',
        'publish-image': '发布图片',
        'delivery-method': '收货方式',
        'messages': '消息首页',
        'system-message': '系统消息',
        'interaction-message': '互动消息',
        'customer-service': '在线客服',
        'private-chat': '私聊',
        'profile': '我的页面',
        'settings': '设置',
        'identity-verify': '实名认证(未完成)',
        'identity-verified': '实名认证(已完成)',
        'address-manage': '地址管理',
        'edit-address': '编辑地址',
        'store-address': '门店地址',
        'about-us': '关于我们',
        'edit-profile': '个人信息编辑',
        'data-overview': '数据概览',
        'my-orders': '我的订单',
        'logistics-detail': '查看物流'
    },

    // 图标映射
    iconMap: {
        'home': 'fa-home',
        'search': 'fa-search',
        'rental-detail': 'fa-camera',
        'select-rental-period': 'fa-calendar',
        'payment-result': 'fa-credit-card',
        'store-info': 'fa-store',
        'comment-list': 'fa-comments',
        'rental-list': 'fa-list',
        'works': 'fa-images',
        'video-work-detail': 'fa-video',
        'image-work-detail': 'fa-image',
        'publish-work-select': 'fa-upload',
        'publish-video': 'fa-video',
        'publish-image': 'fa-image',
        'delivery-method': 'fa-truck',
        'messages': 'fa-comment',
        'system-message': 'fa-cog',
        'interaction-message': 'fa-heart',
        'customer-service': 'fa-headset',
        'private-chat': 'fa-envelope',
        'profile': 'fa-user',
        'settings': 'fa-cog',
        'identity-verify': 'fa-id-card',
        'identity-verified': 'fa-id-card',
        'address-manage': 'fa-map-marker-alt',
        'edit-address': 'fa-edit',
        'store-address': 'fa-store-alt',
        'about-us': 'fa-info-circle',
        'edit-profile': 'fa-user-edit',
        'data-overview': 'fa-chart-bar',
        'my-orders': 'fa-shopping-bag',
        'logistics-detail': 'fa-shipping-fast'
    },

    // 初始化
    init() {
        this.generatePageList();
        this.renderPageLibrary();
        this.setupDragAndDrop();
    },

    // 生成页面列表（基于已知的32个页面）
    generatePageList() {
        const pageIds = Object.keys(this.pageMap);
        this.pages = pageIds.map(id => ({
            id: id,
            name: this.pageMap[id],
            filePath: `pages/${id}.html`,
            icon: this.iconMap[id] || 'fa-file',
            originalSize: { width: 320, height: 680 }
        }));
    },

    // 渲染页面库
    renderPageLibrary() {
        const container = document.getElementById('pageLibrary');
        const countSpan = document.getElementById('pageCount');

        if (!container) return;

        container.innerHTML = '';
        countSpan.textContent = this.pages.length;

        this.pages.forEach(page => {
            const item = document.createElement('div');
            item.className = 'page-item';
            item.draggable = true;
            item.dataset.pageId = page.id;

            item.innerHTML = `
                <i class="fas ${page.icon}"></i>
                <div class="page-item-info">
                    <div class="page-item-name">${page.name}</div>
                    <div class="page-item-id">${page.id}</div>
                </div>
            `;

            // 拖拽开始
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('pageId', page.id);
                e.dataTransfer.effectAllowed = 'copy';
                item.classList.add('dragging');
            });

            // 拖拽结束
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
            });

            container.appendChild(item);
        });
    },

    // 设置拖拽事件
    setupDragAndDrop() {
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

                // 显示提示
                this.showHint(`已添加: ${this.pageMap[pageId]}`);
            }
        });
    },

    // 获取页面信息
    getPageInfo(pageId) {
        return this.pages.find(p => p.id === pageId);
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