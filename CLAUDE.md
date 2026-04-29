# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web component project extracted from the pure-admin design system. The goal is to create a standalone, reusable date picker web component from the existing source files.

**Current Status**: Fully implemented - TypeScript web component with Vite build tooling, ready for development and publishing.

## Architecture

### Source Layout

The codebase is TypeScript, organized as a core class plus extracted operation modules. CSS is plain CSS custom properties with the `--drp-*` prefix; no SCSS, no preprocessor.

**Core**
- `src/date-picker.ts` — `DateRangePicker` class (~1800 lines). Constructor, options resolution, calendar/DOM creation, locale init, action-button rendering, action-button tooltip lifecycle, day metadata lookup. Holds the state.
- `src/web-component.ts` — `WebDaterangepickerElement` custom element (~870 lines). Wraps the core class in a Shadow DOM. ~35 getter/setter pairs for attributes and complex-data properties; `attributeChangedCallback` routes most attribute changes through `destroy() + initializePicker()`.
- `src/index.ts` — public-API entry; exports the web component, the core class, and types.
- `src/types.ts` — shared types and the `DatePickerOptions` interface.
- `src/logger.ts` — `loglevel`-based namespaced loggers (`drpLogger`, `uiLogger`, `dragLogger`, `selectionLogger`, etc.).

**Operation modules** (functions taking `picker` as first arg, modifying its state):
- `src/date-picker-rendering.ts` — `renderCalendar`, `renderRollingSelector`, day-cell decoration, summary rendering, custom-render callbacks.
- `src/date-picker-navigation.ts` — month navigation (`prevMonth`, `nextMonth`), unified navigation, collision detection between adjacent columns in multi-month mode, rolling-selector navigation.
- `src/date-picker-interaction.ts` — drag-to-adjust handlers (`onDragStart`, `onDragMove`, `onDragEnd`), input-mask parsing (`applyMask`, `applyRangeMask`), keyboard navigation.
- `src/date-picker-selection.ts` — `selectDay`, `selectToday`, `clearSelection`, `apply`, range validation (`validateRangeAsync`).
- `src/date-picker-ui.ts` — `show`/`hide`/`position`/`showMessage`/`hideMessage`. Floating UI integration for the calendar popover.
- `src/date-picker-validation.ts` — pure date helpers (`normalizeDate`, `isDateDisabled`, `formatDateKey`, `detectWeekStartDay`).
- `src/date-picker-locales.ts` — locale strings, weekday/month names, locale resolution.
- `src/modules/click-events/` and `src/modules/scroll-events/` — small managers that own their own event subscriptions and clean up on destroy.

**CSS** (`src/css/`)
- `main.css` — partial imports.
- `_variables.css` — all `--drp-*` custom properties (376 lines, the theming surface).
- `_base.css`, `_calendar-grid.css`, `_header-navigation.css`, `_summary-actions.css`, `_badges.css`, `_loading.css`, `_message.css`, `_tooltips.css`, `_modifiers.css` — feature partials.

### Component Features

- **Selection modes**: single, range, multiple
- **Multi-month display**: 1-N months side-by-side (`visibleMonthsCount` option)
- **Layouts**: horizontal row or grid (`monthLayout: 'horizontal' | 'grid'` with `gridRows`/`gridColumns`)
- **Unified navigation** for grid layouts: anchor-month index drives the whole grid
- **Input masking**: progressive auto-formatting as the user types, configurable date format
- **Trigger modes**: auto-open on focus, on typing, or manual (`calendarOpenTrigger`)
- **Range features**: day/night count summary, drag-to-adjust dates, Apply button
- **Collision prevention**: multi-month columns can't show duplicate months
- **Progressive input parsing**: calendar tracks the input as the user types valid date segments
- **Rolling selector**: scrollable year/month list inside the header
- **Disabled-dates handling**: `allow` / `prevent` / `block` / `split` / `individual` strategies for ranges that span disabled dates
- **Custom rendering** via callbacks: `renderDayCallback`, `renderDayContentCallback`, `getMonthHeaderCallback`, `getUnifiedHeaderCallback`, `formatSummaryCallback` — see security note in `src/types.ts`
- **Tooltips** on day cells, badges, and action buttons (via Floating UI)
- **Locale support**: bundled English plus user-overridable strings; auto-detects from browser

### Important Implementation Details

**Month columns (multi-month mode)**
- `monthDates: Date[]` — one entry per visible month column; navigation can move them independently
- `activeMonthIndex` — which column has keyboard focus
- `focusedDayIndex` — which day within the active column is focused
- `showingRollingSelector: boolean[]` — rolling-selector open state per column
- Tab cycles between columns; collision detection prevents two adjacent columns from showing the same month

**Date format parsing** (`parseFormat` in core class)
- Supports `YYYY`/`YY`, `MM`/`M`, `DD`/`D` with arbitrary separators
- Result is cached on `formatInfo` and used by both rendering and the input mask

**Keyboard navigation**
- Arrows: Up/Down (week), Left/Right (day)
- Ctrl+Left/Right or PageUp/PageDown: previous/next month
- Home / End: first/last day of current month
- Ctrl+Home / Ctrl+End: jump to start/end of year (repeat to step year-by-year)
- `t`: jump to today
- Enter: select focused day; Escape: close; Tab: switch column

**Floating UI integration** (`src/date-picker-ui.ts`)
- Calendar popover and action-button tooltips both use `computePosition` + `autoUpdate`
- Default placement: `bottom-start`; flips and shifts on viewport overflow

## Development Guidelines

### Adding New Features

- Min/max dates, disabled dates, disabled weekdays, and rolling year/month ranges are implemented; the constraint pipeline lives in `Validation.isDateDisabled` plus `getEffectiveYearRange` / `getEffectiveMonthRange` on the core class
- For new options that should be reactive at runtime, both `observedAttributes` (in `web-component.ts`) and the parsing block in `initializePicker` need updating — these two lists must agree, and currently a hand-coded mapping exists between them
- Most attribute changes today trigger a full picker rebuild via `destroy() + initializePicker()` — selection state is lost. A surgical `updateOptions(partial)` API is the architectural fix; until it lands, treat any new option that changes at runtime carefully

### Adding New CSS Variables

- Declare in `src/css/_variables.css` with the `--drp-` prefix
- Reference from a partial via `var(--drp-x, fallback)` — every theming hook should default to a sensible value so the component works unstyled
- Don't declare a hook you don't wire — declared-but-unread variables are dead theming surface

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

### Size System

The component uses a consistent 5-level size scale (xs, sm, md, lg, xl) across all sizing attributes:

**Web Component Attributes:**
- `input-size` - Input field size (floating mode only)
- `spacing` - Calendar spacing scale
- `font-size` - Calendar font size scale
- `cell-size` - Calendar day cell size

**CSS Variables (per size):**
- Input: `--drp-input-size-{size}-font`, `--drp-input-size-{size}-padding-v`, `--drp-input-size-{size}-padding-h`, `--drp-input-size-{size}-height`, `--drp-input-size-{size}-icon-size`
- Calendar: Uses `.drp-spacing-{size}`, `.drp-font-{size}`, `.drp-cell-{size}` classes

**Example:**
```html
<web-daterangepicker input-size="lg" spacing="lg" font-size="lg" cell-size="lg">
</web-daterangepicker>
```

## Build System

### Build Tools
- **Vite** - Fast build tool and dev server with HMR
- **TypeScript** - Type-safe development
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
- `web-daterangepicker.js` - ES module format
- `web-daterangepicker.umd.js` - UMD format for CDN/legacy
- `index.d.ts` - TypeScript declarations
