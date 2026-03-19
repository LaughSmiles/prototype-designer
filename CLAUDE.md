# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **reusable high-fidelity prototype design framework** that supports rapid creation of mobile app prototypes with visual flow design. The demo project is "摄影派" (Photography School) - a photography rental and sharing app with 32 screens designed for iPhone 15 Pro dimensions (320x680px).

### Key Features
- **Configuration-driven**: Define projects via `config.js` JSON without modifying framework code
- **Framework separation**: Framework code in `js/` is independent of project content in `pages/`
- **Zero dependencies**: Pure frontend, no backend required
- **No build process**: All files are standalone HTML, no compilation needed

## Project Structure

```
项目根目录/
├── canvas-editor.html         # Canvas editor entry point (framework core)
├── config.js                  # Project configuration (MODIFY THIS)
├── index.html                  # Project showcase page
├── pages/                      # Page files (MODIFY THIS)
│   ├── home/                   # Home module pages
│   ├── rental/                 # Rental module pages
│   ├── works/                  # Works module pages
│   ├── messages/               # Messages module pages
│   └── profile/                # Profile module pages
├── js/                         # Framework core code (DO NOT MODIFY)
│   ├── canvas-editor.js       # Main controller - initializes all modules
│   ├── page-library.js        # Page library management
│   ├── canvas-view.js         # View operations (pan/zoom)
│   ├── element-manager.js     # Element management
│   ├── page-manager.js        # Multi-page canvas management
│   ├── tools.js               # Tool system (arrow/annotation)
│   ├── storage.js             # Data persistence
│   ├── history-manager.js     # Undo/redo support
│   ├── modal-manager.js       # Modal dialogs
│   ├── alignment-manager.js   # Element alignment guides
│   └── virtual-scrollbar.js   # Custom scrollbar
├── css/
│   └── canvas-editor.css      # Canvas editor styles
└── .cursor-history.md         # Session history and development log
```

## Key Technologies

- **Styling**: TailwindCSS (CDN)
- **Icons**: FontAwesome 6.4.0 (CDN)
- **Images**: Unsplash API for high-quality photography content
- **Layout**: Mobile-first responsive design with iOS-style UI components

## Configuration System (config.js)

The project is configured via `config.js` which defines `window.PROJECT_CONFIG`:

```javascript
window.PROJECT_CONFIG = {
  projectName: "项目名称",           // Display name
  projectRootPath: "E:\\path\\to",  // Absolute path for file operations
  canvasSize: { width: 320, height: 680 },
  categories: [
    { id: "home", name: "首页模块", order: 1 }
  ],
  pages: [
    { id: "home", name: "首页", icon: "fa-home", category: "home", path: "pages/home/home.html" }
  ]
}
```

**Important**: Page `id` must match the HTML filename (without extension).

## Module Architecture

### Initialization Order (in canvas-editor.js)
The modules must be initialized in this specific order:
1. `PageLibrary` - Loads config and page list
2. `CanvasView` - View pan/zoom controls
3. `ElementManager` - Element CRUD operations
4. `Tools` - Arrow and annotation tools
5. `ModalManager` - Dialog management
6. `Storage` - Data persistence (depends on PageLibrary)
7. `PageManager` - Multi-page canvas (depends on Storage)
8. `HistoryManager` - Undo/redo support

### Module Dependencies
- All modules use global `window.` references (not ES modules)
- `ElementManager` depends on `CanvasView` and `PageLibrary`
- `Storage` depends on `PageLibrary` and `ElementManager`
- `PageManager` depends on `Storage`

## Architecture Overview

### User端 (Consumer App) - 5 Main Modules

1. **首页 (Home)**: Search, carousel ads, featured equipment rental, popular works
2. **租赁 (Rental)**: Equipment browsing, filtering, detailed rental process with date selection and payment
3. **作品 (Works)**: Social feed with image/video posts, publishing workflow, comments
4. **消息 (Messages)**: System notifications, interactions, customer service, private chat
5. **我的 (Profile)**: User center, orders, addresses, identity verification, data overview

### Core User Flows

- **Rental Flow**: Browse → Detail → Select Period → Choose Delivery → Payment → Result
- **Publishing Flow**: Select Type → Upload Media → Add Metadata → Publish
- **Order Management**: View orders by status → Track logistics → Return equipment

## Development Commands

