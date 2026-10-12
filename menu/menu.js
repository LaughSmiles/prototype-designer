// 菜单配置文件 —— 侧边栏导航数据源（哔哩云视频社区 · 管理后台）
//
// ⚠️ 本文件就是菜单的唯一数据源，直接改这里（没有上游生成脚本）。
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
//       即 admin/content/video.html，而不是 pages/admin/content/video.html
//
// 注意: 树结构实际由 parentId 决定，缩进只为可读性。
//       顶层分组 id 与 config.js 的 category 同名，这是本项目约定。
//
// ⚠️ 书写格式（只有第 1 条是硬要求，其余是约定，不要当成校验规则）：
//   1) 键名**不加引号** —— dsh-prototype-guard 用 /\bpath:\s*"([^"]+)"/ 读本文件的
//      path，键名一旦加引号就匹配不到，插件会误报「所有页面都没进菜单」。
//   2) 顶层分组与子项都推荐单行成组；子项保留 parentId。
//   3) 本注释里的示例刻意不写出可被正则匹配的字面量 —— 插件会先剥离注释再解析。
//
// ⚠️ 只有桌面页进菜单，App 端页面用底部 TabBar 导航，不在此列。
// ⚠️ 每个在 config.js 注册的桌面页都必须在这里有条目，否则侧边栏点不到。

window.SIDEBAR_MENU = [
  // 顶级单项（不带 children）：运营概览对应 pages/admin/home.html
  { id: "dashboard-home", name: "运营概览", icon: "fa-gauge-high", path: "admin/home.html", order: 1 },

  // 内容管理
  { id: "content", name: "内容管理", icon: "fa-video", order: 2, children: [
    { id: "content-video", name: "视频管理", icon: "fa-film", path: "admin/content/video.html", order: 1, parentId: "content" },
    { id: "content-part", name: "分区管理", icon: "fa-layer-group", path: "admin/content/part.html", order: 2, parentId: "content" }
  ] },

  // 用户管理
  { id: "user", name: "用户管理", icon: "fa-users", order: 3, children: [
    { id: "user-account", name: "用户管理", icon: "fa-user", path: "admin/user/account.html", order: 1, parentId: "user" },
    { id: "user-upper", name: "UP主认证", icon: "fa-certificate", path: "admin/user/upper.html", order: 2, parentId: "user" }
  ] },

  // 社区治理
  { id: "community", name: "社区治理", icon: "fa-shield-halved", order: 4, children: [
    { id: "community-comment", name: "评论弹幕管理", icon: "fa-comments", path: "admin/community/comment.html", order: 1, parentId: "community" },
    { id: "community-audit", name: "内容审核", icon: "fa-clipboard-check", path: "admin/community/audit.html", order: 2, parentId: "community" },
    { id: "community-report", name: "举报处理", icon: "fa-flag", path: "admin/community/report.html", order: 3, parentId: "community" }
  ] },

  // 系统管理
  { id: "system", name: "系统管理", icon: "fa-cogs", order: 5, children: [
    { id: "system-role", name: "角色权限", icon: "fa-user-shield", path: "admin/system/role.html", order: 1, parentId: "system" },
    { id: "system-admin", name: "管理员", icon: "fa-user-gear", path: "admin/system/admin.html", order: 2, parentId: "system" },
    { id: "system-config", name: "系统配置", icon: "fa-sliders", path: "admin/system/config.html", order: 3, parentId: "system" }
  ] }
];