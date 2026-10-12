// 项目配置文件 —— 哔哩云视频社区（移动端 App + 管理后台）
// 由 dsh-prototype-guard 插件守护：页面注册、菜单路由、脚本契约都会在写入时校验。
//
// ⚠️ projectName 派生出两处东西，定新产品时要一起想清楚：
//   1. localStorage 键（{projectName}Canvas / {projectName}_uiState）
//   2. 后台页 <title> 的后缀（"页面名 - <projectName>"）。形态②的 PROTO_FORM 按它查表；
//      形态①与标题无关，但保持一致更利于阅读
window.PROJECT_CONFIG = {
  "projectName": "哔哩云",
  "projectTitle": "哔哩云 - 视频社区高保真原型",
  "projectDescription": "移动端 App（首页/搜索/播放/我的/消息/投稿）+ 电脑端前台（首页/搜索/播放/频道/UP主/登录/消息/投稿/历史/收藏）+ 管理后台（仪表盘/视频/用户/评论弹幕/审核/举报/系统）",
  "version": "1.0.0",
  "projectRootPath": "E:\\develop\\java_item\\ai\\prototype-desiger",
  "canvasSize": {
    "width": 1440,
    "height": 900
  },
  "devices": [
    { "id": "app", "name": "移动端", "icon": "fa-mobile-alt", "canvasSize": { "width": 375, "height": 812 } },
    { "id": "pc", "name": "电脑前台", "icon": "fa-display", "canvasSize": { "width": 1600, "height": 1000 } },
    { "id": "admin", "name": "管理后台", "icon": "fa-desktop" }
  ],

  // 分类：device 决定该组出现在哪个设备 Tab 下
  "categories": [
    { "id": "app-main",     "name": "移动端 · 主流程", "order": 1, "device": "app" },
    { "id": "app-message",  "name": "移动端 · 互动",   "order": 2, "device": "app" },
    { "id": "pc-main",      "name": "电脑端 ·  浏览",  "order": 1, "device": "pc" },
    { "id": "pc-account",   "name": "电脑端 · 账户",  "order": 2, "device": "pc" },
    { "id": "dashboard",    "name": "数据中心",        "order": 1, "device": "admin" },
    { "id": "content",      "name": "内容管理",        "order": 2, "device": "admin" },
    { "id": "user",         "name": "用户管理",        "order": 3, "device": "admin" },
    { "id": "community",    "name": "社区治理",        "order": 4, "device": "admin" },
    { "id": "system",       "name": "系统管理",        "order": 5, "device": "admin" }
  ],

  // 页面：path 相对项目根；id 唯一（惯例 <category>-<name>，但匹配靠 path）
  "pages": [
    // ---- 移动端 ----
    { "id": "app-home",     "name": "首页推荐", "icon": "fa-house",        "category": "app-main",    "path": "pages/app/home/home.html" },
    { "id": "app-search",   "name": "搜索发现", "icon": "fa-magnifying-glass", "category": "app-main",  "path": "pages/app/search/search.html" },
    { "id": "app-player",   "name": "视频播放", "icon": "fa-play",         "category": "app-main",    "path": "pages/app/player/player.html" },
    { "id": "app-profile",  "name": "个人中心", "icon": "fa-user",         "category": "app-main",    "path": "pages/app/profile/profile.html" },
    { "id": "app-message",  "name": "消息中心", "icon": "fa-comment-dots", "category": "app-message", "path": "pages/app/message/message.html" },
    { "id": "app-upload",   "name": "投稿发布", "icon": "fa-cloud-arrow-up", "category": "app-message", "path": "pages/app/upload/upload.html" },

    // ---- 电脑端前台 ----
    { "id": "pc-home",      "name": "首页推荐", "icon": "fa-house",          "category": "pc-main",     "path": "pages/pc/home/home.html" },
    { "id": "pc-search",    "name": "搜索结果", "icon": "fa-magnifying-glass","category": "pc-main",     "path": "pages/pc/search/search.html" },
    { "id": "pc-player",    "name": "视频播放", "icon": "fa-play",           "category": "pc-main",     "path": "pages/pc/player/player.html" },
    { "id": "pc-channel",   "name": "频道分区", "icon": "fa-layer-group",    "category": "pc-main",     "path": "pages/pc/channel/channel.html" },
    { "id": "pc-space",     "name": "UP主空间", "icon": "fa-id-card",        "category": "pc-main",     "path": "pages/pc/space/space.html" },
    { "id": "pc-login",     "name": "登录注册", "icon": "fa-right-to-bracket","category": "pc-account",  "path": "pages/pc/login/login.html" },
    { "id": "pc-message",   "name": "消息中心", "icon": "fa-comment-dots",   "category": "pc-account",  "path": "pages/pc/message/message.html" },
    { "id": "pc-upload",    "name": "投稿发布", "icon": "fa-cloud-arrow-up", "category": "pc-account",  "path": "pages/pc/upload/upload.html" },
    { "id": "pc-history",   "name": "观看历史", "icon": "fa-clock-rotate-left","category": "pc-account","path": "pages/pc/history/history.html" },
    { "id": "pc-favorite",  "name": "我的收藏", "icon": "fa-bookmark",       "category": "pc-account",  "path": "pages/pc/favorite/favorite.html" },

    // ---- 管理后台 ----
    { "id": "home",          "name": "运营概览",   "icon": "fa-gauge-high",   "category": "dashboard", "path": "pages/admin/home.html" },
    { "id": "content-video", "name": "视频管理",   "icon": "fa-video",        "category": "content",   "path": "pages/admin/content/video.html" },
    { "id": "content-part",  "name": "分区管理",   "icon": "fa-layer-group",  "category": "content",   "path": "pages/admin/content/part.html" },
    { "id": "user-account",  "name": "用户管理",   "icon": "fa-users",        "category": "user",      "path": "pages/admin/user/account.html" },
    { "id": "user-upper",    "name": "UP主认证",   "icon": "fa-certificate",  "category": "user",      "path": "pages/admin/user/upper.html" },
    { "id": "community-comment", "name": "评论弹幕管理", "icon": "fa-comments", "category": "community", "path": "pages/admin/community/comment.html" },
    { "id": "community-audit",   "name": "内容审核",   "icon": "fa-shield-halved", "category": "community", "path": "pages/admin/community/audit.html" },
    { "id": "community-report",  "name": "举报处理",   "icon": "fa-flag",        "category": "community", "path": "pages/admin/community/report.html" },
    { "id": "system-role",   "name": "角色权限",   "icon": "fa-user-shield",  "category": "system",    "path": "pages/admin/system/role.html" },
    { "id": "system-admin",  "name": "管理员",     "icon": "fa-user-gear",    "category": "system",    "path": "pages/admin/system/admin.html" },
    { "id": "system-config", "name": "系统配置",   "icon": "fa-sliders",      "category": "system",    "path": "pages/admin/system/config.html" }
  ]
};