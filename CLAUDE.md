# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **reusable high-fidelity prototype design framework** for rapid creation of web app prototypes with visual flow design. The current project is **"拾光社区"** — a Xiaohongshu-style community product benchmark — **15 prototype pages total**:

- **7 mobile pages** under `pages/app/` — the 拾光社区 community App (发现 / 笔记详情 / 搜索 / 发布 / 消息 / 我 / 他人主页). Canvas 375×812, driven by the `devices` entry in `config.js`.
- **8 desktop pages** under `pages/admin/` — the 社区运营运营后台 (数据看板 / 笔记管理 / 内容审核 / 用户管理 / 评论管理 / 话题标签 / 举报处理 / 敏感词风控). Canvas 1440×900.

### Key Features
- **Configuration-driven**: Define projects via `config.js` JSON without modifying framework code
- **Framework/content separation**: Framework code in `js/` is independent of project content in `pages/`
- **Zero dependencies, no build**: Pure frontend, all standalone HTML files, no compilation needed
- **Dual theme system**: Dark (default, Glassmorphism) and Light (Classic) themes via `data-theme` attribute
- **Fully offline**: All third-party libraries live in `lib/` (no CDN); all page images are localized under `lib/images/`

## Development Commands

No build step required. Open files directly in a browser.

```bash
# View the prototype showcase (renders all 15 pages from config.js)
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

# 3) Re-inject page-fields-config.js references (--dry-run to preview)
node inject-config-reference.js --dry-run
node inject-config-reference.js

# 4) Regenerate form-field config from the real Vue project
#    NOTE: requires the real Vue repo; the script exits with an error if it is missing
node extract-form-fields.js --views-root=<path-to>/src/views
node extract-form-fields.js --allow-fallback    # degrade to header inference (not recommended)

# 5) Re-download / re-localize external images
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
├── pages/                     # Page HTML files (MODIFY THIS)
│   ├── admin/                 # 8 desktop pages
│   │   ├── dashboard.html note.html audit.html user.html
│   │   └── comment.html topic.html report.html risk.html
│   └── app/                   # 7 mobile pages
│       └── discover note-detail search publish message profile user-home
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
│   ├── page-fields-config.js  # Form/header config (222 entities; 7 手工补写于社区后台)
│   ├── prototype-components.js # Shared page interaction components (forms, deletes, tabs)
│   └── topbar.js              # Shared topbar logic (fullscreen state, Ctrl+S intercept)
├── css/
│   ├── canvas-editor.css      # Editor styles + theme variables
│   └── sidebar-menu.css       # Dynamic sidebar menu styles
├── lib/                       # Vendored third-party libraries + localized images
│   ├── js/ (tailwindcss 3.4.17, marked 15.0.12, html2canvas 1.4.1)
│   ├── css/ (fontawesome 6.4.0)
│   ├── webfonts/ (3 woff2)
│   ├── images/ (localized page images)
│   └── NOTICE.md              # Third-party attribution (required by CC BY 4.0 / OFL)
├── tools/                     # Node check & maintenance scripts
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
- **`js/page-fields-config.js`** — `window.PAGE_FIELDS_CONFIG`: 222 entities mapping a page title to `{ entityName, fields[], headers[] }`. Consumed by `prototype-components.js` to **auto-generate** add/edit forms and table headers. Keys are Chinese page titles, so renaming a page title silently breaks its form (the code falls back to `<th>`-header inference).
- **`js/prototype-components.js`** — injected into all prototype pages, handles button clicks (add/edit forms, delete confirmations, export toasts, status toggles, search/reset), and auto-generates tab bar at top of `.main-content`
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
3. `id` must be **unique**; by convention it is `<category>-<page-name>` (id `system-user` → path `pages/admin/system/user.html`). ⚠️ The id does **not** have to equal the filename — several pages deliberately differ (`mall-kefu` → `mall/kefu.html`, `infra-log` → `infra/log.html`, id `home` → `pages/admin/home.html`).
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

Page template references. Desktop pages live two levels below the project root (`pages/admin/<module>/`), so all paths use **three** `../` segments:

```html
<script src="../../../lib/js/tailwindcss.js"></script>      <!-- TailwindCSS 3.4.17 -->
<link rel="stylesheet" href="../../../lib/css/all.min.css">  <!-- Font Awesome 6.4.0 -->
<link rel="stylesheet" href="../../../css/sidebar-menu.css">
<script src="../../../menu/menu.js"></script>               <!-- menu DATA, must be first -->
<script src="../../../js/debug.js"></script>
<script src="../../../js/page-fields-config.js"></script>  <!-- form/header config -->
<script src="../../../js/prototype-components.js"></script>
```

Root-level desktop pages (`pages/admin/login.html`, `home.html`, …) sit one level shallower and therefore use `../../`.
Mobile pages (`pages/app/<module>/`) use `../../../` for `lib/`, `css/`, `js/` but load **no** menu or page-config scripts.

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
- **Third-party libraries**: served from `lib/` (not CDN) — TailwindCSS 3.4.17, Font Awesome 6.4.0, marked 15.0.12, html2canvas 1.4.1. See `lib/NOTICE.md` for attribution requirements.
- **Page images**: localized under `lib/images/`, managed by `tools/localize-images.js`. The project renders fully offline.
- **iframe-based pages**: prototype pages are loaded inside iframes on the canvas. The iframes stay `pointer-events: auto`; interaction blocking in edit mode is handled by the `.page-click-overlay` overlay instead. (Toggling iframe `pointer-events` was removed on purpose — it freezes the scroll compositor, see Chrome bug interact.js #605 and `.cursor-history.md` 2026-05-21 03:20.) Right-click a page element's drag bar for the fullscreen preview.
- **CSS sibling selectors** for expander buttons: `.sidebar-right.collapsed ~ .expander-right` — these don't trigger when `collapsed` class is added via JS after initial render, so `loadUIState()` must manually set `expander.style.display`
- **Fullscreen preview**: Right-click a page element's drag bar to open fullscreen overlay. Press Esc to exit. The overlay intercepts Ctrl+S to prevent browser save dialog.
- **Menu data source**: `menu/menu.js` is the single **hand-maintained** menu source (no generator script in this repo); `js/menu/*` is only the rendering engine. Every desktop page registered in `config.js` must also appear here, otherwise the sidebar cannot reach it.
- **Title suffix follows `projectName`**: pages are `<title>页面名 - <PROJECT_CONFIG.projectName></title>`. `prototype-components.js`'s `getPageTitleKey()` and the guard plugin both derive the suffix from `config.js`, so renaming the project needs no code change — but a suffix that does not match `projectName` exactly silently breaks form generation.
- **Logging**: use `Debug.log/warn/error`, never raw `console.*` (see Debug Logging).
