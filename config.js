// 项目配置文件 - 拾光社区原型（移动端社区 App + 运营后台）
// 由 dsh-prototype-guard 插件守护：页面注册、菜单路由、脚本契约都会在写入时校验。
//
// ⚠️ projectName 派生出两处东西，改名要一起想清楚：
//   1. localStorage 键（{projectName}Canvas / {projectName}_uiState）
//   2. 后台页 <title> 的后缀（"页面名 - 拾光社区"），prototype-components.js 据此查表
window.PROJECT_CONFIG = {
  "projectName": "拾光社区",
  "projectTitle": "拾光社区 - 小红书式社区 App & 运营后台高保真原型",
  "projectDescription": "对标小红书的社区内容产品原型：移动端 7 页 + 社区运营后台 8 页",
  "version": "4.0.0",
  "projectRootPath": "E:\\develop\\java_item\\ai\\prototype-desiger",
  "canvasSize": {
    "width": 1440,
    "height": 900
  },
  // 设备类型定义（可选，不配则不显示设备Tab）
  "devices": [
    { "id": "app", "name": "社区App", "icon": "fa-mobile-alt", "canvasSize": { "width": 375, "height": 812 } },
    { "id": "admin", "name": "运营后台", "icon": "fa-desktop" }
  ],
  "categories": [
    // ========== 移动端（社区 App） ==========
    { "id": "app-home", "name": "发现", "order": 0, "device": "app" },
    { "id": "app-note", "name": "笔记", "order": 1, "device": "app" },
    { "id": "app-search", "name": "搜索", "order": 2, "device": "app" },
    { "id": "app-publish", "name": "发布", "order": 3, "device": "app" },
    { "id": "app-message", "name": "消息", "order": 4, "device": "app" },
    { "id": "app-profile", "name": "个人", "order": 5, "device": "app" },
    // ========== 桌面端（社区运营后台） ==========
    { "id": "community", "name": "社区运营", "order": 10, "device": "admin" }
  ],
  "pages": [
    // ========== 移动端 · 社区 App ==========
    { "id": "app-discover", "name": "发现", "icon": "fa-compass", "category": "app-home", "path": "pages/app/discover.html" },
    { "id": "app-note-detail", "name": "笔记详情", "icon": "fa-book-open", "category": "app-note", "path": "pages/app/note-detail.html" },
    { "id": "app-search", "name": "搜索", "icon": "fa-search", "category": "app-search", "path": "pages/app/search.html" },
    { "id": "app-publish", "name": "发布笔记", "icon": "fa-plus-square", "category": "app-publish", "path": "pages/app/publish.html" },
    { "id": "app-message", "name": "消息", "icon": "fa-comment-dots", "category": "app-message", "path": "pages/app/message.html" },
    { "id": "app-profile", "name": "我", "icon": "fa-user", "category": "app-profile", "path": "pages/app/profile.html" },
    { "id": "app-user-home", "name": "他人主页", "icon": "fa-id-badge", "category": "app-profile", "path": "pages/app/user-home.html" },
    // ========== 桌面端 · 社区运营后台 ==========
    { "id": "community-dashboard", "name": "数据看板", "icon": "fa-chart-line", "category": "community", "path": "pages/admin/dashboard.html" },
    { "id": "community-note", "name": "笔记管理", "icon": "fa-book", "category": "community", "path": "pages/admin/note.html" },
    { "id": "community-audit", "name": "内容审核", "icon": "fa-clipboard-check", "category": "community", "path": "pages/admin/audit.html" },
    { "id": "community-user", "name": "用户管理", "icon": "fa-users", "category": "community", "path": "pages/admin/user.html" },
    { "id": "community-comment", "name": "评论管理", "icon": "fa-comments", "category": "community", "path": "pages/admin/comment.html" },
    { "id": "community-topic", "name": "话题标签", "icon": "fa-hashtag", "category": "community", "path": "pages/admin/topic.html" },
    { "id": "community-report", "name": "举报处理", "icon": "fa-flag", "category": "community", "path": "pages/admin/report.html" },
    { "id": "community-risk", "name": "敏感词风控", "icon": "fa-shield-alt", "category": "community", "path": "pages/admin/risk.html" }
  ]
};
