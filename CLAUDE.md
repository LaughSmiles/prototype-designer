# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **high-fidelity prototype design project** for a photography rental and sharing app called "摄影派" (Photography School). The project consists of 33 HTML files implementing a complete mobile app UI/UX prototype designed for iPhone 15 Pro dimensions (320x680px).

## Project Structure

```
生成原型图/
├── index.html                 # Main entry point - displays all 32 screens in a grid
├── pages/                     # 32 individual screen files
│   ├── 首页模块 (Home)        # 7 screens: home, search, rental-detail, etc.
│   ├── 租赁模块 (Rental)      # 1 screen: rental-list
│   ├── 作品模块 (Works)       # 7 screens: works, video/image details, publish flows
│   ├── 消息模块 (Messages)    # 5 screens: messages, system, interaction, chat, etc.
│   └── 我的模块 (Profile)     # 12 screens: profile, settings, orders, addresses, etc.
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