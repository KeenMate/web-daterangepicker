# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **Range Mode Selection Border**: Fixed visual bug where the original clicked date retained its selection border when dragging a range from a different date
  - When clicking a date and then dragging from a different date, the picker now correctly clears the old selection
  - Prevents confusing visual state where multiple dates appear selected
  - Fixed in `date-picker-interaction.ts` startDrag function
- **Month/Year Selector Navigation Interference**: Fixed selector staying open when navigation buttons are clicked
  - Month/year rolling selector now automatically closes when users click previous/next month buttons (< >)
  - Prevents scroll jumping and layout issues caused by open selector during month navigation
  - Fixed in `date-picker-navigation.ts` prevMonth and nextMonth functions

### Documentation

- **Placeholder Clarification**: Documented that `placeholder` attribute must be set explicitly even when using `display-format-mask`
  - The `display-format-mask` only provides localized format tokens for display
  - The `placeholder` attribute controls the actual input placeholder text
  - Both should be set for optimal user experience

## [2.0.0] - 2025-11-06

### BREAKING CHANGES - Comprehensive Naming Refactor

This release focuses entirely on improving naming clarity and self-documentation across the entire API. All changes are **breaking** and require migration.

### Added

#### Internationalization (i18n)

Complete i18n support with automatic locale detection, built-in translations, and full customization:

- **Auto Locale Detection**: Set `locale="auto"` to automatically detect user's browser language
- **Built-in Locales**: English (`en`), German (`de`), French (`fr`), Spanish (`es`)
- **Intl API Integration**: Automatically localized weekday and month names via `Intl.DateTimeFormat`
- **Dual Mask System**:
  - `date-format-mask`: Used for validation (always English tokens: YYYY, MM, DD)
  - `display-format-mask`: Shown to users (localized tokens: aaaa for Spanish año, jjjj for German jahr)
  - Example: `date-format-mask="YYYY-MM-DD"` with `display-format-mask="dd/mm/aaaa"` for Spanish
- **Custom String Overrides**: Override any UI string via `customStrings` option
  - Button labels: `today`, `clear`, `apply`
  - Summary text: `preview`, `day`/`days`, `night`/`nights`
- **New Attributes**:
  - `locale`: Set language (`'auto'`, `'en'`, `'de'`, `'fr'`, `'es'`)
  - `display-format-mask`: Localized format hint for users
- **New Options**:
  - `locale`: Language code or `'auto'`
  - `displayFormatMask`: Localized format mask
  - `customStrings`: Partial<LocaleStrings> for overriding UI text
- **New TypeScript Interface**: `LocaleStrings` for type-safe custom translations

**Example Usage:**

```html
<!-- Spanish with auto-detection -->
<date-range-picker locale="auto"></date-range-picker>

<!-- Explicit Spanish with localized display mask -->
<date-range-picker
  locale="es"
  date-format-mask="YYYY-MM-DD"
  display-format-mask="dd/mm/aaaa"
  placeholder="Selecciona una fecha">
</date-range-picker>
```

```javascript
// German with custom string overrides
const picker = new PureDatePicker(input, {
  locale: 'de',
  dateFormatMask: 'DD.MM.YYYY',
  displayFormatMask: 'tt.mm.jjjj',
  customStrings: {
    today: 'Jetzt',
    clear: 'Zurücksetzen'
  }
});
```

### Fixed

- **Grid Layout Overflow**: Fixed floating calendar popups with grid layouts not being visible on smaller screens
  - Added `max-width: calc(100vw - 2rem)` to prevent calendar from extending beyond viewport
  - Added `box-sizing: border-box` to include padding in width calculation
  - Grid layouts (especially 2×3 with 6 months) now properly constrain to viewport width

#### Renamed Web Component Attributes (HTML)

| Old Name | New Name | Reason |
|----------|----------|--------|
| `mode` | `selection-mode` | Clarifies this controls selection behavior |
| `format` | `date-format-mask` | Specifies this is for date formatting |
| `months-to-show` | `visible-months-count` | More explicit about what the number represents |
| `trigger` | `calendar-open-trigger` | Clarifies what is being triggered |
| `disabled-days` | `disabled-weekdays` | Distinguishes from days of month (0-6 are weekdays) |
| `display` | `positioning-mode` | More explicit about what is being displayed |
| `layout` | `month-layout` | Clarifies this controls month arrangement |
| `range-disabled-mode` | `range-disabled-handling` | Better describes the behavior |
| `position` | `calendar-placement` | More specific about what is being positioned |

