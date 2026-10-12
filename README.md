# 画布编辑器框架使用指南

## 📖 概述

这是一个**可复用的高保真原型设计框架**,支持快速创建Web/移动应用原型并进行可视化流程设计。桌面端(管理后台)与移动端(App)共用同一套框架代码。

> ⚠️ 仓库当前是**空骨架**:`config.js` 的 `projectName` 仍是占位值 `待定`,`categories[]` / `pages[]` 与 `menu/menu.js` 的 `SIDEBAR_MENU` 都是空的,`pages/` 下没有任何页面。本文描述的是框架**能力**与**约定**,不是某个具体产品的现状——按下面「快速开始」填入你自己的产品即可。

### 核心特性

- ✅ **配置化**: 通过 JSON 配置文件定义项目,无需修改代码
- ✅ **可复用**: 框架与项目内容分离,轻松创建新项目
- ✅ **可视化**: 拖拽式画布编辑器,直观组织页面流程
- ✅ **零依赖**: 纯前端实现,无需后端服务
- ✅ **易扩展**: 支持自定义页面、分类和配置

---

## 🚀 快速开始

### 创建新项目(5分钟)

#### 步骤1: 通过AI生成原型页面

根据项目类型选择对应的提示词模板：

<details>
<summary>📱 移动端 App 原型</summary>

