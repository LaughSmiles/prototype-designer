# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **reusable high-fidelity prototype design framework** for rapid creation of mobile app prototypes with visual flow design. The demo project is "摄影派" (Photography School) — a photography rental and sharing app with 32 screens designed for iPhone 15 Pro dimensions (320x680px).

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
│   ├── home/  rental/  works/  messages/  profile/
├── js/                        # Framework code (DO NOT MODIFY)
│   ├── canvas-editor.js       # Main controller, initializes all modules
│   ├── page-library/          # Page library (config loading, rendering, drag-drop)
│   ├── canvas-view/           # View pan/zoom (core, box-selection, events)
│   ├── element-manager/       # Element CRUD (core, adder, renderer, annotation, keyboard)
│   ├── page-manager/          # Multi-page canvas (core, drag-sort, context-menu)
│   ├── tools/                 # Tool system (core, arrow, annotation)
│   ├── storage.js             # Data persistence (save/load/export/import)
│   ├── history-manager.js     # Undo/redo
│   ├── modal-manager.js       # Modal dialogs
│   ├── alignment-manager.js   # Element alignment guides
│   └── virtual-scrollbar.js   # Custom scrollbar
├── css/
│   └── canvas-editor.css      # Editor styles + theme variables
├── lib/                       # Local copies of third-party libraries
│   ├── js/ (tailwindcss, marked, html2canvas)
│   └── css/ (fontawesome)
└── .cursor-history.md         # Session history log
```

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

## Configuration System (config.js)

Defines `window.PROJECT_CONFIG` with:

| Field | Description |
|-------|-------------|
| `projectName` | Display name (browser title, welcome message) |
| `projectRootPath` | Absolute path for file operations |
| `canvasSize` | `{ width: 320, height: 680 }` default element size |
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
| `photographySchoolCanvas` | Canvas data (version 2.0, multi-page format with pages array) |
| `photographySchool_uiState` | UI state (sidebar collapsed states) |
| `canvasEditor_theme` | Current theme (`dark` or `light`) |

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

## Creating a New Project

1. Generate prototype HTML files using AI (prompt template in README.md)
2. Copy files to `pages/` directory, update `index.html`
3. Configure `config.js` with project name, categories, and pages
4. Fix page navigation links between pages
5. Open `canvas-editor.html` to use the canvas editor

## Design Specifications

### iPhone 15 Pro Mockup
- Frame: 320px × 680px, 45px corner radius
- Screen: 100% width/height, 35px corner radius
- Notch: 80px × 25px centered at top
- Status bar: 44px height with blur effect

### iOS Design Patterns
- Navigation with back buttons and titles
- 5-icon Tab Bar (Home, Rental, Works, Messages, Profile)
- Bottom sheet modals with backdrop blur
- Cards with white backgrounds, 20px border radius, shadows

## Key Technical Notes

- **No ES modules**: All JS files define global objects, loaded via `<script>` tags
- **Third-party libraries**: Served from `lib/` directory (not CDN) — TailwindCSS, FontAwesome 6.4.0, marked.js, html2canvas
- **iframe-based pages**: Prototype pages are loaded inside iframes on the canvas
- **CSS sibling selectors** for expander buttons: `.sidebar-right.collapsed ~ .expander-right` — these don't trigger when `collapsed` class is added via JS after initial render, so `loadUIState()` must manually set `expander.style.display`
