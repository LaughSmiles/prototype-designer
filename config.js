// 项目配置文件 - 芋道管理后台原型
window.PROJECT_CONFIG = {
  "projectName": "芋道管理后台",
  "projectTitle": "芋道管理后台 - 高保真原型设计",
  "projectDescription": "芋道管理后台 (yudao-ui-admin-vue3) 原型设计系统，包含 AI、BPM、CRM、Mall 等完整业务模块",
  "version": "1.0.0",
  "projectRootPath": "E:\\develop\\java_item\\yudao\\prototype-desiger",
  "canvasSize": {
    "width": 1440,
    "height": 900
  },
  "categories": [
    {
      "id": "home",
      "name": "首页",
      "order": 0
    },
    {
      "id": "system",
      "name": "系统管理",
      "order": 1
    },
    {
      "id": "infra",
      "name": "基础设施",
      "order": 2
    },
    {
      "id": "pay",
      "name": "支付管理",
      "order": 3
    },
    {
      "id": "bpm",
      "name": "工作流程",
      "order": 4
    },
    {
      "id": "member",
      "name": "会员中心",
      "order": 5
    },
    {
      "id": "mall",
      "name": "商城系统",
      "order": 6
    },
    {
      "id": "mp",
      "name": "公众号管理",
      "order": 7
    },
    {
      "id": "crm",
      "name": "CRM 系统",
      "order": 8
    },
    {
      "id": "erp",
      "name": "ERP 系统",
      "order": 9
    },
    {
      "id": "ai",
      "name": "AI 大模型",
      "order": 10
    },
    {
      "id": "iot",
      "name": "IoT 物联网",
      "order": 11
    },
    {
      "id": "report",
      "name": "报表管理",
      "order": 12
    },
    {
      "id": "error",
      "name": "错误页面",
      "order": 13
    },
    {
      "id": "other",
      "name": "其他",
      "order": 14
    }
  ],
  "pages": [
    // 错误页面
    {
      "id": "error-403",
      "name": "403 禁止访问",
      "icon": "fa-ban",
      "category": "error",
      "path": "pages/error/403.html"
    },
    {
      "id": "error-404",
      "name": "404 页面不存在",
      "icon": "fa-exclamation-triangle",
      "category": "error",
      "path": "pages/error/404.html"
    },
    {
      "id": "error-500",
      "name": "500 服务器错误",
      "icon": "fa-server",
      "category": "error",
      "path": "pages/error/500.html"
    },
    // 其他分类 (基础页面和特殊页面)
    {
      "id": "login",
      "name": "登录",
      "icon": "fa-sign-in-alt",
      "category": "other",
      "path": "pages/login.html"
    },
    {
      "id": "home",
      "name": "首页",
      "icon": "fa-home",
      "category": "home",
      "path": "pages/home.html"
    },
    {
      "id": "profile",
      "name": "个人中心",
      "icon": "fa-user",
      "category": "other",
      "path": "pages/profile.html"
    },
    {
      "id": "redirect",
      "name": "重定向",
      "icon": "fa-redirect",
      "category": "other",
      "path": "pages/redirect.html"
    },
    { "id": "system-dict-data", "name": "字典数据", "icon": "fa-list", "category": "other", "path": "pages/system/dict-data.html" },
    { "id": "system-errorcode", "name": "错误码管理", "icon": "fa-bug", "category": "other", "path": "pages/system/errorcode.html" },
    // 系统管理模块 (按数据库菜单顺序)
    // 1. 租户管理 (sort=0)
    { "id": "system-tenant", "name": "租户管理", "icon": "fa-building", "category": "system", "path": "pages/system/tenant.html" },
    { "id": "system-tenant-package", "name": "租户套餐", "icon": "fa-box", "category": "system", "path": "pages/system/tenant-package.html" },
    // 2. 用户管理 (sort=1)
    { "id": "system-user", "name": "用户管理", "icon": "fa-users", "category": "system", "path": "pages/system/user.html" },
    // 3. 角色管理 (sort=2)
    { "id": "system-role", "name": "角色管理", "icon": "fa-user-shield", "category": "system", "path": "pages/system/role.html" },
    // 4. 菜单管理 (sort=3)
    { "id": "system-menu", "name": "菜单管理", "icon": "fa-bars", "category": "system", "path": "pages/system/menu.html" },
    // 5. 部门管理 (sort=4)
    { "id": "system-dept", "name": "部门管理", "icon": "fa-sitemap", "category": "system", "path": "pages/system/dept.html" },
    // 6. 岗位管理 (sort=5)
    { "id": "system-post", "name": "岗位管理", "icon": "fa-id-badge", "category": "system", "path": "pages/system/post.html" },
    // 7. 字典管理 (sort=6)
    { "id": "system-dict", "name": "字典类型", "icon": "fa-book", "category": "system", "path": "pages/system/dict.html" },
    // 8. 消息中心 (sort=7) - 邮箱管理
    { "id": "system-mail-account", "name": "邮箱账号", "icon": "fa-envelope", "category": "system", "path": "pages/system/mail-account.html" },
    { "id": "system-mail-template", "name": "邮件模板", "icon": "fa-envelope-open", "category": "system", "path": "pages/system/mail-template.html" },
    { "id": "system-mail-log", "name": "邮件日志", "icon": "fa-paper-plane", "category": "system", "path": "pages/system/mail-log.html" },
    // 8. 消息中心 - 公告管理 (sort=4)
    { "id": "system-notice", "name": "公告管理", "icon": "fa-bullhorn", "category": "system", "path": "pages/system/notice.html" },
    // 8. 消息中心 - 短信管理
    { "id": "system-sms-channel", "name": "短信渠道", "icon": "fa-comment-dots", "category": "system", "path": "pages/system/sms-channel.html" },
    { "id": "system-sms-template", "name": "短信模板", "icon": "fa-file-alt", "category": "system", "path": "pages/system/sms-template.html" },
    { "id": "system-sms-log", "name": "短信日志", "icon": "fa-comment", "category": "system", "path": "pages/system/sms-log.html" },
    // 8. 消息中心 - 站内信管理
    { "id": "system-notify-template", "name": "站内信模板", "icon": "fa-bell-slash", "category": "system", "path": "pages/system/notify-template.html" },
    { "id": "system-notify-message", "name": "站内信", "icon": "fa-bell", "category": "system", "path": "pages/system/notify-message.html" },
    // 9. 审计日志 (sort=9)
    { "id": "system-operatelog", "name": "操作日志", "icon": "fa-history", "category": "system", "path": "pages/system/operatelog.html" },
    { "id": "system-loginlog", "name": "登录日志", "icon": "fa-sign-in-alt", "category": "system", "path": "pages/system/loginlog.html" },
    // 10. 三方登录 (sort=10)
    { "id": "system-social-client", "name": "社交客户端", "icon": "fa-share-alt", "category": "system", "path": "pages/system/social-client.html" },
    { "id": "system-social-user", "name": "社交用户", "icon": "fa-user-friends", "category": "system", "path": "pages/system/social-user.html" },
    // 11. OAuth 2.0 (sort=10)
    { "id": "system-oauth2-client", "name": "OAuth2客户端", "icon": "fa-key", "category": "system", "path": "pages/system/oauth2-client.html" },
    { "id": "system-oauth2-token", "name": "OAuth2令牌", "icon": "fa-ticket-alt", "category": "system", "path": "pages/system/oauth2-token.html" },
    // 12. 地区管理 (sort=14)
    { "id": "system-area", "name": "地区管理", "icon": "fa-map-marker-alt", "category": "system", "path": "pages/system/area.html" },
    // AI 模块
    { "id": "ai-chat", "name": "AI 对话", "icon": "fa-comments", "category": "ai", "path": "pages/ai/chat.html" },
    { "id": "ai-chat-manager", "name": "AI 对话管理", "icon": "fa-comments", "category": "ai", "path": "pages/ai/chat-manager.html" },
    { "id": "ai-image", "name": "AI 绘图", "icon": "fa-palette", "category": "ai", "path": "pages/ai/image.html" },
    { "id": "ai-image-square", "name": "AI 绘图广场", "icon": "fa-images", "category": "ai", "path": "pages/ai/image-square.html" },
    { "id": "ai-image-manager", "name": "AI 绘图管理", "icon": "fa-image", "category": "ai", "path": "pages/ai/image-manager.html" },
    { "id": "ai-knowledge", "name": "知识库", "icon": "fa-book", "category": "ai", "path": "pages/ai/knowledge.html" },
    { "id": "ai-knowledge-document", "name": "知识库文档", "icon": "fa-file-alt", "category": "ai", "path": "pages/ai/knowledge-document.html" },
    { "id": "ai-knowledge-segment", "name": "知识库分段", "icon": "fa-puzzle-piece", "category": "ai", "path": "pages/ai/knowledge-segment.html" },
    { "id": "ai-mindmap", "name": "思维导图", "icon": "fa-project-diagram", "category": "ai", "path": "pages/ai/mindmap.html" },
    { "id": "ai-mindmap-manager", "name": "思维导图管理", "icon": "fa-sitemap", "category": "ai", "path": "pages/ai/mindmap-manager.html" },
    { "id": "ai-workflow", "name": "工作流", "icon": "fa-cogs", "category": "ai", "path": "pages/ai/workflow.html" },
    { "id": "ai-write", "name": "AI 写作", "icon": "fa-pen-fancy", "category": "ai", "path": "pages/ai/write.html" },
    { "id": "ai-write-manager", "name": "AI 写作管理", "icon": "fa-pen", "category": "ai", "path": "pages/ai/write-manager.html" },
    { "id": "ai-music", "name": "AI 音乐", "icon": "fa-music", "category": "ai", "path": "pages/ai/music.html" },
    { "id": "ai-music-manager", "name": "AI 音乐管理", "icon": "fa-compact-disc", "category": "ai", "path": "pages/ai/music-manager.html" },
    { "id": "ai-model", "name": "模型管理", "icon": "fa-robot", "category": "ai", "path": "pages/ai/model.html" },
    { "id": "ai-api-key", "name": "API 密钥", "icon": "fa-key", "category": "ai", "path": "pages/ai/api-key.html" },
    { "id": "ai-chat-role", "name": "对话角色", "icon": "fa-user-secret", "category": "ai", "path": "pages/ai/chat-role.html" },
    { "id": "ai-tool", "name": "工具管理", "icon": "fa-wrench", "category": "ai", "path": "pages/ai/tool.html" },
    // BPM 模块
    { "id": "bpm-model", "name": "流程模型", "icon": "fa-project-diagram", "category": "bpm", "path": "pages/bpm/model.html" },
    { "id": "bpm-model-definition", "name": "流程定义", "icon": "fa-sitemap", "category": "bpm", "path": "pages/bpm/model-definition.html" },
    { "id": "bpm-model-form", "name": "流程表单", "icon": "fa-wpforms", "category": "bpm", "path": "pages/bpm/model-form.html" },
    { "id": "bpm-form", "name": "动态表单", "icon": "fa-file-alt", "category": "bpm", "path": "pages/bpm/form.html" },
    { "id": "bpm-form-editor", "name": "表单设计器", "icon": "fa-drafting-compass", "category": "bpm", "path": "pages/bpm/form-editor.html" },
    { "id": "bpm-task-my", "name": "我的任务", "icon": "fa-tasks", "category": "bpm", "path": "pages/bpm/task-my.html" },
    { "id": "bpm-task-detail", "name": "任务详情", "icon": "fa-clipboard-list", "category": "bpm", "path": "pages/bpm/task-detail.html" },
    { "id": "bpm-oa-leave", "name": "请假申请", "icon": "fa-calendar-minus", "category": "bpm", "path": "pages/bpm/oa-leave.html" },
    { "id": "bpm-oa-leave-create", "name": "创建请假", "icon": "fa-plus-circle", "category": "bpm", "path": "pages/bpm/oa-leave-create.html" },
    { "id": "bpm-oa-leave-detail", "name": "请假详情", "icon": "fa-info-circle", "category": "bpm", "path": "pages/bpm/oa-leave-detail.html" },
    { "id": "bpm-category", "name": "流程分类", "icon": "fa-folder", "category": "bpm", "path": "pages/bpm/category.html" },
    { "id": "bpm-group", "name": "用户组", "icon": "fa-users-cog", "category": "bpm", "path": "pages/bpm/group.html" },
    { "id": "bpm-process-expression", "name": "流程表达式", "icon": "fa-calculator", "category": "bpm", "path": "pages/bpm/process-expression.html" },
    // Mall 模块
    { "id": "mall-product-spu", "name": "商品管理", "icon": "fa-box", "category": "mall", "path": "pages/mall/product-spu.html" },
    { "id": "mall-product-spu-form", "name": "商品编辑", "icon": "fa-edit", "category": "mall", "path": "pages/mall/product-spu-form.html" },
    { "id": "mall-product-category", "name": "商品分类", "icon": "fa-tags", "category": "mall", "path": "pages/mall/product-category.html" },
    { "id": "mall-product-property", "name": "商品规格", "icon": "fa-sliders-h", "category": "mall", "path": "pages/mall/product-property.html" },
    { "id": "mall-order", "name": "订单管理", "icon": "fa-shopping-cart", "category": "mall", "path": "pages/mall/order.html" },
    { "id": "mall-order-detail", "name": "订单详情", "icon": "fa-file-invoice", "category": "mall", "path": "pages/mall/order-detail.html" },
    { "id": "mall-after-sale", "name": "售后管理", "icon": "fa-undo", "category": "mall", "path": "pages/mall/after-sale.html" },
    { "id": "mall-after-sale-detail", "name": "售后详情", "icon": "fa-info-circle", "category": "mall", "path": "pages/mall/after-sale-detail.html" },
    { "id": "mall-coupon", "name": "优惠券", "icon": "fa-ticket-alt", "category": "mall", "path": "pages/mall/coupon.html" },
    { "id": "mall-discount-activity", "name": "限时折扣", "icon": "fa-percentage", "category": "mall", "path": "pages/mall/discount-activity.html" },
    { "id": "mall-reward-activity", "name": "满减送活动", "icon": "fa-gift", "category": "mall", "path": "pages/mall/reward-activity.html" },
    { "id": "mall-seckill", "name": "秒杀活动", "icon": "fa-bolt", "category": "mall", "path": "pages/mall/seckill.html" },
    { "id": "mall-bargain", "name": "砍价活动", "icon": "fa-handshake", "category": "mall", "path": "pages/mall/bargain.html" },
    { "id": "mall-point", "name": "积分商城", "icon": "fa-coins", "category": "mall", "path": "pages/mall/point.html" },
    { "id": "mall-diy-template", "name": "装修模板", "icon": "fa-paint-brush", "category": "mall", "path": "pages/mall/diy-template.html" },
    // CRM 模块
    { "id": "crm-customer", "name": "客户管理", "icon": "fa-user-tie", "category": "crm", "path": "pages/crm/customer.html" },
    { "id": "crm-customer-detail", "name": "客户详情", "icon": "fa-user-circle", "category": "crm", "path": "pages/crm/customer-detail.html" },
    { "id": "crm-contact", "name": "联系人", "icon": "fa-address-book", "category": "crm", "path": "pages/crm/contact.html" },
    { "id": "crm-business", "name": "商机管理", "icon": "fa-handshake", "category": "crm", "path": "pages/crm/business.html" },
    { "id": "crm-business-detail", "name": "商机详情", "icon": "fa-chart-line", "category": "crm", "path": "pages/crm/business-detail.html" },
    { "id": "crm-contract", "name": "合同管理", "icon": "fa-file-contract", "category": "crm", "path": "pages/crm/contract.html" },
    { "id": "crm-contract-detail", "name": "合同详情", "icon": "fa-file-alt", "category": "crm", "path": "pages/crm/contract-detail.html" },
    { "id": "crm-clue", "name": "线索管理", "icon": "fa-lightbulb", "category": "crm", "path": "pages/crm/clue.html" },
    { "id": "crm-clue-detail", "name": "线索详情", "icon": "fa-info-circle", "category": "crm", "path": "pages/crm/clue-detail.html" },
    { "id": "crm-receivable", "name": "回款管理", "icon": "fa-money-bill-wave", "category": "crm", "path": "pages/crm/receivable.html" },
    { "id": "crm-receivable-plan", "name": "回款计划", "icon": "fa-calendar-check", "category": "crm", "path": "pages/crm/receivable-plan.html" },
    { "id": "crm-product", "name": "产品管理", "icon": "fa-box", "category": "crm", "path": "pages/crm/product.html" },
    { "id": "crm-statistics", "name": "CRM 统计", "icon": "fa-chart-bar", "category": "crm", "path": "pages/crm/statistics.html" },
    // Member 模块
    { "id": "member-user", "name": "会员列表", "icon": "fa-users", "category": "member", "path": "pages/member/user.html" },
    { "id": "member-user-detail", "name": "会员详情", "icon": "fa-user-circle", "category": "member", "path": "pages/member/user-detail.html" },
    { "id": "member-tag", "name": "会员标签", "icon": "fa-tags", "category": "member", "path": "pages/member/tag.html" },
    { "id": "member-level", "name": "会员等级", "icon": "fa-layer-group", "category": "member", "path": "pages/member/level.html" },
    { "id": "member-group", "name": "会员分组", "icon": "fa-object-group", "category": "member", "path": "pages/member/group.html" },
    // Pay 模块
    { "id": "pay-app", "name": "应用信息", "icon": "fa-mobile-alt", "category": "pay", "path": "pages/pay/app.html" },
    { "id": "pay-channel", "name": "支付渠道", "icon": "fa-credit-card", "category": "pay", "path": "pages/pay/channel.html" },
    { "id": "pay-merchant", "name": "商户信息", "icon": "fa-store", "category": "pay", "path": "pages/pay/merchant.html" },
    { "id": "pay-order", "name": "支付订单", "icon": "fa-receipt", "category": "pay", "path": "pages/pay/order.html" },
    { "id": "pay-transfer", "name": "转账订单", "icon": "fa-exchange-alt", "category": "pay", "path": "pages/pay/transfer.html" },
    { "id": "pay-cashier", "name": "收银台", "icon": "fa-cash-register", "category": "pay", "path": "pages/pay/cashier.html" },
    // Infra 模块
    { "id": "infra-codegen", "name": "代码生成", "icon": "fa-code", "category": "infra", "path": "pages/infra/codegen.html" },
    { "id": "infra-codegen-edit", "name": "代码生成编辑", "icon": "fa-edit", "category": "infra", "path": "pages/infra/codegen-edit.html" },
    { "id": "infra-job", "name": "定时任务", "icon": "fa-clock", "category": "infra", "path": "pages/infra/job.html" },
    { "id": "infra-job-log", "name": "任务日志", "icon": "fa-list-alt", "category": "infra", "path": "pages/infra/job-log.html" },
    { "id": "infra-file", "name": "文件管理", "icon": "fa-folder", "category": "infra", "path": "pages/infra/file.html" },
    { "id": "infra-file-config", "name": "文件配置", "icon": "fa-cog", "category": "infra", "path": "pages/infra/file-config.html" },
    { "id": "infra-api-log", "name": "API 日志", "icon": "fa-plug", "category": "infra", "path": "pages/infra/api-log.html" },
    { "id": "infra-config", "name": "参数配置", "icon": "fa-sliders-h", "category": "infra", "path": "pages/infra/config.html" },
    { "id": "infra-test", "name": "接口测试", "icon": "fa-vial", "category": "infra", "path": "pages/infra/test.html" },
    // IoT 模块
    { "id": "iot-device", "name": "设备管理", "icon": "fa-microchip", "category": "iot", "path": "pages/iot/device.html" },
    { "id": "iot-device-detail", "name": "设备详情", "icon": "fa-info-circle", "category": "iot", "path": "pages/iot/device-detail.html" },
    { "id": "iot-product", "name": "产品管理", "icon": "fa-box", "category": "iot", "path": "pages/iot/product.html" },
    { "id": "iot-product-detail", "name": "产品详情", "icon": "fa-clipboard-list", "category": "iot", "path": "pages/iot/product-detail.html" },
    { "id": "iot-firmware", "name": "固件管理", "icon": "fa-download", "category": "iot", "path": "pages/iot/firmware.html" },
    // ERP 模块
    { "id": "erp-product", "name": "ERP 产品", "icon": "fa-box", "category": "erp", "path": "pages/erp/product.html" },
    { "id": "erp-product-category", "name": "产品分类", "icon": "fa-tags", "category": "erp", "path": "pages/erp/product-category.html" },
    { "id": "erp-product-unit", "name": "计量单位", "icon": "fa-balance-scale", "category": "erp", "path": "pages/erp/product-unit.html" },
    { "id": "erp-warehouse", "name": "仓库管理", "icon": "fa-warehouse", "category": "erp", "path": "pages/erp/warehouse.html" },
    { "id": "erp-supplier", "name": "供应商管理", "icon": "fa-truck", "category": "erp", "path": "pages/erp/supplier.html" },
    { "id": "erp-purchase-order", "name": "采购订单", "icon": "fa-shopping-cart", "category": "erp", "path": "pages/erp/purchase-order.html" },
    { "id": "erp-purchase-in", "name": "采购入库", "icon": "fa-sign-in-alt", "category": "erp", "path": "pages/erp/purchase-in.html" },
    { "id": "erp-purchase-return", "name": "采购退货", "icon": "fa-undo", "category": "erp", "path": "pages/erp/purchase-return.html" },
    { "id": "erp-sale-customer", "name": "客户管理", "icon": "fa-user-tie", "category": "erp", "path": "pages/erp/sale-customer.html" },
    { "id": "erp-sale-order", "name": "销售订单", "icon": "fa-file-invoice-dollar", "category": "erp", "path": "pages/erp/sale-order.html" },
    { "id": "erp-sale-out", "name": "销售出库", "icon": "fa-sign-out-alt", "category": "erp", "path": "pages/erp/sale-out.html" },
    { "id": "erp-sale-return", "name": "销售退货", "icon": "fa-reply", "category": "erp", "path": "pages/erp/sale-return.html" },
    { "id": "erp-stock", "name": "库存查询", "icon": "fa-database", "category": "erp", "path": "pages/erp/stock.html" },
    { "id": "erp-stock-check", "name": "库存盘点", "icon": "fa-clipboard-check", "category": "erp", "path": "pages/erp/stock-check.html" },
    { "id": "erp-stock-in", "name": "其他入库", "icon": "fa-arrow-down", "category": "erp", "path": "pages/erp/stock-in.html" },
    { "id": "erp-stock-out", "name": "其他出库", "icon": "fa-arrow-up", "category": "erp", "path": "pages/erp/stock-out.html" },
    { "id": "erp-stock-move", "name": "库存调拨", "icon": "fa-exchange-alt", "category": "erp", "path": "pages/erp/stock-move.html" },
    { "id": "erp-stock-record", "name": "库存流水", "icon": "fa-history", "category": "erp", "path": "pages/erp/stock-record.html" },
    { "id": "erp-finance-account", "name": "财务账户", "icon": "fa-university", "category": "erp", "path": "pages/erp/finance-account.html" },
    { "id": "erp-finance-receipt", "name": "收款管理", "icon": "fa-hand-holding-usd", "category": "erp", "path": "pages/erp/finance-receipt.html" },
    { "id": "erp-finance-payment", "name": "付款管理", "icon": "fa-money-check-alt", "category": "erp", "path": "pages/erp/finance-payment.html" },
    // Report 模块
    { "id": "report-goview", "name": "GoView 大屏", "icon": "fa-chart-pie", "category": "report", "path": "pages/report/goview.html" },
    { "id": "report-jmreport", "name": "积木报表", "icon": "fa-file-alt", "category": "report", "path": "pages/report/jmreport.html" },
    // MP 模块
    { "id": "mp-account", "name": "公众号账号", "icon": "fa-user-circle", "category": "mp", "path": "pages/mp/account.html" },
    { "id": "mp-menu", "name": "菜单管理", "icon": "fa-bars", "category": "mp", "path": "pages/mp/menu.html" },
    { "id": "mp-auto-reply", "name": "自动回复", "icon": "fa-reply", "category": "mp", "path": "pages/mp/auto-reply.html" },
    { "id": "mp-message", "name": "消息管理", "icon": "fa-envelope", "category": "mp", "path": "pages/mp/message.html" },
    { "id": "mp-message-template", "name": "消息模板", "icon": "fa-file-alt", "category": "mp", "path": "pages/mp/message-template.html" },
    { "id": "mp-material", "name": "素材管理", "icon": "fa-images", "category": "mp", "path": "pages/mp/material.html" },
    { "id": "mp-draft", "name": "图文草稿", "icon": "fa-edit", "category": "mp", "path": "pages/mp/draft.html" },
    { "id": "mp-free-publish", "name": "免费发文", "icon": "fa-paper-plane", "category": "mp", "path": "pages/mp/free-publish.html" },
    { "id": "mp-tag", "name": "用户标签", "icon": "fa-tags", "category": "mp", "path": "pages/mp/tag.html" },
    { "id": "mp-user", "name": "用户管理", "icon": "fa-users", "category": "mp", "path": "pages/mp/user.html" },
    { "id": "mp-statistics", "name": "数据统计", "icon": "fa-chart-bar", "category": "mp", "path": "pages/mp/statistics.html" }
  ]
};
