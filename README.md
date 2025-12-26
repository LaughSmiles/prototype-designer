# 画布编辑器框架使用指南

## 📖 概述

这是一个**可复用的高保真原型设计框架**,支持快速创建移动应用原型并进行可视化流程设计。

### 核心特性

- ✅ **配置化**: 通过 JSON 配置文件定义项目,无需修改代码
- ✅ **可复用**: 框架与项目内容分离,轻松创建新项目
- ✅ **可视化**: 拖拽式画布编辑器,直观组织页面流程
- ✅ **零依赖**: 纯前端实现,无需后端服务
- ✅ **易扩展**: 支持自定义页面、分类和配置

---

## 🚀 快速开始

### 创建新项目(5分钟)

#### 步骤1: 通过AI创建原型图

提示词

```
我想开发一个{XXX功能的中文App，等等自己}，现在需要输出高保真的原型图，请通过以下方式帮我完成所有界面的原型设计，并确保这些原型界面可以直接用于开发：
1.  用户体验分析：先分析这个App的用户需求和主要功能，确定核心交互逻辑。
2.  产品界面规划：作为产品经理，定义关键界面，确保产品功能模块和信息架构合理。
3.  高保真UI设计：作为UI设计师，设计贴近真实iOS设计规范的界面，使用现代化的UI元素，风格简洁，使其具有良好的视觉体验。
4.  HTML原型实现：使用HTML+TailwindCSS(或Bootstrap)生成所有原型界面，并使用FontAwesome(或其他开源UI组件)让界面更加精美、接近真实的App设计。
5.  拆分代码文件，保持结构清晰：
    -   每个界面应作为独立的HTML文件存放，例如home.html、profile.html、settings.html等。并存在在pages目录下。
    -   index.html作为主入口，不直接写入所有界面的HTML代码，而是使用iframe的方式嵌入这些HTML片段，并将所有页面直接平铺展示在index页面中，而不是跳转链接。
    -   index.html在主目录下，没有存放在pages目录中
6.  真实感增强：
    -   界面尺寸应模拟iPhone 15 Pro，并让界面圆角化，使其更像真实的手机界面。
    -   使用真实的UI图片，而非占位符图片(可从Unsplash、Pexels、Apple官方UI资源中选择)。
    -   添加顶部状态栏(模拟iOS状态栏)，并包含App导航栏(类似iOS底部TabBar)。
请按照以上要求生成完整的HTML代码，并确保其可用于实际iOS App的开发。
```

#### 步骤2: 将ai创建的原型图复制到本项目中

/page目录和index.html页面

#### 步骤3: 修改配置文件

notes：可以解决ai帮你生成配置文件，提示词如下

```
@README.md @pages @index.html @project-config.json
帮我配置project-config.json
```

编辑 `project-config.json`:

```json
{
  "projectName": "我的新项目",
  "projectTitle": "项目标题",
  "projectDescription": "项目描述",
  "version": "1.0.0",
  "canvasSize": {
    "width": 320,
    "height": 680
  },
  "categories": [
    {
      "id": "main",
      "name": "主要功能",
      "order": 1
    }
  ],
  "pages": [
    {
      "id": "home",
      "name": "首页",
      "icon": "fa-home",
      "category": "main"
    },
    {
      "id": "profile",
      "name": "个人中心",
      "icon": "fa-user",
      "category": "main"
    }
  ]
}
```

#### 步骤4: 完成!

打开 `canvas-editor.html` 开始使用!

---

## 📁 项目结构

