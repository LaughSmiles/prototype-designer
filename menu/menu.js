// 菜单配置文件 - 芋道管理后台原型
// 动态侧边栏菜单数据配置
//
// 数据来源: system_menu 数据库表 (由 generate_menu_js.py 自动生成)
// 页面路径: prototype-desiger/pages/ 目录
//
// 菜单项结构说明:
// - id: 唯一标识符
// - name: 显示名称
// - icon: Font Awesome 图标类名
// - path: 页面路径（相对于 pages 目录，null 表示无跳转）
// - order: 排序字段（对应数据库 sort，数字越小越靠前）
// - parentId: 父菜单 ID（null 表示顶级菜单）
//
// 注意: 此文件由脚本自动生成，请勿手动修改

window.SIDEBAR_MENU = [
  { id: "home", name: "首页", icon: "fa-home", path: "home.html", order: 0, parentId: null },
  {
    id: "system",
    name: "系统管理",
    icon: "fa-cog",
    path: null,
    order: 10,
    parentId: null,
    children: [
        {
          id: "system-tenant",
          name: "租户管理",
          icon: "fa-building",
          path: null,
          order: 0,
          parentId: "system",
          children: [
              { id: "system-tenant-list", name: "租户列表", icon: "fa-list-alt", path: "system/tenant.html", order: 0, parentId: "system-tenant" },
              { id: "system-tenant-package", name: "租户套餐", icon: "fa-th-list", path: "system/tenant-package.html", order: 0, parentId: "system-tenant" }
          ]
        },
        { id: "system-user", name: "用户管理", icon: "fa-user", path: "system/user.html", order: 1, parentId: "system" },
        { id: "system-role", name: "角色管理", icon: "fa-user-shield", path: "system/role.html", order: 2, parentId: "system" },
        { id: "system-menu", name: "菜单管理", icon: "fa-bars", path: "system/menu.html", order: 3, parentId: "system" },
        { id: "system-dept", name: "部门管理", icon: "fa-sitemap", path: "system/dept.html", order: 4, parentId: "system" },
        { id: "system-post", name: "岗位管理", icon: "fa-id-badge", path: "system/post.html", order: 5, parentId: "system" },
        { id: "system-dict", name: "字典管理", icon: "fa-book", path: "system/dict.html", order: 6, parentId: "system" },
        {
          id: "system-messages",
          name: "消息中心",
          icon: "fa-comment-dots",
          path: null,
          order: 7,
          parentId: "system",
          children: [
              {
                id: "system-messages-sms",
                name: "短信管理",
                icon: "fa-file",
                path: null,
                order: 1,
                parentId: "system-messages",
                children: [
                    { id: "system-messages-sms-sms-channel", name: "短信渠道", icon: "fa-exchange-alt", path: "system/sms-channel.html", order: 0, parentId: "system-messages-sms" },
                    { id: "system-messages-sms-sms-template", name: "短信模板", icon: "fa-paper-plane", path: "system/sms-template.html", order: 1, parentId: "system-messages-sms" },
                    { id: "system-messages-sms-sms-log", name: "短信日志", icon: "fa-edit", path: "system/sms-log.html", order: 2, parentId: "system-messages-sms" }
                ]
              },
              {
                id: "system-messages-mail",
                name: "邮箱管理",
                icon: "fa-mail-bulk",
                path: null,
                order: 2,
                parentId: "system-messages",
                children: [
                    { id: "system-messages-mail-mail-account", name: "邮箱账号", icon: "fa-at", path: "system/mail-account.html", order: 0, parentId: "system-messages-mail" },
                    { id: "system-messages-mail-mail-template", name: "邮件模版", icon: "fa-tag", path: "system/mail-template.html", order: 0, parentId: "system-messages-mail" },
                    { id: "system-messages-mail-mail-log", name: "邮件记录", icon: "fa-edit", path: "system/mail-log.html", order: 0, parentId: "system-messages-mail" }
                ]
              },
              {
                id: "system-messages-notify",
                name: "站内信管理",
                icon: "fa-inbox",
                path: null,
                order: 3,
                parentId: "system-messages",
                children: [
                    { id: "system-messages-notify-notify-template", name: "模板管理", icon: "fa-archive", path: "system/notify-template.html", order: 0, parentId: "system-messages-notify" },
                    { id: "system-messages-notify-notify-message", name: "消息记录", icon: "fa-edit", path: "system/notify-message.html", order: 0, parentId: "system-messages-notify" }
                ]
              },
              { id: "system-messages-notice", name: "通知公告", icon: "fa-bullhorn", path: "system/notice.html", order: 4, parentId: "system-messages" }
          ]
        },
        {
          id: "system-log",
          name: "审计日志",
          icon: "fa-file-alt",
          path: null,
          order: 9,
          parentId: "system",
          children: [
              { id: "system-log-operate-log", name: "操作日志", icon: "fa-clipboard-list", path: "system/operatelog.html", order: 1, parentId: "system-log" },
              { id: "system-log-login-log", name: "登录日志", icon: "fa-sign-in-alt", path: "system/loginlog.html", order: 2, parentId: "system-log" }
          ]
        },
        {
          id: "system-oauth2",
          name: "OAuth 2.0",
          icon: "fa-key",
          path: null,
          order: 10,
          parentId: "system",
          children: [
              { id: "system-oauth2-application", name: "应用管理", icon: "fa-hdd-o", path: "system/oauth2-client.html", order: 0, parentId: "system-oauth2" },
              { id: "system-oauth2-token", name: "令牌管理", icon: "fa-key", path: "system/oauth2-token.html", order: 2, parentId: "system-oauth2" }
          ]
        },
        {
          id: "system-social",
          name: "三方登录",
          icon: "fa-rocket",
          path: null,
          order: 10,
          parentId: "system",
          children: [
              { id: "system-social-client", name: "三方应用", icon: "fa-cog", path: "system/social-client.html", order: 1, parentId: "system-social" },
              { id: "system-social-user", name: "三方用户", icon: "fa-user-friends", path: "system/social-user.html", order: 2, parentId: "system-social" }
          ]
        },
        { id: "system-area", name: "地区管理", icon: "fa-map-marker-alt", path: "system/area.html", order: 14, parentId: "system" }
    ]
  },
  {
    id: "infra",
    name: "基础设施",
    icon: "fa-server",
    path: null,
    order: 20,
    parentId: null,
    children: [
        { id: "infra-codegen", name: "代码生成", icon: "fa-code", path: "infra/codegen.html", order: 1, parentId: "infra" },
        {
          id: "infra-demo",
          name: "代码生成案例",
          icon: "fa-flask",
          path: null,
          order: 1,
          parentId: "infra",
          children: [
              { id: "infra-demo-demo01-contact", name: "单表（增删改查）", icon: "fa-file", path: "infra/demo-demo01-contact.html", order: 1, parentId: "infra-demo" },
              { id: "infra-demo-demo02-category", name: "树表（增删改查）", icon: "fa-tree", path: "infra/demo-demo02-category.html", order: 2, parentId: "infra-demo" },
              { id: "infra-demo-demo03-normal", name: "主子表（标准）", icon: "fa-battery-3", path: "infra/demo-demo03-normal.html", order: 10, parentId: "infra-demo" },
              { id: "infra-demo-demo03-erp", name: "主子表（ERP）", icon: "fa-file", path: "infra/demo-demo03-erp.html", order: 11, parentId: "infra-demo" },
              { id: "infra-demo-demo03-inner", name: "主子表（内嵌）", icon: "fa-power-off", path: "infra/demo-demo03-inner.html", order: 12, parentId: "infra-demo" }
          ]
        },
        { id: "infra-data-source-config", name: "数据源配置", icon: "fa-database", path: "infra/data-source-config.html", order: 1, parentId: "infra" },
        { id: "infra-build", name: "表单构建", icon: "fa-wpforms", path: "infra/build.html", order: 2, parentId: "infra" },
        { id: "infra-swagger", name: "API 接口", icon: "fa-plug", path: "infra/swagger.html", order: 3, parentId: "infra" },
        {
          id: "infra-log",
          name: "API 日志",
          icon: "fa-tasks",
          path: null,
          order: 4,
          parentId: "infra",
          children: [
              { id: "infra-log-api-access-log", name: "访问日志", icon: "fa-file", path: "infra/api-access-log.html", order: 1, parentId: "infra-log" },
              { id: "infra-log-api-error-log", name: "错误日志", icon: "fa-file", path: "infra/api-error-log.html", order: 2, parentId: "infra-log" }
          ]
        },
        { id: "infra-websocket", name: "WebSocket", icon: "fa-plug", path: "infra/websocket.html", order: 5, parentId: "infra" },
        {
          id: "infra-file",
          name: "文件管理",
          icon: "fa-file",
          path: null,
          order: 6,
          parentId: "infra",
          children: [
              { id: "infra-file-file-config", name: "文件配置", icon: "fa-file-signature", path: "infra/file-config.html", order: 0, parentId: "infra-file" },
              { id: "infra-file-file", name: "文件列表", icon: "fa-file", path: "infra/file.html", order: 5, parentId: "infra-file" }
          ]
        },
        { id: "infra-job", name: "定时任务", icon: "fa-clock", path: null, order: 7, parentId: "infra" },
        { id: "infra-config", name: "配置管理", icon: "fa-cogs", path: "infra/config.html", order: 8, parentId: "infra" },
        {
          id: "infra-monitors",
          name: "监控中心",
          icon: "fa-desktop",
          path: null,
          order: 10,
          parentId: "infra",
          children: [
              { id: "infra-monitors-druid", name: "MySQL 监控", icon: "fa-database", path: "infra/monitors-druid.html", order: 1, parentId: "infra-monitors" },
              { id: "infra-monitors-redis", name: "Redis 监控", icon: "fa-server", path: "infra/monitors-redis.html", order: 2, parentId: "infra-monitors" },
              { id: "infra-monitors-admin-server", name: "Java 监控", icon: "fa-coffee", path: "infra/monitors-admin-server.html", order: 3, parentId: "infra-monitors" },
              { id: "infra-monitors-skywalking", name: "链路追踪", icon: "fa-route", path: "infra/monitors-skywalking.html", order: 4, parentId: "infra-monitors" }
          ]
        }
    ]
  },
  {
    id: "pay",
    name: "支付管理",
    icon: "fa-credit-card",
    path: null,
    order: 30,
    parentId: null,
    children: [
        { id: "pay-app", name: "应用信息", icon: "fa-apple-alt", path: "pay/app.html", order: 1, parentId: "pay" },
        { id: "pay-order", name: "支付订单", icon: "fa-list-ol", path: "pay/order.html", order: 2, parentId: "pay" },
        { id: "pay-refund", name: "退款订单", icon: "fa-undo-alt", path: "pay/refund.html", order: 3, parentId: "pay" },
        { id: "pay-transfer", name: "转账订单", icon: "fa-exchange-alt", path: "pay/transfer.html", order: 3, parentId: "pay" },
        {
          id: "pay-wallet",
          name: "钱包管理",
          icon: "fa-wallet",
          path: null,
          order: 4,
          parentId: "pay",
          children: [
              { id: "pay-wallet-wallet-balance", name: "钱包余额", icon: "fa-wallet", path: "pay/wallet-wallet-balance.html", order: 1, parentId: "pay-wallet" },
              { id: "pay-wallet-wallet-recharge-package", name: "充值套餐", icon: "fa-gem", path: "pay/wallet-wallet-recharge-package.html", order: 2, parentId: "pay-wallet" }
          ]
        },
        { id: "pay-notify", name: "回调通知", icon: "fa-bell", path: "pay/notify.html", order: 5, parentId: "pay" },
        {
          id: "pay-demo",
          name: "接入示例",
          icon: "fa-flask",
          path: null,
          order: 99,
          parentId: "pay",
          children: [
              { id: "pay-demo-order", name: "支付&退款案例", icon: "fa-vial", path: "pay/order.html", order: 1, parentId: "pay-demo" },
              { id: "pay-demo-transfer", name: "提现转账案例", icon: "fa-vial", path: "pay/transfer.html", order: 2, parentId: "pay-demo" }
          ]
        }
    ]
  },
  {
    id: "report",
    name: "报表管理",
    icon: "fa-chart-pie",
    path: null,
    order: 40,
    parentId: null,
    children: [
        { id: "report-jimu-report", name: "报表设计器", icon: "fa-chart-bar", path: "report/jimu-report.html", order: 1, parentId: "report" },
        { id: "report-jimu-bi", name: "仪表盘设计器", icon: "fa-tachometer-alt", path: "report/jimu-bi.html", order: 1, parentId: "report" },
        { id: "report-go-view", name: "大屏设计器", icon: "fa-chart-area", path: "report/goview.html", order: 2, parentId: "report" }
    ]
  },
  {
    id: "bpm",
    name: "工作流程",
    icon: "fa-project-diagram",
    path: null,
    order: 50,
    parentId: null,
    children: [
        {
          id: "bpm-manager",
          name: "流程管理",
          icon: "fa-dedent",
          path: null,
          order: 10,
          parentId: "bpm",
          children: [
              { id: "bpm-manager-model", name: "流程模型", icon: "fa-project-diagram", path: "bpm/model.html", order: 1, parentId: "bpm-manager" },
              { id: "bpm-manager-form", name: "流程表单", icon: "fa-wpforms", path: "bpm/form.html", order: 2, parentId: "bpm-manager" },
              { id: "bpm-manager-category", name: "流程分类", icon: "fa-object-group", path: "bpm/category.html", order: 3, parentId: "bpm-manager" },
              { id: "bpm-manager-user-group", name: "用户分组", icon: "fa-user-secret", path: "bpm/manager-user-group.html", order: 4, parentId: "bpm-manager" },
              { id: "bpm-manager-process-listener", name: "流程监听器", icon: "fa-headphones", path: "bpm/manager-process-listener.html", order: 5, parentId: "bpm-manager" },
              { id: "bpm-manager-process-expression", name: "流程表达式", icon: "fa-compass", path: "bpm/process-expression.html", order: 6, parentId: "bpm-manager" },
              { id: "bpm-manager-manager", name: "流程实例", icon: "fa-sitemap", path: "bpm/task-my.html", order: 10, parentId: "bpm-manager" },
              { id: "bpm-manager-process-tasnk", name: "流程任务", icon: "fa-tasks", path: "bpm/task-my.html", order: 11, parentId: "bpm-manager" }
          ]
        },
        {
          id: "bpm-task",
          name: "审批中心",
          icon: "fa-check-circle",
          path: null,
          order: 20,
          parentId: "bpm",
          children: [
              { id: "bpm-task-create", name: "发起流程", icon: "fa-grin-stars", path: "bpm/task-my.html", order: 0, parentId: "bpm-task" },
              { id: "bpm-task-my", name: "我的流程", icon: "fa-book", path: "bpm/task-my.html", order: 1, parentId: "bpm-task" },
              { id: "bpm-task-todo", name: "待办任务", icon: "fa-slack", path: "bpm/task-my.html", order: 10, parentId: "bpm-task" },
              { id: "bpm-task-done", name: "已办任务", icon: "fa-delicious", path: "bpm/task-my.html", order: 20, parentId: "bpm-task" },
              { id: "bpm-task-copy", name: "抄送我的", icon: "fa-file", path: "bpm/task-my.html", order: 30, parentId: "bpm-task" }
          ]
        },
        {
          id: "bpm-oa",
          name: "OA 示例",
          icon: "fa-road",
          path: null,
          order: 40,
          parentId: "bpm",
          children: [
              { id: "bpm-oa-leave", name: "请假查询", icon: "fa-leanpub", path: "bpm/oa-leave.html", order: 0, parentId: "bpm-oa" }
          ]
        }
    ]
  },
  {
    id: "member",
    name: "会员中心",
    icon: "fa-user-circle",
    path: null,
    order: 55,
    parentId: null,
    children: [
        { id: "member-config", name: "会员配置", icon: "fa-sliders-h", path: "member/config.html", order: 0, parentId: "member" },
        { id: "member-user", name: "会员管理", icon: "fa-user", path: "member/user.html", order: 0, parentId: "member" },
        { id: "member-tag", name: "会员标签", icon: "fa-tags", path: "member/tag.html", order: 1, parentId: "member" },
        { id: "member-level", name: "会员等级", icon: "fa-level-up-alt", path: "member/level.html", order: 2, parentId: "member" },
        { id: "member-group", name: "会员分组", icon: "fa-users", path: "member/group.html", order: 3, parentId: "member" },
        { id: "member-record", name: "会员积分", icon: "fa-coins", path: "member/record.html", order: 10, parentId: "member" },
        {
          id: "member-signin",
          name: "会员签到",
          icon: "fa-calendar-check",
          path: null,
          order: 11,
          parentId: "member",
          children: [
              { id: "member-signin-config", name: "签到配置", icon: "fa-calendar-check", path: "member/signin-config.html", order: 2, parentId: "member-signin" },
              { id: "member-signin-record", name: "签到记录", icon: "fa-history", path: "member/signin-record.html", order: 3, parentId: "member-signin" }
          ]
        }
    ]
  },
  {
    id: "mall",
    name: "商城系统",
    icon: "fa-shopping-bag",
    path: null,
    order: 59,
    parentId: null,
    children: [
        { id: "mall-home", name: "商城首页", icon: "fa-home", path: "mall/home.html", order: 1, parentId: "mall" },
        {
          id: "mall-product",
          name: "商品中心",
          icon: "fa-box",
          path: null,
          order: 60,
          parentId: "mall",
          children: [
              { id: "mall-product-spu", name: "商品列表", icon: "fa-box-open", path: "mall/product-spu.html", order: 1, parentId: "mall-product" },
              { id: "mall-product-category", name: "商品分类", icon: "fa-th-large", path: "mall/product-category.html", order: 2, parentId: "mall-product" },
              { id: "mall-product-brand", name: "商品品牌", icon: "fa-tag", path: "mall/product-brand.html", order: 3, parentId: "mall-product" },
              { id: "mall-product-property", name: "商品属性", icon: "fa-sliders-h", path: "mall/product-property.html", order: 4, parentId: "mall-product" },
              { id: "mall-product-comment", name: "商品评论", icon: "fa-comments", path: "mall/product-comment.html", order: 5, parentId: "mall-product" }
          ]
        },
        {
          id: "mall-trade",
          name: "订单中心",
          icon: "fa-receipt",
          path: null,
          order: 65,
          parentId: "mall",
          children: [
              { id: "mall-trade-config", name: "交易配置", icon: "fa-cogs", path: "mall/trade-config.html", order: 0, parentId: "mall-trade" },
              { id: "mall-trade-order", name: "订单列表", icon: "fa-list", path: "mall/order.html", order: 1, parentId: "mall-trade" },
              { id: "mall-trade-after-sale", name: "售后退款", icon: "fa-undo-alt", path: "mall/after-sale.html", order: 2, parentId: "mall-trade" },
              {
                id: "mall-trade-delivery",
                name: "配送管理",
                icon: "fa-truck",
                path: null,
                order: 3,
                parentId: "mall-trade",
                children: [
                    {
                      id: "mall-trade-delivery-express",
                      name: "快递发货",
                      icon: "fa-truck",
                      path: null,
                      order: 0,
                      parentId: "mall-trade-delivery",
                      children: [
                          { id: "mall-trade-delivery-express-express", name: "快递公司", icon: "fa-truck", path: "mall/express-express.html", order: 0, parentId: "mall-trade-delivery-express" },
                          { id: "mall-trade-delivery-express-express-template", name: "运费模版", icon: "fa-file-invoice", path: "mall/express-express-template.html", order: 1, parentId: "mall-trade-delivery-express" }
                      ]
                    },
                    {
                      id: "mall-trade-delivery-pick-up-store",
                      name: "门店自提",
                      icon: "fa-store",
                      path: null,
                      order: 1,
                      parentId: "mall-trade-delivery",
                      children: [
                          { id: "mall-trade-delivery-pick-up-store-pick-up-store", name: "门店管理", icon: "fa-store", path: "mall/pick-up-store-pick-up-store.html", order: 1, parentId: "mall-trade-delivery-pick-up-store" },
                          { id: "mall-trade-delivery-pick-up-store-pick-up-order", name: "核销订单", icon: "fa-check-circle", path: "mall/pick-up-store-pick-up-order.html", order: 2, parentId: "mall-trade-delivery-pick-up-store" }
                      ]
                    }
                ]
              },
              {
                id: "mall-trade-brokerage",
                name: "分销管理",
                icon: "fa-share-alt",
                path: null,
                order: 4,
                parentId: "mall-trade",
                children: [
                    { id: "mall-trade-brokerage-brokerage-user", name: "分销用户", icon: "fa-users", path: "mall/brokerage-brokerage-user.html", order: 0, parentId: "mall-trade-brokerage" },
                    { id: "mall-trade-brokerage-brokerage-record", name: "佣金记录", icon: "fa-money-bill", path: "mall/brokerage-brokerage-record.html", order: 1, parentId: "mall-trade-brokerage" },
                    { id: "mall-trade-brokerage-brokerage-withdraw", name: "佣金提现", icon: "fa-hand-holding-usd", path: "mall/brokerage-brokerage-withdraw.html", order: 2, parentId: "mall-trade-brokerage" }
                ]
              }
          ]
        },
        {
          id: "mall-promotion",
          name: "营销中心",
          icon: "fa-gift",
          path: null,
          order: 70,
          parentId: "mall",
          children: [
              {
                id: "mall-promotion-content",
                name: "内容管理",
                icon: "fa-newspaper",
                path: null,
                order: 1,
                parentId: "mall-promotion",
                children: [
                    { id: "mall-promotion-content-category", name: "文章分类", icon: "fa-folder-open", path: "mall/article-category.html", order: 0, parentId: "mall-promotion-content" },
                    { id: "mall-promotion-content-article", name: "文章列表", icon: "fa-file-alt", path: "mall/content-article.html", order: 2, parentId: "mall-promotion-content" },
                    { id: "mall-promotion-content-banner", name: "Banner", icon: "fa-image", path: "mall/content-banner.html", order: 100, parentId: "mall-promotion-content" }
                ]
              },
              {
                id: "mall-promotion-coupon",
                name: "优惠劵",
                icon: "fa-ticket-alt",
                path: null,
                order: 2,
                parentId: "mall-promotion",
                children: [
                    { id: "mall-promotion-coupon-template", name: "优惠劵列表", icon: "fa-ticket-alt", path: "mall/coupon-template.html", order: 1, parentId: "mall-promotion-coupon" },
                    { id: "mall-promotion-coupon-list", name: "领取记录", icon: "fa-list", path: "mall/coupon-list.html", order: 2, parentId: "mall-promotion-coupon" }
                ]
              },
              {
                id: "mall-promotion-seckill",
                name: "秒杀活动",
                icon: "fa-bolt",
                path: null,
                order: 3,
                parentId: "mall-promotion",
                children: [
                    { id: "mall-promotion-seckill-config", name: "秒杀时段", icon: "fa-clock", path: "mall/seckill-config.html", order: 1, parentId: "mall-promotion-seckill" },
                    { id: "mall-promotion-seckill-activity", name: "秒杀商品", icon: "fa-bolt", path: "mall/seckill-activity.html", order: 2, parentId: "mall-promotion-seckill" }
                ]
              },
              {
                id: "mall-promotion-combination",
                name: "拼团活动",
                icon: "fa-users",
                path: null,
                order: 3,
                parentId: "mall-promotion",
                children: [
                    { id: "mall-promotion-combination-acitivity", name: "拼团商品", icon: "fa-box-open", path: "mall/combination-activity.html", order: 1, parentId: "mall-promotion-combination" },
                    { id: "mall-promotion-combination-record", name: "拼团记录", icon: "fa-history", path: "mall/combination-record.html", order: 2, parentId: "mall-promotion-combination" }
                ]
              },
              {
                id: "mall-promotion-bargain",
                name: "砍价活动",
                icon: "fa-gavel",
                path: null,
                order: 4,
                parentId: "mall-promotion",
                children: [
                    { id: "mall-promotion-bargain-activity", name: "砍价商品", icon: "fa-gavel", path: "mall/bargain-activity.html", order: 1, parentId: "mall-promotion-bargain" },
                    { id: "mall-promotion-bargain-record", name: "砍价记录", icon: "fa-history", path: "mall/bargain-record.html", order: 2, parentId: "mall-promotion-bargain" }
                ]
              },
              { id: "mall-promotion-point-activity", name: "积分商城", icon: "fa-coins", path: "mall/promotion-point-activity.html", order: 5, parentId: "mall-promotion" },
              {
                id: "mall-promotion-diy-template",
                name: "商城装修",
                icon: "fa-file",
                path: null,
                order: 20,
                parentId: "mall-promotion",
                children: [
                    { id: "mall-promotion-diy-template-diy-template", name: "装修模板", icon: "fa-paint-brush", path: "mall/diy-template.html", order: 1, parentId: "mall-promotion-diy-template" },
                    { id: "mall-promotion-diy-template-diy-page", name: "装修页面", icon: "fa-paint-roller", path: "mall/diy-page.html", order: 2, parentId: "mall-promotion-diy-template" }
                ]
              },
              {
                id: "mall-promotion-youhui",
                name: "优惠活动",
                icon: "fa-tags",
                path: null,
                order: 99,
                parentId: "mall-promotion",
                children: [
                    { id: "mall-promotion-youhui-discount-activity", name: "限时折扣", icon: "fa-clock", path: "mall/discount-activity.html", order: 7, parentId: "mall-promotion-youhui" },
                    { id: "mall-promotion-youhui-reward-activity", name: "满减送", icon: "fa-percentage", path: "mall/reward-activity.html", order: 10, parentId: "mall-promotion-youhui" }
                ]
              }
          ]
        },
        {
          id: "mall-statistics",
          name: "统计中心",
          icon: "fa-chart-line",
          path: null,
          order: 75,
          parentId: "mall",
          children: [
              { id: "mall-statistics-member", name: "会员统计", icon: "fa-users", path: "mall/statistics-member.html", order: 2, parentId: "mall-statistics" },
              { id: "mall-statistics-product", name: "商品统计", icon: "fa-box", path: "mall/statistics-product.html", order: 3, parentId: "mall-statistics" },
              { id: "mall-statistics-trade", name: "交易统计", icon: "fa-chart-line", path: "mall/statistics-trade.html", order: 4, parentId: "mall-statistics" }
          ]
        },
        { id: "mall-kefu", name: "客服中心", icon: "fa-headset", path: "mall/kefu.html", order: 100, parentId: "mall" }
    ]
  },
  {
    id: "mp",
    name: "公众号管理",
    icon: "fa-comment-dots",
    path: null,
    order: 100,
    parentId: null,
    children: [
        { id: "mp-account", name: "账号管理", icon: "fa-user-circle", path: "mp/account.html", order: 1, parentId: "mp" },
        { id: "mp-statistics", name: "数据统计", icon: "fa-chart-bar", path: "mp/statistics.html", order: 2, parentId: "mp" },
        { id: "mp-tag", name: "标签管理", icon: "fa-tags", path: "mp/tag.html", order: 3, parentId: "mp" },
        { id: "mp-user", name: "粉丝管理", icon: "fa-user-secret", path: "mp/user.html", order: 4, parentId: "mp" },
        { id: "mp-message", name: "消息管理", icon: "fa-envelope", path: "mp/message.html", order: 5, parentId: "mp" },
        { id: "mp-menu", name: "菜单管理", icon: "fa-bars", path: "mp/menu.html", order: 6, parentId: "mp" },
        { id: "mp-auto-reply", name: "自动回复", icon: "fa-reply", path: "mp/auto-reply.html", order: 7, parentId: "mp" },
        { id: "mp-material", name: "素材管理", icon: "fa-images", path: "mp/material.html", order: 8, parentId: "mp" },
        { id: "mp-draft", name: "图文草稿箱", icon: "fa-edit", path: "mp/draft.html", order: 9, parentId: "mp" },
        { id: "mp-free-publish", name: "图文发表记录", icon: "fa-pen-fancy", path: "mp/free-publish.html", order: 10, parentId: "mp" }
    ]
  },
  {
    id: "crm",
    name: "CRM 系统",
    icon: "fa-handshake",
    path: null,
    order: 200,
    parentId: null,
    children: [
        { id: "crm-backlog", name: "待办事项", icon: "fa-tasks", path: "crm/backlog.html", order: 0, parentId: "crm" },
        { id: "crm-clue", name: "线索管理", icon: "fa-search", path: "crm/clue.html", order: 8, parentId: "crm" },
        { id: "crm-customer", name: "客户管理", icon: "fa-address-book", path: "crm/customer.html", order: 10, parentId: "crm" },
        { id: "crm-contact", name: "联系人管理", icon: "fa-address-card", path: "crm/contact.html", order: 20, parentId: "crm" },
        { id: "crm-pool", name: "客户公海", icon: "fa-water", path: "crm/customer-pool.html", order: 30, parentId: "crm" },
        { id: "crm-business", name: "商机管理", icon: "fa-lightbulb", path: "crm/business.html", order: 40, parentId: "crm" },
        { id: "crm-contract", name: "合同管理", icon: "fa-file-contract", path: "crm/contract.html", order: 50, parentId: "crm" },
        { id: "crm-receivable", name: "回款管理", icon: "fa-money-bill-wave", path: "crm/receivable.html", order: 60, parentId: "crm" },
        { id: "crm-receivable-plan", name: "回款计划", icon: "fa-calendar-check", path: "crm/receivable-plan.html", order: 61, parentId: "crm" },
        { id: "crm-product", name: "产品管理", icon: "fa-cube", path: "crm/product.html", order: 80, parentId: "crm" },
        {
          id: "crm-statistics",
          name: "数据统计",
          icon: "fa-chart-bar",
          path: null,
          order: 200,
          parentId: "crm",
          children: [
              { id: "crm-statistics-customer", name: "客户分析", icon: "fa-chart-bar", path: "crm/customer.html", order: 0, parentId: "crm-statistics" },
              { id: "crm-statistics-ranking", name: "排行榜", icon: "fa-trophy", path: "crm/statistics-ranking.html", order: 1, parentId: "crm-statistics" },
              { id: "crm-statistics-performance", name: "员工业绩", icon: "fa-chart-line", path: "crm/statistics-performance.html", order: 3, parentId: "crm-statistics" },
              { id: "crm-statistics-portrait", name: "客户画像", icon: "fa-id-card", path: "crm/statistics-portrait.html", order: 4, parentId: "crm-statistics" },
              { id: "crm-statistics-funnel", name: "销售漏斗", icon: "fa-filter", path: "crm/statistics-funnel.html", order: 5, parentId: "crm-statistics" }
          ]
        },
        {
          id: "crm-config",
          name: "系统配置",
          icon: "fa-cogs",
          path: null,
          order: 999,
          parentId: "crm",
          children: [
              { id: "crm-config-customer-pool-config", name: "客户公海配置", icon: "fa-water", path: "crm/config-customer-pool-config.html", order: 0, parentId: "crm-config" },
              { id: "crm-config-customer-limit-config", name: "客户限制配置", icon: "fa-user-lock", path: "crm/config-customer-limit-config.html", order: 1, parentId: "crm-config" },
              { id: "crm-config-category", name: "产品分类配置", icon: "fa-th-large", path: "crm/product-category.html", order: 3, parentId: "crm-config" },
              { id: "crm-config-business-status", name: "商机状态配置", icon: "fa-lightbulb", path: "crm/config-business-status.html", order: 4, parentId: "crm-config" },
              { id: "crm-config-contract-config", name: "合同配置", icon: "fa-file-contract", path: "crm/config-contract-config.html", order: 5, parentId: "crm-config" }
          ]
        }
    ]
  },
  {
    id: "erp",
    name: "ERP 系统",
    icon: "fa-warehouse",
    path: null,
    order: 300,
    parentId: null,
    children: [
        { id: "erp-home", name: "ERP 首页", icon: "fa-home", path: "erp/home.html", order: 0, parentId: "erp" },
        {
          id: "erp-purchase",
          name: "采购管理",
          icon: "fa-cart-plus",
          path: null,
          order: 10,
          parentId: "erp",
          children: [
              { id: "erp-purchase-order", name: "采购订单", icon: "fa-file-invoice", path: "erp/purchase-order.html", order: 1, parentId: "erp-purchase" },
              { id: "erp-purchase-in", name: "采购入库", icon: "fa-dolly", path: "erp/purchase-in.html", order: 2, parentId: "erp-purchase" },
              { id: "erp-purchase-return", name: "采购退货", icon: "fa-undo-alt", path: "erp/purchase-return.html", order: 3, parentId: "erp-purchase" },
              { id: "erp-purchase-supplier", name: "供应商信息", icon: "fa-truck", path: "erp/purchase-supplier.html", order: 4, parentId: "erp-purchase" }
          ]
        },
        {
          id: "erp-sale",
          name: "销售管理",
          icon: "fa-shopping-cart",
          path: null,
          order: 20,
          parentId: "erp",
          children: [
              { id: "erp-sale-order", name: "销售订单", icon: "fa-file-invoice-dollar", path: "erp/sale-order.html", order: 1, parentId: "erp-sale" },
              { id: "erp-sale-out", name: "销售出库", icon: "fa-sign-out-alt", path: "erp/sale-out.html", order: 2, parentId: "erp-sale" },
              { id: "erp-sale-return", name: "销售退货", icon: "fa-undo", path: "erp/sale-return.html", order: 3, parentId: "erp-sale" },
              { id: "erp-sale-customer", name: "客户信息", icon: "fa-user-tie", path: "erp/sale-customer.html", order: 4, parentId: "erp-sale" }
          ]
        },
        {
          id: "erp-stock",
          name: "库存管理",
          icon: "fa-cubes",
          path: null,
          order: 30,
          parentId: "erp",
          children: [
              { id: "erp-stock-warehouse", name: "仓库信息", icon: "fa-warehouse", path: "erp/warehouse.html", order: 0, parentId: "erp-stock" },
              { id: "erp-stock-stock", name: "产品库存", icon: "fa-boxes", path: "erp/stock.html", order: 1, parentId: "erp-stock" },
              { id: "erp-stock-record", name: "出入库明细", icon: "fa-exchange-alt", path: "erp/stock-record.html", order: 2, parentId: "erp-stock" },
              { id: "erp-stock-in", name: "其它入库", icon: "fa-sign-in-alt", path: "erp/stock-in.html", order: 3, parentId: "erp-stock" },
              { id: "erp-stock-out", name: "其它出库", icon: "fa-sign-out-alt", path: "erp/stock-out.html", order: 4, parentId: "erp-stock" },
              { id: "erp-stock-move", name: "库存调拨", icon: "fa-arrows-alt", path: "erp/stock-move.html", order: 5, parentId: "erp-stock" },
              { id: "erp-stock-check", name: "库存盘点", icon: "fa-clipboard-check", path: "erp/stock-check.html", order: 6, parentId: "erp-stock" }
          ]
        },
        {
          id: "erp-product",
          name: "产品管理",
          icon: "fa-cube",
          path: null,
          order: 40,
          parentId: "erp",
          children: [
              { id: "erp-product-product", name: "产品信息", icon: "fa-box-open", path: "erp/product.html", order: 0, parentId: "erp-product" },
              { id: "erp-product-product-category", name: "产品分类", icon: "fa-th-large", path: "erp/product-category.html", order: 1, parentId: "erp-product" },
              { id: "erp-product-unit", name: "产品单位", icon: "fa-ruler", path: "erp/product-unit.html", order: 2, parentId: "erp-product" }
          ]
        },
        {
          id: "erp-finance",
          name: "财务管理",
          icon: "fa-coins",
          path: null,
          order: 50,
          parentId: "erp",
          children: [
              { id: "erp-finance-payment", name: "付款单", icon: "fa-money-bill", path: "erp/finance-payment.html", order: 1, parentId: "erp-finance" },
              { id: "erp-finance-receipt", name: "收款单", icon: "fa-hand-holding-usd", path: "erp/finance-receipt.html", order: 2, parentId: "erp-finance" },
              { id: "erp-finance-account", name: "结算账户", icon: "fa-university", path: "erp/finance-account.html", order: 10, parentId: "erp-finance" }
          ]
        }
    ]
  },
  {
    id: "ai",
    name: "AI 大模型",
    icon: "fa-brain",
    path: null,
    order: 400,
    parentId: null,
    children: [
        { id: "ai-chat", name: "AI 对话", icon: "fa-comments", path: "ai/chat.html", order: 1, parentId: "ai" },
        { id: "ai-image", name: "AI 绘画", icon: "fa-image", path: "ai/image.html", order: 2, parentId: "ai" },
        { id: "ai-write", name: "AI 写作", icon: "fa-book-reader", path: "ai/write.html", order: 3, parentId: "ai" },
        { id: "ai-music", name: "AI 音乐", icon: "fa-music", path: "ai/music.html", order: 4, parentId: "ai" },
        { id: "ai-knowledge", name: "AI 知识库", icon: "fa-book", path: "ai/knowledge.html", order: 5, parentId: "ai" },
        { id: "ai-workflow", name: "AI 工作流", icon: "fa-hand-paper", path: "ai/workflow.html", order: 5, parentId: "ai" },
        { id: "ai-mind-map", name: "AI 思维导图", icon: "fa-sitemap", path: "ai/mindmap.html", order: 6, parentId: "ai" },
        {
          id: "ai-console",
          name: "控制台",
          icon: "fa-cogs",
          path: null,
          order: 100,
          parentId: "ai",
          children: [
              { id: "ai-console-api-key", name: "API 密钥", icon: "fa-key", path: "ai/api-key.html", order: 0, parentId: "ai-console" },
              { id: "ai-console-model", name: "模型配置", icon: "fa-calculator", path: "ai/model.html", order: 0, parentId: "ai-console" },
              { id: "ai-console-chat-role", name: "聊天角色", icon: "fa-user-secret", path: "ai/chat-role.html", order: 0, parentId: "ai-console" },
              { id: "ai-console-tool", name: "工具管理", icon: "fa-tools", path: "ai/tool.html", order: 0, parentId: "ai-console" },
              { id: "ai-console-chat-conversation", name: "聊天管理", icon: "fa-comments", path: "ai/console-chat-conversation.html", order: 10, parentId: "ai-console" },
              { id: "ai-console-image", name: "绘画管理", icon: "fa-images", path: "ai/image.html", order: 11, parentId: "ai-console" },
              { id: "ai-console-music", name: "音乐管理", icon: "fa-music", path: "ai/music.html", order: 12, parentId: "ai-console" },
              { id: "ai-console-write", name: "写作管理", icon: "fa-pen", path: "ai/write.html", order: 13, parentId: "ai-console" },
              { id: "ai-console-mind-map", name: "导图管理", icon: "fa-sitemap", path: "ai/mindmap.html", order: 14, parentId: "ai-console" }
          ]
        }
    ]
  },
  {
    id: "iot",
    name: "IoT 物联网",
    icon: "fa-microchip",
    path: null,
    order: 500,
    parentId: null,
    children: [
        { id: "iot-home", name: "IoT 首页", icon: "fa-home", path: "iot/home.html", order: 1, parentId: "iot" },
        {
          id: "iot-device",
          name: "设备接入",
          icon: "fa-plug",
          path: null,
          order: 2,
          parentId: "iot",
          children: [
              { id: "iot-device-product", name: "产品管理", icon: "fa-cube", path: "iot/product.html", order: 1, parentId: "iot-device" },
              { id: "iot-device-device", name: "设备管理", icon: "fa-mobile-alt", path: "iot/device.html", order: 2, parentId: "iot-device" },
              { id: "iot-device-product-category", name: "产品分类", icon: "fa-th-large", path: "iot/device-product-category.html", order: 3, parentId: "iot-device" },
              { id: "iot-device-device-group", name: "设备分组", icon: "fa-layer-group", path: "iot/device-group.html", order: 3, parentId: "iot-device" },
              { id: "iot-device-thing-model", name: "产品物模型", icon: "fa-cube", path: "iot/device-thing-model.html", order: 99, parentId: "iot-device" }
          ]
        },
        {
          id: "iot-rule",
          name: "规则引擎",
          icon: "fa-cogs",
          path: null,
          order: 3,
          parentId: "iot",
          children: [
              { id: "iot-rule-scene", name: "场景联动", icon: "fa-link", path: "iot/rule-scene.html", order: 1, parentId: "iot-rule" },
              { id: "iot-rule-data-rule", name: "数据流转", icon: "fa-random", path: "iot/rule-data-rule.html", order: 2, parentId: "iot-rule" }
          ]
        },
        {
          id: "iot-alert",
          name: "告警中心",
          icon: "fa-bell",
          path: null,
          order: 3,
          parentId: "iot",
          children: [
              { id: "iot-alert-config", name: "告警配置", icon: "fa-cog", path: "iot/alert-config.html", order: 1, parentId: "iot-alert" },
              { id: "iot-alert-record", name: "告警记录", icon: "fa-history", path: "iot/alert-record.html", order: 2, parentId: "iot-alert" }
          ]
        },
        {
          id: "iot-operation",
          name: "运维管理",
          icon: "fa-wrench",
          path: null,
          order: 4,
          parentId: "iot",
          children: [
              { id: "iot-operation-firmware", name: "OTA 固件", icon: "fa-download", path: "iot/ota-firmware.html", order: 1, parentId: "iot-operation" }
          ]
        }
    ]
  }
];