#### Renamed DatePicker Options (JavaScript/TypeScript)

| Old Name | New Name |
|----------|----------|
| `mode` | `selectionMode` |
| `position` | `calendarPlacement` |
| `monthsToShow` | `visibleMonthsCount` |
| `format` | `dateFormatMask` |
| `calendarTrigger` | `calendarOpenTrigger` |
| `display` | `positioningMode` |
| `layout` | `monthLayout` |
| `disabledDays` | `disabledWeekdays` |
| `getDateInfo` | `getDateMetadata` |
| `rangeDisabledMode` | `rangeDisabledHandling` |

#### Renamed Public Methods

| Old Name | New Name | Reason |
|----------|----------|--------|
| `getValue()` | `getInputValue()` | Clarifies it returns the input's value |
| `setValue()` | `setInputValue()` | Clarifies it sets the input's value |
| `clear()` | `clearSelection()` | Explicit about what is being cleared |

#### Renamed TypeScript Interfaces

| Old Name | New Name | Reason |
|----------|----------|--------|
| `SpecialDate` | `DecoratedDate` | Better describes dates with custom styling/labels |

#### Renamed CSS Classes (ALL)

**All CSS classes** have been renamed from `pa-*` prefix to `drp-*` prefix (Date Range Picker):

- `pa-date-picker` → `drp-date-picker`
- `pa-input` → `drp-input`
- `pa-date-picker__day` → `drp-date-picker__day`
- ... and 100+ other classes

### Migration Guide

#### For HTML/Web Component Users

```html
<!-- BEFORE (v1.0.0-rc01) -->
<date-range-picker
  mode="range"
  format="DD/MM/YYYY"
  months-to-show="2"
  trigger="auto"
  disabled-days="0,6"
  range-disabled-mode="block"
  display="floating"
  layout="grid"
  position="bottom">
</date-range-picker>

<!-- AFTER (v2.0.0) -->
<date-range-picker
  selection-mode="range"
  date-format-mask="DD/MM/YYYY"
  visible-months-count="2"
  calendar-open-trigger="auto"
  disabled-weekdays="0,6"
  range-disabled-handling="block"
  positioning-mode="floating"
  month-layout="grid"
  calendar-placement="bottom">
</date-range-picker>
```

#### For JavaScript/TypeScript Users

```javascript
// BEFORE (v1.0.0-rc01)
const picker = new PureDatePicker(input, {
  mode: 'range',
  format: 'DD/MM/YYYY',
  monthsToShow: 2,
  calendarTrigger: 'auto',
  display: 'floating',
  layout: 'horizontal',
  position: 'bottom-start',
  disabledDays: [0, 6],
  specialDates: [...],
  getDateInfo: (date) => {...},
  rangeDisabledMode: 'allow'
});

picker.setValue('2025-01-01');
const value = picker.getValue();
picker.clear();

// AFTER (v2.0.0)
const picker = new PureDatePicker(input, {
  selectionMode: 'range',
  dateFormatMask: 'DD/MM/YYYY',
  visibleMonthsCount: 2,
  calendarOpenTrigger: 'auto',
  positioningMode: 'floating',
  monthLayout: 'horizontal',
  calendarPlacement: 'bottom-start',
  disabledWeekdays: [0, 6],
  specialDates: [...],  // Uses DecoratedDate interface
  getDateMetadata: (date) => {...},
  rangeDisabledHandling: 'allow'
});

picker.setInputValue('2025-01-01');
const value = picker.getInputValue();
picker.clearSelection();
```

#### For CSS Customization

```css
/* BEFORE (v1.0.0-rc01) */
.pa-date-picker { ... }
.pa-date-picker__day { ... }
.pa-input { ... }

/* AFTER (v2.0.0) */
.drp-date-picker { ... }
.drp-date-picker__day { ... }
.drp-input { ... }
```

#### For Size Wrapper Classes

Size wrapper classes remain unchanged:
- `.drp-font-xs/sm/md/lg/xl` (no change - already used drp prefix)
- `.drp-spacing-xs/sm/md/lg/xl` (no change - already used drp prefix)

---

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
