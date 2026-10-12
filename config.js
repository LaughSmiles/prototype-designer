// 项目配置文件 —— 当前为空骨架，等待新产品定义。
// 由 dsh-prototype-guard 插件守护：页面注册、菜单路由、脚本契约都会在写入时校验。
//
// ⚠️ projectName 派生出两处东西，定新产品时要一起想清楚：
//   1. localStorage 键（{projectName}Canvas / {projectName}_uiState）
//   2. 后台页 <title> 的后缀（"页面名 - <projectName>"），prototype-components.js 据此查表
//
// ⚠️ 目前 projectName 仍是上一个项目的遗留值「拾光社区」，页面已全部删除。
//    定下新产品后需要一并改：projectName / projectTitle / categories[] / pages[]，
//    并同步清空 menu/menu.js。改完务必跑 node tools/check-config.js。
window.PROJECT_CONFIG = {
  "projectName": "拾光社区",
  "projectTitle": "拾光社区 - 小红书式社区 App & 运营后台高保真原型",
  "projectDescription": "页面已全部清空，等待新产品定义",
  "version": "5.0.0",
  "projectRootPath": "E:\\develop\\java_item\\ai\\prototype-desiger",
  "canvasSize": {
    "width": 1440,
    "height": 900
  },
  // 设备类型定义（可选，不配则不显示设备Tab）—— 与产品无关，保留
  "devices": [
    { "id": "app", "name": "移动端", "icon": "fa-mobile-alt", "canvasSize": { "width": 375, "height": 812 } },
    { "id": "admin", "name": "管理后台", "icon": "fa-desktop" }
  ],
  // 分类与页面都随新产品一起定，先清空
  "categories": [],
  "pages": []
};