### Viewing the Prototype
```bash
# Open in browser (Windows)
start index.html

# Or simply double-click index.html
```

### Adding New Screens
1. Create new HTML file in `/pages/` directory
2. Follow the existing pattern: iOS status bar, TailwindCSS, FontAwesome icons
3. Add iframe to `index.html` in the appropriate module section
4. Update `.cursor-history.md` with changes

### Modifying Existing Screens
- Edit files in `/pages/` directory directly
- Use the same styling conventions (status bar height, colors, fonts)
- Test by refreshing `index.html` in browser

## Canvas Editor

### Overview
The canvas editor is an **interactive prototyping tool** that allows you to:
- Drag and drop pages from the library onto a canvas
- Pan and zoom the view (Ctrl + scroll to zoom, scroll to pan)
- Move and scale page elements
- Add arrow and text annotations
- Save and export canvas layouts

### How to Use
1. **Open**: Click "进入画布编辑器" button on the main page, or open `canvas-editor.html`
2. **Layout**: Three-column interface
   - **Left**: Tools (Select, Arrow, Text) + Actions (Save, Export, Import, Clear) + Zoom controls
   - **Center**: Canvas area (占满剩余空间)
   - **Right**: Page library (all 32 pages)
3. **Add Pages**: Drag pages from right panel to canvas
4. **Pan View**: Mouse wheel (or middle-click and drag)
5. **Zoom View**: Ctrl + mouse wheel
6. **Move Elements**: Click and drag on canvas elements
7. **Scale Elements**: Select element + Ctrl + mouse wheel (maintains aspect ratio)
8. **Add Arrows**: Select arrow tool, click start point, click end point
9. **Add Text**: Select text tool, click on canvas, enter text
10. **Delete**: Select element + Delete key, or click X button
11. **Save**: Ctrl+S or click save button (saves to localStorage)
12. **Export**: Ctrl+E or click export button (downloads JSON)
13. **Import**: Ctrl+I or click import button (loads JSON file)

### Keyboard Shortcuts
- **S**: Select tool
- **A**: Arrow tool
- **T**: Text tool
- **Ctrl+S**: Save to localStorage
- **Ctrl+E**: Export JSON
- **Ctrl+I**: Import JSON
- **Ctrl+0**: Reset view
- **Delete**: Delete selected element
- **Esc**: Deselect / Cancel tool
- **Ctrl+/**: Show help

### File Structure
```
js/
├── canvas-editor.js    # Main controller - initializes all modules
├── page-library.js     # Manages page list and drag-drop
├── canvas-view.js      # Handles view pan/zoom
├── element-manager.js  # Creates/updates/deletes elements
├── page-manager.js     # Multi-page canvas management
├── tools.js            # Arrow and annotation tools
├── storage.js          # Save/load/export/import
├── history-manager.js  # Undo/redo functionality
├── modal-manager.js    # Modal dialogs
├── alignment-manager.js # Element alignment guides
└── virtual-scrollbar.js # Custom scrollbar
```

## Creating a New Project

1. **Generate prototype HTML files** using AI with the prompt from README.md
2. **Copy files** to `pages/` directory and update `index.html`
3. **Configure `config.js`** with project name, categories, and pages
4. **Fix page navigation** - ensure links work between pages
5. **Open `canvas-editor.html`** to start using the canvas editor

## Design Specifications

### iPhone 15 Pro Mockup
- **Frame**: 320px × 680px with 45px corner radius
- **Screen**: 100% width/height, 35px corner radius
- **Notch**: 80px × 25px centered at top
- **Padding**: 12px around screen

### iOS Design Patterns Used
- **Status Bar**: 44px height, blur effect, time/battery indicators
- **Navigation**: Back buttons, titles, action icons
- **Tab Bar**: 5-icon bottom navigation (Home, Rental, Works, Messages, Profile)
- **Modals**: Bottom sheets with backdrop blur
- **Cards**: White backgrounds, 20px border radius, shadow effects

## Data Persistence

- **localStorage keys**: `canvasEditor_data`, `canvasEditor_usageCount`
- **Export**: Ctrl+E downloads JSON file
- **Import**: Ctrl+I loads JSON file
- Data is auto-saved to browser localStorage

## Reference Documentation

The `页面结构图` file contains the complete mind map of all 32 screens and their relationships. The `README.md` file contains detailed usage instructions for the canvas editor framework.