```
项目根目录/
├── canvas-editor.html         # 画布编辑器入口(框架核心)
├── project-config.json        # 项目配置文件(需修改)
├── index.html                  # 项目展示页(可选)
├── pages/                      # 页面文件目录(需修改)
│   ├── home.html
│   ├── profile.html
│   └── ...                     # 您的页面
├── js/                         # 框架核心代码(无需修改)
│   ├── canvas-editor.js       # 主控制器
│   ├── page-library.js        # 页面库管理(动态加载配置)
│   ├── element-manager.js     # 元素管理(适配动态配置)
│   ├── canvas-view.js         # 画布视图控制
│   ├── tools.js               # 工具系统
│   ├── storage.js             # 数据持久化
│   ├── virtual-scrollbar.js   # 虚拟滚动条
│   └── alignment-manager.js   # 对齐管理器
├── css/                        # 样式文件(无需修改)
│   └── canvas-editor.css      # 画布编辑器样式
```

### 需要修改的文件

- ✏️ `project-config.json` - 项目配置
- ✏️ `pages/` - 页面文件
- ✏️ `index.html` - 项目展示页(可选)

### 无需修改的文件(框架核心)

- 🔒 `canvas-editor.html` - 画布编辑器
- 🔒 `js/` - JavaScript 模块
- 🔒 `css/` - 样式文件

---

## 🔧 配置文件详解

### project-config.json 完整说明

```json
{
  // ===== 项目基本信息 =====
  "projectName": "项目名称",              // 显示在浏览器标题和欢迎信息
  "projectTitle": "完整标题",             // 用于文档说明
  "projectDescription": "项目描述",       // 项目简介
  "version": "1.0.0",                     // 版本号

  // ===== 页面元素的大小 =====
  "canvasSize": {
    "width": 320,                         // 默认宽度(px)
    "height": 680                         // 默认高度(px)
  },

  // ===== 页面分类(可选) =====
  "categories": [
    {
      "id": "home",                       // 分类ID(唯一标识)
      "name": "首页模块",                  // 分类显示名称
      "order": 1                          // 显示顺序(数字越小越靠前)
    },
    {
      "id": "user",
      "name": "用户中心",
      "order": 2
    }
  ],

  // ===== 页面列表 =====
  "pages": [
    {
      "id": "home",                       // 页面ID(必须与文件名一致)
      "name": "首页",                      // 页面显示名称
      "icon": "fa-home",                  // FontAwesome图标类名
      "category": "home"                  // 所属分类ID(对应categories中的id)
    },
    {
      "id": "profile",
      "name": "个人中心",
      "icon": "fa-user",
      "category": "user"
    }
    // ... 更多页面
  ]
}
```

### 字段说明

| 字段                 | 类型   | 必填 | 说明                    |
| -------------------- | ------ | ---- | ----------------------- |
| `projectName`        | string | ✅    | 项目名称,用于标题和日志 |
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
| `pages[].id`         | string | ✅    | 页面ID,必须与文件名一致 |
| `pages[].name`       | string | ✅    | 页面显示名称            |
| `pages[].icon`       | string | ✅    | FontAwesome图标类名     |
| `pages[].category`   | string | ❌    | 所属分类ID              |

---

## 📝 页面文件规范

### 命名规范

1. **文件名必须与配置中的 `id` 完全一致**
   - 配置: `"id": "user-profile"`
   - 文件: `user-profile.html` ✅
   - 文件: `user_profile.html` ❌
   - 文件: `User-Profile.html` ❌

2. **必须使用小写字母、数字和连字符(-)**
   - ✅ `home.html`
   - ✅ `user-profile.html`
   - ✅ `page-2.html`
   - ❌ `Home.html`
   - ❌ `user_profile.html`

3. **扩展名必须是 `.html`**

### 页面模板

建议使用以下HTML模板:

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>页面标题</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
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

- **TailwindCSS**: 已通过CDN引入,直接使用类名
- **FontAwesome 6.4.0**: 图标库,使用 `<i class="fas fa-xxx"></i>`

---

## 🎨 画布编辑器使用指南

### 打开编辑器

在浏览器中打开 `canvas-editor.html`

### 界面布局

