# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **high-fidelity prototype design project** for a photography rental and sharing app called "摄影派" (Photography School). The project consists of 33 HTML files implementing a complete mobile app UI/UX prototype designed for iPhone 15 Pro dimensions (320x680px).

## Project Structure

```
生成原型图/
├── index.html                 # Main entry point - displays all 32 screens + canvas editor link
├── canvas-editor.html         # Canvas editor main page
├── pages/                     # 32 individual screen files
│   ├── 首页模块 (Home)        # 7 screens: home, search, rental-detail, etc.
│   ├── 租赁模块 (Rental)      # 1 screen: rental-list
│   ├── 作品模块 (Works)       # 7 screens: works, video/image details, publish flows
│   ├── 消息模块 (Messages)    # 5 screens: messages, system, interaction, chat, etc.
│   └── 我的模块 (Profile)     # 12 screens: profile, settings, orders, addresses, etc.
├── js/                        # Canvas editor JavaScript modules
│   ├── canvas-editor.js       # Main controller
│   ├── page-library.js        # Page library management
│   ├── canvas-view.js         # View operations (pan/zoom)
│   ├── element-manager.js     # Element management
│   ├── tools.js               # Tool system (arrow/text)
│   └── storage.js             # Data persistence
├── css/
│   └── canvas-editor.css      # Canvas editor styles
├── data/                      # Data backup directory
├── 页面结构图                  # MindMap documentation of the complete architecture
└── .cursor-history.md         # Session history and development log
```

## Key Technologies

- **Styling**: TailwindCSS (CDN)
- **Icons**: FontAwesome 6.4.0 (CDN)
- **Images**: Unsplash API for high-quality photography content
- **Layout**: Mobile-first responsive design with iOS-style UI components

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
├── page-library.js     # Manages 32 page list and drag-drop
├── canvas-view.js      # Handles view pan/zoom
├── element-manager.js  # Creates/updates/deletes elements
├── tools.js            # Arrow and text tools
└── storage.js          # Save/load/export/import
```

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

## File Naming Convention

All screen files follow descriptive naming:
- `home.html` - Main home screen
- `rental-detail.html` - Equipment rental details
- `publish-video.html` - Video publishing interface
- `my-orders.html` - Order management
- etc.

## Important Notes

- **No Build Process**: All files are standalone HTML, no compilation needed
- **CDN Dependencies**: TailwindCSS and FontAwesome loaded via CDN
- **Real Images**: Uses Unsplash API for authentic photography content
- **Interactive Elements**: Includes hover effects, transitions, and simulated interactions
- **Modular Design**: Each screen is self-contained and can be viewed independently

## Reference Documentation

The `页面结构图` file contains the complete mind map of:
- All 32 screens and their relationships
- Detailed user requirements
- Interaction logic
- Information architecture
- Business workflows

This serves as the master reference for understanding the complete app structure and user journeys.