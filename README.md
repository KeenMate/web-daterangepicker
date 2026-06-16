# Date Range Picker Web Component

A lightweight, accessible date picker web component with excellent keyboard navigation and range selection support.

> **⚠️ Security Notice:** This component intentionally allows raw HTML in rendering callbacks and message content to give developers full control over content display. If you display user-generated content, you must sanitize it yourself. See [HTML Injection (XSS) Notice](#html-injection-xss-notice) for the complete list of affected callbacks and methods.

## What's New in v1.14.0-rc02

- **Breaking — 10 boolean attribute renames** (BlissFramework `is*`/`should*` prefix per C-NC-3): `show-seconds` → `is-seconds-shown`, `close-on-scroll` → `should-close-on-scroll`, `unified-navigation` → `is-unified-navigation-enabled`, `highlight-disabled-in-range` → `should-highlight-disabled-in-range`, plus the four `show-*-button` and `show-summary` attributes. JS property names follow the kebab→camel rule. No backward-compat aliases — update markup and code at upgrade time. Full migration table in CHANGELOG.
- **Breaking — 4 TS type renames** (closed-set suffix compliance per C-CST-8 / C-NC-11): `FormatInfo` → `FormatOptions`, `TimeFormatInfo` → `TimeFormatOptions`, `DateInfo` → `DayMetadata`, `SummaryCallbackData` → `SummaryDetail`. Affects `getDateMetadataCallback` return type and `formatSummaryCallback` argument type, both inferred at consumer call sites.
- **Fixed — sibling-picker overlap on focus switch** — clicking from input A to input B while picker A was open showed both popovers stacked for ~150–300ms before A closed. The existing inter-picker activation broadcast now also triggers `hide()` on the inactive picker, collapsing the overlap to a single paint frame.
- **FOUC prevention rule** — the picker no longer flashes as an unstyled inline element between page parse and `customElements.define(...)`. A `web-daterangepicker:not(:defined)` rule reserves the input footprint until the element upgrades.
- **`:host { display: block }`** — the custom element now defaults to block layout instead of the browser's inline default, so input width and popover positioning math hold without consumer overrides.
- **New classifier convention demos** — `examples-badges-tooltips.html` now shows the built-in `dayClass: 'event' | 'holiday'` tints and `badgeClass: 'badge-number' | 'badge-count' | 'badge-text'` styles, plus a custom-classifier example (`'salsa' | 'rumba' | 'pilates'`) via `customStylesCallback`. `examples-theming.html` adds a Test 9 panel showing how to recolor the built-in classifiers by overriding `--drp-event-color` / `--drp-holiday-color` / `--drp-badge-*` on the host.
- **Internal — BEM rename `drp-transitions-enabled` → `drp__picker--transitions-enabled`** — only affects consumers using `customStylesCallback` to inject CSS targeting the transitions class. The `enable-transitions` HTML attribute is unchanged.

## What's New in v1.14.0-rc01

- **Three new time-display UIs — clock, wheel, compact** — `time-display` now accepts four values: `rolls` (default, unchanged), `clock` (Material-style two-step face for hours then minutes, with h12 / h24 dual-ring support), `wheel` (iOS UIPickerView snap-scrolling columns with center selection band), and `compact` (iOS 14+ tappable pills with `contentEditable` typing and Arrow-key increments). All three work in `picker-mode="time"` and `picker-mode="datetime"`; `rolls` stays the default so existing time pickers are unchanged. See `examples-time-picker.html` for the demo gallery.
- **OS-aware light/dark defaults via `light-dark()`** — set `color-scheme: dark` on your page (`:root`, `body`, etc.) and the picker picks readable dark text/background colors automatically. No more enumerating ~15 `--base-*` overrides just to get usable defaults on a dark theme.
- **Drift-detection warning for calendar positioning** — if an exotic ancestor CSS property (e.g. `contain: paint`, or `container-type` in certain shadow-DOM layouts) makes the calendar land somewhere other than where the library told the browser to put it, a `console.warn` fires once with the likely culprit element and an actionable fix suggestion.
- **Calendar no longer stranded to the side when an ancestor uses `container-type`** — Floating UI was walking up to a `container-type: inline-size` ancestor (notably pure-admin's `.pa-layout__main`), but the browser wouldn't actually anchor the fixed calendar there. The library now uses a custom `getOffsetParent` that only walks up properties browsers reliably honor for fixed positioning. Same fix applied to day-cell tooltips.
- **`--base-*` taxonomy aligned with KeenMate cross-component naming** (theming change — see CHANGELOG migration table): `--drp-primary-bg` now reads `--base-hover-bg` (was `--base-main-bg`); `--drp-primary-bg-hover` now reads `--base-active-bg` (was `--base-hover-bg`). `--base-dropdown-bg` and `--base-tooltip-bg` continue to work; new chain fallbacks to `--base-elevated-bg` / `--base-inverse-bg`. Mirrors web-multiselect v1.11.0 so multi-component theming stays coherent.
- **Day hover stays visible on dark themes** — `--drp-primary-bg` now mixes 8% of the text color into the main background by default, so the hover is always a visible step toward the text. No more invisible hover when the consumer forgets to override `--base-hover-bg`.
- **Message colors (`--drp-message-*`) got dark-mode companions** — error/warning/info/success palettes now resolve via `light-dark()` instead of hardcoded bright pastels, so feedback messages stay readable on dark surfaces without overrides.
- **New dark-mode e2e suite** — 4 specs verifying WCAG-AA day-cell contrast on a dark page across fully-themed, minimal-override, and pure OS-inheritance configurations.
- **Framework-class + per-instance dark/light overrides** — set `data-theme="dark"`, `data-bs-theme="dark"` (Bootstrap 5.3+), or `class="dark"` (Tailwind) on any ancestor and the picker switches to its dark palette. Set it on the `<web-daterangepicker>` element itself to theme one instance independently of the page. Symmetric `light` selectors restore the light palette so a single widget can be forced light on a dark page.
- **CSS cascade layers** — `main.css` declares `@layer variables, component, overrides;`. Consumer-side: any unlayered `web-daterangepicker { … }` rule beats every internal rule without `!important`, and any `:root { --base-X: … }` declaration beats the variables layer.
- **CSS file naming refresh** — partials under `src/css/` no longer carry the SASS-style underscore prefix (`_variables.css` → `variables.css`, etc.). The two package-exports paths (`./css/variables`, `./css/base`) keep their public names. Consumers importing internal files directly via `./src/css/_*.css` must update their import paths.
- **Canonical Tier-2 file set.** New stylesheets `controls.css`, `floating.css`, `states.css`, `animations.css` matching the cross-component guideline. The old `tooltips.css` and `modifiers.css` partials were merged into the new files and removed.
- **BEM short-prefix class names.** Internal classes were migrated from the long `.drp-date-picker__*` form to the canonical short `.drp__*` form (`.drp__day`, `.drp__month`, `.drp__rolling-item`, etc.). The root container `.drp-date-picker` is now `.drp__picker`; `.drp-input` and the legacy `.drp-date-picker-input` aliases are unified under `.drp__input`. Public variable-only theming (`web-daterangepicker { --drp-X: ... }`) is unaffected — only consumers using `customStylesCallback` to inject CSS into the shadow root need to update their selectors. See CHANGELOG v1.16.0 for the full migration table.

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
| `should-highlight-disabled-in-range` | `boolean` | `true` | Whether to visually highlight disabled dates within a selected range. Set to `false` to only highlight enabled dates. |
| `auto-close` | `'never' \| 'selection' \| 'apply'` | `'selection'` | When to close calendar (selection = after picking, apply = after Apply button, never = manual) |
| `positioning-mode` | `'inline' \| 'floating' \| 'modal'` | `'floating'` | Calendar positioning (inline = embedded, floating = popup anchored to input, modal = centered overlay with backdrop) |
| `mobile-modal-breakpoint` | CSS length (e.g., `"640px"`, `"40em"`) | — | When configured mode is `floating`, auto-switch to `modal` below this viewport width. |
| `mobile-modal-min-height` | CSS length | — | Same idea but for viewport height — modal engages when viewport height is below the threshold. ORs with `mobile-modal-breakpoint`. |
| `is-summary-shown` | `boolean` | `true` | Show range-mode days/nights summary block. Set to `false` to omit entirely (no empty-div jump). |
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

By default, when you select a range that includes disabled dates, all dates (both enabled and disabled) within the range are visually highlighted. You can change this behavior with the `should-highlight-disabled-in-range` attribute:

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
  should-highlight-disabled-in-range="false">
</web-daterangepicker>
```

**When to use `should-highlight-disabled-in-range="false"`:**
- Selecting working weeks where you only want to see Monday-Friday highlighted
- Visual clarity when disabled dates are not relevant to the selection
- Any scenario where showing gaps in the range is clearer than showing continuous highlighting

## Theming

See [`docs/theming.md`](./docs/theming.md) for the full theming guide.
It covers the four orthogonal contracts (container, variable,
color-scheme, cascade-layer), the Theme Designer integration, the
component variables manifest, and the input-size + calendar-scaling
recipes.

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

## Known Limitations

### Consumer-data class convention — `.holiday` / `.event` / `.badge-{count,number,text}`

The shipped CSS includes default styles for a small set of class names the picker doesn't emit itself — they're applied by your code via the `dayClassMember` / `badgeClassMember` callbacks (or the equivalent `getDateMetadataCallback` return shape). The component ships compound selectors (`.drp__day.holiday`, `.drp__day.event`, `.drp__badge-cell.badge-count`, `.drp__badge-cell.badge-number`, `.drp__badge-cell.badge-text`) as ready-to-use hooks for these common conventions so the most frequent decoration cases work without writing any CSS.

This means a few CSS classes inside the shadow root don't follow strict BEM (`.<prefix>__element--modifier`) — they're consumer-data values used as discriminators next to a BEM block, not component-emitted modifiers. The BEM block (`.drp__day`, `.drp__badge-cell`) carries the component scope; the discriminator carries the data convention.

If your data uses different class names, just supply them via the callback and provide your own CSS — the defaults won't fight you. To retheme the existing defaults without rewriting the CSS, override the backing variables:

- **Holiday cell:** `--drp-holiday-color`, `--drp-holiday-bg-opacity`, `--drp-holiday-hover-bg-opacity`
- **Event cell:** `--drp-event-color`, `--drp-event-bg-opacity`, `--drp-event-hover-bg-opacity`
- **Badge types:** `--drp-badge-number-{bg,color}`, `--drp-badge-count-{bg,color}`, `--drp-badge-text-{bg,color}`

These variables are part of the public theming surface (added in v1.6.0; see CHANGELOG).

## Changelog

See [CHANGELOG.md](https://github.com/keenmate/web-daterangepicker/blob/main/CHANGELOG.md) for version history and migration guides.

## License

MIT

## Credits

Extracted from the [Pure Admin](https://github.com/keenmate/pure-admin) design system.
