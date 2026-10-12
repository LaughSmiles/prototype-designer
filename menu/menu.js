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
// ⚠️ 书写格式（只有第 1 条是硬要求，其余是约定，不要当成校验规则）：
//   1) 键名**不加引号** —— dsh-prototype-guard 用 /\bpath:\s*"([^"]+)"/ 读本文件的
//      path，键名一旦加引号就匹配不到，插件会误报「所有页面都没进菜单」。
//   2) 顶层分组与子项都推荐单行成组（children: [ … ] 展开也可，插件按括号配平解析，
//      不再依赖缩进）；子项保留 parentId。
//      （旧版插件曾要求"顶层分组缩进固定 4 空格且紧跟上一行的 {"，现已改为括号配平，
//        两种写法都能被正确识别，写法一变也不会再给出误导性的插入建议。）
//   3) 本注释里的示例刻意不写出可被正则匹配的字面量 —— 插件会先剥离注释再解析。
//
// ⚠️ 只有桌面页进菜单，App 端页面用底部 TabBar 导航，不在此列。
// ⚠️ 每个在 config.js 注册的桌面页都必须在这里有条目，否则侧边栏点不到。

window.SIDEBAR_MENU = [
  // 当前为空骨架 —— 新产品定档后按下述格式在此补条目：
  // { id: "system-user", name: "用户管理", icon: "fa-users", path: "admin/system/user.html", order: 1, parentId: "system" }
];
