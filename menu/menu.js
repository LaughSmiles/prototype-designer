// 菜单配置文件 - 商城系统原型
// 动态侧边栏菜单数据配置
//
// 菜单项结构说明:
// - id: 唯一标识符
// - name: 显示名称
// - icon: Font Awesome 图标类名
// - path: 页面路径（相对于 pages 目录，null 表示无跳转）
// - order: 排序字段（数字越小越靠前）
// - parentId: 父菜单 ID（null 表示顶级菜单）
// - children: 子菜单数组（最多 3 级）
//
// 注意: 路径写法与 config.js 不同 —— 此处相对 pages/ 目录，
//       即 admin/mall/product.html，而不是 pages/admin/mall/product.html

window.SIDEBAR_MENU = [
  {
    id: "mall",
    name: "商城系统",
    icon: "fa-shopping-cart",
    path: null,
    order: 10,
    parentId: null,
    children: [
      { id: "mall-product", name: "商品管理", icon: "fa-box", path: "admin/mall/product.html", order: 1, parentId: "mall" },
      { id: "mall-category", name: "商品分类", icon: "fa-sitemap", path: "admin/mall/category.html", order: 2, parentId: "mall" },
      { id: "mall-order", name: "订单管理", icon: "fa-file-invoice-dollar", path: "admin/mall/order.html", order: 3, parentId: "mall" },
      { id: "mall-coupon", name: "优惠券管理", icon: "fa-ticket-alt", path: "admin/mall/coupon.html", order: 4, parentId: "mall" },
      { id: "mall-seckill", name: "秒杀活动", icon: "fa-bolt", path: "admin/mall/seckill.html", order: 5, parentId: "mall" }
      // 订单详情 admin/mall/order-detail.html 是详情页，由订单管理进入，不进侧边栏
    ]
  }
];
