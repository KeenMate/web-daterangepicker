# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web component project extracted from the pure-admin design system. The goal is to create a standalone, reusable date picker web component from the existing source files.

**Current Status**: Fully implemented - TypeScript web component with Vite build tooling, ready for development and publishing.

## Architecture

### Source Files

**src/js/date-picker.js** (1711 lines)
- Main date picker implementation as a vanilla JavaScript class `PureDatePicker`
- Self-contained IIFE module that exports to `window.PureDatePicker`
- Auto-initializes on DOM load for elements with `[data-date-picker]` attribute
- Depends on Floating UI (`@floating-ui/dom`) for positioning

**src/scss/_date-picker.scss** (476 lines)
- Complete SCSS styling for the date picker component
- Uses BEM naming convention (`.pa-date-picker__*`)
- References SCSS variables from pure-admin (e.g., `$spacing-md`, `$accent-color`, `$border-radius`)
- These variables will need to be defined or replaced when creating standalone component

**src/date-picker.mustache**
- HTML demo/documentation file showing various usage patterns
- Not part of the component itself, but useful reference for features and examples

### Key Components

**PureDatePicker Class** (src/js/date-picker.js)
- **Initialization** (lines 32-107): Constructor sets up options, parses date format, initializes month views
- **Calendar Rendering** (lines 431-593): Renders calendar grid, handles rolling selector toggle
- **Navigation** (lines 669-711): Month/year navigation with collision detection for multi-month mode
- **Date Selection** (lines 713-768): Handles single date and range selection logic
- **Keyboard Navigation** (lines 216-378): Comprehensive keyboard shortcuts (arrows, Enter, Esc, Tab, PageUp/Down, Home/End, 't' for today)
- **Input Masking** (lines 1169-1420): Auto-formats dates as user types, supports multiple formats (YYYY-MM-DD, DD.MM.YYYY, MM/DD/YYYY, etc.)
- **Drag-to-Adjust** (lines 819-1043): Allows dragging range start/end dates to adjust selection in range mode
- **Rolling Selector** (lines 562-624): Innovative scrollable year/month picker (lines 573-592 render years ±50 from current)

### Component Features

- **Two modes**: Single date (`mode: 'single'`) or date range (`mode: 'range'`)
- **Multi-month display**: Show 1-3+ months side by side (`monthsToShow` option)
- **Input masking**: Configurable date formats with auto-separator insertion
- **Trigger modes**: Auto-open on focus (`calendarTrigger: 'auto'`) or button-only (`calendarTrigger: 'button'`)
- **Range features**: Day/night count summary, drag-to-adjust dates, Apply button
- **Collision prevention**: In multi-month mode, prevents month columns from showing duplicate months (lines 627-667)
- **Progressive input parsing**: Calendar updates as user types valid date segments (lines 1619-1652)

### Important Implementation Details

**Month Column Management** (Multi-Month Mode)
- Each month column has independent navigation via `monthDates` array (line 56)
- `activeMonthIndex` tracks which column has keyboard focus (line 80)
- Tab key switches between columns (lines 251-280)
- Collision detection ensures adjacent columns don't show same month (lines 627-667)

**Date Format Parsing** (lines 1423-1453)
- `parseFormat()` creates structure with separator and part positions
- Supports YYYY/YY for year, MM/M for month, DD/D for day
- `formatInfo` object stores parsed structure used throughout component

**Keyboard Navigation** (lines 216-430+)
- Arrow keys: Up/Down (week), Left/Right (day)
- Ctrl+Left/Right: Previous/next month
- Home: First day of current month
- End: Last day of current month
- Ctrl+Home: Jan 1 of current year (repeat for previous year)
- Ctrl+End: Dec 31 of current year (repeat for next year)
- PageUp/PageDown: Previous/next month
- 't' key: Jump to today
- Enter: Select focused day
- Escape: Close calendar
- Tab: Switch month columns in multi-month mode

**Floating UI Integration** (lines 418-429)
- Uses `computePosition()` with flip and shift middleware
- Default placement: `bottom-start`
- Repositions on show to handle viewport constraints

## Development Guidelines

### Converting to Web Component

When implementing this as a proper web component:
1. The SCSS variables need to be resolved - either define them or use CSS custom properties
2. Consider how to bundle Floating UI dependency
3. The global event listeners (lines 216, 381) need to be scoped to component instance
4. The mustache file provides good test cases for various configurations

### Adding New Features

- Date validation logic is minimal (noted as "UI/UX demo" in comments)
- Min/max date constraints not implemented
- Disabled dates feature not implemented
- These are intentional omissions mentioned in comments as planned for "Svelte version"

### State Management

Key state properties:
- `selectedDate` / `selectedStartDate` / `selectedEndDate`: Current selection
- `monthDates[]`: Array of Date objects representing each visible month column
- `activeMonthIndex`: Which month column has keyboard focus
- `focusedDayIndex`: Which day within active column is keyboard-focused
- `showingRollingSelector[]`: Boolean array tracking rolling selector visibility per column
- Drag state: `isDragging`, `draggingType`, `dragPreviewStart`, `dragPreviewEnd`

### Known Dependencies

- `@floating-ui/dom` - Required for calendar positioning (bundled in the component)
- All SCSS variables have been converted to CSS custom properties with `--drp-` prefix
- No external CSS frameworks required

## Build System

### Build Tools
- **Vite** - Fast build tool and dev server with HMR
- **TypeScript** - Type-safe development
- **Sass** - CSS preprocessing
- **Makefile** - Build automation for Unix/Mac/WSL
- **make.bat** - Build automation for Windows

### Available Commands

```bash
# Using Makefile (Unix/Mac/WSL/Git Bash)
make setup        # Install dependencies
make dev          # Start dev server (watches changes)
make build        # Build for production
make package      # Create npm package
make publish-dry  # Dry-run publish
make publish      # Publish to npm
make clean        # Clean all artifacts
make help         # Show all commands

# Using Windows batch file
make.bat setup    # Same commands as above
make.bat dev

# Using npm directly
npm install       # Install dependencies
npm run dev       # Start dev server
npm run build     # Build for production
npm run package   # Create package
```

### Development Workflow
1. `make setup` - Install dependencies
2. `make dev` - Start development server at http://localhost:5173
3. Make changes - HMR will auto-reload
4. `make build` - Build for production (creates dist/ folder)
5. Test locally before publishing

### Output Files
Build creates `dist/` with:
- `date-range-picker.js` - ES module format
- `date-range-picker.umd.js` - UMD format for CDN/legacy
- `index.d.ts` - TypeScript declarations
