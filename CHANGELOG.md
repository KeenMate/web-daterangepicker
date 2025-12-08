# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.7.0-rc01] - 2025-12-08

### Changed

- **Simplified Sizing System - Removed Scale Variables**: Removed the intermediate scale variable system (`--drp-font-scale`, `--drp-spacing-scale`, `--drp-cell-scale`) and associated modifier classes
  - **What was removed**:
    - SCSS variables: `$drp-density-xs` through `$drp-density-xl`
    - CSS modifier classes: `.drp-font-xs/sm/md/lg/xl`, `.drp-spacing-xs/sm/md/lg/xl`, `.drp-cell-xs/sm/md/lg/xl`
    - Responsive scaling classes: `.drp-responsive`
    - Legacy size classes: `.drp-date-picker--xs/sm/lg/xl`
    - Web component attributes: `spacing`, `font-size`, `cell-size`
    - Web component properties: `spacing`, `fontSize`, `cellSize`
  - **Why**: The `--drp-rem` base unit provides cleaner, more flexible scaling without intermediate multipliers
  - **New approach**: Set CSS variables directly on the `<web-daterangepicker>` element
    - Global scaling: `--drp-rem: 8px` (scales everything to 80%)
    - Fine-grained control: `--drp-spacing-xs: 2px`, `--drp-font-size-base: 18px`
  - **Shadow DOM note**: CSS variables must be set on the element itself (via class or inline style), not on wrapper divs
  - **Migration**:
    ```html
    <!-- Before (removed) -->
    <web-daterangepicker spacing="lg" font-size="lg" cell-size="lg">

    <!-- After (CSS variables on element) -->
    <web-daterangepicker style="--drp-rem: 15px;">

    <!-- Or via CSS class -->
    <style>
      web-daterangepicker.large { --drp-rem: 15px; }
    </style>
    <web-daterangepicker class="large">
    ```
  - **Files modified**: `_base.scss`, `_modifiers.scss`, `_calendar-grid.scss`, `_header-navigation.scss`, `_badges.scss`, `_variables.scss`, `web-component.ts`
  - See `examples-sizes.html` for comprehensive CSS variable sizing examples

- **Font Size Variables - Unitless Multipliers**: Changed `--base-font-size-*` variables from expecting rem/em units to unitless multipliers
  - Theme-designer now outputs: `--base-font-size-sm: 1.4` (unitless)
  - Component computes: `calc(1.4 * var(--drp-rem))` = 14px
  - Fixes issue where CSS `em`/`rem` units were computed at assignment time on `:root`, not relative to component's `--drp-rem`
  - Font-size-base variables now use format: `calc(var(--base-font-size-sm, 1.4) * var(--drp-rem))`

### Added

- **`--drp-badge-row-height` CSS Variable**: New custom property for configuring badge row height at runtime
  - Default: `16px` (SCSS variable `$drp-badge-max-height`)
  - Override in your styles: `--drp-badge-row-height: 20px`
  - Replaces hard-coded SCSS calculation with configurable CSS variable

- **Base Variables Example** (`examples-base-variables.html`): New interactive demo for testing theme-designer typography integration
  - Google Fonts loader with auto font-family detection
  - Real-time controls for font sizes (2xs-2xl), weights, and line heights
  - Live CSS output panel showing current variable values
  - Floating and inline date picker demos with special dates

### Fixed

- **Today Key ('t') Multi-Month Collision**: Pressing 't' to jump to today now correctly adjusts adjacent months in multi-month view
  - Previously, if right column showed Jan 2026 and you pressed 't', it would show Dec 2025 but left column stayed at Jan 2026 (out of order)
  - Now calls `checkAndResolveCollisions()` to ensure all visible months remain in chronological order

- **Badge Row Spacing**: Removed extra `margin-bottom` from `.drp-date-picker__badge-row`
  - Parent `.drp-date-picker__days` gap already provides spacing between rows
  - Reduces vertical whitespace around badge rows

- **Button Font Inheritance**: Added `font-family: inherit` to action buttons (Today, Clear, Apply)
  - Buttons now inherit the custom font from `--base-font-family`
  - Previously buttons used browser default font for `<button>` elements

## [1.6.0] - 2025-12-05

### Added

- **Custom Month Headers** - New `getMonthHeaderCallback` option to customize individual month header text
  - Callback receives `{ month, monthIndex, monthName, year }` and returns custom header string
  - Example: Display room availability like "Jan 2026 (10 rooms)"

- **Month Headers from beforeMonthChangedCallback** - The `beforeMonthChangedCallback` can now return a `monthHeaders` map
  - Key: `"YYYY-MM"` format (e.g., "2026-01")
  - Value: Custom header text to display
  - Useful when header content depends on async-loaded data
  - Priority order: `monthHeaders` > `getMonthHeaderCallback` > default format

- **Themeable Loading Overlay** - New CSS variables for async loading overlay styling
  - `--drp-loading-overlay-background` - Overlay background color (default: semi-transparent white)
  - `--drp-loading-spinner-color` - Spinner border color
  - `--drp-loading-spinner-accent` - Spinner accent/animated color
  - Enables proper dark theme support for loading states

### Changed

