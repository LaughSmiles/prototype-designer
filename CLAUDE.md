# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **reusable high-fidelity prototype design framework** for rapid creation of web app prototypes with visual flow design. The current project is "芋道管理后台" (Yudao Admin) — a Vue3 management dashboard prototype with 100+ screens covering system management, BPM, CRM, Mall, ERP, AI, IoT and more. Canvas dimensions are 1440×900px (desktop).

### Key Features
- **Configuration-driven**: Define projects via `config.js` JSON without modifying framework code
- **Framework/content separation**: Framework code in `js/` is independent of project content in `pages/`
- **Zero dependencies, no build**: Pure frontend, all standalone HTML files, no compilation needed
- **Dual theme system**: Dark (default, Glassmorphism) and Light (Classic) themes via `data-theme` attribute

## Development Commands

No build step required. Open files directly in a browser.

```bash
# View the prototype showcase
start index.html

# Open the canvas editor
start canvas-editor.html
```

There are no tests, linter, or build commands for this project.

## Project Structure

```
project-root/
├── canvas-editor.html         # Canvas editor entry (framework core)
├── config.js                  # Project configuration (MODIFY THIS)
├── index.html                 # Project showcase page
├── pages/                     # Page HTML files (MODIFY THIS)
│   ├── system/ bpm/ crm/ mall/ erp/ ai/ iot/ mp/ member/ pay/ infra/ report/
├── js/                        # Framework code
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
├── lib/                       # Local copies of third-party libraries
│   ├── js/ (tailwindcss, marked, html2canvas)
│   └── css/ (fontawesome)
└── .cursor-history.md         # Session history log
```

### What to modify vs. what not to modify
- **Modify**: `config.js`, `pages/`, `index.html`
- **Framework code** (no need to modify): `canvas-editor.html`, `js/`, `css/`, `lib/`

## Module Architecture

### Script Load Order (in canvas-editor.html)

Scripts are loaded as global objects (no ES modules). The load order in HTML must match:

1. `config.js` — defines `window.PROJECT_CONFIG`
2. `page-library/` — page library module
3. `canvas-view/` — view pan/zoom
4. `element-manager/` — element CRUD
5. `tools/` — arrow/annotation tools
6. `modal-manager.js` — dialogs
7. `storage.js` — data persistence
8. `page-manager/` — multi-page canvas
9. `history-manager.js` — undo/redo
10. `canvas-editor.js` — **main controller (must load last)**

### Initialization Order (in canvas-editor.js `initModules()`)

The `CanvasEditor.init()` method initializes modules in this specific order at DOMContentLoaded:

1. `PageLibrary.init()` — loads config and renders page list (async, awaited)
2. `CanvasView.init()`
3. `ElementManager.init()`
4. `Tools.init()`
5. `ModalManager.init()`
6. `Storage.init()` — calls `loadUIState()` then `startAutoSave()`
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

Pages use a separate menu system loaded by each HTML page:
- `js/menu/menu-data.js` — menu data source (mirrors database `system_menu` table)
- `js/menu/menu-render.js` — renders sidebar HTML
- `js/menu/menu-interaction.js` — highlight current page, collapse/expand, active states
- `js/menu/menu.js` — entry point, exposes `SidebarMenu.init(containerId)`
- `css/sidebar-menu.css` — menu styles
- Pages include `<div id="sidebar-menu"></div>` and call `SidebarMenu.init('sidebar-menu')` in a `<script>` block

### Shared Page Scripts

- **`js/prototype-components.js`** — injected into all prototype pages, handles button clicks (add/edit forms, delete confirmations, export toasts, status toggles, search/reset), and auto-generates tab bar at top of `.main-content`
- **`js/topbar.js`** — injected into all pages, handles fullscreen toggle + localStorage persistence and Ctrl+S intercept in fullscreen mode

## Configuration System (config.js)

Defines `window.PROJECT_CONFIG` with:

| Field | Description |
|-------|-------------|
| `projectName` | Display name (browser title, welcome message) |
| `projectRootPath` | Absolute path for file operations |
| `canvasSize` | `{ width: 1440, height: 900 }` default element size |
| `categories` | Array of `{ id, name, order }` for grouping pages |
| `pages` | Array of `{ id, name, icon, category, path }` |

**Critical rule**: Page `id` must match the HTML filename (without `.html` extension).

## Theme System

Dual theme system controlled by `data-theme` attribute on `<html>`:
- **Dark** (`data-theme="dark"`, default) — Glassmorphism style with translucent surfaces
- **Light** (`data-theme="light"`) — Classic opaque style

Theme is toggled via `#themeToggleBtn` button click, persisted to `localStorage` key `canvasEditor_theme`.

CSS variables are defined in `css/canvas-editor.css` under `:root[data-theme="dark"]` and `:root[data-theme="light"]`.

## Data Persistence

| localStorage Key | Content |
|-----------------|---------|
| `{projectName}Canvas` | Canvas data (version 2.0, multi-page format with pages array) |
| `{projectName}_uiState` | UI state (sidebar collapsed states) |
| `canvasEditor_theme` | Current theme (`dark` or `light`) |
| `topbar_fullscreen` | Fullscreen state for page preview |

Data format version `2.0` supports multiple pages. Old `1.0` format (single page with `elements` array) is auto-migrated on load. Auto-save runs every 60 seconds.

## Canvas Editor Operations

### Layout
Three-column interface: Left sidebar (canvas page list) | Center (canvas with top status bar containing tools) | Right sidebar (page library). Both sidebars are collapsible with drag resizers. Tools (Select/Arrow/Annotation) are in the top status bar.

### Keyboard Shortcuts
- **1/2/3**: Select / Arrow / Annotation tool
- **Ctrl+S**: Save to localStorage
- **Ctrl+Z / Ctrl+Y**: Undo / Redo
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

Page template references:
- TailwindCSS: `../lib/js/tailwindcss.js` (or `../../lib/js/tailwindcss.js` from nested dirs)
- FontAwesome: `../lib/css/all.min.css` (or `../../lib/css/all.min.css`)
- Sidebar CSS: `../../css/sidebar-menu.css`

## Creating a New Project

1. Generate prototype HTML files using AI (prompt template in README.md)
2. Copy files to `pages/` directory, update `index.html`
3. Configure `config.js` with project name, categories, and pages
4. Fix page navigation links between pages
5. Open `canvas-editor.html` to use the canvas editor

## Key Technical Notes

- **No ES modules**: All JS files define global objects, loaded via `<script>` tags
- **Third-party libraries**: Served from `lib/` directory (not CDN) — TailwindCSS, FontAwesome 6.4.0, marked.js, html2canvas
- **iframe-based pages**: Prototype pages are loaded inside iframes on the canvas; iframe has `pointer-events: none` to allow canvas interactions. Right-click context menu provides fullscreen preview.
- **CSS sibling selectors** for expander buttons: `.sidebar-right.collapsed ~ .expander-right` — these don't trigger when `collapsed` class is added via JS after initial render, so `loadUIState()` must manually set `expander.style.display`
- **Fullscreen preview**: Right-click a page element's drag bar to open fullscreen overlay. Press Esc to exit. The overlay intercepts Ctrl+S to prevent browser save dialog.
- **Menu data source**: `js/menu/menu-data.js` mirrors the database `system_menu` table. When updating pages, check that sidebar menu items match the database structure.
