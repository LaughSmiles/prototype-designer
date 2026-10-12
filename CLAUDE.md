# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **reusable high-fidelity prototype design framework** for rapid creation of web app prototypes with visual flow design. It is currently an **empty skeleton awaiting a new product definition** — the previous product was archived and cleared:

- **0 prototype pages** — `pages/` holds only `.gitkeep`. `config.js` carries the placeholder `projectName: "待定"` with empty `categories[]` / `pages[]`, and `menu/menu.js` has an empty `SIDEBAR_MENU`.
- **To start a product**: set `projectName` / `projectTitle` / `projectDescription` in `config.js`, fill `categories[]` + `pages[]`, rebuild `menu/menu.js` for desktop pages, and add HTML under `pages/admin/` or `pages/app/`.
- **Assets cleared** — `lib/images/` and `lib/videos/` are empty. Localize media before referencing it; the acquisition channels (Pexels / Unsplash, MCP first) are documented in `lib/AGENTS.md` §5.
- **Framework intact** — `js/`, `css/`, `lib/`, `canvas-editor.html` are untouched and product-agnostic; the guard-plugin contract still applies.

### Key Features
- **Configuration-driven**: Define projects via `config.js` JSON without modifying framework code
- **Framework/content separation**: Framework code in `js/` is independent of project content in `pages/`
- **Zero dependencies, no build**: Pure frontend, all standalone HTML files, no compilation needed
- **Dual theme system**: Dark (default, Glassmorphism) and Light (Classic) themes via `data-theme` attribute
- **Fully offline**: All third-party libraries live in `lib/` (no CDN); all page images are localized under `lib/images/`

## Development Commands

No build step required. Open files directly in a browser.

```bash
# View the prototype showcase (renders every page registered in config.js)
start index.html

# Open the canvas editor
start canvas-editor.html
```

### Validation & maintenance scripts (Node, run from `tools/`)

These are **check commands, not build steps** — run them after adding/removing pages.

```bash
cd tools

# 1) Verify config.js matches the pages/ directory (orphan pages, duplicate ids, missing files)
node check-config.js

# 2) Verify every local src/href in every page actually resolves (--repair to auto-fix)
node check-references.js
node check-references.js --repair

# 3) Re-download / re-localize external images
node localize-images.js --dry-run
```

`check-config.js` and `check-references.js` exit non-zero on failure, so they can be wired into CI.

There are no unit tests, linter, or build commands for this project.

## Project Structure

```
project-root/
├── canvas-editor.html         # Canvas editor entry (framework core)
├── config.js                  # Project configuration (MODIFY THIS) — single source of truth
├── index.html                 # Project showcase page (reads config.js, no hardcoded page list)
├── pages/                     # Page HTML files (MODIFY THIS) — 当前只有 .gitkeep
│   ├── admin/                 # 桌面页（1440×900）；根级页用 ../../，pages/admin/<module>/ 用 ../../../
│   │   └── <module>/*.html    # 约定：后台首页放根级（pages/admin/home.html），TabBar 会按页面深度算到它
│   └── app/                   # 移动端页（375×812），不加载菜单与表单配置，但必须加载 js/topbar.js
├── menu/                      # Menu DATA source (MODIFY THIS)
│   └── menu.js                # window.SIDEBAR_MENU，菜单数据源（手工维护，无生成脚本）
├── tools/                     # Node maintenance scripts (no npm scripts; run manually)
├── js/                        # Framework code
│   ├── debug.js               # Debug log gate (load first)
│   ├── canvas-editor.js       # Main controller, initializes all modules
│   ├── page-library/          # Page library (config loading, rendering, drag-drop)
│   ├── canvas-view/           # View pan/zoom (core, box-selection, events)
│   ├── element-manager/       # Element CRUD (core, adder, renderer, annotation, keyboard)
│   ├── page-manager/          # Multi-page canvas (core, drag-sort, context-menu)
│   ├── menu/                  # Dynamic sidebar menu (data, render, interaction)
│   ├── tools/                 # Tool system (core, arrow, annotation)
│   ├── storage.js             # Data persistence (save/load/export/import)
│   ├── history-manager.js     # Undo/redo
│   ├── modal-manager.js       # Modal dialogs
│   ├── alignment-manager.js   # Element alignment guides
│   ├── virtual-scrollbar.js   # Custom scrollbar
│   ├── prototype-components.js # Shared page interaction components (forms, deletes, tabs)
│   └── topbar.js              # Shared topbar logic (fullscreen state, Ctrl+S intercept)
├── css/
│   ├── canvas-editor.css      # Editor styles + theme variables
│   └── sidebar-menu.css       # Dynamic sidebar menu styles
├── lib/                       # Vendored third-party libraries + localized images
│   ├── js/ (tailwindcss 3.4.17, marked 15.0.12, html2canvas 1.4.1)
│   ├── css/ (fontawesome 6.4.0)
│   ├── webfonts/ (3 woff2)
│   ├── images/ · videos/      # 本地化素材（当前为空，获取渠道见 lib/AGENTS.md §5）
│   └── AGENTS.md              # 素材获取规范（图片/视频渠道）+ 第三方署名（CC BY 4.0 / OFL / Pexels）
└── .cursor-history.md         # Session history log
```