- **BREAKING: Unified Theming Variable Renames** - Renamed several CSS variables for consistency with unified theming system across KeenMate components
  - `--drp-accent-text-color` → `--drp-text-on-accent`
  - `--drp-input-disabled-background` → `--drp-input-background-disabled`
  - `--drp-card-bg` → `--drp-dropdown-background`
  - `--drp-tooltip-bg` → `--drp-tooltip-background`
  - `--drp-tooltip-color` → `--drp-tooltip-text-color`
  - This ensures consistent naming patterns across all KeenMate components (web-multiselect, web-daterangepicker, etc.)
  - Tier 1 variables (core colors, inputs, dropdowns, tooltips) now have identical suffixes across components
  - Enables better integration with the [Theme Designer](https://theme-designer.keenmate.dev) tool
  - **Migration**: Find and replace the old variable names with the new ones in your stylesheets

## [1.5.0] - 2025-11-28

### Changed

- **10px-Based Sizing System**: Converted all rem units to a 10px-based system using `--drp-rem: 10px`
  - All spacing, padding, border-radius, font-size, and height values now use `calc(multiplier * var(--drp-rem))`
  - Visual output remains **identical** - same pixel values, cleaner internal math
  - Enables easy scaling by overriding single `--drp-rem` variable
  - Formula: `multiplier = old_rem_value × 16 ÷ 10`

- **New Input Height Values**: Updated input sizes to match Pure Admin design system
  | Size | Value | Pixels |
  |------|-------|--------|
  | XS | 3.1rem | 31px |
  | SM | 3.3rem | 33px |
  | MD | 3.5rem | 35px |
  | LG | 3.8rem | 38px |
  | XL | 4.1rem | 41px |

### Added

- **`--drp-rem` CSS Variable**: New base unit variable for scaling
  - Default: `10px` (produces same visual output as before)
  - Override to scale entire component: `--drp-rem: 1rem` (inherits from document)
  - Three customization methods documented in README

### Documentation

- Updated README with Input Size Scale section and customization examples
- Documented three ways to customize input heights:
  1. Direct px override: `--drp-input-size-md-height: 42px`
  2. Scale via `--drp-rem`: `--drp-rem: 12px`
  3. Override with calc: `--drp-input-size-md-height: calc(4.2 * var(--drp-rem))`

## [1.4.0] - 2025-11-27 ✅ Published

### Added

- **Input Size Attribute**: New `input-size` attribute for controlling input field dimensions
  - Supports 5-level scale: `xs`, `sm`, `md` (default), `lg`, `xl`
  - Consistent with calendar sizing attributes (`spacing`, `font-size`, `cell-size`)
  - Added CSS variables for xs and xl sizes:
    - `--drp-input-size-xs-*` (font, padding-v, padding-h, height, icon-size)
    - `--drp-input-size-xl-*` (font, padding-v, padding-h, height, icon-size)
  - CSS classes: `.drp-input--xs`, `.drp-input--xl` and icon positioning classes

### Changed

- **Complete 5-Level Size Scale**: All size attributes now support consistent xs/sm/md/lg/xl scale
  - `input-size` - Input field size (floating mode only)
  - `spacing` - Calendar spacing scale
  - `font-size` - Calendar font size scale
  - `cell-size` - Calendar day cell size

### Documentation

- Updated API.md with size attributes in attributes table
- Updated AI documentation (ai/basic-usage.txt, ai/INDEX.txt) with correct size attribute usage
- Added Input Size Variants section to CSS Custom Properties documentation

## [1.3.0] - 2025-11-25

### Added

- **Comprehensive Input Styling**: Added complete styling system for input elements with CSS custom properties
  - New `.drp-input` class with full styling (borders, colors, focus states, disabled states)
  - Three size variants: small, medium (default), and large
  - Size variant classes: `.drp-input--sm`, `.drp-input--lg`
  - Proper calendar icon positioning for all sizes via `.drp-date-picker-input--sm/lg`
  - Input-specific CSS custom properties:
    - `--drp-input-background`, `--drp-input-color`
    - `--drp-input-border-color`, `--drp-input-border-color-hover`, `--drp-input-border-color-focus`
    - `--drp-input-placeholder-color`, `--drp-input-disabled-background`
    - `--drp-input-focus-shadow-color`, `--drp-input-focus-shadow-size`
    - `--drp-input-icon-opacity`
    - Size variant variables for sm/md/lg (font, padding, height, icon size)

### Changed

- **CSS Architecture: Decoupled Component Variables** - Eliminated tight coupling between component styles
  - **Problem**: All components directly referenced base variables (e.g., `var(--drp-text-primary)`, `var(--drp-accent-color)`), creating dependencies where changing one component affected unrelated components
  - **Solution**: Added semantic CSS custom property layer that maps component-specific properties to base variables
  - **Benefits**: Each component can now be styled independently without affecting others

  **New Semantic Variables Added** (in `_base.scss`):

  - **Header & Navigation**: `--drp-header-text-color`, `--drp-header-bg-hover`, `--drp-nav-text-color`, `--drp-nav-border-color`, `--drp-nav-bg-hover`, `--drp-rolling-*` variables
  - **Calendar Grid & Days**: `--drp-weekday-color`, `--drp-day-text-color`, `--drp-day-bg-hover`, `--drp-day-selected-bg`, `--drp-day-selected-color`, `--drp-day-focused-outline`, etc.
  - **Summary & Actions**: `--drp-summary-text-color`, `--drp-summary-count-color`, `--drp-button-border-color`, `--drp-button-today-color`, `--drp-button-apply-bg`, etc.
  - **Badges**: `--drp-badge-number-bg`, `--drp-badge-number-color`, `--drp-badge-count-bg`, `--drp-badge-text-bg`
  - **Unified Navigation**: `--drp-unified-range-text-color`, `--drp-unified-month-color`

  **Files Modified**:
  - `src/scss/_base.scss`: Added 60+ semantic CSS custom properties
  - `src/scss/_header-navigation.scss`: Updated to use semantic variables instead of base variables
  - `src/scss/_calendar-grid.scss`: Updated day cells, weekdays to use semantic variables
  - `src/scss/_summary-actions.scss`: Updated summary and buttons to use semantic variables
  - `src/scss/_badges.scss`: Converted from SCSS variables to CSS custom properties

  **Example Usage**:
  ```css
  /* Now you can customize components independently */
  :root {
    /* Customize just the input without affecting calendar */
    --drp-input-background: #f0f0f0;
    --drp-input-border-color: #999;

    /* Customize buttons without affecting day cells */
    --drp-button-today-color: green;
    --drp-button-apply-bg: purple;
  }
  ```

  **Pattern**: Semantic variables default to base variables (e.g., `--drp-input-color: var(--drp-text-primary)`), but can be overridden independently for fine-grained customization.

## [1.2.0] - 2025-01-24

### Fixed

- **Badge styling in Shadow DOM**: Fixed all examples where `badgeClass` or `dayClass` were used without corresponding `customStylesCallback`
  - **Root Cause**: Badge CSS classes (like `'holiday'`, `'event'`, `'price-high'`) were not defined anywhere. Since web component uses Shadow DOM, these styles must be explicitly injected using `customStylesCallback`.
  - **Files Fixed**:
    - `examples-badges-tooltips.html`: Fixed 8 examples (holidaysDemo, cottageDemo, methodMapping, methodTooltips, memberMappingExample, dynamicPricing, dynamicAvailability, combinedExample)
    - `examples-javascript-instantiation.html`: Updated API documentation from old `class`/`badge`/`tooltip` to new `badgeClass`/`badgeText`/`badgeTooltip`/`dayClass`/`dayTooltip`/`isDisabled`
  - **Pattern Applied**: All fixes inject CSS into Shadow DOM using proper selector format:
    ```javascript
    picker.customStylesCallback = () => {
      return `
        .drp-date-picker__badge-cell.your-class-name {
          background-color: ... !important;
          color: ... !important;
          border: ... !important;
        }
      `;
    };
    ```
  - **Badge Classes Styled**: 'holiday', 'event', 'booked', 'price-high', 'price-medium', 'price-low', 'low-availability', 'medium-availability'
  - **Day Classes Styled**: 'low-availability-day'
  - All badge styling now properly displays in Shadow DOM across all example files

### Added

- **Unified Navigation Enhancements**
  - **`unifiedHeaderInteractive` option**: Makes unified header range display clickable to open month/year rolling selector
    - Default: `false` (header is static text only)
    - When enabled, clicking the unified header (e.g., "January 2025 - June 2025") opens the rolling selector
    - Web component attribute: `unified-header-interactive`
    - Only applies when `unifiedNavigation` is enabled
    - **Example**:
      ```html
      <web-daterangepicker
        unified-navigation
        unified-header-interactive
        visible-months-count="6"
        month-layout="grid"
        grid-rows="2"
        grid-columns="3">
      </web-daterangepicker>
      ```

  - **`getUnifiedHeaderCallback` - Custom unified header text**
    - Callback to customize the unified header range display text
    - Receives: `{ firstMonth: Date, lastMonth: Date, anchorMonth: Date, monthNames: string[] }`
    - Returns: HTML string to display in unified header
    - Enables displaying only anchor month instead of full range
    - **Example** (display only anchor month):
      ```javascript
      const picker = new DateRangePicker(input, {
        unifiedNavigation: true,
        visibleMonthsCount: 9,
        unifiedNavigationAnchorIndex: 4,
        getUnifiedHeaderCallback: ({ anchorMonth, monthNames }) => {
          return `${monthNames[anchorMonth.getMonth()]} ${anchorMonth.getFullYear()}`;
          // Returns: "May 2025" for 3×3 grid with center anchor
        }
      });
      ```
    - **Example** (custom range format):
      ```javascript
      getUnifiedHeaderCallback: ({ firstMonth, lastMonth, monthNames }) => {
        return `${monthNames[firstMonth.getMonth()]} - ${monthNames[lastMonth.getMonth()]} ${lastMonth.getFullYear()}`;
        // Returns: "Jan - Sep 2025"
      }
      ```

  - **Multi-month cache improvement**: `beforeMonthChangedCallback` now calculates full visible range for unified navigation mode
    - Previously only calculated ~42 days for first month
    - Now calculates full range across all visible months (e.g., ~180 days for 2×3 grid)
    - Enables proper bulk metadata loading for multi-month displays
    - Significantly reduces API calls when using unified navigation with `beforeMonthChangedCallback`

- **`beforeMonthChangedCallback` - Performance optimization for bulk metadata loading**
  - New callback invoked BEFORE month navigation occurs (before rendering new month)
  - Enables loading bulk metadata for all visible dates in one API call instead of per-day callbacks
  - **Performance**: 1 API call per month vs 35-42 calls with `getDateMetadataCallback`
  - Can block navigation to unavailable months (returns `action: 'block'`)
  - Shows loading overlay automatically during async operations
  - Callback receives context: `{ year, month, monthIndex, firstVisibleDate, lastVisibleDate }`
  - Returns: `{ action: 'accept' | 'block', metadata?: Map<string, DateInfo>, message?: string }`
  - **Example** (hotel availability):
    ```javascript
    const picker = new DateRangePicker(input, {
      beforeMonthChangedCallback: async ({ firstVisibleDate, lastVisibleDate }) => {
        // Single API call for entire month
        const response = await fetch('/api/availability', {
          method: 'POST',
          body: JSON.stringify({
            start: firstVisibleDate.toISOString(),
            end: lastVisibleDate.toISOString()
          })
        });
        const data = await response.json();

        // Build metadata map
        const metadata = new Map();
        data.forEach(day => {
          metadata.set(day.date, {
            badgeText: `$${day.price}`,
            isDisabled: day.available === 0,
            dayTooltip: `${day.available} rooms available`
          });
        });

        return { action: 'accept', metadata };
      }
    });
    ```
  - **Web Component**: Available as property (not attribute)
    ```javascript
    const picker = document.querySelector('web-daterangepicker');
    picker.beforeMonthChangedCallback = async (context) => { ... };
    ```
  - **Priority**: Bulk metadata cache > `getDateMetadataCallback` > `specialDates`
  - See `examples-events.html` for complete examples

### Fixed

- **Unified Navigation: Year range drift in rolling selector**
  - Fixed bug where unified rolling selector's year range would drift after selecting years
  - When `rollingYearRange` not explicitly set, default range (today ± 1) now stays stable
  - Example: Default shows 2024-2026, selecting 2026 keeps range 2024-2026 (previously drifted to 2025-2027)
  - Centralized year/month range calculation via `getEffectiveYearRange()` and `getEffectiveMonthRange()`
  - Both rendering and validation now use same range logic (single source of truth)

- **Navigation buttons now respect rollingYearRange/rollingMonthRange boundaries**
  - Navigation buttons (< >) previously allowed navigating outside configured date ranges
  - Added two-layer boundary enforcement:
    1. Click handler checks if button is disabled before executing navigation
    2. Navigation functions validate target month has enabled days
  - Applies to both unified navigation and individual month navigation
  - Buttons are already visually disabled, now also functionally blocked

- **Unified rolling selector now closes on click outside**
  - Added document-level click handler for all positioning modes
  - **Inline mode**: Clicking outside calendar closes rolling selectors (calendar stays visible)
  - **Floating mode**: Clicking outside calendar closes entire calendar + selectors
  - Matches intuitive behavior of standard dropdown menus
  - Handler properly attached during initialization for inline mode

- **Non-interactive unified headers no longer show hover effects**
  - When `unifiedHeaderInteractive` is false, unified header appeared clickable with hover background
  - Added CSS modifier class `.drp-date-picker__unified-range--static`
  - Non-interactive headers now have default cursor and no hover/active effects
  - Clearly distinguishes clickable vs non-clickable headers

- **Unified Navigation: Individual month headers now non-interactive**
  - Fixed bug where individual month headers were still interactive (clickable) in unified navigation mode
  - Individual month headers now correctly display as static text-only with no prev/next buttons
  - Only the unified header should have navigation controls when `unifiedNavigation` is enabled
  - Eliminates user confusion about which navigation controls are active

- **Unified Navigation: Rolling selector constraints now properly applied**
  - Verified that `rollingYearRange` and `rollingMonthRange` constraints work correctly in unified rolling selector
  - Year and month selectors properly mark disabled years/months
  - Matches behavior of individual month rolling selectors

### Changed

- **BREAKING: Renamed `beforeDateSelect` to `beforeDateSelectCallback`**
  - **What Changed**: To maintain naming consistency across the codebase, the callback property has been renamed.
  - **Naming Convention**: Event handlers (passive) use no suffix (e.g., `onSelect`), while callbacks (active transforms/validation) use "Callback" suffix.
  - **Old API** (removed):
    ```javascript
    const picker = new DateRangePicker(input, {
      beforeDateSelect: async (selection) => {
        return { action: 'accept' };
      }
    });
    ```
  - **New API**:
    ```javascript
    const picker = new DateRangePicker(input, {
      beforeDateSelectCallback: async (selection) => {
        return { action: 'accept' };
      }
    });
    ```
  - **Why**: `beforeDateSelectCallback` actively participates in selection (validates, blocks, adjusts), making it a "callback" not just an "event handler"
  - **Migration**: Simply rename `beforeDateSelect` → `beforeDateSelectCallback` in your code

### Removed

- **BREAKING: Removed deprecated `validateRangeCallback`**
  - The old `validateRangeCallback` has been completely removed
  - Use `beforeDateSelectCallback` instead (works for both single and range modes)

## [1.1.0] - 2025-11-20

### Added

- **`formatSummaryCallback` now available as web component property**
  - Previously only available in JavaScript API, now exposed on `<web-daterangepicker>` element
  - Set directly on web component: `picker.formatSummaryCallback = (data) => { ... }`
  - Allows custom summary formatting in range mode (pricing, night counts, etc.)
  - See updated documentation in `ai/basic-usage.txt` and showcase examples
  - **Example**:
    ```javascript
    const picker = document.querySelector('web-daterangepicker');
    picker.formatSummaryCallback = (data) => {
      const total = data.nights * 150;
      return `${data.nights} nights × $150 = $${total}`;
    };
    ```

### Changed

- **Updated documentation to clarify callback availability**
  - `ai/basic-usage.txt`: Added comprehensive section on web component callback properties
  - `ai/INDEX.txt`: Added new "WEB COMPONENT CALLBACK PROPERTIES" section
  - Most callbacks are now properly exposed as web component properties
  - Only `customStrings` and `actionButtons` remain JavaScript API only

### Fixed

- **Updated `examples-basic.html` to use proper API**
  - Changed from accessing private `picker` property to using public `formatSummaryCallback` property
  - Removes reliance on internal implementation details

### Removed

- **BREAKING: Removed `isDateDisabled` callback option**
  - **What Changed**: The `isDateDisabled` callback has been completely removed from the API. Use `getDateMetadataCallback` instead.
  - **Old API** (removed):
    ```javascript
    const picker = new DateRangePicker(input, {
      isDateDisabled: (date) => {
        return date.getDay() === 0 || date.getDay() === 6; // Boolean return
      }
    });
    ```
  - **New API** (correct):
    ```javascript
    const picker = new DateRangePicker(input, {
      getDateMetadataCallback: (date) => {
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        return isWeekend ? { isDisabled: true } : null; // DateInfo object or null
      }
    });
    ```
  - **Why**: This removes API inconsistency. The `getDateMetadataCallback` is more powerful as it allows both disabling dates AND adding visual metadata (badges, tooltips, custom classes) in a single callback.
  - **Migration Guide**:
    1. Find all uses of `isDateDisabled` in your code
    2. Replace with `getDateMetadataCallback`
    3. Change return value from boolean to `{ isDisabled: true }` or `null`
    4. Optionally add visual metadata like badges or tooltips
  - **Files Modified**: `src/types.ts`, `src/web-component.ts`, `src/date-picker-validation.ts`, `src/date-picker.ts`

## [1.0.0] - PUBLISHED - 2025-11-20

### Changed

- **BREAKING: Logging System - Complete Rewrite**
  - **Global API Namespace**: Migrated from `window.keenmate.daterangepicker` to `window.components['web-daterangepicker']`
    - **Old**: `window.keenmate.daterangepicker.version()`
    - **New**: `window.components['web-daterangepicker'].version()`
  - **Logger Naming**: Renamed loggers to match hierarchical category system
    - `initLogger` → `drpLogger` (main logger for initialization and general logs)
    - All other loggers renamed to hierarchical categories: `DRP`, `DRP:RENDERING`, `DRP:INTERACTION`, `DRP:SELECTION`, `DRP:NAVIGATION`, `DRP:UI`, `DRP:VALIDATION`, `DRP:DRAG`
  - **Color-Coded Console Output**: Added styled console logs matching svelte-spa-router pattern
    - Blue for debug, green for info, orange for warn, red for error
    - Timestamps with milliseconds for precise debugging
    - Format: `[HH:MM:SS.mmm] [LEVEL] [CATEGORY] message`
  - **New Logging API**: Exposed via `window.components['web-daterangepicker'].logging`
    - `enableLogging()` - Enable all loggers at debug level
    - `disableLogging()` - Silence all loggers
    - `setLogLevel(level)` - Set all loggers to specific level ('trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent')
    - `setCategoryLevel(category, level)` - Set specific category level (e.g., 'DRP:RENDERING', 'debug')
    - `getCategories()` - Get array of all available categories
  - **Files Modified**:
    - `src/logger.ts` - Complete rewrite with loglevel-plugin-prefix, custom methodFactory, color scheme
    - `src/index.ts` - Changed global namespace, added logging property to API
    - `src/date-picker.ts` - Updated imports (`initLogger` → `drpLogger`, `setLoggingEnabled` → `enableLogging/disableLogging`)
  - **Usage Example**:
    ```javascript
    // Enable all logging
    window.components['web-daterangepicker'].logging.enableLogging()

    // Set specific category to debug
    window.components['web-daterangepicker'].logging.setCategoryLevel('DRP:RENDERING', 'debug')

    // Get all categories
    window.components['web-daterangepicker'].logging.getCategories()
    // Returns: ['DRP', 'DRP:RENDERING', 'DRP:INTERACTION', 'DRP:SELECTION', 'DRP:NAVIGATION', 'DRP:UI', 'DRP:VALIDATION', 'DRP:DRAG']

    // Disable all logging
    window.components['web-daterangepicker'].logging.disableLogging()
    ```

- **Callback property names** for clarity and consistency
  - `renderDay` → `renderDayCallback`
  - `renderDayContent` → `renderDayContentCallback`
  - `getDateMetadata` → `getDateMetadataCallback`

### Added

- **Size Control Attributes**: New `spacing` and `font-size` attributes for easy calendar sizing
  - **`spacing` attribute**: Controls gaps, padding, and calendar width
  - **`font-size` attribute**: Controls all text sizing
  - **Values**: `"xs"` (0.7×) | `"sm"` (0.85×) | `"md"` (1.0×, default) | `"lg"` (1.2×) | `"xl"` (1.4×)
  - **Usage**:
    ```html
    <!-- Small compact picker -->
    <web-daterangepicker spacing="sm" font-size="sm"></web-daterangepicker>

    <!-- Large picker for desktop -->
    <web-daterangepicker spacing="lg" font-size="lg"></web-daterangepicker>

    <!-- Independent control: large text, compact spacing -->
    <web-daterangepicker spacing="sm" font-size="lg"></web-daterangepicker>
    ```
  - **JavaScript API**:
    ```javascript
    const picker = document.querySelector('web-daterangepicker');
    picker.spacing = 'lg';      // Property setter
    picker.fontSize = 'xl';     // Property setter
    ```
  - **Implementation**: Applies existing `.drp-spacing-*` and `.drp-font-*` CSS classes to the component element
  - **Benefits**:
    - No wrapper divs needed (works with Shadow DOM)
    - Dynamic sizing via JavaScript properties
    - Independent font and spacing control
    - No re-initialization when size changes (just CSS updates)
  - **Files Modified**:
    - `src/web-component.ts`: Added size attribute handling, `applySizeStyles()` method, getters/setters
  - **Replaces**: Wrapper div approach with CSS classes (though CSS classes still work for advanced use)

## [1.0.0-rc08] - 2025-11-13

### Fixed

- **Critical: RC07 was published without today's fixes**: RC07 was built from outdated dist folder (Nov 12 build)
  - This version correctly includes all fixes from rc06 and rc07
  - Updated Makefile: `make publish` now runs `clean-dist` before building
  - Ensures published package always contains latest source code changes

## [1.0.0-rc07] - 2025-11-13

### Changed

- **BREAKING: Calendar Trigger Modes Renamed**: Replaced `calendar-open-trigger` values for better clarity
  - **Old values**: `"auto"` | `"button"`
  - **New values**: `"focus"` | `"typing"` | `"manual"`
  - **Migration Guide**:
    - `"auto"` → `"focus"` (default behavior - opens on input focus)
    - `"button"` → `"manual"` (opens only via button click or programmatic calls)
    - NEW: `"typing"` mode opens calendar when user starts typing
  - **Files Updated**:
    - `src/types.ts`: Updated DatePickerOptions interface
    - `src/date-picker.ts`: Implemented three distinct trigger modes with proper event listeners
    - `src/web-component.ts`: Updated attribute parsing, default is now `"focus"`
  - **New Examples**: Added "Calendar Trigger Modes" section in `examples-basic.html` demonstrating all three modes

### Added

- **Typing Trigger Mode**: New `calendar-open-trigger="typing"` mode that opens calendar when user starts typing in the input
  - Useful for search-as-you-type interfaces
  - Calendar opens automatically when input value length > 0
  - Example: Start typing "2025" and calendar opens showing that year

## [1.0.0-rc06] - 2025-11-13

### Fixed

- **Critical: Month Offset Bug**: Fixed +1 month offset when parsing `data-date` attributes
  - **Root Cause**: `data-date` stores months in 1-based format (1-12), but JavaScript `Date` constructor expects 0-based months (0-11)
  - **Impact**: When selecting November 3-4, the range was actually created for December 3-4. Drag interactions also selected wrong months.
  - **Files Fixed**:
    - `src/date-picker-selection.ts` (lines 99, 193): Added `month - 1` when creating Date from selected day and when tracking focused day
    - `src/date-picker-interaction.ts` (lines 100, 222, 373): Added `month - 1` in drag start, drag move, and drag end handlers
    - `src/date-picker-navigation.ts` (lines 179, 258, 312): Added `month - 1` in keyboard navigation functions
    - `src/date-picker-rendering.ts` (line 739): Added `month - 1` in updateDragPreview to fix drag visual preview
  - **Test File**: Added `test-month-bug.html` to verify fix with 3 test cases (single date, range, cross-month)
  - Now `data-date="2025-11-12"` correctly creates November 12, not December 12

- **Missing Function Import**: Fixed `normalizeDate is not defined` error
  - **Location**: `src/date-picker.ts` line 152
  - **Fix**: Changed `normalizeDate()` to `Validation.normalizeDate()` to use proper namespace
  - This error prevented ALL date pickers from initializing

- **Missing Script Import**: Fixed custom rendering examples not displaying
  - **Location**: `examples-custom-rendering.html`
  - **Fix**: Added `<script type="module" src="/src/index.ts"></script>` to load web component
  - All 6 custom rendering examples now work correctly

## [1.0.0-rc05] - 2025-11-13

### Added

- **Custom Day Cell Rendering**: Added comprehensive customization API with slots and render callbacks
  - **Named Slots per Day**: Declarative HTML customization using `<div slot="day-YYYY-MM-DD">`
    - Example: `<div slot="day-2025-01-15">Custom content</div>`
    - Perfect for marking specific special dates, events, or holidays
    - Highest priority - overrides callbacks and default rendering

  - **`renderDay` Callback**: Full replacement of day cell content
    - Signature: `(data: DayRenderData) => HTMLElement | string | null`
    - Replaces entire day cell content with custom rendering
    - Use for dynamic content like prices, availability, complex layouts
    - Second priority - used when no slot exists for that day

  - **`renderDayContent` Callback**: Augmentation of default day cell
    - Signature: `(data: DayRenderData) => HTMLElement | string | null`
    - Adds content to default day number display
    - Use for badges, icons, indicators that accompany the day number
    - Third priority - used when no slot and no `renderDay`

  - **DayRenderData Interface**: Complete context provided to callbacks
    - Date information: `date` (Date object), `dateString` (ISO format), `dayNumber` (1-31)
    - State flags: `isDisabled`, `isSelected`, `isStartDate`, `isEndDate`, `isInRange`, `isToday`, `isWeekend`
    - Context: `monthIndex`, `element` (default rendered element), `picker` (picker instance)

  - **Priority System**: Three-tier rendering with clear precedence
    1. Per-day slots (highest) - declarative HTML for specific dates
    2. `renderDay` callback - programmatic full replacement
    3. `renderDayContent` callback - programmatic augmentation
    4. Default rendering (lowest) - built-in day number display

  - **Web Component Integration**: Properties exposed on `<web-daterangepicker>` element
    - `picker.renderDay = (data) => { ... }` - Set callback via JavaScript
    - `picker.renderDayContent = (data) => { ... }` - Set callback via JavaScript
    - Callbacks trigger automatic re-render when changed

  - **Examples File**: Created `examples-custom-rendering.html` with 6 complete examples
    - Per-day slots with events and holidays
    - Hotel booking with dynamic pricing
    - Event calendar with indicators
    - Weekend highlighting based on state
    - Mixed slots + callbacks pattern
    - Real-world booking system with totals

  - **Files Modified**:
    - `src/types.ts`: Added `DayRenderData` interface and `renderDay`/`renderDayContent` options
    - `src/date-picker.ts`: Added callback options to constructor (lines 117-118)
    - `src/date-picker-rendering.ts`:
      - Refactored `renderDays()` to wrap content in `<slot>` tags (line 377)
      - Added `processRenderCallbacks()` function to handle callback execution (lines 391-490)
      - Checks slot content, calls callbacks, injects results into DOM
    - `src/web-component.ts`:
      - Added `_renderDay` and `_renderDayContent` private properties
      - Added public getters/setters with auto re-render (lines 429-456)
      - Pass callbacks to picker options (lines 172-173)

### Technical Details

- **Slot Implementation**: Uses HTML `<slot>` elements with named slots for each day
  - Slot names follow format: `day-YYYY-MM-DD` (e.g., `day-2025-01-15`)
  - Default content is day number, replaced by user's slotted content
  - Uses `assignedNodes()` to detect if user provided content

- **Callback Processing**: Runs after DOM update in `renderDays()`
  - Queries all `.drp-date-picker__day` elements
  - Builds `DayRenderData` object with complete state
  - Checks for slot content first (skip callback if slot exists)
  - Executes callback and injects result (HTML string or HTMLElement)
  - Error handling with try-catch and console logging

- **State Classes**: Component ALWAYS adds state CSS classes to container
  - `drp-date-picker__day--disabled`, `--selected`, `--range-start`, etc.
  - Users can leverage these for styling or ignore for complete custom styling
  - Hybrid approach: component manages container, callbacks manage content

## [1.0.0-rc04] - 2025-11-13

### Added

- **Rolling Selector Range Constraints**: Added `rollingYearRange` and `rollingMonthRange` options to limit date selection
  - `rollingYearRange`: Control which years appear in rolling selector and are selectable
    - Examples: `"2025"` (single year), `"2024-2026"` (range)
    - Acts as PRIMARY constraint - dates outside this range are disabled
  - `rollingMonthRange`: Control which months appear in rolling selector and are selectable
    - Format: `"MM-MM"` (e.g., `"06-08"` for summer months, `"11-12"` for year-end)
    - Acts as PRIMARY constraint - dates outside this range are disabled
  - Both options filter the rolling selector lists AND disable dates in the calendar grid
  - Added to `types.ts`, `date-picker.ts`, `web-component.ts` as `rolling-year-range` and `rolling-month-range` attributes
  - Default year range changed from ±50 years to ±1 year (3 years total) when no constraints specified

- **Initial Date Option**: Added `initialDate` option to control which month/year displays when calendar opens
  - Format: Date object or date string (e.g., `"2024-10-01"`)
  - Web component attribute: `initial-date`
  - Smart defaults when not specified:
    - If rolling ranges set: Uses first day of first allowed year/month
    - Else if today is before `minDate`: Uses `minDate`
    - Else if today is after `maxDate`: Uses `maxDate`
    - Else: Uses today
  - Added to `types.ts`, `date-picker.ts`, `web-component.ts`

- **Rolling Selector Examples**: Added comprehensive examples section in `examples-basic.html`
  - Current Year Only
  - Limited to 2025 (via date constraints)
  - Summer Months Only (June-August)
  - Q4 Business Planning (Oct-Dec 2024)
  - Year-End Booking (Nov-Dec only)
  - Multi-Year Range (2024-2026)

### Fixed

- **Rolling Selector Parameters Not Working**: Fixed critical bug where `rollingYearRange` and `rollingMonthRange` were not being applied
  - Root cause: Options were read by web component but never copied to `this.options` in `PureDatePicker` constructor
  - Added missing properties to options object in `date-picker.ts` (lines 114-115)

- **Date Validation Logic**: Made rolling ranges PRIMARY constraints, min/max dates SECONDARY
  - Updated `isDateDisabledInternal()` to check year/month ranges FIRST before other constraints
  - Example: `rolling-month-range="06-07"` only allows June-July dates, even if `min-date/max-date` span full year
  - If ranges are outside min/max dates, all dates are disabled (correct behavior)
  - Added parser helper methods `parseYearRange()` and `parseMonthRange()` to picker class

- **Rolling Selector Width Jump**: Fixed calendar width shrinking by ~0.5rem when opening month/year selector
  - Root cause: Rolling selector had different gap spacing than calendar grid
  - Solution 1: Changed rolling selector gap from `--drp-spacing-md` to `--drp-spacing-xs` in `_header-navigation.scss`
  - Solution 2: Added dynamic width calculation (like height) in `date-picker-rendering.ts`
    - Captures `offsetWidth` of days grid on first render
    - Rounds up with `Math.ceil()` for consistency
    - Sets explicit `style.width` on rolling selector
  - Calendar now maintains consistent width when toggling views

- **Auto-scroll on Rolling Selector Open**: Removed automatic scroll-to-selected-item behavior
  - Removed `scrollIntoView()` calls from `renderRollingSelector()` (lines 395, 414 in `date-picker-rendering.ts`)
  - Selector now stays at top position when opened, providing better UX

- **Month Range Rendering**: Fixed month list to only show months within configured range
  - Changed from rendering all 12 months (with some disabled) to only rendering months in `rolling-month-range`
  - Loop now iterates from `monthRange.min` to `monthRange.max` only
  - Disabled validation still applies to rendered months based on min/max dates

- **Year Range Default**: Reduced default year range for better UX
  - Changed from ±50 years (101 years!) to ±1 year (3 years total)
  - When `min-date/max-date` set but no `rolling-year-range`, automatically constrains to years from those dates
  - Much more sensible default for most use cases

### Changed

- **Validation Logic Priority**: Rolling selector ranges now act as primary constraints
  - Order of validation in `isDateDisabledInternal()`:
    1. Check `rollingYearRange` - disable if outside year range
    2. Check `rollingMonthRange` - disable if outside month range
    3. Check `minDate/maxDate` - disable if outside date range
    4. Check disabled weekdays, disabled dates, custom callbacks
  - This ensures month/year ranges define the "allowed universe" of dates

## [1.0.0-rc03] - 2025-11-11

### Fixed

- **Range Mode Selection Border (Multi-Month)**: Completed fix for visual bug where original clicked date retained focused styling when dragging a range from a different month column
  - Previously only worked within same month column
  - Now properly clears both visual classes and focus state across all month columns in multi-month display
  - Fixed in `date-picker-interaction.ts` lines 119-125:
    - Clears `focusedDayIndex` to prevent re-applying focus during re-render
    - Removes all selection-related CSS classes (`--range-start`, `--range-end`, `--selected`, `--focused`) from all day elements
  - Ensures clean visual state when starting new range from different month

### Removed

- **Old SCSS File**: Removed `src/scss/_date-picker.scss.old` (replaced by modular SCSS architecture)

### Added

- **Example Files**: Added comprehensive example HTML files
  - `examples-basic.html` - Basic usage examples
  - `examples-logging.html` - Logging and debugging examples
  - `examples-theming.html` - Theming and customization examples

## [1.0.0-rc02] - 2025-11-11

### Added

- **Convenience Package Exports**: Added direct exports for commonly used SCSS files
  - `@keenmate/web-daterangepicker/scss/variables` - Direct access to SCSS variables
  - `@keenmate/web-daterangepicker/scss/base` - Direct access to CSS custom properties definitions
  - Makes it easier to import just the variables or base styles without traversing paths

### Fixed

- **Dark Theme Color System**: Fixed theming system to support proper dark mode and custom color schemes
  - **Root Cause**: CSS color properties were missing from month titles and day cells, causing text to default to black
  - **Added Missing Color Declarations**:
    - Added `color: var(--drp-text-primary)` to `.drp-date-picker__month-year` in `_header-navigation.scss`
    - Added `color: var(--drp-text-primary)` to `.drp-date-picker__day` in `_calendar-grid.scss`
  - **New CSS Variables for Themeable Text Colors**:
    - Added `--drp-accent-text-color` for text on accent-colored backgrounds (default: white)
    - Added `--drp-button-text-color` for button text (default: white)
  - **Replaced Hardcoded Colors**: Converted all hardcoded white text colors to CSS variables:
    - Selected days, range dates, and drag preview edges now use `var(--drp-accent-text-color)`
    - Apply button now uses `var(--drp-button-text-color)`
    - Rolling selector selected items now use `var(--drp-accent-text-color)`
  - **Updated Dark Theme Example**: Enhanced `examples-theming.html` with proper dark mode colors:
    - `--drp-text-primary: #f1f5f9` (light text for dark backgrounds)
    - `--drp-accent-text-color: #ffffff` (white text on blue accents)
    - `--drp-button-text-color: #ffffff` (white text on buttons)
  - This enables full theming support where accent colors, backgrounds, and text colors can all be customized independently
- **SCSS Import Structure**: Fixed web component to use new modular SCSS architecture
  - Changed `web-component.ts` to import `./scss/main.scss` instead of old monolithic `_date-picker.scss`
  - Ensures all color properties from modular files are included in the build
  - Renamed old file to `_date-picker.scss.old` to prevent confusion
- **Range Mode Selection Border**: Fixed visual bug where the original clicked date retained its selection border when dragging a range from a different date
  - When clicking a date and then dragging from a different date, the picker now correctly clears the old selection
  - Prevents confusing visual state where multiple dates appear selected
  - Fixed in `date-picker-interaction.ts` startDrag function
- **Month/Year Selector Navigation Interference**: Fixed selector staying open when navigation buttons are clicked
  - Month/year rolling selector now automatically closes when users click previous/next month buttons (< >)
  - Prevents scroll jumping and layout issues caused by open selector during month navigation
  - Fixed in `date-picker-navigation.ts` prevMonth and nextMonth functions

### Documentation

- **Input Styling Limitation**: Documented Shadow DOM limitation for input field styling
  - Added comprehensive warning section in Custom Styling documentation page
  - Explained why component cannot style the `<input>` element directly (Shadow DOM encapsulation)
  - Provided CSS examples for styling inputs in global styles
  - Included framework examples for Tailwind CSS and Bootstrap
  - Cross-referenced with API documentation Known Limitations section
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
<web-daterangepicker locale="auto"></web-daterangepicker>

<!-- Explicit Spanish with localized display mask -->
<web-daterangepicker
  locale="es"
  date-format-mask="YYYY-MM-DD"
  display-format-mask="dd/mm/aaaa"
  placeholder="Selecciona una fecha">
</web-daterangepicker>
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
<web-daterangepicker
  mode="range"
  format="DD/MM/YYYY"
  months-to-show="2"
  trigger="auto"
  disabled-days="0,6"
  range-disabled-mode="block"
  display="floating"
  layout="grid"
  position="bottom">
</web-daterangepicker>

<!-- AFTER (v2.0.0) -->
<web-daterangepicker
  selection-mode="range"
  date-format-mask="DD/MM/YYYY"
  visible-months-count="2"
  calendar-open-trigger="auto"
  disabled-weekdays="0,6"
  range-disabled-handling="block"
  positioning-mode="floating"
  month-layout="grid"
  calendar-placement="bottom">
</web-daterangepicker>
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
  <web-daterangepicker></web-daterangepicker>
</div>

<!-- After (v1.0.0-rc01) -->
<div class="drp-font-lg drp-spacing-lg">
  <web-daterangepicker></web-daterangepicker>
</div>

<!-- Or mix sizes independently -->
<div class="drp-font-lg drp-spacing-xs">
  <web-daterangepicker></web-daterangepicker>
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
