// 项目配置文件 - 商城系统原型（移动端 + 桌面端）
// 由 dsh-prototype-guard 插件守护：页面注册、菜单路由、脚本契约都会在写入时校验。
window.PROJECT_CONFIG = {
  "projectName": "芋道管理后台",
  "projectTitle": "商城系统 - 移动端 & 桌面端高保真原型",
  "projectDescription": "同时覆盖商城 App 与商城管理后台的高保真原型设计系统",
  "version": "3.0.0",
  "projectRootPath": "E:\\develop\\java_item\\ai\\prototype-desiger",
  "canvasSize": {
    "width": 1440,
    "height": 900
  },
  // 设备类型定义（可选，不配则不显示设备Tab）
  "devices": [
    { "id": "app", "name": "商城App", "icon": "fa-mobile-alt", "canvasSize": { "width": 375, "height": 812 } },
    { "id": "admin", "name": "管理后台", "icon": "fa-desktop" }
  ],
  "categories": [
    // ========== 移动端（商城 App） ==========
    { "id": "app-home", "name": "首页", "order": 0, "device": "app" },
    { "id": "app-category", "name": "分类", "order": 1, "device": "app" },
    { "id": "app-cart", "name": "购物车", "order": 2, "device": "app" },
    { "id": "app-order", "name": "订单", "order": 3, "device": "app" },
    { "id": "app-profile", "name": "我的", "order": 4, "device": "app" },
    // ========== 桌面端（商城管理后台） ==========
    { "id": "mall", "name": "商城系统", "order": 10, "device": "admin" }
  ],
  "pages": [
    // ========== 移动端 · 商城 App ==========
    { "id": "app-mall-home", "name": "商城首页", "icon": "fa-store", "category": "app-home", "path": "pages/app/mall/home.html" },
    { "id": "app-mall-category", "name": "商品分类", "icon": "fa-th-large", "category": "app-category", "path": "pages/app/mall/category.html" },
    { "id": "app-mall-product-detail", "name": "商品详情", "icon": "fa-info-circle", "category": "app-category", "path": "pages/app/mall/product-detail.html" },
    { "id": "app-mall-cart", "name": "购物车", "icon": "fa-shopping-cart", "category": "app-cart", "path": "pages/app/mall/cart.html" },
    { "id": "app-mall-order-list", "name": "我的订单", "icon": "fa-list-alt", "category": "app-order", "path": "pages/app/mall/order-list.html" },
    { "id": "app-mall-profile", "name": "我的", "icon": "fa-user", "category": "app-profile", "path": "pages/app/mall/profile.html" },
    // ========== 桌面端 · 商城系统 ==========
    { "id": "mall-product", "name": "商品管理", "icon": "fa-box", "category": "mall", "path": "pages/admin/mall/product.html" },
    { "id": "mall-category", "name": "商品分类", "icon": "fa-sitemap", "category": "mall", "path": "pages/admin/mall/category.html" },
    { "id": "mall-order", "name": "订单管理", "icon": "fa-file-invoice-dollar", "category": "mall", "path": "pages/admin/mall/order.html" },
    { "id": "mall-order-detail", "name": "订单详情", "icon": "fa-receipt", "category": "mall", "path": "pages/admin/mall/order-detail.html" },
    { "id": "mall-coupon", "name": "优惠券管理", "icon": "fa-ticket-alt", "category": "mall", "path": "pages/admin/mall/coupon.html" },
    { "id": "mall-seckill", "name": "秒杀活动", "icon": "fa-bolt", "category": "mall", "path": "pages/admin/mall/seckill.html" }
  ]
};