### What to modify vs. what not to modify
- **Modify**: `config.js`, `pages/`, `menu/`, `index.html`
- **Framework code** (no need to modify): `canvas-editor.html`, `js/`, `css/`, `lib/`

## Module Architecture

### Script Load Order (in canvas-editor.html)

Scripts are loaded as global objects (no ES modules). The load order in HTML must match:

1. `config.js` — defines `window.PROJECT_CONFIG`
2. `js/debug.js` — debug log gate (must precede the modules that call `Debug.*`)
3. `page-library/` — page library module
4. `virtual-scrollbar.js` + `alignment-manager.js`
5. `canvas-view/` — view pan/zoom
6. `element-manager/` — element CRUD
7. `tools/` — arrow/annotation tools
8. `modal-manager.js` — dialogs
9. `storage.js` — data persistence
10. `page-manager/` — multi-page canvas
11. `history-manager.js` — undo/redo
12. `canvas-editor.js` — **main controller (must load last)**

### Debug Logging

All framework diagnostics go through `window.Debug` (see `js/debug.js`), **not** raw `console.log`:

- `Debug.log(...)` — debug output, **silent by default**
- `Debug.warn(...)` / `Debug.error(...)` — always emitted

Enable debug output with `?debug=1` on the URL, `localStorage.setItem('prototypeDebug','1')`, or `Debug.enable()` in the console.

### Initialization Order (in canvas-editor.js `initModules()`)

The `CanvasEditor.init()` method initializes modules in this specific order at DOMContentLoaded:

1. `PageLibrary.init()` — loads config and renders page list (async, awaited)
2. `CanvasView.init()`
3. `ElementManager.init()`
4. `Tools.init()`
5. `ModalManager.init()`
6. `Storage.init()` — calls `migrateLegacyKeys()`, `loadUIState()`, then `startAutoSave()`
7. `PageManager.init()` — depends on Storage
8. `HistoryManager.init()`
9. Sidebar resizer + theme toggle + global shortcuts

### Module Dependencies

All modules are global objects. Key dependency chains:
- `Storage` depends on `PageLibrary` and `ElementManager`
- `PageManager` depends on `Storage`
- `ElementManager` depends on `CanvasView` and `PageLibrary`
- `loadUIState()` (in Storage) runs **before** `initSidebarResizer()` (in CanvasEditor), so expander button visibility must be set manually in `loadUIState()`

### Dynamic Sidebar Menu System (in pages)

The menu system is **data + engine**, split across two directories. Load order matters: the data file must load first.

**Data layer** (define before anything reads it):
- `menu/menu.js` — defines `window.SIDEBAR_MENU`（**手工维护**的菜单数据源，无上游生成脚本；支持嵌套 `children`）。⚠️ This is the actual **data source**.

**Engine layer**:
- `js/menu/menu-data.js` — **consumes** `window.SIDEBAR_MENU`, builds the 3-level tree + path→menu map
- `js/menu/menu-render.js` — renders sidebar HTML
- `js/menu/menu-interaction.js` — highlight current page, collapse/expand, active states
- `js/menu/menu.js` — entry point, exposes `SidebarMenu.init(containerId)`
- `css/sidebar-menu.css` — menu styles

