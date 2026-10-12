// 菜单配置文件 —— 侧边栏导航数据源（当前为空骨架，等待新产品定义）
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
// ⚠️ 书写格式是硬要求，不要改成 JSON 风格：
//   1) 键名**不加引号** —— 写「无引号的 path 键」，不要写「带双引号的 path 键」。
//      dsh-prototype-guard 用 /\bpath:\s*"([^"]+)"/ 和 /^ {4}id: "…",$/ 两条正则读本文件，
//      键名一旦加引号就一条都匹配不到，插件会误报「所有页面都没进菜单、当前没有任何顶层分组」。
//      （本注释刻意不写出可被正则匹配的字面量，否则插件会把注释里的示例当成一条真实菜单路径。）
//   2) 顶层分组字段缩进固定 4 空格，且紧跟在上一行的 `{` 之后。
//   3) 顶层分组用嵌套 `children: [`，子项写单行并保留 parentId（与 js/menu/menu-data.js
//      的兜底菜单同一种写法）。menu-data.js 会把 children 展平后按 parentId 建树，
//      所以两种写法都能渲染，但只有这种写法能同时通过插件校验。
//
// ⚠️ 只有桌面页进菜单，App 端页面用底部 TabBar 导航，不在此列。
// ⚠️ 每个在 config.js 注册的桌面页都必须在这里有条目，否则侧边栏点不到。

window.SIDEBAR_MENU = [
  // 当前为空骨架 —— 新产品定档后按下述格式在此补条目：
  // { id: "system-user", name: "用户管理", icon: "fa-users", path: "admin/system/user.html", order: 1, parentId: "system" }
];