```
┌─────────────┬──────────────────────────┬─────────────┐
│  工具栏     │      画布区域             │   页面库    │
│             │                          │             │
│ - 选择      │                          │  [分类1]    │
│ - 箭头      │     (拖拽页面到此处)      │   - 页面1   │
│ - 注释      │                          │   - 页面2   │
│             │                          │  [分类2]    │
│ - 保存      │                          │   - 页面3   │
│ - 导出文件  │                          │             │
│ - 导入文件  │                          │             │
│ - 清空画布  │                          │             │
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

#### 缩放视图

- **Ctrl + 滚轮**: 缩放整个画布视图(0.1x - 5x)
- **空格键**: 重置视图到50%并返回中心

#### 移动画布视图

- **滚轮**: 上下左右移动视图
- **中键拖动**: 拖动画布

#### 添加箭头标注

1. 点击左侧工具栏的"箭头"工具(或按 `A` 键)
2. 点击画布上的**起始点**
3. 点击画布上的**结束点**
4. 箭头自动创建

#### 添加卡片注释

1. 点击左侧工具栏的"注释"工具(或按 `N` 键)
2. 点击画布上的任意位置
3. 输入注释文字
4. 点击外部完成编辑

#### 删除元素

1. 选中要删除的元素
2. 按 `Delete` 键
3. 或点击元素右上角的 **×** 按钮

#### 保存进度

- **Ctrl + S**: 保存到浏览器缓存
- 或点击"保存到浏览器缓存"按钮

#### 导出/导入

- **导出文件**: Ctrl + E (导出JSON文件)
- **导入文件**: Ctrl + I (导入JSON文件)

---

## ⌨️ 快捷键大全

### 工具切换

| 快捷键 | 功能         |
| ------ | ------------ |
| `S`    | 选择工具     |
| `A`    | 箭头工具     |
| `N`    | 卡片注释工具 |

### 视图操作

| 快捷键        | 功能                |
| ------------- | ------------------- |
| `Ctrl + 滚轮` | 缩放视图(0.1x - 5x) |
| `滚轮`        | 移动画布视图        |
| `空格键`      | 重置视图到50%       |
| `Ctrl + 0`    | 重置视图到100%      |

### 元素操作

| 快捷键   | 功能              |
| -------- | ----------------- |
| `Delete` | 删除选中元素      |
| `Esc`    | 取消选择/退出工具 |

### 数据操作

| 快捷键     | 功能             |
| ---------- | ---------------- |
| `Ctrl + S` | 保存到浏览器缓存 |
| `Ctrl + E` | 导出JSON文件     |
| `Ctrl + I` | 导入JSON文件     |

### 帮助

| 快捷键     | 功能         |
| ---------- | ------------ |
| `Ctrl + /` | 显示帮助信息 |

---

## 💾 数据持久化

### 保存位置

数据保存在浏览器的 `localStorage` 中:

```javascript
// 存储键名
canvasEditor_data
canvasEditor_usageCount
```

### 清空缓存

点击"清空浏览器缓存"按钮可以清除所有保存的数据。

### 导出/导入

#### 导出

1. 点击"导出文件"按钮
2. 下载 JSON 文件到本地
3. 文件名格式: `画布数据_时间戳.json`

#### 导入

1. 点击"导入文件"按钮
2. 选择之前导出的 JSON 文件
3. 画布自动恢复到导出时的状态

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

**原因**: `project-config.json` 文件格式错误或路径不正确

**解决**:

1. 检查 JSON 格式是否正确(可使用 https://jsonlint.com 验证)
2. 确保文件在项目根目录
3. 打开浏览器控制台查看错误信息

### Q2: 页面无法显示

**原因**:

- 文件名与配置中的 `id` 不一致
- 文件不在 `pages/` 目录
- HTML 文件格式错误

**解决**:

1. 检查文件名拼写(区分大小写)
2. 确保文件在 `pages/` 目录
3. 验证 HTML 语法

### Q3: 拖拽页面后显示为空白

**原因**: iframe 加载失败

**解决**:

1. 检查页面文件路径
2. 打开浏览器控制台查看错误
3. 确保使用 `http://` 或 `https://` 协议(不是 `file://`)

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