Desktop pages include them in this order:
```html
<script src="../../../menu/menu.js"></script>          <!-- data first -->
<script src="../../../js/menu/menu-data.js"></script>
<script src="../../../js/menu/menu-render.js"></script>
<script src="../../../js/menu/menu-interaction.js"></script>
<script src="../../../js/menu/menu.js"></script>
```
and call `SidebarMenu.init('sidebar-menu')` against a `<div id="sidebar-menu"></div>`.

Mobile pages (`pages/app/`) do **not** use the menu system.

### Shared Page Scripts

- **`js/debug.js`** — debug gate; desktop pages must load it before the scripts below
- **`window.PROTO_FORM`（页面内联）** — 每一页的新增/编辑表单定义，由 AI 在生成该页时写进页面，必须在 `prototype-components.js` **之前**：
  ```js
  window.PROTO_FORM = {
    entityName: "订单",
    fields: [ { label: "客户名称", type: "input", required: true }, ... ]
  };
  ```
  也接受按标题索引的旧写法 `window.PROTO_FORM = { "订单管理": {...} }`。`type` 取值：`input / textarea / number / date / select / radio / checkbox / password`。
  ⚠️ 每个 `field.label` 必须与本页 `<th>` 文字**一字不差**，否则「编辑」回填为空且不报错。
  只在表单里、表格里本就没有的字段（密码 / 确认密码）必须加 `"formOnly": true`，或用 `type: "password"`（自动豁免）。
  未定义时 `prototype-components.js` 依次退化为：`<th>` 关键字推断 → 通用 5 字段（名称/编码/排序/状态/备注），控件类型多半是错的。
  推断档会跳过「编号 / 创建人 / 更新时间 / 创建时间 / 更新日期」这类系统列，但**含「时间/日期」的其他列会生成 date 控件**。
- **`js/prototype-components.js`** — injected into all prototype pages, handles button clicks (add/edit forms, delete confirmations, export toasts, status toggles, search/reset), and auto-generates tab bar at top of `.main-content`. 表单与详情按**列位置**对齐 DOM 的 `<th>`/`<td>`（`getAlignedHeaders()`），不要用配置里的表头——那是死字段。
- **`js/topbar.js`** — injected into all pages, handles fullscreen toggle + localStorage persistence and Ctrl+S intercept in fullscreen mode

## Configuration System (config.js)

Defines `window.PROJECT_CONFIG` with:

| Field | Description |
|-------|-------------|
| `projectName` | Display name; **also derives the localStorage keys** (see Data Persistence) |
| `projectTitle` | Full display title used in the showcase header |
| `projectDescription` | Short description |
| `version` | Project version string |
| `projectRootPath` | Absolute path for file operations |
| `canvasSize` | `{ width: 1440, height: 900 }` default element size |
| `devices[]` | Device tabs: `{ id, name, icon, canvasSize? }` — `app` (375×812) and `admin` (inherits `canvasSize`) |
| `categories[]` | `{ id, name, order, device }` — `device` decides which device tab a group appears under |
| `pages[]` | `{ id, name, icon, category, path }` |

**Critical rules**

1. `path` must point to a file that really exists (relative to project root). Validate with `node tools/check-config.js`.
2. `category` must be one of `categories[].id`.
3. `id` must be **unique**; by convention it is `<category>-<page-name>` (id `system-user` → path `pages/admin/system/user.html`). ⚠️ The id does **not** have to equal the filename — matching is by `path`, not `id`.
   ⚠️ Two sets of filenames are **load-bearing**, because they are hardcoded in framework code:
   - `pages/admin/system/{user,role,menu}.html` — `prototype-components.js` hardcodes its fake tab paths as `system/user.html` / `system/role.html` / `system/menu.html`. Renaming them makes those tabs 404.
   - `js/menu/menu-data.js` → `getFallbackMenu()` also hardcodes a `system` group with `system/user.html` when `window.SIDEBAR_MENU` is missing.
