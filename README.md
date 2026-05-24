# Date Range Picker Web Component

A lightweight, accessible date picker web component with excellent keyboard navigation and range selection support.

> **⚠️ Security Notice:** This component intentionally allows raw HTML in rendering callbacks and message content to give developers full control over content display. If you display user-generated content, you must sanitize it yourself. See [HTML Injection (XSS) Notice](#html-injection-xss-notice) for the complete list of affected callbacks and methods.

## What's New in v1.14.0

- **Time picker and datetime mode** — new `picker-mode` attribute with values `date` (default, unchanged), `time` (rolls-only popover for hours/minutes), and `datetime` (calendar grid + time rolls side-by-side in one popover). Orthogonal to the existing `selection-mode` so date-mode behavior is untouched. v1 supports time/datetime in `single` mode only; `range`/`multiple` silently falls back with a console warning (datetime range lands in v1.15).
- **Rolling-list time UI reuses the year/month picker pattern** — two-to-four roll columns (hours, minutes, optional seconds, optional AM/PM) sharing the existing `.drp-date-picker__rolling-list` + `.drp-date-picker__rolling-item` classes, so all existing `--drp-rolling-*` theming hooks apply. Click an item to commit; the highlighted item snaps to the current selection.
- **Time config attributes** — `time-format-mask` (tokens `HH`/`H`/`hh`/`h`/`mm`/`m`/`ss`/`s`/`a`, default `HH:mm`), `display-time-format-mask` (localized placeholder parallel to `display-format-mask`), `time-step` (minute/second increment in the rolls, default `1`), `hour-cycle` (`h12`/`h24`, auto-derived from the mask), `show-seconds` (auto-derived from the `s` token), `show-now-button` (defaults true in time/datetime, parallel to `show-today-button`).
- **`autoClose` defaults to `'apply'` in time/datetime modes** so each roll-click updates the pending selection rather than slamming the popover shut between hour and minute. User-supplied `auto-close` still wins.
- **`normalizeDate()` gained a `preserveTime` flag** (default `false`, so every existing caller is unchanged). `initialDate` parsing flips it on in time/datetime, so `initial-date="2026-05-23T14:30"` survives both the parse and ISO string handling. Disabled-dates / range-validation helpers stay midnight by design.
- **New locale strings** — `time`, `now`, `am`, `pm` added to `LocaleStrings` and hardcoded for the four bundled locales (en/de/fr/es). `customStrings` override still works.
- **CSS surface** — new `_time-picker.css` partial with `--drp-time-picker-*` variables. New BEM classes `.drp-date-picker__main`, `.drp-date-picker__time-picker`, `.drp-date-picker__time-rolls`, `.drp-date-picker__time-roll`, `.drp-date-picker__time-separator`, `.drp-date-picker__time-label`, plus root modifiers `.drp-date-picker--time` and `.drp-date-picker--datetime`. Container query collapses the date|time row to vertical at narrow widths (mobile / modal).
- **v1 scope limitations** (documented, not bugs): time/datetime + range/multiple falls back; datetime + `month-layout="grid"` forces horizontal (warning); input mask only parses dates (committed H/M/S survive reopens because the picker's selection is authoritative); per-hour disabling not supported (`disabledDates` is whole-day only); keyboard navigation short-circuited in time mode for v1; `min-time` / `max-time` deferred.

## What's New in v1.13.0

- **Live hover preview in range mode** — after the first click sets a start date, hovering over candidate end days now paints the would-be range live so users can see what a commit would produce *before* they click. Behavior is mode-aware per `disabled-dates-handling`: `allow` paints the full range with disabled-day overlays on top; `prevent` flips to a red `--hover-preview-invalid` tint when the click would be rejected (telegraphs the rejection); `block` snaps backward to the last enabled day before a disabled gap (teaches the snap behaviour in advance); `split` leaves disabled days bare so the visual gaps communicate the upcoming sub-range split. Auto-swaps direction when hovering before the committed start. Cleanup wired on commit, mouseleave, drag-start, hide, and destroy. Two new CSS hooks: `--drp-day-hover-preview-bg-opacity` and `--drp-day-hover-preview-invalid-bg-opacity` (both default `0.18`). 10 specs in `e2e/hover-preview.spec.ts`.
- **Property setters for `customStrings` and `monthNames` on the web component** — previously reachable only via `picker.updateOptions(...)` (which leaked the internal `picker` instance) or the dedicated `setMonthNames()` method. Both now work like the other ~35 property setters: `el.customStrings = { today: 'Jump' }` or `el.monthNames = ['Enero', ...]`. `setMonthNames()` kept as a deprecated alias that forwards to the new setter.
- **Eight new HTML attributes for declarative parity with complex-data properties** — `disabled-dates` (comma-separated ISO dates; whitespace tolerated; invalid entries silently dropped) plus the seven `*-member` mappings (`date-member`, `badge-text-member`, `badge-class-member`, `day-class-member`, `badge-tooltip-member`, `day-tooltip-member`, `is-disabled-member`). Same property-wins precedence as the other dual-path options — the JS property wins when both paths are populated.
- **Weekend / per-weekday CSS hooks on day cells** — `.drp-date-picker__day--weekend` modifier class on Saturday/Sunday plus `data-weekday="0..6"` (matching `Date.prototype.getDay()`) on every cell. No default styling shipped — pure theming surface. `[data-weekday="5"]` targets Friday only, `--weekend` covers the standard Sat/Sun pair.
- **Range typing separator changed to `" - "`** — auto-injected separator after a complete start date now matches the committed range format (`"YYYY-MM-DD - YYYY-MM-DD"`); the keydown whitelist accepts `-` and space instead of the English-only `t`/`o`. Compact pasted form `2026-06-10-2026-06-15` is also accepted now via position-based fallback (anything past `maxLength` is the end side, with leading dashes/spaces stripped). **Migration:** anyone relying on literal `" to "` typing needs to switch to `-`.
- **`displayFormatMask` doubles as the input placeholder** when no explicit `placeholder` is set (explicit `placeholder=` still wins). Closes the loop on the option's documented purpose: localized format hint (`tt.mm.jjjj`, `dd.mm.rrrr`, `dd/mm/aaaa`) shown to users in their language without requiring a separate placeholder attribute.
- **Pre-upgrade property assignment now works for all 35+ setters** — `actionButtons` and the other complex-data setters previously required `customElements.whenDefined()` because properties assigned to a not-yet-upgraded element became own-properties that permanently shadowed the class accessors. New `_liftPreUpgradeProperties()` in `connectedCallback` walks the prototype chain for `set` descriptors and re-routes any matching own-properties through their accessors. Consumers can drop `whenDefined()` calls before setting complex data.
- **Playwright e2e harness — 172 specs** covering selection, triggers, multi-month, keyboard, input behavior, date restrictions, disabled-handling, visual states, positioning, locale, theming, callbacks, tooltips, and the hover preview. Run with `npm run test:e2e` or `make test-e2e`.

## Features

- 🎯 **Input Masking** - Auto-format dates as you type with separator insertion
- ⌨️ **Keyboard Navigation** - Full keyboard support (arrows, Enter, Esc, PageUp/Down, Home/End)
- 📅 **Rolling Selector** - Innovative scrollable year/month picker
- 📊 **Multi-Month Display** - Show 1-3+ months side by side with independent navigation
- 🎨 **Themeable** - All styles use CSS custom properties (`--drp-*`)
- 🖱️ **Drag-to-Adjust** - Drag range endpoints to adjust selection (range mode)
- 👀 **Live Hover Preview** - See the would-be range painted live as you move toward an end date (range mode, mode-aware per `disabled-dates-handling`)
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
| `disabled-dates` | `string` | - | Comma-separated ISO dates to disable (e.g., `"2026-06-13, 2026-06-14, 2026-12-25"`). The `disabledDates` property still wins if both paths are set. |
| `disabled-dates-handling` | `'allow' \| 'prevent' \| 'block' \| 'split' \| 'individual'` | `'allow'` | How to handle range selections over disabled dates (see [Range Selection Modes](#range-selection-modes)) |
| `display-format-mask` | `string` | Same as `date-format-mask` | Localized format hint shown to users (e.g., `'dd/mm/aaaa'` Spanish, `'tt.mm.jjjj'` German). Used as the input placeholder when no explicit `placeholder` is set. Validation still uses `date-format-mask`. |
| `highlight-disabled-in-range` | `boolean` | `true` | Whether to visually highlight disabled dates within a selected range. Set to `false` to only highlight enabled dates. |
| `auto-close` | `'never' \| 'selection' \| 'apply'` | `'selection'` | When to close calendar (selection = after picking, apply = after Apply button, never = manual) |
| `positioning-mode` | `'inline' \| 'floating' \| 'modal'` | `'floating'` | Calendar positioning (inline = embedded, floating = popup anchored to input, modal = centered overlay with backdrop) |
| `mobile-modal-breakpoint` | CSS length (e.g., `"640px"`, `"40em"`) | — | When configured mode is `floating`, auto-switch to `modal` below this viewport width. |
| `mobile-modal-min-height` | CSS length | — | Same idea but for viewport height — modal engages when viewport height is below the threshold. ORs with `mobile-modal-breakpoint`. |
| `show-summary` | `boolean` | `true` | Show range-mode days/nights summary block. Set to `false` to omit entirely (no empty-div jump). |
| `input-size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Input field size (floating/modal modes only) |
| `enable-transitions` | `boolean` | `false` | Enable CSS transitions/animations |
| `date-member` | `string` | `'date'` | Field name on `specialDates` objects holding the date. Lets you reuse existing data shapes without renaming keys. |
| `badge-text-member` | `string` | `'badgeText'` | Field name on `specialDates` objects holding the badge label. |
| `badge-class-member` | `string` | `'badgeClass'` | Field name on `specialDates` objects holding the badge's extra CSS class. |
| `day-class-member` | `string` | `'dayClass'` | Field name on `specialDates` objects holding the day cell's extra CSS class. |
| `badge-tooltip-member` | `string` | `'badgeTooltip'` | Field name on `specialDates` objects holding the badge tooltip text. |
| `day-tooltip-member` | `string` | `'dayTooltip'` | Field name on `specialDates` objects holding the day tooltip text. |
| `is-disabled-member` | `string` | `'isDisabled'` | Field name on `specialDates` objects holding the disabled flag. |

## Properties

```typescript
// Get/set properties (use camelCase in JavaScript)
picker.selectionMode = 'range';
picker.dateFormatMask = 'DD.MM.YYYY';
picker.value = '2025-11-15';
picker.disabled = true;

// Complex data (arrays / objects / callbacks) — set via property, not attribute
picker.disabledDates = ['2026-06-13', '2026-06-14'];
picker.specialDates  = [{ date: '2026-12-25', badgeText: '🎄', badgeTooltip: 'Christmas' }];

// Localization overrides
picker.customStrings = { today: 'Jump', clear: 'Wipe' };
picker.monthNames    = ['01','02','03','04','05','06','07','08','09','10','11','12'];
```

> Property setters work even before the element is upgraded — assignments made before `customElements.define()` runs are routed through the accessors during `connectedCallback`, so you don't need `customElements.whenDefined('web-daterangepicker')` guards.

## Methods

| Method | Description |
|--------|-------------|
| `show()` | Show the calendar (floating mode only) |
| `hide()` | Hide the calendar |
| `toggle()` | Toggle calendar visibility |
| `clearSelection()` | Clear the current selection |
| `getInputValue()` | Get the current value as a string |
| `setInputValue(value: string)` | Set the value |
| `showMessage(html: string)` | Display a message in the calendar with custom HTML content |
| `hideMessage()` | Hide the currently displayed message |

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| `date-select` | `{ date?, dateRange?, formattedValue }` | Fired when a date is selected |
| `change` | `{ date?, dateRange?, formattedValue }` | Fired when selection changes |
| `custom-action` | `{ [key: string]: string }` | Fired when a button with `data-action="custom"` is clicked. Detail contains all `data-*` attributes as camelCase keys. |

> There are no separate `apply` or `cancel` events. The Apply button commits the pending selection and dispatches `change`. Pressing Escape with an uncommitted selection silently restores the input value and fires nothing.

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

## ⚠️ Working with Dates Across Timezones

This is a **calendar-date picker** — it represents days, not moments in time. Skipping this section will eventually cost you a one-day-shift bug, so please read it.

### How the picker represents dates

When the user clicks April 30, the picker stores `new Date(year, month - 1, day)` — that's **local midnight** on the picked day. The same is true for `selectedDate`, `selectedStartDate`, `selectedEndDate`, and the Date passed to every callback. There's no UTC anywhere in the picker's internal lookup paths.

### The trap: `Date.prototype.toISOString()`

`toISOString()` returns the date in **UTC**. For any user not in UTC, that string represents a different *calendar* day than the one they see:

```js
// User in Moscow (UTC+3) picks April 30.
// selectedDate is `new Date(2026, 3, 30)` = April 30 00:00 MSK = April 29 21:00 UTC.

selectedDate.toISOString().split('T')[0]  // → "2026-04-29"  ❌ wrong day
selectedDate.getDate()                     // → 30           ✅ what the user clicked
```

This is what broke the example demos in earlier versions: lookup keys built from `dayOffset()` (local) didn't match keys derived from `toISOString()` (UTC). Badges rendered one day late, tooltips on the right day. Same bug strikes any user who tries `date.toISOString()` to key into a `Map<string, DateInfo>`.

### The rule

**Format dates from local components, never from `toISOString()`:**

```js
const toLocalISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

picker.getDateMetadataCallback = (date) => {
  const dateStr = toLocalISO(date);    // ✅ matches what the user sees
  // …lookup, return DateInfo…
};
```

### Sending dates to a server / between users

`Date` objects can't survive transport — they get serialized. The serialization format determines whether the date stays on the right calendar day across timezones:

| What you send | Russian user picks Apr 30 → LA user receives | Verdict |
|---|---|---|
| `event.detail.formattedValue` (`"2026-04-30"`) | `"2026-04-30"` → set on LA picker → April 30 | ✅ |
| `JSON.stringify(detail)` (Date → ISO string) | `"2026-04-29T21:00:00.000Z"` → April 29 in LA | ❌ |
| `selectedDate.toISOString()` | `"2026-04-29T21:00:00.000Z"` → April 29 in LA | ❌ |
| `toLocalISO(selectedDate)` (`"2026-04-30"`) | `"2026-04-30"` | ✅ |

**Recommendation:** transmit calendar dates as `YYYY-MM-DD` **strings**, never as ISO timestamps or raw `Date`/JSON-serialized payloads.

### Receiving a date string

`new Date("2026-04-30")` parses as **UTC midnight** — surprising for non-UTC users (in LA it'd be April 29). Build local Dates from the string parts:

```js
// ❌ Don't do this
const d = new Date("2026-04-30");                    // UTC midnight, surprising in non-UTC

// ✅ Do this
const [y, m, day] = "2026-04-30".split("-").map(Number);
const localDate = new Date(y, m - 1, day);           // April 30 local — what the user picked

// Or, if you just need to set the picker:
picker.setInputValue("2026-04-30");                  // picker handles parsing internally
picker.value = "2026-04-30";                         // attribute setter
```

### Quick checklist

- [ ] Picker callbacks: format Dates with `toLocalISO()`, not `toISOString()`
- [ ] Outgoing dates (server, URL, localStorage): send `YYYY-MM-DD` strings
- [ ] Incoming dates: prefer `picker.setInputValue("YYYY-MM-DD")` over manual `new Date(...)` parsing
- [ ] Map/dictionary keys for date lookups: build keys with `toLocalISO()` and lookup the same way

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
// Local-date formatter — see "Working with Dates Across Timezones" above.
// Don't use date.toISOString() here; it shifts by one day in non-UTC timezones.
const toLocalISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

picker.getDateMetadataCallback = (date) => {
  const dateStr = toLocalISO(date);

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

Since the component uses Shadow DOM, inject custom styles via the `customStylesCallback`:

```javascript
picker.customStylesCallback = () => `
  /* Holiday styling */
  .drp-date-picker__day.holiday {
    background-color: rgba(239, 68, 68, 0.1);
  }

  /* Event styling */
  .drp-date-picker__day.event {
    background-color: rgba(16, 185, 129, 0.1);
  }

  /* Custom class example */
  .drp-date-picker__day.peak-season {
    background-color: rgba(251, 191, 36, 0.15);
    font-weight: 600;
  }
`;
```

### Date Selection Validation (beforeDateSelectCallback)

Validate or modify date selections before they're applied. Supports async validation (e.g., API calls):

```javascript
const picker = document.querySelector('web-daterangepicker');

picker.beforeDateSelectCallback = async (selection) => {
  // selection is Date (single mode) or { start: Date, end: Date } (range mode)

  // Example: Check availability via API.
  // Send YYYY-MM-DD strings, not toISOString() — the picker is a calendar-date
  // picker, and ISO timestamps shift by ±1 day across timezones.
  const response = await fetch('/api/check-availability', {
    method: 'POST',
    body: JSON.stringify({
      start: toLocalISO(selection.start),
      end: toLocalISO(selection.end)
    })
  });
  const { available, message } = await response.json();

  if (!available) {
    return {
      action: 'restore',
      message: message,
      showInvalidRange: true  // Keep selection visible with error styling
    };
  }

  return { action: 'accept' };
};
```

**Return object options:**

| Property | Type | Description |
|----------|------|-------------|
| `action` | `'accept' \| 'adjust' \| 'restore' \| 'clear'` | **Required.** What to do with the selection |
| `message` | `string` | Optional message to display in the calendar |
| `showInvalidRange` | `boolean` | When `true` with `action: 'restore'`, keeps the invalid selection visible with red error styling |
| `adjustedDate` | `Date` | For `action: 'adjust'` in single mode - the corrected date |
| `adjustedStartDate` | `Date` | For `action: 'adjust'` in range mode - the corrected start date |
| `adjustedEndDate` | `Date` | For `action: 'adjust'` in range mode - the corrected end date |

**Action behaviors:**

- **`accept`**: Apply the selection as-is. Hides any existing message.
- **`adjust`**: Apply corrected dates instead (use with `adjustedDate` or `adjustedStartDate`/`adjustedEndDate`)
- **`restore`**: Revert to previous selection. Use `showInvalidRange: true` to show what was attempted.
- **`clear`**: Clear the selection entirely.

**Example: Minimum nights validation with error display:**

```javascript
picker.beforeDateSelectCallback = (range) => {
  const nights = Math.floor((range.end - range.start) / (1000 * 60 * 60 * 24));

  if (nights < 2) {
    return {
      action: 'restore',
      message: 'Minimum 2 nights required',
      showInvalidRange: true  // Shows attempted range with red styling
    };
  }

  if (nights > 14) {
    return {
      action: 'restore',
      message: 'Maximum 14 nights allowed',
      showInvalidRange: true
    };
  }

  return { action: 'accept' };
};
```

### Bulk Metadata Loading (beforeMonthChangedCallback)

Load metadata for all visible dates in a single API call when the user navigates months. Much more efficient than `getDateMetadataCallback` which is called per-date:

```javascript
const picker = document.querySelector('web-daterangepicker');

picker.beforeMonthChangedCallback = async (context) => {
  // context: { year, month, monthIndex, firstVisibleDate, lastVisibleDate }

  // Fetch availability for all visible dates in one call.
  // Use toLocalISO (see "Working with Dates Across Timezones") so the
  // server receives the calendar dates the user actually sees.
  const response = await fetch('/api/availability', {
    method: 'POST',
    body: JSON.stringify({
      start: toLocalISO(context.firstVisibleDate),
      end: toLocalISO(context.lastVisibleDate)
    })
  });
  const data = await response.json();

  // Build metadata map (key: YYYY-MM-DD, value: DateInfo)
  const metadata = new Map();
  data.forEach(day => {
    metadata.set(day.date, {
      badgeText: `$${day.price}`,
      isDisabled: !day.available,
      dayTooltip: `${day.roomsLeft} rooms available`
    });
  });

  return { action: 'accept', metadata };
};
```

**Return object options:**

| Property | Type | Description |
|----------|------|-------------|
| `action` | `'accept' \| 'block'` | **Required.** Allow or prevent month navigation |
| `metadata` | `Map<string, DateInfo>` | Bulk metadata keyed by `YYYY-MM-DD`. Cached and used instead of `getDateMetadataCallback` |
| `monthHeaders` | `Map<string, string>` | Custom month headers keyed by `YYYY-MM` (e.g., `"2026-01"` → `"Jan 2026 (5 rooms)"`) |
| `message` | `string` | Optional message to display (useful with `action: 'block'`) |

**Performance:** 1 API call per month navigation vs 35-42 calls with `getDateMetadataCallback`.

### Messages & Custom Actions

Display contextual messages in the calendar with interactive buttons:

```javascript
const picker = document.querySelector('web-daterangepicker');

// Show a simple message
picker.showMessage('<p>Please select a check-in date</p>');

// Show a message with a close button
picker.showMessage(`
  <p>Weekend dates have higher rates</p>
  <button data-action="close-message">Got it</button>
`);

// Show a message with custom action buttons
picker.showMessage(`
  <p>These dates are unavailable. Try:</p>
  <button data-action="custom" data-start-date="2026-01-14" data-end-date="2026-01-17">
    Jan 14 - Jan 17
  </button>
`);

// Handle custom action button clicks
picker.addEventListener('custom-action', (e) => {
  const { startDate, endDate } = e.detail;
  if (startDate && endDate) {
    picker.selectedRanges = [{
      start: new Date(startDate),
      end: new Date(endDate)
    }];
    picker.hideMessage();
  }
});

// Hide message programmatically
picker.hideMessage();
```

**Built-in button actions:**
- `data-action="close-message"` - Closes the message (no event fired)
- `data-action="custom"` - Fires `custom-action` event with all `data-*` attributes

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

### Theme Designer

The easiest way to customize the appearance of this component is using the **KeenMate Theme Designer** at:

**[theme-designer.keenmate.dev](https://theme-designer.keenmate.dev)**

#### How It Works

1. **Choose 3 base colors** - background, text, and accent
2. **Preview changes live** - see your theme applied instantly
3. **Fine-tune individual variables** - lock specific values while adjusting others
4. **Export your theme** - copy CSS, JSON, or SCSS to your project

#### CSS Variable Layers

KeenMate components support a **two-layer theming architecture**:

**Standalone Mode (Simple)** - Just override the component-specific variables you need:

```css
:root {
  --drp-accent-color: #your-brand-color;
  --drp-primary-bg: #your-background;
  --drp-text-primary: #your-text-color;
}
```

**Cascading Mode (Multi-Component)** - When using multiple KeenMate components, you can define a shared base layer:

```css
:root {
  /* Base layer - single source of truth */
  --base-accent-color: #3b82f6;
  --base-primary-bg: #ffffff;
  --base-text-primary: #111827;

  /* Components reference base layer */
  --ms-accent-color: var(--base-accent-color);
  --drp-accent-color: var(--base-accent-color);
}
```

Change `--base-accent-color` once → all components update automatically.

#### Unified Variable Naming

All KeenMate components follow a consistent naming convention for **Tier 1 variables** (core theming):

| Purpose | web-multiselect | web-daterangepicker |
|---------|-----------------|---------------------|
| Brand color | `--ms-accent-color` | `--drp-accent-color` |
| Background | `--ms-primary-bg` | `--drp-primary-bg` |
| Text color | `--ms-text-primary` | `--drp-text-primary` |
| Text on accent | `--ms-text-on-accent` | `--drp-text-on-accent` |
| Border color | `--ms-border-color` | `--drp-border-color` |

Learn the pattern once, apply it across all components.

#### Component Variables Manifest

This package exports a `component-variables.manifest.json` file that documents all supported CSS variables for tooling integration (e.g., Theme Designer, IDE autocomplete):

```javascript
import manifest from '@keenmate/web-daterangepicker/component-variables.manifest.json';
// manifest.baseVariables - list of --base-* variables the component responds to
// manifest.componentVariables - list of --drp-* component-specific variables
```

### CSS Custom Properties

Customize the appearance using CSS custom properties:

```css
:root {
  /* Base Unit - scale entire component by changing this */
  --drp-rem: 10px;          /* Default base unit (change to scale everything) */

  /* Colors */
  --drp-dropdown-background: #ffffff;
  --drp-border-color: #e5e7eb;
  --drp-primary-bg: #f3f4f6;
  --drp-primary-bg-hover: #e5e7eb;
  --drp-accent-color: #3b82f6;
  --drp-accent-color-hover: #2563eb;
  --drp-text-primary: #111827;
  --drp-text-secondary: #6b7280;
  --drp-text-on-accent: #ffffff;

  /* Input Field */
  --drp-input-background: var(--drp-dropdown-background);
  --drp-input-color: var(--drp-text-primary);
  --drp-input-border: var(--base-input-border, var(--drp-border));
  --drp-input-border-hover: var(--base-input-border-hover, var(--drp-border-width-base) solid var(--drp-accent-color));
  --drp-input-border-focus: var(--base-input-border-focus, var(--drp-border-width-base) solid var(--drp-accent-color));
  --drp-input-placeholder-color: var(--drp-text-secondary);

  /* Typography (all scale with --drp-rem) */
  --drp-font-size-xs: calc(1.2 * var(--drp-rem));   /* 12px */
  --drp-font-size-sm: calc(1.4 * var(--drp-rem));   /* 14px */
  --drp-font-size-base: calc(1.6 * var(--drp-rem)); /* 16px */
  --drp-font-weight-medium: 500;
  --drp-font-weight-semibold: 600;

  /* Spacing (all scale with --drp-rem) */
  --drp-spacing-xs: calc(0.4 * var(--drp-rem));  /* 4px */
  --drp-spacing-sm: calc(0.8 * var(--drp-rem));  /* 8px */
  --drp-spacing-md: calc(1.6 * var(--drp-rem));  /* 16px */

  /* Borders */
  --drp-border-width-base: 1px;
  --drp-border-radius-sm: calc(var(--base-border-radius-sm, 0.4) * var(--drp-rem));  /* 4px - day cells, tooltips */
  --drp-border-radius-md: calc(var(--base-border-radius-md, 0.6) * var(--drp-rem));  /* 6px - inputs, buttons */
  --drp-border-radius-lg: calc(var(--base-border-radius-lg, 0.8) * var(--drp-rem));  /* 8px - calendar, dropdowns */
  --drp-border-radius: var(--drp-border-radius-md);  /* default alias */

  /* Shadows */
  --drp-shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);

  /* Transitions */
  --drp-transition-fast: 150ms;
  --drp-easing-snappy: cubic-bezier(0.4, 0.0, 0.2, 1);
}
```

### Input Size Scale

The component uses a 10px-based sizing system (`--drp-rem: 10px`) for clean, predictable dimensions:

| Size | Attribute | Height | Base Variable |
|------|-----------|--------|---------------|
| XS   | `input-size="xs"` | 31px | `--base-input-size-xs-height` |
| SM   | `input-size="sm"` | 33px | `--base-input-size-sm-height` |
| MD   | `input-size="md"` | 35px (default) | `--base-input-size-md-height` |
| LG   | `input-size="lg"` | 38px | `--base-input-size-lg-height` |
| XL   | `input-size="xl"` | 41px | `--base-input-size-xl-height` |

**Theme Designer Integration**: Input heights reference `--base-input-size-*-height` variables from the [Theme Designer](https://theme-designer.keenmate.dev). This ensures consistent input heights across all KeenMate components (web-multiselect, web-daterangepicker).

For complete size variable reference (font sizes, padding, spacing), see [SIZES.md](SIZES.md).

#### Customizing Input Heights

Four ways to customize input dimensions:

```css
/* Option 1: Via Theme Designer base variables (recommended for multi-component consistency) */
:root {
  --base-input-size-md-height: 4.2;  /* All components: 42px at 10px rem */
}

/* Option 2: Direct px override */
web-daterangepicker {
  --drp-input-size-md-height: 42px;
}

/* Option 3: Scale all sizes via --drp-rem */
web-daterangepicker {
  --drp-rem: 12px;  /* MD = 3.5 × 12 = 42px */
}

/* Option 4: Override specific size with calc */
web-daterangepicker {
  --drp-input-size-md-height: calc(4.2 * var(--drp-rem));
}
```

### Calendar Scaling

Scale the entire calendar by setting `--drp-rem` directly on the `<web-daterangepicker>` element:

```css
/* Compact size (80%) */
web-daterangepicker.compact {
  --drp-rem: 8px;
}

/* Large size (150%) */
web-daterangepicker.large {
  --drp-rem: 15px;
}

/* Or use inline style */
<web-daterangepicker style="--drp-rem: 12px;"></web-daterangepicker>
```

**Important:** Due to Shadow DOM, CSS variables must be set on the `<web-daterangepicker>` element itself (via class or inline style), not on a wrapper div.

For fine-grained control, override individual variables:

```css
web-daterangepicker.custom {
  --drp-rem: 12px;
  --drp-spacing-xs: 2px;  /* Tighter gaps */
  --drp-font-size-base: 18px;  /* Larger text */
}
```

See [examples-sizes.html](examples-sizes.html) for interactive demos.

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

- Modern browsers with Web Components and CSS `color-mix()` support
- Chrome/Edge 111+
- Firefox 113+
- Safari 16.2+

For older browser support, use the compiled `dist/style.css` which is processed by Vite.

## HTML Injection (XSS) Notice

The following callbacks and methods allow **raw HTML injection** and are intentionally **NOT XSS-safe**. This gives developers full control over rendering but requires sanitizing untrusted data:

| Callback/Method | Output Used In | Risk Level |
|-----------------|---------------|------------|
| `showMessage(html)` | Message area (innerHTML) | HTML injection |
| `renderDayCallback` | Day cells (innerHTML) | HTML injection |
| `renderDayContentCallback` | Day cells (innerHTML) | HTML injection |
| `getDateMetadataCallback` (badgeText, dayTooltip) | Badges/tooltips (innerHTML) | HTML injection |
| `formatSummaryCallback` | Summary display (innerHTML) | HTML injection |
| `getMonthHeaderCallback` | Month headers (innerHTML) | HTML injection |
| `getUnifiedHeaderCallback` | Unified header (innerHTML) | HTML injection |
| `customStylesCallback` | Style tag (textContent) | CSS injection |
| `actionButtons[].label` | Button labels (innerHTML) | HTML injection |

**Safe callbacks** (output is escaped or used as data):
- `beforeDateSelectCallback`, `beforeMonthChangedCallback` (return action objects)
- `onSelect`, `onChange` (event handlers)
- `getDateMetadataCallback` (isDisabled, dayClass, badgeClass - CSS class names only)

**If displaying user-generated content**, sanitize it before passing to these callbacks or methods.

## Changelog

See [CHANGELOG.md](https://github.com/keenmate/web-daterangepicker/blob/main/CHANGELOG.md) for version history and migration guides.

## License

MIT

## Credits

Extracted from the [Pure Admin](https://github.com/keenmate/pure-admin) design system.
