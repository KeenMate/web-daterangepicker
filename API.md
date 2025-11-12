# API Reference

Complete API documentation for the Web Date Range Picker component.

---

## Table of Contents

1. [Package Exports](#package-exports)
2. [Web Component Attributes](#web-component-attributes)
3. [DatePicker Options](#datepicker-options)
4. [Public Methods](#public-methods)
5. [Events & Event Detail](#events--event-detail)
6. [Debugging & Logging](#debugging--logging)
7. [CSS Classes](#css-classes)
8. [CSS Custom Properties](#css-custom-properties)
9. [TypeScript Interfaces](#typescript-interfaces)
10. [Keyboard Navigation](#keyboard-navigation)
11. [Property Accessors](#property-accessors)
12. [Browser Support](#browser-support)
13. [Advanced Usage Examples](#advanced-usage-examples)
14. [Known Limitations](#known-limitations)
15. [Migration Guide](#migration-guide)

---

## Package Exports

The package provides multiple exports for different use cases:

### Component & Styles

```javascript
// Import the web component (auto-registers as <date-range-picker>)
import '@keenmate/web-daterangepicker';

// Import compiled CSS
import '@keenmate/web-daterangepicker/style.css';

// Import TypeScript types
import type { DatePickerOptions, DateRange, DecoratedDate } from '@keenmate/web-daterangepicker';
```

### SCSS Customization

```scss
// Import all SCSS (main entry point)
@import '@keenmate/web-daterangepicker/scss';

// Or import specific SCSS modules
@import '@keenmate/web-daterangepicker/scss/variables';  // SCSS variables only
@import '@keenmate/web-daterangepicker/scss/base';       // CSS custom properties definitions
@import '@keenmate/web-daterangepicker/src/scss/_calendar-grid.scss';  // Individual modules
```

### Available Exports

| Export | Path | Description |
|--------|------|-------------|
| Main component | `@keenmate/web-daterangepicker` | ES module + UMD, auto-registers web component |
| Compiled CSS | `@keenmate/web-daterangepicker/style.css` | Production-ready CSS bundle |
| SCSS entry point | `@keenmate/web-daterangepicker/scss` | Main SCSS file importing all modules |
| SCSS variables | `@keenmate/web-daterangepicker/scss/variables` | SCSS variables (`$drp-*`) |
| CSS custom properties | `@keenmate/web-daterangepicker/scss/base` | CSS variables (`:host { --drp-* }`) |
| Individual SCSS files | `@keenmate/web-daterangepicker/src/scss/*` | Any SCSS module by path |
| Dist files | `@keenmate/web-daterangepicker/dist/*` | Any dist file by path |

**Note:** When importing SCSS files, you can customize the component by overriding SCSS variables before importing, or by overriding CSS custom properties in your CSS.

---

## Web Component Attributes

All attributes can be set directly on the `<date-range-picker>` HTML element.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `selection-mode` | `'single' \| 'range'` | `'single'` | Selection mode: single date or date range |
| `date-format-mask` | `string` | `'YYYY-MM-DD'` | Date format string. Supports YYYY/YY, MM/M, DD/D with separators `-`, `/`, `.` |
| `visible-months-count` | `number` | `1` (single), `2` (range) | Number of calendar months to display simultaneously |
| `calendar-open-trigger` | `'auto' \| 'button'` | `'auto'` | Calendar trigger: `'auto'` (click/focus) or `'button'` (button only) |
| `value` | `string` | `''` | Current input value (formatted date string) |
| `disabled` | `boolean` | `false` | When present, disables the input element |
| `placeholder` | `string` | `undefined` | Input placeholder text |
| `week-start-day` | `'auto' \| 0-6` | `'auto'` | First day of week: `'auto'` (locale-based) or `0` (Sunday) through `6` (Saturday) |
| `min-date` | `string` | `undefined` | Minimum selectable date (YYYY-MM-DD format) |
| `max-date` | `string` | `undefined` | Maximum selectable date (YYYY-MM-DD format) |
| `disabled-weekdays` | `string` | `undefined` | Comma-separated days of week to disable (e.g., `"0,6"` for weekends) |
| `range-disabled-handling` | `'allow' \| 'block' \| 'split' \| 'individual'` | `'allow'` | How to handle disabled dates within ranges (see below) |
| `highlight-disabled-in-range` | `boolean` | `true` | Whether to visually highlight disabled dates within selected range |
| `positioning-mode` | `'inline' \| 'floating'` | `'floating'` | Display mode: `'inline'` (always visible) or `'floating'` (popup) |
| `month-layout` | `'horizontal' \| 'grid'` | `'horizontal'` | Layout mode for multiple months |
| `grid-rows` | `number` | `undefined` | Number of rows for grid layout (e.g., `2` for 2×3 grid) |
| `grid-columns` | `number` | `undefined` | Number of columns for grid layout (e.g., `3` for 2×3 grid) |
| `calendar-placement` | `string` | Smart default* | Floating UI placement: `'bottom'`, `'top'`, `'left'`, `'right'`, `'bottom-start'`, `'bottom-end'`, `'top-start'`, `'top-end'`, etc. |
| `locale` | `string \| 'auto'` | `'auto'` | Locale for UI strings and date formatting. Use `'auto'` for browser detection, or specify: `'en'`, `'de'`, `'fr'`, `'es'` |
| `display-format-mask` | `string` | Same as `date-format-mask` | Localized format mask shown to users (e.g., `'dd/mm/aaaa'` in Spanish). Validation still uses `date-format-mask` |
| `show-debug-info` | `boolean` | `false` | When present, enables detailed debug logging to browser console. See [Debugging & Logging](#debugging--logging) |

**Smart default positioning:**
- Grid layouts: `'bottom'` (centered)
- Horizontal layouts: `'bottom-start'` (left-aligned)

### Range Disabled Modes

The `range-disabled-handling` attribute controls behavior when selecting ranges that include disabled dates:

| Mode | Behavior | Use Case |
|------|----------|----------|
| `'allow'` | Allows ranges over disabled dates. Event includes `enabledDates` and `disabledDates` arrays | Hotel bookings (allow selecting range, calculate only enabled days) |
| `'block'` | Prevents selections that span disabled dates. Snaps range end to last enabled date before gap | Restricted scheduling (cannot cross blackout dates) |
| `'split'` | Returns multiple ranges split by disabled dates. Event includes `dateRanges` array | Multi-period bookings (weekdays only) |
| `'individual'` | Returns flat array of individual enabled dates. Event includes `dates` array | Cherry-picking dates (select range, get individual days) |

### Example Usage

```html
<!-- Basic single date picker -->
<date-range-picker
  selection-mode="single"
  date-format-mask="DD.MM.YYYY"
  placeholder="Select date">
</date-range-picker>

<!-- Range picker with weekend restriction -->
<date-range-picker
  selection-mode="range"
  disabled-weekdays="0,6"
  range-disabled-handling="block">
</date-range-picker>

<!-- 6-month grid calendar -->
<date-range-picker
  selection-mode="single"
  positioning-mode="inline"
  visible-months-count="6"
  month-layout="grid"
  grid-rows="2"
  grid-columns="3">
</date-range-picker>

<!-- Spanish localization with localized display format -->
<date-range-picker
  selection-mode="single"
  locale="es"
  date-format-mask="YYYY-MM-DD"
  display-format-mask="dd/mm/aaaa"
  placeholder="Selecciona una fecha">
</date-range-picker>
```

---

## DatePicker Options

When instantiating `PureDatePicker` directly (not using web component), pass these options. The web component automatically converts attributes to options.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `selectionMode` | `'single' \| 'range'` | `'single'` | Selection mode |
| `calendarPlacement` | `string` | `'bottom-start'` or `'bottom'` | Floating UI placement |
| `visibleMonthsCount` | `number` | `1` or `2` | Number of months to display |
| `dateFormatMask` | `string` | `'YYYY-MM-DD'` | Date format pattern |
| `calendarOpenTrigger` | `'auto' \| 'button'` | `'auto'` | How calendar is triggered |
| `onSelect` | `(date: Date \| DateRange) => void` | `undefined` | Callback when date is selected |
| `container` | `HTMLElement` | `document.body` | Where to append calendar (for web component, uses shadow root) |
| `positioningMode` | `'inline' \| 'floating'` | `'floating'` | Display mode |
| `monthLayout` | `'horizontal' \| 'grid'` | `'horizontal'` | Multi-month layout mode |
| `gridRows` | `number` | `undefined` | Grid rows count |
| `gridColumns` | `number` | `undefined` | Grid columns count |
| `weekStartDay` | `'auto' \| 0-6` | `'auto'` | Week start day |
| `minDate` | `Date \| string` | `undefined` | Minimum selectable date |
| `maxDate` | `Date \| string` | `undefined` | Maximum selectable date |
| `disabledDates` | `(Date \| string)[]` | `undefined` | Array of specific dates to disable |
| `disabledWeekdays` | `number[]` | `undefined` | Array of weekdays to disable (0=Sunday, 6=Saturday) |
| `specialDates` | `DecoratedDate[]` | `undefined` | Array of special dates with custom styling/labels |
| `isDateDisabled` | `(date: Date) => boolean` | `undefined` | Custom function to determine if date is disabled |
| `getDateMetadata` | `(date: Date) => DateInfo \| null` | `undefined` | Custom function to provide date styling/labels |
| `rangeDisabledHandling` | `'allow' \| 'block' \| 'split' \| 'individual'` | `'allow'` | Range behavior over disabled dates |
| `highlightDisabledInRange` | `boolean` | `true` | Highlight disabled dates in range |
| `locale` | `string \| 'auto'` | `'auto'` | Locale for UI strings and Intl date formatting. Built-in: `'en'`, `'de'`, `'fr'`, `'es'` |
| `displayFormatMask` | `string` | Same as `dateFormatMask` | Localized format mask for display (e.g., `'dd/mm/aaaa'` for Spanish) |
| `customStrings` | `Partial<LocaleStrings>` | `undefined` | Override built-in UI strings (Today, Clear, Apply, etc.) |
| `formatSummaryCallback` | `(data: SummaryCallbackData) => string` | `undefined` | Custom function to format the summary display (receives all selection data, returns HTML string) |

### Example Usage

```javascript
const picker = new PureDatePicker(inputElement, {
  selectionMode: 'range',
  dateFormatMask: 'DD/MM/YYYY',
  visibleMonthsCount: 2,
  weekStartDay: 1, // Monday
  disabledWeekdays: [0, 6], // Weekends
  specialDates: [
    { date: '2025-12-25', label: '🎄', tooltip: 'Christmas' }
  ],
  onSelect: (dateRange) => {
    console.log('Selected:', dateRange);
  }
});

// Spanish localization with custom strings
const pickerES = new PureDatePicker(inputElement, {
  selectionMode: 'single',
  locale: 'es',
  dateFormatMask: 'YYYY-MM-DD',
  displayFormatMask: 'dd/mm/aaaa',
  customStrings: {
    today: 'Hoy',
    clear: 'Borrar',
    preview: 'Previsualización'
  },
  onSelect: (date) => {
    console.log('Fecha seleccionada:', date);
  }
});
```

---

## Public Methods

### Web Component Methods

Available on `<date-range-picker>` element:

| Method | Signature | Description |
|--------|-----------|-------------|
| `show()` | `() => void` | Show the calendar (floating mode only) |
| `hide()` | `() => void` | Hide the calendar (floating mode only) |
| `toggle()` | `() => void` | Toggle calendar visibility |
| `clearSelection()` | `() => void` | Clear all selections and reset input |
| `getInputValue()` | `() => string` | Get current formatted value from input |
| `setInputValue(value)` | `(value: string) => void` | Set input value and update calendar |

**Example:**
```javascript
const picker = document.querySelector('date-range-picker');

picker.show();
picker.setInputValue('2025-12-25');
console.log(picker.getInputValue()); // "2025-12-25"
picker.clearSelection();
```

### PureDatePicker Instance Methods

Available on `PureDatePicker` instance (accessible via `picker.picker` on web component):

| Method | Signature | Description |
|--------|-----------|-------------|
| `show()` | `() => void` | Show calendar |
| `hide()` | `() => void` | Hide calendar |
| `toggle()` | `() => void` | Toggle calendar visibility |
| `clear()` | `() => void` | Clear selection |
| `destroy()` | `() => void` | Remove calendar and cleanup all event listeners |
| `formatDate(date)` | `(date: Date \| null) => string` | Format date using configured format |
| `isDateDisabledInternal(date)` | `(date: Date) => boolean` | Check if date is disabled (combines all disable logic) |
| `getDateInfoInternal(date)` | `(date: Date) => DateInfo \| null` | Get date info (styling/labels) |
| `hasDisabledDatesInRange(start, end)` | `(start: Date, end: Date) => boolean` | Check if range contains disabled dates |
| `getEnabledDatesInRange(start, end)` | `(start: Date, end: Date) => Date[]` | Get all enabled dates in range |
| `getDisabledDatesInRange(start, end)` | `(start: Date, end: Date) => Date[]` | Get all disabled dates in range |
| `findLastEnabledBeforeGap(start, end)` | `(start: Date, end: Date) => Date` | Find last enabled date before disabled gap (for 'block' mode) |
| `splitRangeByDisabled(start, end)` | `(start: Date, end: Date) => DateRange[]` | Split range into multiple ranges by disabled dates |
| `isToday(date)` | `(date: Date) => boolean` | Check if date is today |
| `isSameDay(date1, date2)` | `(date1: Date \| null, date2: Date \| null) => boolean` | Compare two dates (day precision) |
| `isInRange(date)` | `(date: Date) => boolean` | Check if date is within selected range |

**Example:**
```javascript
const picker = new PureDatePicker(input, { mode: 'range' });

const start = new Date(2025, 0, 1);
const end = new Date(2025, 0, 31);

console.log(picker.hasDisabledDatesInRange(start, end));
const enabled = picker.getEnabledDatesInRange(start, end);
console.log(`${enabled.length} enabled days in January`);
```

---

## Events & Event Detail

### Custom Events

The web component dispatches two identical events (for convenience):

| Event Name | Bubbles | Composed | Description |
|------------|---------|----------|-------------|
| `date-select` | ✓ | ✓ | Fired when a date or range is selected |
| `change` | ✓ | ✓ | Fired when a date or range is selected (alias of `date-select`) |

Both events have the same `detail` structure.

### Event Detail Properties

The `event.detail` object contains different properties depending on the mode and configuration:

| Property | Type | Always Present | Conditions | Description |
|----------|------|----------------|------------|-------------|
| `formattedValue` | `string` | ✓ | - | Formatted date string for display |
| `date` | `Date` | - | Mode: `single` | Selected date (single mode) |
| `dateRange` | `DateRange` | - | Mode: `range` (except `individual`) | Selected range with `start` and `end` dates |
| `enabledDates` | `Date[]` | - | Mode: `range`, rangeDisabledMode: `'allow'` | All enabled dates within range |
| `disabledDates` | `Date[]` | - | Mode: `range`, rangeDisabledMode: `'allow'` | All disabled dates within range |
| `dateRanges` | `DateRange[]` | - | Mode: `range`, rangeDisabledMode: `'split'` | Multiple ranges split by disabled dates |
| `dates` | `Date[]` | - | Mode: `range`, rangeDisabledMode: `'split'` or `'individual'` | Flat array of individual enabled dates |
| `getEnabledDateCount` | `() => number` | - | Mode: `range`, rangeDisabledMode: `'allow'` | Helper function to count enabled dates |
| `getTotalDays` | `() => number` | - | Mode: `range`, rangeDisabledMode: `'allow'` | Helper function to get total days in range |

### Event Examples

```javascript
const picker = document.querySelector('date-range-picker');

// Single mode
picker.addEventListener('date-select', (e) => {
  console.log('Selected date:', e.detail.date);
  console.log('Formatted:', e.detail.formattedValue);
});

// Range mode - 'allow' mode
picker.addEventListener('date-select', (e) => {
  const { dateRange, enabledDates, disabledDates } = e.detail;
  console.log('Range:', dateRange.start, 'to', dateRange.end);
  console.log('Enabled days:', enabledDates.length);
  console.log('Disabled days:', disabledDates.length);
  console.log('Total days:', e.detail.getTotalDays());
});

// Range mode - 'split' mode
picker.addEventListener('date-select', (e) => {
  const { dateRanges, dates } = e.detail;
  console.log('Split into', dateRanges.length, 'ranges');
  console.log('Total enabled dates:', dates.length);
  dateRanges.forEach((range, i) => {
    console.log(`Range ${i + 1}:`, range.start, 'to', range.end);
  });
});

// Range mode - 'individual' mode
picker.addEventListener('date-select', (e) => {
  const { dates } = e.detail;
  console.log('Selected', dates.length, 'individual dates');
  dates.forEach(date => console.log(date.toLocaleDateString()));
});
```

---

## Debugging & Logging

The date picker includes a professional logging system powered by [loglevel](https://github.com/pimterry/loglevel) that helps you debug issues during development.

### Enabling Debug Logging

Add the `show-debug-info` attribute to any picker instance to enable debug logging for that specific instance:

```html
<date-range-picker show-debug-info></date-range-picker>
```

### Log Categories

The logging system is organized into specialized categories, each prefixed with a timestamp and category name:

| Category | Logger Name | What It Logs |
|----------|-------------|--------------|
| **INIT** | `initLogger` | Component initialization, configuration, and setup |
| **NAVIGATION** | `navigationLogger` | Month/year navigation, keyboard focus movement, collision detection |
| **UI** | `uiLogger` | Calendar show/hide, positioning, floating UI calculations |
| **RENDERING** | `renderingLogger` | Calendar rendering, DOM updates |
| **SELECTION** | `selectionLogger` | Date selection, range completion |
| **VALIDATION** | `validationLogger` | Date validation, disabled date checking |
| **DRAG** | `dragLogger` | Drag-to-adjust operations, drag preview |
| **INTERACTION** | `interactionLogger` | Input masking, user input parsing |

### Log Message Format

All log messages follow a consistent format with function context:

```
[HH:mm:ss.SSS] [LEVEL] [CATEGORY] functionName() [context] - message
```

**Examples:**
```
[14:23:15.842] [DEBUG] [NAVIGATION] moveFocus() Col0 - found 31 days in column
[14:23:15.845] [DEBUG] [SELECTION] selectDay() Col1 - activeMonthIndex: 1
[14:23:15.850] [DEBUG] [VALIDATION] validateRangeAsync called - mode: block
[14:23:15.852] [DEBUG] [DRAG] onDragMove - mode: block, start: Mon Jan 01 2025, end: Fri Jan 05 2025
```

### Log Levels

The library uses these log levels:

| Level | When Used | Visibility |
|-------|-----------|------------|
| `silent` | Default (production) | No logging |
| `error` | Critical errors (async validation failures, etc.) | Always visible |
| `warn` | Warnings (invalid inputs, validation failures) | Always visible |
| `info` | Not currently used | - |
| `debug` | Development debugging | Only when `show-debug-info` is enabled |
| `trace` | Not currently used | - |

### Console Output Example

When `show-debug-info` is enabled, you'll see detailed logs in your browser console:

```
[14:23:15.420] [DEBUG] [INIT] Week starts on day: 1
[14:23:15.421] [DEBUG] [INIT] disabledDatesHandling: block
[14:23:15.422] [DEBUG] [INIT] Locale: en Weekdays: (7) ['Mo', 'Tu', ...] Months: (12) ['January', ...]
[14:23:15.423] [DEBUG] [INIT] Format info: {separator: '-', parts: {...}, maxLength: 10}
[14:23:15.425] [DEBUG] [INIT] Creating calendar
[14:23:15.428] [DEBUG] [RENDERING] renderCalendar() called
[14:23:15.430] [DEBUG] [UI] show() - adding visible class
[14:23:15.432] [DEBUG] [UI] position() - FloatingUI computed - x: 245, y: 380, placement: 'bottom-start'
```

### Filtering Logs by Category

You can filter browser console output by category name. In Chrome DevTools Console:

- Filter by category: Type `DRAG` or `SELECTION` in the filter box
- Filter by function: Type `moveFocus()` or `selectDay()`
- Filter by column: Type `Col0` or `Col1` for multi-month navigation

### Programmatic Control

Access the logging system directly via JavaScript:

```javascript
import { setLoggingEnabled, setLogLevel } from '@keenmate/web-daterangepicker';

// Enable/disable all logging
setLoggingEnabled(true);  // Turn on debug logging
setLoggingEnabled(false); // Turn off debug logging

// Set specific log level
setLogLevel('debug');  // Show debug and above
setLogLevel('warn');   // Show only warnings and errors
setLogLevel('silent'); // Disable all logging
```

### Per-Category Loggers

For advanced debugging, import individual category loggers:

```javascript
import {
  initLogger,
  navigationLogger,
  uiLogger,
  renderingLogger,
  selectionLogger,
  validationLogger,
  dragLogger,
  interactionLogger
} from '@keenmate/web-daterangepicker';

// Set level for specific category only
navigationLogger.setLevel('debug');
dragLogger.setLevel('trace');
```

### Best Practices

1. **Development**: Enable `show-debug-info` on problematic picker instances only to reduce console noise
2. **Production**: Never ship with `show-debug-info` enabled
3. **Debugging Selection Issues**: Look for `SELECTION` and `VALIDATION` logs
4. **Debugging Navigation**: Look for `NAVIGATION` logs with `Col` markers
5. **Debugging Input Masking**: Look for `INTERACTION` logs with `updateCalendarFromInput`
6. **Debugging Drag Issues**: Look for `DRAG` logs showing mode and range preview

### Example: Debugging Block Mode

```html
<date-range-picker
  selection-mode="range"
  disabled-weekdays="0,6"
  disabled-dates-handling="block"
  show-debug-info>
</date-range-picker>
```

Console output when selecting a range:
```
[14:30:45.120] [DEBUG] [SELECTION] selectDay() Col0 - activeMonthIndex: 0
[14:30:45.122] [DEBUG] [VALIDATION] validateRangeAsync called - mode: block, start: Mon Jan 01 2025, end: Sat Jan 06 2025
[14:30:45.123] [DEBUG] [VALIDATION] Checking BLOCK mode
[14:30:45.124] [DEBUG] [VALIDATION] BLOCK mode - range contains disabled dates, adjusting
[14:30:45.125] [DEBUG] [VALIDATION] BLOCK mode - adjusted end: Fri Jan 05 2025
```

---

## CSS Classes

### Wrapper Classes (Applied to Parent Element)

Wrap the `<date-range-picker>` in a `<div>` with these classes for styling control:

#### Font Size Classes

Control text size independently of spacing:

| Class | Scale | Description |
|-------|-------|-------------|
| `.drp-font-xs` | 0.7× | Extra small font |
| `.drp-font-sm` | 0.85× | Small font |
| `.drp-font-md` | 1.0× | Medium font (default) |
| `.drp-font-lg` | 1.2× | Large font |
| `.drp-font-xl` | 1.4× | Extra large font |

#### Spacing/Density Classes

Control gaps and padding independently of font size:

| Class | Scale | Description |
|-------|-------|-------------|
| `.drp-spacing-xs` | 0.7× | Extra compact spacing |
| `.drp-spacing-sm` | 0.85× | Compact spacing |
| `.drp-spacing-md` | 1.0× | Medium spacing (default) |
| `.drp-spacing-lg` | 1.2× | Spacious |
| `.drp-spacing-xl` | 1.4× | Extra spacious |

#### Responsive Class

| Class | Description |
|-------|-------------|
| `.drp-responsive` | Enable responsive breakpoints. Font and spacing scale down at 1200px and 768px breakpoints |

**Example:**
```html
<!-- Large readable text in compact layout -->
<div class="drp-font-lg drp-spacing-xs">
  <date-range-picker></date-range-picker>
</div>

<!-- Small text with generous spacing -->
<div class="drp-font-sm drp-spacing-lg">
  <date-range-picker></date-range-picker>
</div>

<!-- Responsive: both font and spacing scale down on mobile -->
<div class="drp-font-lg drp-spacing-lg drp-responsive">
  <date-range-picker></date-range-picker>
</div>
```

### Component Structure Classes

These classes are automatically applied by the component (read-only):

#### Calendar Container

| Class | Description |
|-------|-------------|
| `.drp-date-picker` | Main calendar container |
| `.drp-date-picker--visible` | Calendar is visible |
| `.drp-date-picker--inline` | Inline mode (always visible) |

#### Layout

| Class | Description |
|-------|-------------|
| `.drp-date-picker__months` | Container for all months |
| `.drp-date-picker__months--horizontal` | Horizontal layout (side-by-side) |
| `.drp-date-picker__months--grid` | Grid layout (rows × columns) |
| `.drp-date-picker__month` | Individual month container |

#### Month Header

| Class | Description |
|-------|-------------|
| `.drp-date-picker__header` | Month header container |
| `.drp-date-picker__month-year` | Month/year display (clickable for rolling selector) |
| `.drp-date-picker__nav` | Navigation button base |
| `.drp-date-picker__nav--prev` | Previous month button |
| `.drp-date-picker__nav--next` | Next month button |
| `.drp-date-picker__nav--disabled` | Disabled navigation button |

#### Rolling Selector

| Class | Description |
|-------|-------------|
| `.drp-date-picker__rolling-selector` | Rolling month/year selector container |
| `.drp-date-picker__rolling-selector--visible` | Visible state |
| `.drp-date-picker__rolling-list` | Scrollable list of years/months |
| `.drp-date-picker__rolling-item` | Individual year/month item |
| `.drp-date-picker__rolling-item--selected` | Currently selected item |

#### Calendar Grid

| Class | Description |
|-------|-------------|
| `.drp-date-picker__weekdays` | Weekday labels container (Mo, Tu, We...) |
| `.drp-date-picker__weekday` | Individual weekday label |
| `.drp-date-picker__days` | Days grid container |
| `.drp-date-picker__date-row` | Row of 7 days |
| `.drp-date-picker__day` | Individual day cell |

#### Day States

| Class | Description |
|-------|-------------|
| `.drp-date-picker__day--today` | Today's date |
| `.drp-date-picker__day--selected` | Selected date (single mode) |
| `.drp-date-picker__day--focused` | Keyboard focused |
| `.drp-date-picker__day--disabled` | Disabled date (not selectable) |
| `.drp-date-picker__day--other-month` | Day from adjacent month (grayed out) |

#### Range Mode States

| Class | Description |
|-------|-------------|
| `.drp-date-picker__day--range-start` | Range start date |
| `.drp-date-picker__day--range-end` | Range end date |
| `.drp-date-picker__day--in-range` | Date within selected range |

#### Drag States (Range Mode)

| Class | Description |
|-------|-------------|
| `.drp-date-picker__day--dragging` | Currently being dragged |
| `.drp-date-picker__day--drag-preview` | Preview of new range during drag |
| `.drp-date-picker__day--drag-invalid` | Invalid drag position (block mode) |

#### Badge System

| Class | Description |
|-------|-------------|
| `.drp-date-picker__badge-row` | Badge row (appears above date row) |
| `.drp-date-picker__badge-cell` | Individual badge cell |

#### Custom Date Classes

Can be added via `specialDates` array or `getDateInfo` callback:

| Predefined Class | Description |
|------------------|-------------|
| `.holiday` | Holiday styling (red tint) |
| `.event` | Event styling (green tint) |

You can also add any custom class names for complete control.

#### Actions & Summary

| Class | Description |
|-------|-------------|
| `.drp-date-picker__summary` | Summary container (range mode) |
| `.drp-date-picker__actions` | Actions container |
| `.drp-date-picker__button` | Button base class |
| `.drp-date-picker__button--today` | Today button |
| `.drp-date-picker__button--clear` | Clear button |
| `.drp-date-picker__button--apply` | Apply button (range mode) |
| `.drp-date-picker__button--cancel` | Cancel button |

---

## CSS Custom Properties

All CSS variables use the `--drp-` prefix and can be overridden from page-level CSS.

### How It Works

The component defines CSS variables using `:host` in its shadow DOM styles. This allows you to override them from your page-level CSS by targeting the web component element:

```css
/* Your page CSS */
date-range-picker {
  --drp-accent-color: #10b981;
  --drp-border-radius: 0.5rem;
}
```

**Why `:host`?** CSS variables defined with `:host` inside shadow DOM are:
- ✅ Accessible to all styles inside the shadow DOM
- ✅ Overridable from page-level CSS (as shown above)
- ✅ Scoped to each component instance

**Note:** If you see `:root` mentioned in old documentation or examples, it has been replaced with `:host` for proper shadow DOM support. Using `:root` inside shadow DOM doesn't work correctly.

### Available Variables

### Colors

| Property | Default | Description |
|----------|---------|-------------|
| `--drp-card-bg` | `#ffffff` | Calendar background |
| `--drp-border-color` | `#e5e7eb` | Border color |
| `--drp-primary-bg` | `#f3f4f6` | Primary background (hover states) |
| `--drp-primary-bg-hover` | `#e5e7eb` | Primary background hover |
| `--drp-accent-color` | `#3b82f6` | Accent color (selected, focused) |
| `--drp-accent-color-hover` | `#2563eb` | Accent color hover |
| `--drp-text-primary` | `#111827` | Primary text color |
| `--drp-text-secondary` | `#6b7280` | Secondary text color |
| `--drp-accent-text-color` | `#ffffff` | Text color on accent backgrounds |
| `--drp-button-text-color` | `#ffffff` | Button text color |

### Spacing

| Property | Default | Description |
|----------|---------|-------------|
| `--drp-spacing-xs` | `0.25rem` | Extra small spacing |
| `--drp-spacing-sm` | `0.5rem` | Small spacing |
| `--drp-spacing-md` | `1rem` | Medium spacing |
| `--drp-spacing-lg` | `1.5rem` | Large spacing |
| `--drp-spacing-xl` | `2rem` | Extra large spacing |

### Typography

| Property | Default | Description |
|----------|---------|-------------|
| `--drp-font-size-2xs` | `0.625rem` | Extra extra small |
| `--drp-font-size-xs` | `0.75rem` | Extra small |
| `--drp-font-size-sm` | `0.875rem` | Small |
| `--drp-font-size-base` | `1rem` | Base font size |
| `--drp-font-size-lg` | `1.125rem` | Large |
| `--drp-font-size-xl` | `1.25rem` | Extra large |
| `--drp-font-size-2xl` | `1.5rem` | Extra extra large |
| `--drp-font-weight-medium` | `500` | Medium weight |
| `--drp-font-weight-semibold` | `600` | Semibold weight |

### Borders & Shadows

| Property | Default | Description |
|----------|---------|-------------|
| `--drp-border-width-base` | `1px` | Base border width |
| `--drp-border-radius` | `0.375rem` | Border radius |
| `--drp-shadow-xl` | (complex value) | Extra large shadow for floating calendar |

### Transitions

| Property | Default | Description |
|----------|---------|-------------|
| `--drp-transition-fast` | `150ms` | Fast transition duration |
| `--drp-easing-snappy` | `cubic-bezier(0.4, 0.0, 0.2, 1)` | Snappy easing curve |

### Other

| Property | Default | Description |
|----------|---------|-------------|
| `--drp-input-padding-h` | `0.75rem` | Input horizontal padding |
| `--drp-grid-rows` | (dynamic) | Grid rows count (set automatically) |
| `--drp-grid-columns` | (dynamic) | Grid columns count (set automatically) |

### Theming Examples

#### Basic Theme Override

```css
/* Target specific picker instances with classes */
date-range-picker.custom-theme {
  --drp-accent-color: #10b981;
  --drp-accent-color-hover: #059669;
  --drp-border-radius: 0.5rem;
  --drp-font-size-base: 1.125rem;
}
```

#### Dark Theme

```css
date-range-picker.dark-theme {
  --drp-card-bg: #1e293b;
  --drp-text-primary: #f1f5f9;
  --drp-text-secondary: #cbd5e1;
  --drp-border-color: #334155;
  --drp-accent-color: #3b82f6;
  --drp-accent-color-hover: #2563eb;
  --drp-primary-bg: #334155;
  --drp-primary-bg-hover: #475569;
  --drp-accent-text-color: #ffffff;
  --drp-button-text-color: #ffffff;
}
```

#### Multiple Themes

```css
/* Blue theme */
date-range-picker.theme-blue {
  --drp-accent-color: #3b82f6;
  --drp-accent-color-hover: #2563eb;
}

/* Green theme */
date-range-picker.theme-green {
  --drp-accent-color: #10b981;
  --drp-accent-color-hover: #059669;
}

/* Purple theme */
date-range-picker.theme-purple {
  --drp-accent-color: #8b5cf6;
  --drp-accent-color-hover: #7c3aed;
}
```

#### Dynamic Theme Switching

```javascript
// Change theme at runtime
const picker = document.querySelector('date-range-picker');

// Apply dark theme
picker.classList.add('dark-theme');

// Switch to different color theme
picker.classList.remove('theme-blue');
picker.classList.add('theme-green');
```

---

## TypeScript Interfaces

### DatePickerOptions

```typescript
interface DatePickerOptions {
  mode?: 'single' | 'range';
  position?: string;
  monthsToShow?: number;
  format?: string;
  calendarTrigger?: 'auto' | 'button';
  onSelect?: (date: Date | DateRange) => void;
  container?: HTMLElement;
  display?: 'inline' | 'floating';
  layout?: 'horizontal' | 'grid';
  gridRows?: number;
  gridColumns?: number;
  weekStartDay?: 'auto' | 0 | 1 | 2 | 3 | 4 | 5 | 6;
  minDate?: Date | string;
  maxDate?: Date | string;
  disabledDates?: (Date | string)[];
  disabledDays?: number[];
  specialDates?: DecoratedDate[];
  isDateDisabled?: (date: Date) => boolean;
  getDateInfo?: (date: Date) => DateInfo | null;
  rangeDisabledMode?: 'allow' | 'block' | 'split' | 'individual';
  highlightDisabledInRange?: boolean;

  // Internationalization
  locale?: string | 'auto';
  displayFormatMask?: string;
  customStrings?: Partial<LocaleStrings>;

  // Custom summary formatting
  formatSummaryCallback?: (data: SummaryCallbackData) => string;
}
```

### DateRange

```typescript
interface DateRange {
  start: Date;
  end: Date;
}
```

### DatePickerEventDetail

```typescript
interface DatePickerEventDetail {
  date?: Date;                              // Single mode
  dateRange?: DateRange;                    // Range mode
  formattedValue: string;                   // Always present

  // 'allow' mode
  enabledDates?: Date[];
  disabledDates?: Date[];
  getEnabledDateCount?: () => number;
  getTotalDays?: () => number;

  // 'split' mode
  dateRanges?: DateRange[];

  // 'split' or 'individual' mode
  dates?: Date[];
}
```

### DecoratedDate

```typescript
interface DecoratedDate {
  date: Date | string;
  class?: string;      // Custom CSS class (e.g., 'holiday', 'event')
  label?: string;      // Short text overlay (e.g., '🎄', 'H', '$99')
  tooltip?: string;    // Hover tooltip text
}
```

### DateInfo

```typescript
interface DateInfo {
  disabled?: boolean;  // Override disabled state
  class?: string;      // Additional CSS classes
  label?: string;      // Text overlay in day cell
  tooltip?: string;    // Hover tooltip text
}
```

### LocaleStrings

```typescript
interface LocaleStrings {
  // Button labels
  today: string;
  clear: string;
  apply: string;

  // Summary text
  preview: string;
  day: string;
  days: string;
  night: string;
  nights: string;
}
```

### SummaryCallbackData

```typescript
interface SummaryCallbackData {
  // Basic counts
  days: number;           // Total days selected
  nights: number;         // Total nights (days - 1)

  // Simple range (when rangeDisabledHandling is 'allow' or 'block')
  startDate: Date | null;
  endDate: Date | null;

  // Multiple ranges (when rangeDisabledHandling is 'split')
  dateRanges?: DateRange[];

  // Individual dates (when rangeDisabledHandling is 'individual' or 'split')
  dates?: Date[];

  // For 'allow' mode - breakdown of enabled vs disabled
  enabledDates?: Date[];
  disabledDates?: Date[];

  // Context
  selectionMode: 'single' | 'range';
  rangeDisabledHandling?: 'allow' | 'block' | 'split' | 'individual';
  localeStrings: LocaleStrings;

  // Preview flag (true when dragging)
  isPreview?: boolean;
}
```

### FormatInfo

```typescript
interface FormatInfo {
  format: string;
  separator: string;
  parts: {
    year?: { index: number; length: number };
    month?: { index: number; length: number };
    day?: { index: number; length: number };
  };
  maxLength: number;
}
```

### MonthDisplay

```typescript
interface MonthDisplay {
  month: number;  // 0-11 (January = 0)
  year: number;   // Full year (e.g., 2025)
}
```

---

## Keyboard Navigation

Complete keyboard support for accessibility:

### Calendar Navigation

| Key | Action |
|-----|--------|
| `Escape` | Close calendar (floating mode) |
| `↑` | Move focus up 1 week (7 days) |
| `↓` | Move focus down 1 week (7 days) |
| `←` | Move focus left 1 day |
| `→` | Move focus right 1 day |
| `Ctrl/Cmd + ←` or `PageUp` | Previous month (maintain day position) |
| `Ctrl/Cmd + →` or `PageDown` | Next month (maintain day position) |
| `Enter` | Select focused day |
| `t` or `T` | Jump to today |
| `Tab` | Switch to next month column (multi-month mode) |
| `Shift + Tab` | Switch to previous month column (multi-month mode) |
| `Home` | First day of current month. Press again for previous month |
| `End` | Last day of current month. Press again for next month |
| `Ctrl/Cmd + Home` | January 1st of current year. Press again for previous year |
| `Ctrl/Cmd + End` | December 31st of current year. Press again for next year |

### Input Masking

| Key | Action |
|-----|--------|
| Separator (`-`, `/`, `.`) | Auto-pad single digit with leading zero |
| `Ctrl/Cmd + V` | Clean and format pasted content |

---

## Property Accessors

The web component provides convenient property accessors for JavaScript:

### Read/Write Properties

| Property | Type | Description |
|----------|------|-------------|
| `selectionMode` | `'single' \| 'range'` | Selection mode |
| `dateFormatMask` | `string` | Date format |
| `value` | `string` | Current value (formatted string) |
| `disabled` | `boolean` | Disabled state |
| `weekStartDay` | `'auto' \| 0-6` | Week start day |
| `minDate` | `string \| undefined` | Minimum date |
| `maxDate` | `string \| undefined` | Maximum date |
| `disabledWeekdays` | `number[] \| undefined` | Disabled weekdays array |
| `specialDates` | `DecoratedDate[] \| undefined` | Special dates (triggers re-init) |
| `disabledDates` | `(Date \| string)[] \| undefined` | Disabled dates (triggers re-init) |
| `isDateDisabled` | `((date: Date) => boolean) \| undefined` | Custom disable function (triggers re-init) |
| `getDateMetadata` | `((date: Date) => DateInfo \| null) \| undefined` | Custom date metadata function (triggers re-init) |

**Note:** Properties that trigger re-initialization (marked above) will destroy and recreate the calendar when changed.

### Example

```javascript
const picker = document.querySelector('date-range-picker');

// Get/set via properties
picker.mode = 'range';
picker.minDate = '2025-01-01';
picker.maxDate = '2025-12-31';

// Set complex properties (must use JS, not HTML attributes)
picker.specialDates = [
  { date: '2025-12-25', label: '🎄', tooltip: 'Christmas' }
];

picker.isDateDisabled = (date) => {
  return date.getDay() === 0 || date.getDay() === 6; // Weekends
};
```

---

## Browser Support

### Modern Browsers

- Chrome 90+
- Firefox 88+
- Safari 15+
- Edge 90+

### Week Start Day Detection

The component uses `Intl.Locale` API with `weekInfo` for automatic week start detection:

- **Modern browsers** (Chrome 99+, Firefox 105+, Safari 16+): Uses native `weekInfo`
- **Older browsers**: Falls back to locale-based detection
- **Fallback list**: Sunday-start countries include US, Canada, Japan, Israel, Saudi Arabia, UAE, South Korea
- **Default**: Monday (most of the world)

### Dependencies

- **@floating-ui/dom** - Positioning system for floating calendar

---

## Advanced Usage Examples

### Custom Date Styling with `getDateInfo`

```javascript
const picker = document.querySelector('date-range-picker');

// Mark weekends with a custom class
picker.getDateInfo = (date) => {
  const day = date.getDay();
  if (day === 0 || day === 6) {
    return {
      class: 'weekend-day',
      label: '⭐',
      tooltip: 'Weekend!'
    };
  }
  return null;
};
```

```css
/* Add custom styling */
.drp-date-picker__day.weekend-day {
  background-color: #fef3c7;
}
```

### Dynamic Date Restrictions

```javascript
// Disable dates based on API data
const bookedDates = await fetchBookedDates();

picker.isDateDisabled = (date) => {
  return bookedDates.some(booked =>
    date.toDateString() === booked.toDateString()
  );
};
```

### Handling Range with Split Mode

```javascript
picker.setAttribute('range-disabled-mode', 'split');
picker.addEventListener('date-select', (e) => {
  const { dateRanges, dates } = e.detail;

  console.log(`Selected ${dateRanges.length} separate ranges`);
  dateRanges.forEach((range, i) => {
    const nights = Math.floor(
      (range.end - range.start) / (1000 * 60 * 60 * 24)
    );
    console.log(`Range ${i + 1}: ${nights} nights`);
  });

  console.log(`Total ${dates.length} individual days`);
});
```

### Internationalization (i18n)

The date picker provides comprehensive i18n support with automatic browser detection, built-in locales, and full customization options.

#### Auto-Detection

```html
<!-- Auto-detect user's browser locale -->
<date-range-picker locale="auto"></date-range-picker>
```

The picker will:
1. Detect the user's browser language (`navigator.language`)
2. Use built-in translations if available (`en`, `de`, `fr`, `es`)
3. Fall back to English if locale is not supported
4. Use Intl API for weekday and month names

#### Built-in Locales

```html
<!-- Spanish -->
<date-range-picker locale="es"></date-range-picker>

<!-- German -->
<date-range-picker locale="de"></date-range-picker>

<!-- French -->
<date-range-picker locale="fr"></date-range-picker>

<!-- English (explicit) -->
<date-range-picker locale="en"></date-range-picker>
```

#### Dual Mask System

Use `date-format-mask` for validation (English tokens) and `display-format-mask` for visual display (localized tokens):

```html
<!-- Spanish: Show "dd/mm/aaaa" to users, validate with "YYYY-MM-DD" -->
<date-range-picker
  date-format-mask="YYYY-MM-DD"
  display-format-mask="dd/mm/aaaa"
  locale="es">
</date-range-picker>

<!-- German: Show "tt.mm.jjjj" to users, validate with "DD.MM.YYYY" -->
<date-range-picker
  date-format-mask="DD.MM.YYYY"
  display-format-mask="tt.mm.jjjj"
  locale="de">
</date-range-picker>
```

**How it works:**
- `date-format-mask`: Used for parsing and validation (always use English: YYYY, MM, DD)
- `display-format-mask`: Shown to users as a hint (use localized: aaaa for año, jjjj for jahr, etc.)
- Both masks must represent the same format structure, just with different language tokens

#### Custom String Overrides

```javascript
const picker = document.querySelector('date-range-picker');

// Override specific strings while keeping rest of locale
picker.picker.options.customStrings = {
  today: 'Ahora',          // Custom "Today"
  clear: 'Borrar todo',    // Custom "Clear"
  apply: 'Confirmar'       // Custom "Apply"
  // Other strings inherited from locale
};

// Or in PureDatePicker:
const picker = new PureDatePicker(input, {
  locale: 'es',
  customStrings: {
    today: 'Ahora',
    preview: 'Vista previa personalizada'
  }
});
```

**Available strings:**
- `today` - Today button
- `clear` - Clear button
- `apply` - Apply button (range mode)
- `preview` - Preview label in summary
- `day` / `days` - Day count (singular/plural)
- `night` / `nights` - Night count (singular/plural)

#### Complete Spanish Example

```html
<date-range-picker
  id="spanish-picker"
  selection-mode="range"
  locale="es"
  date-format-mask="YYYY-MM-DD"
  display-format-mask="dd/mm/aaaa"
  placeholder="Selecciona fechas"
  visible-months-count="2">
</date-range-picker>

<script>
  const picker = document.getElementById('spanish-picker');

  picker.addEventListener('date-select', (e) => {
    const { dateRange, formattedValue } = e.detail;
    console.log('Rango seleccionado:', formattedValue);
    console.log('Desde:', dateRange.start);
    console.log('Hasta:', dateRange.end);
  });
</script>
```

#### Complete German Example with Custom Strings

```javascript
const picker = new PureDatePicker(inputElement, {
  selectionMode: 'single',
  locale: 'de',
  dateFormatMask: 'DD.MM.YYYY',
  displayFormatMask: 'tt.mm.jjjj',
  customStrings: {
    today: 'Jetzt',
    clear: 'Zurücksetzen',
    preview: 'Vorschau'
  },
  weekStartDay: 1, // Monday (automatically detected for 'de', but can override)
  onSelect: (date) => {
    console.log('Ausgewähltes Datum:', date);
  }
});
```

#### What Gets Localized

| Element | Source | Customizable |
|---------|--------|--------------|
| Weekday names (Mo, Tu, We...) | Intl API (`Intl.DateTimeFormat`) | ❌ No (browser-provided) |
| Month names (January, February...) | Intl API (`Intl.DateTimeFormat`) | ❌ No (browser-provided) |
| Button labels (Today, Clear, Apply) | Built-in locale strings | ✅ Yes (via `customStrings`) |
| Summary text (day, days, night, nights) | Built-in locale strings | ✅ Yes (via `customStrings`) |
| Display format mask hint | `display-format-mask` attribute | ✅ Yes |
| Week start day | Intl API (`Intl.Locale.weekInfo`) | ✅ Yes (via `week-start-day`) |

### Custom Summary Formatting

The `formatSummaryCallback` option allows you to completely customize the summary display below the calendar. The callback receives comprehensive data about the selection and returns an HTML string.

#### Basic Example: Show Only Nights

```javascript
const picker = new PureDatePicker(input, {
  selectionMode: 'range',
  formatSummaryCallback: (data) => {
    return `<strong>${data.nights}</strong> ${data.nights === 1 ? data.localeStrings.night : data.localeStrings.nights}`;
  }
});
```

#### Example: Add Custom Pricing

```javascript
const picker = new PureDatePicker(input, {
  selectionMode: 'range',
  formatSummaryCallback: (data) => {
    const pricePerNight = 150;
    const total = data.nights * pricePerNight;

    return `
      <div style="display: flex; justify-content: space-between; width: 100%;">
        <span>${data.nights} ${data.nights === 1 ? data.localeStrings.night : data.localeStrings.nights}</span>
        <span style="font-weight: bold;">$${total}</span>
      </div>
    `;
  }
});
```

#### Example: Handle Multiple Ranges (Split Mode)

```javascript
const picker = new PureDatePicker(input, {
  selectionMode: 'range',
  rangeDisabledHandling: 'split',
  disabledWeekdays: [0, 6], // Disable weekends
  formatSummaryCallback: (data) => {
    if (data.dateRanges && data.dateRanges.length > 1) {
      // Multiple ranges
      return `
        <div>
          <div>${data.dateRanges.length} separate periods</div>
          <div>${data.days} ${data.localeStrings.days} total</div>
        </div>
      `;
    } else {
      // Single range
      return `${data.days} ${data.localeStrings.days}, ${data.nights} ${data.localeStrings.nights}`;
    }
  }
});
```

#### Example: Show Enabled vs Disabled Count (Allow Mode)

```javascript
const picker = new PureDatePicker(input, {
  selectionMode: 'range',
  rangeDisabledHandling: 'allow',
  disabledWeekdays: [0, 6],
  formatSummaryCallback: (data) => {
    if (data.enabledDates && data.disabledDates) {
      return `
        <div style="font-size: 0.9em;">
          <div><strong>${data.enabledDates.length}</strong> weekdays</div>
          <div style="opacity: 0.7;">${data.disabledDates.length} weekends (excluded)</div>
        </div>
      `;
    }
    return `${data.days} ${data.localeStrings.days}`;
  }
});
```

#### Example: Preview Indicator

```javascript
const picker = new PureDatePicker(input, {
  selectionMode: 'range',
  formatSummaryCallback: (data) => {
    const prefix = data.isPreview ?
      `<span style="opacity: 0.7;">${data.localeStrings.preview}: </span>` : '';

    return `
      ${prefix}
      <span>${data.days} ${data.days === 1 ? data.localeStrings.day : data.localeStrings.days}</span>
      <span>, </span>
      <span>${data.nights} ${data.nights === 1 ? data.localeStrings.night : data.localeStrings.nights}</span>
    `;
  }
});
```

#### SummaryCallbackData Properties

The callback receives an object with the following properties:

| Property | Type | When Available | Description |
|----------|------|----------------|-------------|
| `days` | `number` | Always | Total days selected |
| `nights` | `number` | Always | Total nights (days - 1) |
| `startDate` | `Date \| null` | Always | Start date of selection |
| `endDate` | `Date \| null` | Always | End date of selection |
| `selectionMode` | `'single' \| 'range'` | Always | Current selection mode |
| `rangeDisabledHandling` | `string` | Always | Current disabled handling mode |
| `localeStrings` | `LocaleStrings` | Always | Localized UI strings |
| `isPreview` | `boolean` | Always | True when dragging (preview) |
| `dateRanges` | `DateRange[]` | Split mode | Array of separate ranges |
| `dates` | `Date[]` | Individual/Split mode | Array of selected dates |
| `enabledDates` | `Date[]` | Allow mode | Enabled dates in range |
| `disabledDates` | `Date[]` | Allow mode | Disabled dates in range |

---

## Known Limitations

### Input Field Styling

**The component cannot style the `<input>` element directly due to Shadow DOM encapsulation.**

#### Why This Happens

The date picker is built as a web component using Shadow DOM for style encapsulation. This architectural decision provides several benefits:

- **Style isolation**: Component styles don't leak to your page
- **Predictable styling**: Your global CSS doesn't break the calendar
- **Encapsulation**: Clean API boundary between component and consumer

However, Shadow DOM creates a barrier:
- The `<input>` element lives in the **light DOM** (your page)
- The calendar popup lives in the **shadow DOM** (component internals)
- Styles inside shadow DOM **cannot reach out** to style light DOM elements

#### What the Component Provides

The component adds minimal decoration to the input:

```html
<div class="drp-date-picker-input">
  <input type="text" />  <!-- Your input, must be styled by you -->
  <!-- Calendar icon (📅) added via CSS ::after -->
</div>
```

**Available SCSS variables (for icon only):**
- `$drp-input-padding-h` - Horizontal padding for icon positioning
- `$drp-input-icon-opacity` - Opacity of the calendar icon

#### How to Style Your Input

**You must style the input element using your own CSS** in your application:

```css
/* Your global CSS or component styles */
date-range-picker input {
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  font-size: 1rem;
  width: 100%;
  box-sizing: border-box;
}

date-range-picker input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

date-range-picker input:disabled {
  background-color: #f3f4f6;
  cursor: not-allowed;
  opacity: 0.6;
}
```

#### Wrapper Class Approach

The component adds a `.drp-date-picker-input` wrapper class that you can target:

```css
/* Style the wrapper */
.drp-date-picker-input {
  position: relative;
}

/* Style the input inside the wrapper */
.drp-date-picker-input input {
  padding: 0.75rem 2.5rem 0.75rem 0.75rem; /* Extra padding-right for icon */
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  transition: border-color 150ms;
}

.drp-date-picker-input input:hover {
  border-color: #9ca3af;
}

.drp-date-picker-input input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
```

#### Alternative: Use Your Own Input

Instead of letting the component create the input, you can provide your own pre-styled input:

```html
<date-range-picker>
  <input
    type="text"
    class="my-custom-input"
    placeholder="Select date"
  />
</date-range-picker>
```

```css
/* Your custom input class */
.my-custom-input {
  /* Full control over input styling */
  padding: 1rem;
  border: 2px solid #3b82f6;
  border-radius: 9999px;
  font-size: 1.125rem;
  /* ... */
}
```

#### What DOES Work

These CSS properties **do work** on the input element:

✅ All basic styling:
- `padding`, `margin`, `border`, `border-radius`
- `background-color`, `color`, `font-size`, `font-family`
- `width`, `height`, `box-sizing`
- Pseudo-classes: `:hover`, `:focus`, `:disabled`, `:placeholder`
- Transitions and animations

✅ Flexbox/Grid parent styling:
- Wrap the `<date-range-picker>` in a flex/grid container
- Control layout and positioning normally

#### What Does NOT Work

These approaches **will not work**:

❌ Trying to style from inside shadow DOM:
```css
/* Inside component SCSS - THIS WON'T WORK */
input {
  border: 1px solid red; /* Cannot reach light DOM */
}
```

❌ CSS variables in shadow DOM to style input:
```css
/* Inside component - THIS WON'T WORK */
:host {
  --input-border-color: red;
}

/* Light DOM input cannot access shadow DOM variables */
```

❌ Using `::part()` or `::slotted()` on input:
- Input is not in a slot or exposed as a part

#### Framework-Specific Examples

**Vue 3 / Scoped Styles:**
```vue
<template>
  <date-range-picker></date-range-picker>
</template>

<style scoped>
/* :deep() pierces component boundary */
date-range-picker :deep(input) {
  padding: 1rem;
  border: 1px solid #ccc;
}
</style>
```

**React / CSS Modules:**
```jsx
<div className={styles.pickerWrapper}>
  <date-range-picker></date-range-picker>
</div>
```

```css
/* styles.module.css */
.pickerWrapper input {
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 0.5rem;
}
```

**Svelte:**
```svelte
<date-range-picker></date-range-picker>

<style>
  :global(date-range-picker input) {
    padding: 1rem;
    border: 1px solid #ccc;
  }
</style>
```

#### Design System Integration

If you're using a design system (Material UI, Bootstrap, Tailwind, etc.), apply your input classes directly:

**Tailwind CSS:**
```html
<date-range-picker>
  <input
    type="text"
    class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
  />
</date-range-picker>
```

**Bootstrap:**
```html
<date-range-picker>
  <input type="text" class="form-control" />
</date-range-picker>
```

#### Summary

- ✅ **Calendar styling**: Fully controlled by component SCSS variables and CSS custom properties
- ❌ **Input styling**: Must be handled by you in your application CSS
- 💡 **Reason**: Shadow DOM encapsulation keeps calendar styles isolated but prevents styling light DOM elements
- 🎯 **Solution**: Style `date-range-picker input` selector in your global/component CSS

---

## Migration Guide

### From v0.x Size Classes

The old `.drp-size-*` classes have been replaced with independent font and spacing classes:

```html
<!-- OLD (v0.x) -->
<div class="drp-size-lg">
  <date-range-picker></date-range-picker>
</div>

<!-- NEW (v1.0+) -->
<div class="drp-font-lg drp-spacing-lg">
  <date-range-picker></date-range-picker>
</div>

<!-- Or mix independently -->
<div class="drp-font-lg drp-spacing-xs">
  <date-range-picker></date-range-picker>
</div>
```

**Quick Migration Table:**

| Old Class | New Classes |
|-----------|-------------|
| `.drp-size-xs` | `.drp-font-xs .drp-spacing-xs` |
| `.drp-size-sm` | `.drp-font-sm .drp-spacing-sm` |
| `.drp-size-md` | `.drp-font-md .drp-spacing-md` or omit for defaults |
| `.drp-size-lg` | `.drp-font-lg .drp-spacing-lg` |
| `.drp-size-xl` | `.drp-font-xl .drp-spacing-xl` |

---

## Status Note

All documented features are **actively maintained and fully functional**. No deprecated or unused features found as of v1.0.0-rc01.