4. Every HTML file under `pages/` should be registered; `check-config.js` reports unregistered files as orphan errors.

## Theme System

Dual theme system controlled by `data-theme` attribute on `<html>`:
- **Dark** (`data-theme="dark"`, default) — Glassmorphism style with translucent surfaces
- **Light** (`data-theme="light"`) — Classic opaque style

Theme is toggled via `#themeToggleBtn` button click, persisted to `localStorage` key `canvasEditor_theme`.

CSS variables are defined in `css/canvas-editor.css` under `:root[data-theme="dark"]` and `:root[data-theme="light"]`.

## Data Persistence

| localStorage Key | Content | Written by |
|-----------------|---------|------------|
| `{projectName}Canvas` | Canvas data (version 2.0, multi-page format with `pages` array) | `storage.js` |
| `{projectName}_uiState` | UI state (sidebar collapsed states) | `storage.js` |
| `canvasEditor_theme` | Current theme (`dark` or `light`) | `canvas-editor.js` |
| `sidebarMenuExpanded` | Sidebar menu collapse state | `js/menu/menu-render.js` |
| `topbar_fullscreen` | Fullscreen state for page preview | `js/topbar.js` |
| `prototypeFullscreenState` | Fullscreen state cache | `element-manager/element-keyboard.js` |
| `prototypeDebug` | Debug-log switch (`'1'` = on) | `js/debug.js` |

The two `{projectName}` keys are **derived from `PROJECT_CONFIG.projectName` at runtime** (getters in `js/storage.js`), so copying this framework under a new project name does not orphan saved data. `Storage.migrateLegacyKeys()` moves any data still sitting under the historical hardcoded key (`photographySchoolCanvas` / `photographySchool_uiState`) to the new key on first load, then deletes the old one.

Data format version `2.0` supports multiple pages. Old `1.0` format (single page with `elements` array) is auto-migrated on load. Auto-save runs every 60 seconds.

### Failure handling (must not regress)

Saving goes through **one** writer, `Storage._writeCanvas(payload)`, shared by manual (`save()`) and automatic (`saveSilently()`) paths. It returns a structured result — `{ok, reason, error, bytes}` where `reason` is `quota` / `unavailable` / `serialize` — and **never fails silently**:

- Every failure routes through `Storage._reportSaveFailure()`, which shows a **sticky** toast (`PageLibrary.showHint(msg, 0)`) and flips the `#saveStateIndicator` badge in the status bar to red. `duration = 0` means the hint stays until dismissed; a transient hint must never replace a sticky one (`page-library-render.js` enforces this).
- `showHint(message, duration)` **must forward `duration`** through the `PageLibrary` → `PageLibraryRender` relay, otherwise sticky hints silently degrade to 2-second toasts.
- Quota warnings are rate-limited to one repeat per 5 minutes so autosave retries every 60s don't spam.
- Corrupt canvas JSON is **quarantined** to `{projectName}Canvas.corrupt.<timestamp>` before the main key is touched, so an unparsable canvas never gets silently overwritten with an empty one by the next autosave.

### Dirty tracking & save-state badge

`Storage.markDirty()` is called from `HistoryManager.saveState()` — the single choke point every canvas mutation passes through — plus explicitly in `undo()` / `redo()` (which bypass `saveState`). The badge `#saveStateIndicator` in the status bar shows `已保存 hh:mm:ss` / `未保存 N 分钟` / `保存失败:...`.

> ⚠️ Use the bare identifier `Storage`, **not** `window.Storage`: top-level `const` in a classic script lives in the global *lexical* scope, so `window.Storage` is `undefined`.

`Storage.setupUnloadGuard()` flushes via `saveSync()` on `pagehide` / `beforeunload` / `visibilitychange`. `saveSync()` is deliberately **synchronous and network-free** — it snapshots memory via `_buildPayloadSync()` because an `await fetch` can never resolve during unload.

### Page existence probing

`PageLibrary.probePage()` returns a **tri-state**: `exists` / `missing` / `unknown`, with a 3s `AbortSignal.timeout`. `probePages()` dedupes by `filePath` and runs concurrently. `PageManager.cleanInvalidPageReferences()` only deletes an element on a confirmed `missing` (HTTP 404) — `unknown` (timeout / network error / 5xx) **keeps** it, so a flaky server cannot wipe the user's canvas during a save.

