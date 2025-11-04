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
- ✨ **Modern** - Web Component with Shadow DOM, TypeScript, bundled with Vite

## Installation

```bash
npm install @keenmate/web-daterangepicker
```

## Usage

### Basic HTML

```html
<!-- Single date picker -->
<date-range-picker
  mode="single"
  format="YYYY-MM-DD"
  placeholder="Select date"
></date-range-picker>

<!-- Date range picker -->
<date-range-picker
  mode="range"
  format="YYYY-MM-DD"
  months-to-show="2"
  placeholder="Select date range"
></date-range-picker>
```

### With JavaScript/TypeScript

```typescript
// Import the component (includes styles)
import '@keenmate/web-daterangepicker';

// Or import styles separately if needed
import '@keenmate/web-daterangepicker/style.css';

const picker = document.querySelector('date-range-picker');

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
picker.clear();       // Clear selection
picker.getValue();    // Get current value
picker.setValue('2025-11-15'); // Set value
```

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `mode` | `'single' \| 'range'` | `'single'` | Single date or date range selection |
| `format` | `string` | `'YYYY-MM-DD'` | Date format (YYYY-MM-DD, DD.MM.YYYY, MM/DD/YYYY, etc.) |
| `months-to-show` | `number` | `1` (single), `2` (range) | Number of months to display |
| `trigger` | `'auto' \| 'button'` | `'auto'` | How to open calendar (auto = click/focus, button = button only) |
| `value` | `string` | - | Current value |
| `placeholder` | `string` | - | Input placeholder text |
| `disabled` | `boolean` | `false` | Disable the picker |

## Properties

```typescript
// Get/set properties
picker.mode = 'range';
picker.format = 'DD.MM.YYYY';
picker.value = '2025-11-15';
picker.disabled = true;
```

## Methods

| Method | Description |
|--------|-------------|
| `show()` | Show the calendar |
| `hide()` | Hide the calendar |
| `toggle()` | Toggle calendar visibility |
| `clear()` | Clear the current selection |
| `getValue()` | Get the current value as a string |
| `setValue(value: string)` | Set the value |

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

## Theming

Customize the appearance using CSS custom properties:

```css
:root {
  /* Colors */
  --drp-card-bg: #ffffff;
  --drp-border-color: #e5e7eb;
  --drp-primary-bg: #f3f4f6;
  --drp-primary-bg-hover: #e5e7eb;
  --drp-accent-color: #3b82f6;
  --drp-accent-color-hover: #2563eb;
  --drp-text-primary: #111827;
  --drp-text-secondary: #6b7280;

  /* Spacing */
  --drp-spacing-xs: 0.25rem;
  --drp-spacing-sm: 0.5rem;
  --drp-spacing-md: 1rem;
  --drp-spacing-lg: 1.5rem;
  --drp-spacing-xl: 2rem;

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
