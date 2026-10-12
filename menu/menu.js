// 菜单配置文件 - 拾光社区运营后台
// 动态侧边栏菜单数据配置
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
//       即 admin/note.html，而不是 pages/admin/note.html
//
// 注意: 树结构实际由 parentId 决定，下面的缩进只为可读性。
//       顶层分组 id 与 config.js 的 category 同名（community），这是本项目约定。

window.SIDEBAR_MENU = [
  {
    id: "community",
    name: "社区运营",
    icon: "fa-users",
    path: null,
    order: 10,
    parentId: null,
    children: [
      { id: "community-dashboard", name: "数据看板", icon: "fa-chart-line", path: "admin/dashboard.html", order: 1, parentId: "community" },
      {
        id: "community-content",
        name: "内容运营",
        icon: "fa-newspaper",
        path: null,
        order: 2,
        parentId: "community",
        children: [
          { id: "community-note", name: "笔记管理", icon: "fa-book", path: "admin/note.html", order: 1, parentId: "community-content" },
          { id: "community-audit", name: "内容审核", icon: "fa-clipboard-check", path: "admin/audit.html", order: 2, parentId: "community-content" },
          { id: "community-comment", name: "评论管理", icon: "fa-comments", path: "admin/comment.html", order: 3, parentId: "community-content" },
          { id: "community-topic", name: "话题标签", icon: "fa-hashtag", path: "admin/topic.html", order: 4, parentId: "community-content" },
          { id: "community-report", name: "举报处理", icon: "fa-flag", path: "admin/report.html", order: 5, parentId: "community-content" }
        ]
      },
      {
        id: "community-govern",
        name: "用户与风控",
        icon: "fa-user-shield",
        path: null,
        order: 3,
        parentId: "community",
        children: [
          { id: "community-user", name: "用户管理", icon: "fa-users", path: "admin/user.html", order: 1, parentId: "community-govern" },
          { id: "community-risk", name: "敏感词风控", icon: "fa-shield-alt", path: "admin/risk.html", order: 2, parentId: "community-govern" }
        ]
      }
    ]
  }
];