Under `file://` probing short-circuits to `exists`, so **this code path is only exercised over HTTP** — test it with `node tools/serve.js`, not by double-clicking the HTML.

### Persistence tests

```bash
node tools/serve.js 8899      # no-store static server (avoids stale-cache confusion)
node tools/test-persistence.js      # 36 unit/integration cases (~3s)
node tools/verify-regression.js     # reverts the fixes in a temp tree, requires cases to go red
```

See `tools/README-persistence-tests.md` for the full flow, the manual browser checklist, and the gotchas.

### iframe ↔ canvas messaging

Pages inside the canvas communicate with the editor via `window.postMessage`:

| `type` | Direction | Purpose |
|--------|-----------|---------|
| `canvas-save` | iframe → canvas | Trigger save while fullscreen |
| `prototype-escape-preview` | iframe → canvas | Exit in-place preview (Esc / Q) |

## Canvas Editor Operations

### Layout
Three-column interface: Left sidebar (canvas page list) | Center (canvas with top status bar containing tools) | Right sidebar (page library, with **device tabs**). Both sidebars are collapsible with drag resizers. Tools (Select/Arrow/Annotation) are in the top status bar.

### Keyboard Shortcuts
- **1/2/3**: Select / Arrow / Annotation tool
- **Ctrl+S**: Save to localStorage
- **Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z**: Undo / Redo / Redo
- **Ctrl+E**: Export canvas JSON
- **Ctrl+I**: Import canvas JSON
- **Ctrl+滚轮**: Zoom canvas view
- **Space**: Reset view to 50% and center
- **Delete**: Delete selected element
- **Esc**: Deselect / cancel tool
- **Q**: Enter/exit in-place preview (select a page element first, press Q to enter/exit)
- **Esc**: Exit fullscreen preview (when fullscreen overlay is open)

## Page HTML Layout Pattern

Each prototype page follows a consistent layout:

```
┌──────────────────────────────────────────────────┐
│ Topbar (breadcrumbs + fullscreen/search/user)     │
├───────────┬──────────────────────────────────────┤
│ Sidebar   │ Main Content                          │
│ (dynamic  │ ┌──────────────────────────────────┐ │
│  menu)    │ │ Search form                       │ │
│           │ ├──────────────────────────────────┤ │
│           │ │ Toolbar (add/import/export)       │ │
│           │ ├──────────────────────────────────┤ │
│           │ │ Data table                        │ │
│           │ ├──────────────────────────────────┤ │
│           │ │ Pagination                        │ │
│           │ └──────────────────────────────────┘ │
└───────────┴──────────────────────────────────────┘
```

Page template references. Desktop pages live two levels below the project root (`pages/admin/<module>/`), so all paths use **three** `../` segments. The list below is exactly the guard plugin's `DESKTOP_REQUIRED` plus the three resource tags — omitting any of them makes the plugin (or `check-references.js`) report an error:

```html
<script src="../../../lib/js/tailwindcss.js"></script>      <!-- TailwindCSS 3.4.17 -->
<link rel="stylesheet" href="../../../lib/css/all.min.css">  <!-- Font Awesome 6.4.0 -->
<link rel="stylesheet" href="../../../css/sidebar-menu.css">
<script src="../../../menu/menu.js"></script>               <!-- menu DATA, must be first -->
<script src="../../../js/menu/menu-data.js"></script>
<script src="../../../js/menu/menu-render.js"></script>
<script src="../../../js/menu/menu-interaction.js"></script>
<script src="../../../js/menu/menu.js"></script>
<script src="../../../js/debug.js"></script>                <!-- Debug.* gate, before callers -->
<script src="../../../js/topbar.js"></script>                <!-- Esc → postMessage exit bridge -->
<script>window.PROTO_FORM = { entityName: "订单", fields: [ /* ... */ ] };</script>  <!-- 本页表单，必须在下一行之前 -->
<script src="../../../js/prototype-components.js"></script>
```

