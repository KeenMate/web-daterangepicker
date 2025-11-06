# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0-rc01] - 2025-11-06

### Added

#### Core Features
- **Grid Layout Support**: Added 2×3 grid calendar layout for displaying multiple months
  - New `layout` option: `'horizontal'` (default) or `'grid'`
  - New `gridRows` and `gridColumns` options for controlling grid dimensions
  - Responsive grid that adapts to screen size (3 columns → 2 columns → 1 column)
  - Support for both inline and floating display modes
- **Position Control**: Added `position` attribute for controlling popup placement
  - Supports all Floating UI positions: `bottom`, `bottom-start`, `bottom-end`, `top`, `top-start`, `top-end`, `left`, `right`
  - Smart default positioning: center for grid layouts, left-aligned for horizontal layouts
- **Pre-filled Value Support**: Calendar now correctly displays dates from pre-filled input values on initialization

#### Independent Font & Spacing System
- **BREAKING CHANGE**: Replaced `.drp-size-*` classes with independent control
  - New `.drp-font-xs/sm/md/lg/xl` classes - Control text sizing only (0.7×, 0.85×, 1×, 1.2×, 1.4× scales)
  - New `.drp-spacing-xs/sm/md/lg/xl` classes - Control gaps/density only (0.7×, 0.85×, 1×, 1.2×, 1.4× scales)
  - Mix any font size with any spacing density (e.g., large readable text in compact layout)
- **Enhanced Responsive Behavior**: Font and spacing now scale independently at breakpoints
  - Desktop (>1200px): Applied size
  - Tablet (768px-1200px): Scales down one level
  - Mobile (<768px): Scales down two levels

#### Navigation Improvements
- **Smart Navigation Buttons**: Previous/next month buttons now disable when adjacent months have no enabled days
  - Added `hasEnabledDaysInMonth()` function to check date availability
  - Visual disabled state with reduced opacity and pointer-events disabled

#### Range Selection Enhancements
- **Drag-to-Draw Ranges**: Users can now draw ranges by dragging without clicking first
  - Start dragging from any enabled day to create a new range
  - No need to click first, then drag - just drag from the start date
  - Works seamlessly with existing drag-to-adjust functionality

#### Architecture
- **Pure Functional Refactoring**: Converted from mixin-based to pure functional architecture
  - Functions with explicit parameters instead of `this` context
  - Modular organization: separate files for validation, rendering, navigation, selection, interaction, UI
  - Improved maintainability and testability
  - Eliminated `this` binding issues

### Fixed
- **Spacing Consistency**: Fixed day cell spacing to scale proportionally with size modifiers
  - Vertical spacing between date rows now uses CSS variables (changed `gap: 0` → `gap: var(--drp-spacing-xs)`)
  - Badge row spacing now scales with size (changed hard-coded `2px` → `var(--drp-spacing-xs)`)
  - Badge dimensions now scale with font size (changed hard-coded `1rem` → `var(--drp-font-size-base)`)
  - Badge font size now scales properly (changed hard-coded `0.7rem` → `var(--drp-font-size-2xs)`)
- **Grid Layout Border/Overflow**: Fixed grid calendars to properly contain content
  - Inline calendars now use `width: fit-content` instead of `100%`
  - Grid columns use `minmax(0, 1fr)` to allow proper shrinking
  - Individual months in grid have `min-width: 0` to let grid control sizing

### Changed
- **Web Component Attributes**: Added new observed attributes for grid and positioning
  - `layout`: Controls calendar layout mode (`'horizontal'` or `'grid'`)
  - `grid-rows`: Number of rows for grid layout
  - `grid-columns`: Number of columns for grid layout
  - `position`: Controls popup positioning
- **Default Positioning Logic**: Smart defaults based on layout type
  - Grid layouts: centered below input (`'bottom'`)
  - Horizontal layouts: left-aligned below input (`'bottom-start'`)

### Migration Guide (Breaking Changes)

#### Size Modifier Classes
Old combined size classes have been replaced with independent font and spacing classes:

```html
<!-- Before (v0.x) -->
<div class="drp-size-lg">
  <date-range-picker></date-range-picker>
</div>

<!-- After (v1.0.0-rc01) -->
<div class="drp-font-lg drp-spacing-lg">
  <date-range-picker></date-range-picker>
</div>

<!-- Or mix sizes independently -->
<div class="drp-font-lg drp-spacing-xs">
  <date-range-picker></date-range-picker>
</div>
```

**Migration mapping:**
- `.drp-size-xs` → `.drp-font-xs .drp-spacing-xs`
- `.drp-size-sm` → `.drp-font-sm .drp-spacing-sm`
- `.drp-size-md` → `.drp-font-md .drp-spacing-md` (or omit for defaults)
- `.drp-size-lg` → `.drp-font-lg .drp-spacing-lg`
- `.drp-size-xl` → `.drp-font-xl .drp-spacing-xl`

### Documentation
- Added comprehensive examples for all new features in index.html
  - Grid layout examples (floating popup and inline)
  - Position control examples (6 different positions)
  - Independent font/spacing combinations
  - Responsive sizing examples

---

## [Earlier Versions]

Previous version history not documented. This is the first official changelog entry.
