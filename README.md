# Date Range Picker Web Component

A lightweight, accessible date picker web component with excellent keyboard navigation and range selection support.

## Features

- 🎯 **Input Masking** - Auto-format dates as you type with separator insertion
- ⌨️ **Keyboard Navigation** - Full keyboard support (arrows, Enter, Esc, PageUp/Down, Home/End)
- 📅 **Rolling Selector** - Innovative scrollable year/month picker
- 📊 **Multi-Month Display** - Show 1-3+ months side by side with independent navigation
- 🎨 **Themeable** - All styles use CSS custom properties (`--drp-*`)
- 🖱️ **Drag-to-Adjust** - Drag range endpoints to adjust selection (range mode)
- 🌐 **Multiple Formats** - YYYY-MM-DD, DD.MM.YYYY, MM/DD/YYYY, etc.
- 🌍 **Locale-Aware** - Auto-detect week start day from user's locale
- 🚫 **Date Restrictions** - Min/max dates, disabled days/dates, custom disable logic
- 🎉 **Special Dates** - Highlight holidays, events with custom labels and styling
- ✨ **Modern** - Web Component with Shadow DOM, TypeScript, bundled with Vite

## Installation

```bash
npm install @keenmate/web-daterangepicker
```

## Usage

### Basic HTML

```html
<!-- Single date picker -->
<web-daterangepicker
  selection-mode="single"
  date-format-mask="YYYY-MM-DD"
  placeholder="Select date"
></web-daterangepicker>

<!-- Date range picker -->
<web-daterangepicker
  selection-mode="range"
  date-format-mask="YYYY-MM-DD"
  visible-months-count="2"
  placeholder="Select date range"
></web-daterangepicker>
```

### With JavaScript/TypeScript

```typescript
// Import the component (includes styles)
import '@keenmate/web-daterangepicker';

// Or import styles separately if needed
import '@keenmate/web-daterangepicker/style.css';

const picker = document.querySelector('web-daterangepicker');

// Listen for date selection
picker.addEventListener('date-select', (e) => {
  console.log('Selected:', e.detail.formattedValue);
  console.log('Date object:', e.detail.date);
  console.log('Range:', e.detail.dateRange);
});

// Programmatic API
picker.show();        // Show calendar
picker.hide();        // Hide calendar
picker.toggle();      // Toggle calendar
picker.clearSelection();       // Clear selection
picker.getInputValue();    // Get current value
picker.setInputValue('2025-11-15'); // Set value
```

### JavaScript Instantiation (Direct Class Usage)

If you prefer to use the `DateRangePicker` class directly instead of the web component, you have full programmatic control:

```typescript
import { DateRangePicker } from '@keenmate/web-daterangepicker';
// IMPORTANT: Import CSS separately (web component auto-injects, but the class doesn't)
import '@keenmate/web-daterangepicker/dist/style.css';

const inputElement = document.getElementById('my-input');

const picker = new DateRangePicker(inputElement, {
  selectionMode: 'range',
  visibleMonthsCount: 2,
  dateFormatMask: 'YYYY-MM-DD',
  onSelect: (detail) => {
    // Range mode: detail is { start: Date, end: Date }
    console.log('Range:', detail.start, 'to', detail.end);
  }
});
```

**⚠️ Critical: CSS Requirements**

Unlike the web component, the `DateRangePicker` class does **NOT** automatically inject styles. You **MUST** import CSS separately or you'll see an unstyled calendar. Choose one method:

**Option 1: Import CSS in JavaScript (Recommended)**
```typescript
import { DateRangePicker } from '@keenmate/web-daterangepicker';
import '@keenmate/web-daterangepicker/dist/style.css';
```

**Option 2: Link CSS in HTML**
```html
<link rel="stylesheet" href="./node_modules/@keenmate/web-daterangepicker/dist/style.css">
```

**Option 3: Programmatic Injection**
```typescript
import { DateRangePicker } from '@keenmate/web-daterangepicker';

// Inject styles once before creating pickers
DateRangePicker.injectGlobalStyles();

const picker = new DateRangePicker(inputElement, options);
```

**Why?** The web component uses Shadow DOM and injects styles into its isolated scope automatically. The `DateRangePicker` class creates calendar elements in the regular DOM, so it expects global CSS to be loaded separately.

See the [JavaScript Instantiation Examples](examples-javascript-instantiation.html) for complete code samples and configuration options.

## Attributes