Root-level desktop pages (`pages/admin/login.html`, `home.html`, …) sit one level shallower and therefore use `../../`.

Mobile pages (`pages/app/<module>/`) use `../../../` for `lib/`, `css/`, `js/` and load **no** menu or form scripts — but they **must** load `js/topbar.js` (`MOBILE_REQUIRED`). Without it, pressing Esc cannot leave the canvas preview: under `file://` the canvas cannot inject listeners into the iframe, so the page's own `postMessage` bridge is the only path.

⚠️ Run `node tools/check-references.js` after adding or moving pages — a wrong `../` count silently breaks the page with no visible error.

## Creating a New Project

1. Generate prototype HTML files using AI (prompt template in README.md)
2. Copy files into `pages/admin/<module>/` or `pages/app/<module>/`
3. Register them in `config.js` (id / name / icon / category / path) — `index.html` and the canvas editor both read this file, no other edits needed
4. Run `node tools/check-config.js` and `node tools/check-references.js`
5. Fix page navigation links between pages
6. Open `canvas-editor.html` to use the canvas editor

## Key Technical Notes

- **No ES modules**: All JS files define global objects, loaded via `<script>` tags
- **Third-party libraries**: served from `lib/` (not CDN) — TailwindCSS 3.4.17, Font Awesome 6.4.0, marked 15.0.12, html2canvas 1.4.1. See `lib/AGENTS.md` for attribution requirements.
- **Page media**: localized under `lib/images/` and `lib/videos/` (currently **empty**). The prototype renders fully offline, so **every** page asset must be downloaded locally before it is referenced — acquisition channels (Pexels / Unsplash, MCP first; Pexels is the only video source) are documented in `lib/AGENTS.md` §5. Pages reference photos via inline `background-image:url('../../../lib/images/...')` and clips via `<video src poster autoplay muted loop playsinline>`, so **deleting any file leaves a blank block**.
- **⚠️ Tailwind class-name collisions silently break custom CSS**: every page loads the Tailwind Play CDN, which injects its generated stylesheet **after** the page's own `<style>`. Any custom class that happens to equal a bare Tailwind utility gets overridden. This already bit the project: `.grid{column-count:3}` was killed by Tailwind's `.grid{display:grid}` (3-column waterfall collapsed to 1 column), and `.ring` / `.outline` collided the same way. **Before naming a custom class**, avoid at least: `grid flex block inline hidden table contents static fixed absolute relative sticky visible invisible container isolate italic underline truncate uppercase transform transition border shadow filter resize grow shrink ring outline`. Prefix project classes instead (`.wf`, `.orb`, `.kwclear`, `.gallery` …).
- **iframe-based pages**: prototype pages are loaded inside iframes on the canvas. The iframes stay `pointer-events: auto`; interaction blocking in edit mode is handled by the `.page-click-overlay` overlay instead. (Toggling iframe `pointer-events` was removed on purpose — it freezes the scroll compositor, see Chrome bug interact.js #605 and `.cursor-history.md` 2026-05-21 03:20.) Right-click a page element's drag bar for the fullscreen preview.
- **CSS sibling selectors** for expander buttons: `.sidebar-right.collapsed ~ .expander-right` — these don't trigger when `collapsed` class is added via JS after initial render, so `loadUIState()` must manually set `expander.style.display`
- **Fullscreen preview**: Right-click a page element's drag bar to open fullscreen overlay. Press Esc to exit. The overlay intercepts Ctrl+S to prevent browser save dialog.
- **Menu data source**: `menu/menu.js` is the single **hand-maintained** menu source (no generator script in this repo); `js/menu/*` is only the rendering engine. Every desktop page registered in `config.js` must also appear here, otherwise the sidebar cannot reach it.
- **Title suffix follows `projectName`**: pages are `<title>页面名 - <PROJECT_CONFIG.projectName></title>`. `prototype-components.js`'s `getPageTitleKey()` and the guard plugin both derive the suffix from `config.js`, so renaming the project needs no code change — but a suffix that does not match `projectName` exactly silently breaks form generation.
- **Logging**: use `Debug.log/warn/error`, never raw `console.*` (see Debug Logging).
