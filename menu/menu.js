// 菜单配置文件 —— 当前为空，等待新产品定义。
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
// 注意: 树结构实际由 parentId 决定，缩进只为可读性。
//       顶层分组 id 与 config.js 的 category 同名，这是本项目约定。
//
// ⚠️ 页面已全部删除，菜单暂空。定下新产品后重建，且每个在 config.js 注册的
//    桌面页都必须在这里有条目，否则侧边栏点不到（插件会报 menu-route-missing）。

window.SIDEBAR_MENU = [];