> **Note:** HTML attributes use kebab-case (e.g., `selection-mode`), while JavaScript options use camelCase (e.g., `selectionMode`).

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `selection-mode` | `'single' \| 'range'` | `'single'` | Single date or date range selection |
| `date-format-mask` | `string` | `'YYYY-MM-DD'` | Date format (YYYY-MM-DD, DD.MM.YYYY, MM/DD/YYYY, etc.) |
| `visible-months-count` | `number` | `1` (single), `2` (range) | Number of months to display |
| `calendar-open-trigger` | `'focus' \| 'typing' \| 'manual'` | `'focus'` | How to open calendar (focus = on input focus, typing = when user types, manual = programmatic only) |
| `value` | `string` | - | Current value |
| `placeholder` | `string` | - | Input placeholder text |
| `disabled` | `boolean` | `false` | Disable the picker |
| `week-start-day` | `'auto' \| 0-6` | `'auto'` | First day of week (0=Sunday, 1=Monday, etc. 'auto'=detect from locale) |
| `min-date` | `string` | - | Minimum selectable date (YYYY-MM-DD) |
| `max-date` | `string` | - | Maximum selectable date (YYYY-MM-DD) |
| `disabled-weekdays` | `string` | - | Comma-separated day numbers to disable (e.g., "0,6" for weekends) |
| `disabled-dates-handling` | `'allow' \| 'prevent' \| 'block' \| 'split' \| 'individual'` | `'allow'` | How to handle range selections over disabled dates (see [Range Selection Modes](#range-selection-modes)) |
| `highlight-disabled-in-range` | `boolean` | `true` | Whether to visually highlight disabled dates within a selected range. Set to `false` to only highlight enabled dates. |
| `auto-close` | `'never' \| 'selection' \| 'apply'` | `'selection'` | When to close calendar (selection = after picking, apply = after Apply button, never = manual) |
| `positioning-mode` | `'inline' \| 'floating'` | `'floating'` | Calendar positioning (inline = embedded, floating = popup) |

## Properties

```typescript
// Get/set properties (use camelCase in JavaScript)
picker.selectionMode = 'range';
picker.dateFormatMask = 'DD.MM.YYYY';
picker.value = '2025-11-15';
picker.disabled = true;
```

## Methods

| Method | Description |
|--------|-------------|
| `show()` | Show the calendar (floating mode only) |
| `hide()` | Hide the calendar |
| `toggle()` | Toggle calendar visibility |
| `clearSelection()` | Clear the current selection |
| `getInputValue()` | Get the current value as a string |
| `setInputValue(value: string)` | Set the value |

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| `date-select` | `{ date?, dateRange?, formattedValue }` | Fired when a date is selected |
| `change` | `{ date?, dateRange?, formattedValue }` | Fired when selection changes |

## Keyboard Shortcuts

- **↑ ↓** - Navigate up/down by week
- **← →** - Navigate left/right by day
- **Ctrl+← / Ctrl+→** - Previous / next month (maintains day position)
- **PageUp / PageDown** - Previous / next month (maintains day position)
- **Home** - First day of current month (repeat to cycle backwards through months)
- **End** - Last day of current month (repeat to cycle forwards through months)
- **Ctrl+Home** - January 1st of current year (repeat for previous year)
- **Ctrl+End** - December 31st of current year (repeat for next year)
- **Enter** - Select focused day
- **Escape** - Close calendar
- **Tab / Shift+Tab** - Switch between month columns (multi-month mode)
- **T** - Jump to today

## Advanced Features

### Week Start Day

Control which day the week starts on (auto-detected by default from user's locale):

```html
<!-- Auto-detect from locale (default) -->
<web-daterangepicker week-start-day="auto"></web-daterangepicker>

<!-- Force Sunday start -->
<web-daterangepicker week-start-day="0"></web-daterangepicker>

<!-- Force Monday start (common in Europe) -->
<web-daterangepicker week-start-day="1"></web-daterangepicker>
```

### Disabled Dates & Date Restrictions

#### Simple Restrictions (Attributes)

```html
<!-- Disable weekends -->
<web-daterangepicker disabled-weekdays="0,6"></web-daterangepicker>

<!-- Date range restriction -->
<web-daterangepicker
  min-date="2025-01-01"
  max-date="2025-12-31">
</web-daterangepicker>
```

#### Complex Restrictions (JavaScript)

```javascript
const picker = document.querySelector('web-daterangepicker');

// Disable specific dates (e.g., public holidays)
picker.disabledDates = [
  '2025-12-25', // Christmas
  '2025-01-01', // New Year
  new Date(2025, 6, 4) // July 4th
];

// Custom disable logic (e.g., cottage booking)
picker.getDateMetadataCallback = (date) => {
  // Disable all dates that overlap with existing bookings
  const isBooked = bookedRanges.some(range =>
    date >= range.start && date <= range.end
  );
  return isBooked ? { isDisabled: true } : null;
};
```

### Special Dates (Holidays, Events)

Add visual indicators and labels to specific dates:

```javascript
const picker = document.querySelector('web-daterangepicker');

picker.specialDates = [
  {
    date: '2025-12-25',
    dayClass: 'holiday',     // CSS class for the day cell
    badgeText: '🎄',         // Badge overlay (emoji or short text)
    dayTooltip: 'Christmas Day'
  },
  {
    date: '2025-07-04',
    dayClass: 'holiday',
    badgeText: '🎆',
    dayTooltip: 'Independence Day'
  },
  {
    date: '2025-02-14',
    dayClass: 'event',
    badgeText: '❤️',
    dayTooltip: 'Valentine\'s Day'
  }
];
```

### Advanced Styling & Info

For complete control, use the `getDateMetadataCallback`:

```javascript
picker.getDateMetadataCallback = (date) => {
  const dateStr = date.toISOString().split('T')[0];

  // Check if it's a peak season date
  if (isPeakSeason(date)) {
    return {
      dayClass: 'peak-season',
      badgeText: '$$$',
      dayTooltip: 'Peak season pricing'
    };
  }

  // Check if it's a special offer date
  if (specialOffers[dateStr]) {
    return {
      dayClass: 'special-offer',
      badgeText: '%',
      dayTooltip: `${specialOffers[dateStr]}% off!`
    };
  }

  return null;
};
```

### CSS Styling for Special Dates

```css
/* Holiday styling (predefined class) */
web-daterangepicker::part(calendar) .pa-date-picker__day.holiday {
  background-color: rgba(239, 68, 68, 0.1);
}

/* Event styling (predefined class) */
web-daterangepicker::part(calendar) .pa-date-picker__day.event {
  background-color: rgba(16, 185, 129, 0.1);
}

/* Custom class example */
web-daterangepicker::part(calendar) .pa-date-picker__day.peak-season {
  background-color: rgba(251, 191, 36, 0.15);
  font-weight: 600;
}
```

## Range Selection Modes

When selecting date ranges that include disabled dates (e.g., selecting a working week where weekends are disabled), you can control how the selection is handled using the `disabled-dates-handling` attribute:

### Mode: 'allow' (default)

Allows range selections over disabled dates. Returns both enabled and disabled date arrays:

```html
<web-daterangepicker
  selection-mode="range"
  disabled-weekdays="0,6"
  disabled-dates-handling="allow">
</web-daterangepicker>

<script>
picker.addEventListener('date-select', (e) => {
  console.log('Enabled dates:', e.detail.enabledDates);
  console.log('Disabled dates:', e.detail.disabledDates);
  console.log('Total days:', e.detail.getTotalDays());
  console.log('Enabled count:', e.detail.getEnabledDateCount());
});
</script>
```

**Use case:** Selecting working weeks where you need to know both working days and weekends (e.g., "Select 3 weeks of work" where weekends are included in the range but you get a separate array of working days).

### Mode: 'prevent'

Prevents selecting disabled dates entirely. Clicking a disabled date does nothing:

```html
<web-daterangepicker
  selection-mode="range"
  disabled-dates-handling="prevent">
</web-daterangepicker>
```

**Use case:** Strict date selection where disabled dates should never be part of any selection.

### Mode: 'block'

Prevents range selections from crossing disabled dates. Automatically snaps to the last enabled date before the gap:

```html
<web-daterangepicker
  selection-mode="range"
  disabled-dates-handling="block">
</web-daterangepicker>
```

When dragging from day 1 to day 7 with days 4-5 disabled, the selection will automatically snap to days 1-3.

**Use case:** Cottage booking where you can't book across existing reservations, or any scenario where gaps in the range are not allowed.

### Mode: 'split'

Returns multiple date ranges separated by disabled dates:

```html
<web-daterangepicker
  selection-mode="range"
  disabled-weekdays="0,6"
  disabled-dates-handling="split">
</web-daterangepicker>

<script>
picker.addEventListener('date-select', (e) => {
  console.log('Ranges:', e.detail.dateRanges);
  // e.g., [{start: Mon, end: Fri}, {start: Mon, end: Fri}, {start: Mon, end: Fri}]
  console.log('Formatted:', e.detail.formattedValue);
  // "2025-11-03 - 2025-11-07, 2025-11-10 - 2025-11-14, 2025-11-17 - 2025-11-21"
});
</script>
```

**Use case:** Reporting or analytics where you need distinct time periods (e.g., "Generate report for these 3 work weeks").

### Mode: 'individual'

Returns a flat array of individual enabled dates:

```html
<web-daterangepicker
  selection-mode="range"
  disabled-weekdays="0,6"
  disabled-dates-handling="individual">
</web-daterangepicker>

<script>
picker.addEventListener('date-select', (e) => {
  console.log('Individual dates:', e.detail.dates);
  // [Date(Mon), Date(Tue), Date(Wed), Date(Thu), Date(Fri), Date(Mon), ...]
  console.log('Formatted:', e.detail.formattedValue);
  // "2025-11-03, 2025-11-04, 2025-11-05, 2025-11-06, 2025-11-07, ..."
});
</script>
```

**Use case:** Scheduling or event planning where you need a list of specific dates (e.g., "Schedule training sessions on these dates").

### Event Detail Structure by Mode

| Mode | Properties | Description |
|------|-----------|-------------|
| `allow` | `dateRange`, `enabledDates`, `disabledDates`, `getTotalDays()`, `getEnabledDateCount()` | Full range with helper methods |
| `prevent` | `dateRange`, `dates` | Only enabled dates can be selected |
| `block` | `dateRange`, `dates` | Single continuous range (no disabled dates) |
| `split` | `dateRanges`, `dates` | Multiple ranges split by disabled dates |
| `individual` | `dates` | Flat array of enabled dates |

### Visual Highlighting Control

By default, when you select a range that includes disabled dates, all dates (both enabled and disabled) within the range are visually highlighted. You can change this behavior with the `highlight-disabled-in-range` attribute:

```html
<!-- Default: highlights all dates in range, including disabled weekends -->
<web-daterangepicker
  selection-mode="range"
  disabled-weekdays="0,6"
  disabled-dates-handling="split">
</web-daterangepicker>

<!-- Only highlight enabled dates (Mon-Fri), skip weekends -->
<web-daterangepicker
  selection-mode="range"
  disabled-weekdays="0,6"
  disabled-dates-handling="split"
  highlight-disabled-in-range="false">
</web-daterangepicker>
```

**When to use `highlight-disabled-in-range="false"`:**
- Selecting working weeks where you only want to see Monday-Friday highlighted
- Visual clarity when disabled dates are not relevant to the selection
- Any scenario where showing gaps in the range is clearer than showing continuous highlighting

## Theming

Customize the appearance using CSS custom properties:

```css
:root {
  /* Scale Multipliers - adjust these to scale the entire component */
  --drp-font-scale: 1;      /* Scale all font sizes (e.g., 1.2 = 20% larger) */
  --drp-spacing-scale: 1;   /* Scale all padding/margins/gaps */
  --drp-cell-scale: 1;      /* Scale day cell dimensions */

  /* Colors */
  --drp-card-bg: #ffffff;
  --drp-border-color: #e5e7eb;
  --drp-primary-bg: #f3f4f6;
  --drp-primary-bg-hover: #e5e7eb;
  --drp-accent-color: #3b82f6;
  --drp-accent-color-hover: #2563eb;
  --drp-text-primary: #111827;
  --drp-text-secondary: #6b7280;
  --drp-accent-text-color: #ffffff;

  /* Input Field */
  --drp-input-background: var(--drp-card-bg);
  --drp-input-color: var(--drp-text-primary);
  --drp-input-border-color: var(--drp-border-color);
  --drp-input-border-color-hover: var(--drp-accent-color);
  --drp-input-border-color-focus: var(--drp-accent-color);
  --drp-input-placeholder-color: var(--drp-text-secondary);

  /* Typography */
  --drp-font-size-xs: 0.75rem;
  --drp-font-size-sm: 0.875rem;
  --drp-font-size-base: 1rem;
  --drp-font-weight-medium: 500;
  --drp-font-weight-semibold: 600;

  /* Borders */
  --drp-border-width-base: 1px;
  --drp-border-radius: 0.375rem;

  /* Shadows */
  --drp-shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);

  /* Transitions */
  --drp-transition-fast: 150ms;
  --drp-easing-snappy: cubic-bezier(0.4, 0.0, 0.2, 1);
}
```

### Quick Sizing Examples

```css
/* Compact size */
:root {
  --drp-font-scale: 0.875;
  --drp-spacing-scale: 0.75;
  --drp-cell-scale: 0.875;
}

/* Large size */
:root {
  --drp-font-scale: 1.125;
  --drp-spacing-scale: 1.25;
  --drp-cell-scale: 1.125;
}
```

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Browser Support

- Modern browsers with Web Components support
- Chrome/Edge 54+
- Firefox 63+
- Safari 10.1+

## License

MIT

## Credits

Extracted from the [Pure Admin](https://github.com/keenmate/pure-admin) design system.