```
我想开发一个{XXX功能的中文App，等等}，现在需要输出高保真的原型图，请通过以下方式帮我完成所有界面的原型设计，并确保这些原型界面可以直接用于开发：
1.  用户体验分析：先分析这个App的用户需求和主要功能，确定核心交互逻辑。
2.  产品界面规划：作为产品经理，定义关键界面，确保产品功能模块和信息架构合理。
3.  高保真UI设计：作为UI设计师，设计贴近真实iOS设计规范的界面，使用现代化的UI元素，风格简洁，使其具有良好的视觉体验。
4.  HTML原型实现：使用HTML+TailwindCSS生成所有原型界面，并使用FontAwesome让界面更加精美、接近真实的App设计。注意：TailwindCSS和FontAwesome通过本地路径引入，不要使用CDN链接。
5.	原型图的图片、视频资源需要下载的本地的lib\images中，在本地引用，不要使用CDN链接。
6.  拆分代码文件，保持结构清晰：
    -   每个界面作为独立的HTML文件，按模块放进 `pages/app/<模块>/`（如 `pages/app/home/home.html`）。
    -   **不要生成、不要修改 `index.html`**：它已改为运行时读取 `config.js` 自动渲染页面清单，
        任何"平铺展示/iframe 拼 HTML"的旧写法都会把它覆盖成死页面。
    -   页面HTML文件中引入资源的路径必须使用相对路径，且**层数 = 文件路径中 `/` 的个数**：
        `pages/app/<模块>/xxx.html` 深度为 3，用 `../../../lib/js/tailwindcss.js`、
        `../../../lib/css/all.min.css`。
7.  真实感增强：
    -   界面尺寸应模拟iPhone 15 Pro，并让界面圆角化，使其更像真实的手机界面。
    -   使用真实的UI图片，而非占位符图片(可从Unsplash、Pexels中选择)。
    -   添加顶部状态栏(模拟iOS状态栏)，并包含App导航栏(类似iOS底部TabBar)。
8.  页面脚本（重要，缺了不会报错、只是功能不工作）：
    -   移动端页面**不要加载**侧边栏菜单的任何脚本（`menu/menu.js` 与 `js/menu/*`）。
    -   移动端页面**必须加载** `<script src="../../../js/topbar.js"></script>`：
        它是退出预览的唯一出路，缺了它，在画布里预览时按 Esc 退不出来。
    -   完整清单：lib/js/tailwindcss.js → js/debug.js → js/topbar.js → js/prototype-components.js
    -   高度必须跟随视口，不要写死 375×812：画布给 iframe 的可用高度比配置值矮 30px，
        写死会让底部 TabBar 整条被推出可视区。
请按照以上要求生成完整的HTML代码，并确保其可用于实际iOS App的开发。
```

</details>



<details>
<summary>🖥️ 管理后台原型</summary>

```
我想开发一个{XXX功能的管理系统，等等}，现在需要输出高保真的原型图，请通过以下方式帮我完成所有界面的原型设计，并确保这些原型界面可以直接用于开发：
1.  需求分析：先分析这个管理系统的用户角色和核心功能，确定主要业务流程。
2.  界面规划：作为产品经理，定义关键页面，确保功能模块和导航结构合理。
3.  高保真UI设计：作为UI设计师，参考主流管理后台设计风格(如Element Plus、Ant Design)，使用现代化的UI元素，风格简洁专业。
4.  HTML原型实现：使用HTML+TailwindCSS生成所有原型页面，并使用FontAwesome图标。注意：TailwindCSS和FontAwesome通过本地路径引入，不要使用CDN链接。
5.  拆分代码文件，保持结构清晰：
    -   每个页面作为独立的HTML文件，按模块放进 `pages/admin/<模块>/`（如 `pages/admin/system/user.html`）。
    -   **不要生成、不要修改 `index.html`**：它已改为运行时读取 `config.js` 自动渲染页面清单。
    -   页面布局统一为：顶部导航栏 + 左侧菜单 + 右侧内容区。
    -   页面结构统一为：搜索表单 + 操作工具栏 + 数据表格 + 分页。
    -   页面HTML文件中引入资源的路径必须使用相对路径，且**层数 = 文件路径中 `/` 的个数**：
        `pages/admin/<模块>/xxx.html` 深度为 3，用 `../../../lib/js/tailwindcss.js`、
        `../../../lib/css/all.min.css`。
6.	原型图的图片、视频资源需要下载的本地的lib\images中，在本地引用，不要使用CDN链接。 
7.  交互增强：
    -   每个表格行添加操作列(查看/编辑/删除)。
    -   搜索和重置按钮要有真实的交互效果。
    -   新增/编辑使用弹框形式展示表单。
8.  数据配置（重要）：
    -   引入侧边栏菜单系统（数据层必须先于引擎层加载）：
        *   <link rel="stylesheet" href="../../../css/sidebar-menu.css">
        *   <script src="../../../menu/menu.js">（菜单配置数据，定义 window.SIDEBAR_MENU）
        *   <script src="../../../js/menu/menu-data.js">（读取上述数据并建树）
        *   <script src="../../../js/menu/menu-render.js">（菜单渲染）
        *   <script src="../../../js/menu/menu-interaction.js">（菜单交互）
        *   <script src="../../../js/menu/menu.js">（菜单入口）
    -   引入页面交互组件（按此顺序）：
        *   <script src="../../../js/debug.js">（调试日志开关，须在调用它的模块之前）
        *   <script src="../../../js/topbar.js">（顶栏全屏 + 退出预览的桥，必须有）
        *   <script src="../../../js/prototype-components.js">（按钮交互组件，必须最后加载）
    -   在页面中添加菜单容器：<div id="sidebar-menu"></div>
    -   在 DOMContentLoaded 后初始化：await SidebarMenu.init('sidebar-menu');
9.	表单定义（重要，必须由你在页面里写）：
    -   表格和表单是两回事：表格是「读」，只读列（编号/时间/操作列/状态标签）不进表单；
        表单是「写」，密码这类字段只出现在表单、表格里绝不显示。所以框架不可能从 <th> 反推出表单。
    -   在 <script src="prototype-components.js"> 之前，写入本页的表单定义：
        *   <script>
              window.PROTO_FORM = {
                  entityName: "订单",
                  fields: [
                      { label: "客户名称", type: "input", required: true },
                      { label: "金额",     type: "number" },
                      { label: "状态",     type: "select", options: ["待付款", "已付款", "已取消"] }
                  ]
              };
            </script>
    -   三条铁律（违反不会报错，只会静默失效）：
        *   每个 field.label 必须与表格中对应的 <th> 文字【一字不差】，否则「编辑」回填为空。
        *   只写「新增时该填什么」，不要把编号、创建时间、操作列写进 fields。
        *   只在表单里、表格里本就没有的字段（如密码、确认密码），必须加 "formOnly": true。
    -   type 可选值：input / textarea / number / date / select / radio / checkbox / password
        （select、radio、checkbox 必须给 options；radio 无 options 会退化成文本框）
    -   不写这一段时表单不会坏，但会退化为「按表头猜字段」，控件类型多半是错的。
请按照以上要求生成完整的HTML代码。
```

</details>

#### 步骤2: 将原型文件复制到项目中

将AI生成的文件复制到项目对应目录：

```
项目根目录/
├── pages/app/<模块>/    ← 移动端页面原样放这里
├── pages/admin/<模块>/  ← 管理后台页面原样放这里
└── index.html           ← 保持原样，不要覆盖
```

#### 步骤3: 配置项目

可以使用AI自动生成配置，提示词：

```
@README.md @pages @index.html @lib
帮我配置 config.js 文件
```

或手动编辑 `config.js`，**注意 `canvasSize` 根据项目类型选择不同尺寸**：

```javascript
window.PROJECT_CONFIG = {
  projectName: "我的新项目",
  projectRootPath: "E:\\path\\to\\project",

  // 画布默认尺寸。推荐改用 devices[] 声明多端，避免移动端/桌面端混用同一个尺寸：
  canvasSize: { width: 1440, height: 900 },

  // 可选：声明多设备后，编辑器与总览页会出现设备切换 Tab
  devices: [
    { id: "app",   name: "移动端", icon: "fa-mobile-alt", canvasSize: { width: 375, height: 812 } },
    { id: "admin", name: "桌面端", icon: "fa-desktop" }   // 不写 canvasSize 则继承上面的 canvasSize
  ],

  categories: [
    { id: "main", name: "主要功能", order: 1 }
  ],
  pages: [
    {
      id: "home",
      name: "首页",
      icon: "fa-home",
      category: "main",
      path: "pages/home/home.html"
    }
  ]
};
```

#### 步骤 3.5：配置管理后台数据（仅管理后台需要）

> 如果你的项目类型是"管理后台"，需要额外配置菜单和表单数据。

##### 3.5.1 配置菜单数据

创建 `menu/menu.js` 文件，定义侧边栏菜单结构：

```javascript
window.SIDEBAR_MENU = [
  {
    id: "system",
    name: "系统管理",
    icon: "fa-cog",
    path: null,
    order: 0,
    parentId: null,
    children: [
      { id: "system-user", name: "用户管理", icon: "fa-user", path: "admin/system/user.html", order: 0, parentId: "system" },
      { id: "system-role", name: "角色管理", icon: "fa-user-shield", path: "admin/system/role.html", order: 1, parentId: "system" },
      // ... 更多菜单项
    ]
  }
];
```

**菜单项字段说明**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 唯一标识符 |
| `name` | string | ✅ | 显示名称 |
| `icon` | string | ✅ | Font Awesome 图标类名 |
| `path` | string/null | ❌ | 页面路径（null 表示父菜单） |
| `order` | number | ❌ | 排序（数字越小越靠前） |
| `parentId` | string/null | ❌ | 父菜单 ID（null 表示顶级） |
| `children` | array | ❌ | 子菜单数组 |

##### 3.5.2 表单定义（由 AI 在页面里直接写）

框架**不再预置任何表单词汇表**。每一页的新增/编辑表单，由 AI 在生成该页时一并写进页面：

```html
<!-- 必须放在 prototype-components.js 之前 -->
<script>
  window.PROTO_FORM = {
    entityName: "订单",
    fields: [
      { label: "客户名称", type: "input", required: true },
      { label: "金额",     type: "number" },
      { label: "状态",     type: "select", options: ["待付款", "已付款", "已取消"] }
    ]
  };
</script>
<script src="../../../js/prototype-components.js"></script>
```

之所以要写：表格是「读」，表单是「写」，两者字段集合**并不相同**——编号、创建时间、操作列只在表格里；
密码、邮箱这类只进表单。`<th>状态</th>` 也推不出下拉框的选项。框架无法从表格反推出表单。

`type` 可选值：`input` / `textarea` / `number` / `date` / `select` / `radio` / `checkbox` / `password`。

**三条约定**：

1. `field.label` 必须与表格里对应的 `<th>` 文字**一字不差**，否则「编辑」回填该字段会是空的；
2. 只在表单里、表格里本就没有的字段（**密码、确认密码**）必须加 `"formOnly": true`：

   ```javascript
   { label: "初始密码", type: "password", formOnly: true }
   ```

3. `select` / `radio` / `checkbox` 必须给 `options`，否则会退化成普通文本框。

> 不写这段**不会报错**，但表单会退化为「按 `<th>` 猜字段」，控件类型多半是错的。
> 守卫插件会在你写入页面时直接报出来。

**加载顺序**（桌面页完整清单，与守卫插件的 `DESKTOP_REQUIRED` 一一对应）：

```html
<!-- 0. 资源 -->
<script src="../../../lib/js/tailwindcss.js"></script>      <!-- TailwindCSS 3.4.17 -->
<link rel="stylesheet" href="../../../lib/css/all.min.css">  <!-- Font Awesome 6.4.0 -->
<link rel="stylesheet" href="../../../css/sidebar-menu.css">

<!-- 1. 菜单配置（menu/menu.js 是数据层，必须先于引擎层） -->
<script src="../../../menu/menu.js"></script>
<script src="../../../js/menu/menu-data.js"></script>
<script src="../../../js/menu/menu-render.js"></script>
<script src="../../../js/menu/menu-interaction.js"></script>
<script src="../../../js/menu/menu.js"></script>

<!-- 2. 调试开关（提供 Debug.*，须在调用它的模块之前） -->
<script src="../../../js/debug.js"></script>

<!-- 3. 顶栏功能（退出预览的唯一出路，必须有） -->
<script src="../../../js/topbar.js"></script>

<!-- 4. 本页表单定义（见上，必须在第 5 项之前） -->

<!-- 5. 交互组件（必须最后加载） -->
<script src="../../../js/prototype-components.js"></script>
```

> 上面的路径是 `pages/admin/<模块>/` 下的写法（**三段** `../`），层数 = 路径中 `/` 的个数。
> 若页面直接放在 `pages/admin/` 下，改用 `../../`；移动端页面放在 `pages/app/<模块>/`，
> 用 `../../../` 引用 `lib/`、`css/`、`js/`，但**不引入**菜单与表单相关脚本，
> 且**必须保留 `js/topbar.js`**。
> 写错层级不会报错，只会静默失效——改完务必跑 `node tools/check-references.js`。

##### 3.5.3 验证配置

打开一个管理后台页面，检查：
- [ ] 左侧菜单正确显示
- [ ] 点击菜单可切换页面
- [ ] 新增按钮弹出表单，字段与页面表格对得上
- [ ] 编辑按钮能正确回填每一列（回填为空 = `field.label` 与 `<th>` 文字不一致）
- [ ] 状态开关显示正确实体名

---

#### 步骤4: 修复页面导航

AI生成的页面中，导航链接可能不正确。使用以下提示词修复：

```
@pages
1、将页面中的所有链接跳转指向真实的HTML文件路径，确保页面之间可以正常跳转
2、每个页面点击返回按钮时能正确返回上一页
```

#### 步骤5: 开始使用!

打开 `canvas-editor.html` 开始使用!

---

## 📁 项目结构

```
项目根目录/
├── canvas-editor.html         # 画布编辑器入口(框架核心)
├── config.js                  # 项目配置文件(需修改) —— 页面清单的唯一来源
├── index.html                 # 项目展示页(读取 config.js 自动渲染，无需维护页面列表)
├── pages/                     # 页面文件目录(需修改)
│   ├── admin/                 #   桌面端页面 (1440x900)，<模块>/xxx.html 用 ../../../ 引用
│   └── app/                   #   移动端页面 (375x812)，<模块>/xxx.html 用 ../../../ 引用
├── menu/                      # 侧边栏菜单【数据层】(需修改)
│   └── menu.js                #   window.SIDEBAR_MENU，菜单数据源（手工维护，无生成脚本）
├── tools/                     # 校验与维护脚本(零 npm 依赖，直接 node 运行)
│   ├── check-config.js        #   校验 config.js 与 pages/ 一致性
│   ├── check-references.js    #   校验/修复页面内所有本地引用
│   ├── localize-images.js     #   外部图片本地化到 lib/images/
│   ├── serve.js               #   本地静态服务器(测页面存在性探测用)
│   ├── test-persistence.js    #   数据持久化回归测试(36 例)
│   ├── verify-regression.js   #   确认上述测试确实能变红
│   ├── reset-storage.html     #   一键清 localStorage
│   └── README-persistence-tests.md  # 持久化测试的完整说明
├── js/                        # 框架核心代码(无需修改)
│   ├── debug.js               # 调试日志开关(需最先加载)
│   ├── canvas-editor.js       # 主控制器
│   ├── page-library/          # 页面库(加载/渲染/拖拽)
│   ├── canvas-view/           # 画布视图(核心/框选/事件)
│   ├── element-manager/       # 元素管理(核心/添加/渲染/注释/键盘)
│   ├── page-manager/          # 多页面画布(核心/拖拽排序/右键菜单)
│   ├── menu/                  # 动态侧边栏菜单【引擎层】(建树/渲染/交互/入口)
│   ├── tools/                 # 工具系统(核心/箭头/注释)
│   ├── storage.js             # 数据持久化
│   ├── history-manager.js     # 撤销/重做
│   ├── modal-manager.js       # 弹窗管理
│   ├── alignment-manager.js   # 对齐管理器
│   ├── prototype-components.js # 共享页面交互组件(表单/弹框/标签栏；读页面内联的 PROTO_FORM)
│   ├── topbar.js              # 共享顶栏逻辑(全屏/退出预览/Ctrl+S拦截)
│   └── virtual-scrollbar.js   # 虚拟滚动条
├── lib/                       # 本地第三方库与素材(无需修改)
│   ├── js/ (tailwindcss 3.4.17, marked 15.0.12, html2canvas 1.4.1)
│   ├── css/ (fontawesome 6.4.0)
│   ├── webfonts/ (3 个 woff2)
│   ├── images/ (本地化的页面图片)
│   ├── videos/ (本地化的页面视频)
│   └── AGENTS.md              # 素材获取规范 + 第三方署名声明
├── css/                       # 样式文件(无需修改)
│   ├── canvas-editor.css      # 画布编辑器样式(含主题变量)
│   └── sidebar-menu.css       # 动态侧边栏菜单样式
```

### 需要修改的文件

- ✏️ `config.js` - 项目配置（页面清单的唯一来源）
- ✏️ `pages/` - 页面文件
- ✏️ `menu/menu.js` - 侧边栏菜单数据
- ✏️ `index.html` - 项目展示页（一般无需改，已改为自动读取 `config.js`）

### 无需修改的文件(框架核心)

- 🔒 `canvas-editor.html` - 画布编辑器
- 🔒 `js/` - JavaScript 模块
- 🔒 `css/` - 样式文件
- 🔒 `lib/` - 第三方库

> 全部第三方库与页面图片都在 `lib/` 下，**不依赖任何 CDN**，项目可完全离线运行。
> 第三方署名要求与素材获取规范见 [`lib/AGENTS.md`](lib/AGENTS.md)。

---

## 🔧 配置文件详解

### config.js 完整说明

```javascript
// 项目配置文件
window.PROJECT_CONFIG = {
  // ===== 项目基本信息 =====
  projectName: "项目名称",              // 显示在浏览器标题和欢迎信息
  projectRootPath: "E:\\path\\to",     // 项目绝对路径(用于文件操作)
  projectTitle: "完整标题",             // 用于文档说明
  projectDescription: "项目描述",       // 项目简介
  version: "1.0.0",                     // 版本号

  // ===== 页面元素的大小 =====
  canvasSize: {
    width: 320,                           // 默认宽度(px)
    height: 680                           // 默认高度(px)
  },

  // ===== 页面分类(可选) =====
  categories: [
    {
      id: "home",                       // 分类ID(唯一标识)
      name: "首页模块",                  // 分类显示名称
      order: 1                          // 显示顺序(数字越小越靠前)
    },
    {
      id: "user",
      name: "用户中心",
      order: 2
    }
  ],

  // ===== 页面列表 =====
  pages: [
    {
      id: "home",                         // 页面ID：唯一即可，惯例 <category>-<page-name>
      name: "首页",                        // 页面显示名称
      icon: "fa-home",                    // FontAwesome图标类名
      category: "home",                   // 所属分类ID(对应categories中的id)
      path: "pages/admin/home.html"       // 页面文件路径，相对项目根，必填
    },
    {
      id: "profile",
      name: "个人中心",
      icon: "fa-user",
      category: "user",
      path: "pages/admin/user/profile.html"
    }
    // ... 更多页面
  ]
};
```

### 字段说明

| 字段                 | 类型   | 必填 | 说明                    |
| -------------------- | ------ | ---- | ----------------------- |
| `projectName`        | string | ✅    | 项目名称,用于标题和日志 |
| `projectRootPath`    | string | ❌    | 项目绝对路径,用于文件操作 |
| `projectTitle`       | string | ❌    | 项目完整标题            |
| `projectDescription` | string | ❌    | 项目描述                |
| `version`            | string | ❌    | 版本号,默认 "1.0.0"     |
| `canvasSize.width`   | number | ✅    | 画布默认宽度,默认 320   |
| `canvasSize.height`  | number | ✅    | 画布默认高度,默认 680   |
| `categories`         | array  | ❌    | 页面分类数组            |
| `categories[].id`    | string | ✅    | 分类ID,必须唯一         |
| `categories[].name`  | string | ✅    | 分类显示名称            |
| `categories[].order` | number | ❌    | 显示顺序                |
| `pages`              | array  | ✅    | 页面列表数组            |
| `pages[].id`         | string | ✅    | 页面ID,全局唯一即可     |
| `pages[].name`       | string | ✅    | 页面显示名称            |
| `pages[].icon`       | string | ✅    | FontAwesome图标类名     |
| `pages[].category`   | string | ❌    | 所属分类ID              |
| `pages[].path`       | string | ✅    | 页面HTML文件的相对路径   |

---

## 📝 页面文件规范

### 命名规范

1. **`id` 无需等于文件名** —— 框架的匹配完全靠 `path`，不比对 `id`。
   惯例是 `id` 用 `<category>-<page-name>`，但两者可以不同（如 `mall-kefu` → `mall/kefu.html`）。

2. **文件名使用小写字母、数字和连字符(-)**
   - ✅ `home.html`
   - ✅ `user-profile.html`
   - ✅ `page-2.html`
   - ❌ `Home.html`
   - ❌ `user_profile.html`

3. **扩展名必须是 `.html`**

> ⚠️ 例外：`pages/admin/system/` 下的 `user.html` / `role.html` / `menu.html`
> 三个文件名是**承重的** —— 页面上的假标签栏把它们写死了。改名会让那三个标签 404。

### 页面模板

> 下面的 `../` 适用于**直接放在 `pages/` 下**的页面。
> 按模块放在 `pages/app/<模块>/` 或 `pages/admin/<模块>/` 时深度为 3，
> 请把模板里的 `../` 全部改成 `../../../`。

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>页面标题 - 项目名</title>
    <script src="../lib/js/tailwindcss.js"></script>
    <link rel="stylesheet" href="../lib/css/all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #f5f5f5;
        }
    </style>
</head>
<body>
    <div class="min-h-screen bg-white">
        <!-- 状态栏 -->
        <div class="h-11 bg-white/90 backdrop-blur-sm flex items-center justify-between px-4 fixed top-0 left-0 right-0 z-50">
            <span class="text-sm font-medium">9:41</span>
            <div class="flex items-center gap-1">
                <i class="fas fa-signal text-xs"></i>
                <i class="fas fa-wifi text-xs"></i>
                <i class="fas fa-battery-full text-xs"></i>
            </div>
        </div>

        <!-- 页面内容 -->
        <div class="pt-11">
            <!-- 您的内容在这里 -->
        </div>
    </div>
</body>
</html>
```

### 可用资源

- **TailwindCSS**: 已通过本地 `lib/js/tailwindcss.js` 引入,直接使用类名
- **FontAwesome 6.4.0**: 图标库,使用 `<i class="fas fa-xxx"></i>`,通过 `lib/css/all.min.css` 引入

---

## 🎨 画布编辑器使用指南

### 打开编辑器

在浏览器中打开 `canvas-editor.html`

### 界面布局

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 状态栏: [选择|箭头|批注] | [保存|清空缓存|导出|导入|清空] | [帮助|主题]    │
├─────────────┬──────────────────────────┬─────────────┤
│  画布页面   │      画布区域             │   页面库    │
│             │                          │             │
│ [+新建页面] │                          │  [分类1]    │
│             │     (拖拽页面到此处)      │   - 页面1   │
│ - 画布页1   │                          │   - 页面2   │
│ - 画布页2   │                          │  [分类2]    │
│ - 画布页3   │                          │   - 页面3   │
│             │                          │             │
│ (右键菜单)  │                          │             │
└─────────────┴──────────────────────────┴─────────────┘
```

### 基本操作

#### 添加页面到画布

1. 在右侧页面库中找到需要的页面
2. **拖拽**页面到中央画布区域
3. 松开鼠标,页面即添加到画布

#### 移动页面元素

1. 点击选中页面元素(显示蓝色边框)
2. 拖拽顶部的**拖拽手柄**(带有 ☰ 图标的标题栏)
3. 移动到目标位置

#### 缩放元素

选中元素后,按 `Ctrl + 滚轮` 可缩放元素大小(保持宽高比)

#### 添加箭头标注

1. 点击顶部状态栏的"箭头"工具(或按 `2` 键)
2. 点击画布上的**起始点**
3. 点击画布上的**结束点**
4. 箭头自动创建

#### 添加批注标记

1. 点击顶部状态栏的"批注标记"工具(或按 `3` 键)
2. 点击画布上的任意位置
3. 输入批注内容(支持 Markdown 格式)
4. 点击外部完成编辑

#### 删除元素

1. 选中要删除的元素
2. 按 `Delete` 键
3. 或点击元素右上角的 **×** 按钮

#### 预览页面

1. 选中画布上的页面元素
2. 按 `Q` 键进入预览模式(可在页面内交互操作)
3. 再次按 `Q` 键退出预览

> 也可以右键点击页面元素的拖拽手柄,选择"全屏显示"进入全屏预览。全屏预览中按 `Esc` 退出。

---

## ⌨️ 快捷键大全

### 工具切换

| 快捷键 | 功能           |
| ------ | -------------- |
| `1`    | 选择工具       |
| `2`    | 箭头工具       |
| `3`    | 批注标记工具   |

### 视图操作

| 快捷键        | 功能                |
| ------------- | ------------------- |
| `Ctrl + 滚轮` | 缩放视图(0.1x - 5x) |
| `滚轮`        | 移动画布视图        |
| `空格键`      | 缩放50%并居中视图   |

### 元素操作

| 快捷键   | 功能              |
| -------- | ----------------- |
| `Delete` | 删除选中元素      |
| `Esc`    | 取消选择/退出全屏预览 |
| `Q`      | 进入/退出原位预览  |

### 数据操作

| 快捷键     | 功能             |
| ---------- | ---------------- |
| `Ctrl + S` | 保存到浏览器缓存 |
| `Ctrl + Z` | 撤销             |
| `Ctrl + Y` | 重做             |

> 导出/导入 JSON 文件请通过顶部状态栏的按钮操作。

---

## 💾 数据持久化

### 保存位置

数据保存在浏览器的 `localStorage` 中:

```javascript
// 存储键名（{projectName} 取自 config.js 的 projectName，运行时派生）
{projectName}Canvas            // 画布数据(多页面格式, version 2.0)
{projectName}_uiState          // UI状态(侧边栏折叠状态)
canvasEditor_theme             // 主题设置(dark/light)
sidebarMenuExpanded            // 侧边栏菜单折叠状态
topbar_fullscreen              // 顶栏全屏状态
prototypeFullscreenState       // 全屏状态缓存
prototypeDebug                 // 调试日志开关('1' = 开启)
```

> `{projectName}` 由 `PROJECT_CONFIG.projectName` 在运行时派生，因此把本框架复制到新项目并改名后，
> 已保存的画布数据依然能被找到。历史版本曾把它硬编码成 `photographySchoolCanvas`，
> 现由 `Storage.migrateLegacyKeys()` 在首次加载时自动迁移。

### 清空缓存

点击"清空浏览器缓存"按钮可以清除所有保存的数据。

### 导出/导入

顶部状态栏有「导出 / 导入」两个按钮，也可直接用快捷键 `Ctrl + E` 导出 JSON、`Ctrl + I` 导入 JSON。导出的文件名格式为 `canvas-时间戳.json`，导入后画布自动恢复到导出时的状态。

---

## 🎨 主题系统

编辑器支持双主题切换,通过点击顶部工具栏的主题按钮切换:

| 主题 | 说明 | 图标 |
| ---- | ---- | ---- |
| **Dark** (默认) | 暗色 Glassmorphism 风格,半透明毛玻璃效果 | ☀️ (红色) |
| **Light** | 亮色经典风格,不透明纯色背景 | 🌙 (蓝色) |

主题选择会自动保存到 `localStorage`,刷新页面后保持上次选择。

---

## 🎯 最佳实践

### 项目组织

1. **按功能模块分类页面**

   ```json
   "categories": [
     { "id": "auth", "name": "认证模块" },
     { "id": "main", "name": "主要功能" },
     { "id": "user", "name": "用户中心" }
   ]
   ```

2. **使用语义化的页面ID**

   - ✅ `user-profile-settings`
   - ✅ `order-payment-result`
   - ❌ `page1`
   - ❌ `abc`

3. **合理使用图标**

   - 首页: `fa-home`
   - 设置: `fa-cog`
   - 用户: `fa-user`
   - 搜索: `fa-search`
   - 更多图标: https://fontawesome.com/icons

### 页面设计

1. **保持一致的布局**
   - 统一的状态栏高度(44px)
   - 统一的导航栏样式
   - 统一的配色方案

2. **使用TailwindCSS类名**
   - 布局: `flex`, `grid`, `absolute`
   - 间距: `p-4`, `m-2`, `gap-4`
   - 颜色: `bg-blue-500`, `text-gray-900`
   - 圆角: `rounded-lg`, `rounded-full`

3. **添加交互反馈**
   - 按钮: `hover:bg-blue-600`
   - 卡片: `active:scale-95`

---

## 🐛 常见问题

### Q1: 页面库显示"未找到页面配置"

**原因**: `config.js` 文件格式错误或路径不正确

**解决**:

1. 检查 JavaScript 语法是否正确
2. 确保文件在项目根目录
3. 打开浏览器控制台查看错误信息

### Q2: 页面无法显示

**原因**:

- 页面文件没在 `config.js` 的 `pages[]` 里注册（**最常见**，检查脚本会报"孤儿页面"）
- `pages[].path` 写的路径与磁盘上的实际位置不一致
- 文件不在 `pages/` 目录下
- HTML 文件格式错误

**解决**:

1. 跑 `node tools/check-config.js`，它会逐条报出没注册的页面
2. 检查 `path` 拼写（区分大小写）与实际文件是否一致
3. 验证 HTML 语法

### Q3: 拖拽页面后显示为空白

**原因**: iframe 加载失败。最常见的是**相对路径层级写错**——`pages/admin/<模块>/` 下的页面需要 **三段** `../`，写成两段不会报错，只是静默加载失败。

**解决**:

1. 运行校验脚本，它会逐条解析所有本地引用并报告失效项：
   ```bash
   cd tools
   node check-references.js            # 仅检查
   node check-references.js --repair   # 自动修正可识别的失效引用
   ```
2. 对照 `CLAUDE.md` 的「Page template references」确认模板引用（页面在 `pages/admin/<模块>/` 用 `../../../`，`pages/admin/` 根级用 `../../`）
3. 确认 `config.js` 中该页面的 `path` 与磁盘上的真实位置一致：`node tools/check-config.js`

> 直接双击 HTML 用 `file://` 打开是**支持的**，`page-library.js` 内置了 file:// 降级逻辑，无需起本地服务器。

### Q4: 快捷键不生效

**原因**:

- 输入法处于激活状态
- 浏览器拦截了快捷键
- 焦点不在编辑器

**解决**:

1. 切换到英文输入法
2. 点击画布区域获取焦点
3. 检查浏览器快捷键冲突

### Q5: 数据丢失

**原因**: 浏览器缓存被清空

**解决**:

1. 定期导出数据(JSON文件)
2. 不要使用浏览器隐私模式
3. 清除浏览器数据前先导出

---

## 📚 扩展阅读

### 相关文档

- [TailwindCSS 文档](https://tailwindcss.com/docs)
- [FontAwesome 图标库](https://fontawesome.com/icons)
- [iOS 设计规范](https://developer.apple.com/design/human-interface-guidelines/)

### 更新日志

查看主目录的 `.cursor-history.md` 文件了解最近的更新。

---

## 🤝 贡献

如果您发现bug或有改进建议,欢迎反馈!

---

## 📄 许可

本框架可自由使用和修改,用于学习和商业项目。

⚠️ 仓库根目录暂未提供 `LICENSE` 文件（授权条款待项目所有者确定）。
若需要对外分发，请先补上明确的许可证文件，并注意本仓库内**再分发的第三方组件**
（TailwindCSS / Font Awesome / marked / html2canvas）各自附带的许可义务，
完整清单见 [`lib/AGENTS.md`](lib/AGENTS.md)——其中 Font Awesome 图标为
**CC BY 4.0（必须署名）**、字体为 **SIL OFL 1.1（须随包分发许可证全文）**。