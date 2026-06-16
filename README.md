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

## API reference

The full attribute / property / method / event surface, advanced
callbacks, range modes, and the standalone-class instantiation guide
live in [`docs/usage.md`](./docs/usage.md). It also includes the
**"Working with dates across timezones"** primer that's worth a read
before shipping.

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
