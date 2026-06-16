# Date Range Picker Web Component

A lightweight, framework-agnostic date picker that ships as a single
custom element. Keyboard-first navigation, single / range / multiple
selection modes, optional time + datetime modes, and OS-aware dark
mode out of the box.

> **⚠️ Security Notice:** This component intentionally allows raw HTML
> in rendering callbacks and message content to give developers full
> control over content display. If you display user-generated content,
> you must sanitize it yourself. See [HTML Injection (XSS) Notice](#html-injection-xss-notice)
> for the complete list of affected callbacks and methods.

## What is it

`@keenmate/web-daterangepicker` is a date picker that runs as a Web
Component — drop the `<web-daterangepicker>` element into any HTML
page (or any framework that speaks DOM: React, Vue, Svelte, Angular,
plain HTML) and it works. No JavaScript framework integration to
build. No virtualized rendering. No copy-pasted theme tokens to keep
in sync.

It covers the full date-picker matrix in one component: **single date**
or **date range** selection; **single / range / multiple** modes;
**date**, **time**, or **datetime** picker modes with four time-display
UIs (rolls, Material clock face, iOS wheel, iOS compact pills);
**multi-month** grids; **input masking** with progressive auto-format
as the user types; **drag-to-adjust** for range endpoints; **disabled
dates** with five different range-traversal strategies; **special
dates** with badges, tooltips, and `dayClass` / `badgeClass`
discriminator hooks; **localized** week start, month names, and labels;
and **async validation** via `beforeDateSelectCallback` with optional
bulk metadata loading per month.

What makes it different from the rest of the date-picker ecosystem:

- **No JavaScript dark-mode detection.** The picker reacts to five
  separate CSS-only signals (OS `prefers-color-scheme`, page-level
  `color-scheme`, framework class on an ancestor, per-instance
  `data-theme` attribute, explicit `light` override) via `light-dark()`
  and `:host-context(...)` selectors. Set whichever your page already
  uses; it flips automatically.
- **Theme Designer integration.** Optional. If you use the KeenMate
  Theme Designer at [theme-designer.keenmate.dev](https://theme-designer.keenmate.dev),
  the picker reads the cross-component `--base-*` taxonomy so one
  theme drives every KeenMate component on the page.
- **One component, every selection shape.** Date / range / multiple /
  time / datetime in one custom element with one consistent API —
  switch by changing one attribute, not by installing a different
  package.
- **First-class keyboard.** Arrow keys, Home / End, Ctrl+Home / End,
  Tab between month columns, `T` to jump to today. Modal mode blurs
  the input so the mobile soft-keyboard collapses.

For a more honest accessibility audit including current ARIA gaps,
see [`docs/accessibility.md`](./docs/accessibility.md).

## What's new

**v1.14.0-rc02** (latest) — BlissFramework guidelines alignment +
sibling-picker overlap fix. See [`CHANGELOG.md`](./CHANGELOG.md) for
the full migration table and history.

## Demos & docs

- 🚀 [Live demo](https://web-daterangepicker.keenmate.dev)
- 📘 [Usage / API reference](./docs/usage.md)
- 🎨 [Theming contract](./docs/theming.md)
- 📚 [Examples / cookbook](./docs/examples.md)
- ♿ [Accessibility](./docs/accessibility.md)

## Install

```bash
npm install @keenmate/web-daterangepicker
```

`rc` releases are tagged separately — install with `@rc` or pin the
exact version:

```bash
npm install @keenmate/web-daterangepicker@rc
```

## Quick start

### Basic HTML

```html
<!-- Single date -->
<web-daterangepicker
  selection-mode="single"
  date-format-mask="YYYY-MM-DD"
  placeholder="Select date"
></web-daterangepicker>

<!-- Date range -->
<web-daterangepicker
  selection-mode="range"
  date-format-mask="YYYY-MM-DD"
  visible-months-count="2"
  placeholder="Select date range"
></web-daterangepicker>
```

### With JavaScript / TypeScript

```ts
// Import the component (registers <web-daterangepicker> + injects styles)
import '@keenmate/web-daterangepicker';

const picker = document.querySelector('web-daterangepicker');

// Listen for date selection
picker.addEventListener('date-select', (e) => {
  console.log('Selected:', e.detail.formattedValue);
  console.log('Date object:', e.detail.date);
  console.log('Range:', e.detail.dateRange);
});

// Programmatic API
picker.show();
picker.hide();
picker.toggle();
picker.clearSelection();
picker.setInputValue('2025-11-15');
```

Using the `DateRangePicker` class directly (without the custom
element) is fully supported — see [`docs/usage.md`](./docs/usage.md#javascript-instantiation-datepickerangepicker-class)
for the CSS-loading caveats.

## Browser support

Modern browsers with Web Components and CSS `color-mix()` support:

- Chrome / Edge 111+
- Firefox 113+
- Safari 16.2+

## Built with BlissFramework

Follows the [BlissFramework component guidelines](https://blissframework.dev/)
for structure, theming, color-scheme, and accessibility. See
[`VALIDATION-NOTES.md`](./VALIDATION-NOTES.md) for the accepted-deviation
register and [`docs/theming.md`](./docs/theming.md) for the four-contract
theming model.

## HTML Injection (XSS) Notice

The following callbacks and methods allow **raw HTML injection** and
are intentionally **not XSS-safe**. This gives developers full control
over rendering but requires sanitizing untrusted data:

| Callback / Method | Output used in | Risk |
|---|---|---|
| `showMessage(html)` | Message area (innerHTML) | HTML injection |
| `renderDayCallback` | Day cells (innerHTML) | HTML injection |
| `renderDayContentCallback` | Day cells (innerHTML) | HTML injection |
| `getDateMetadataCallback` (`badgeText`, `dayTooltip`) | Badges / tooltips (innerHTML) | HTML injection |
| `formatSummaryCallback` | Summary display (innerHTML) | HTML injection |
| `getMonthHeaderCallback` | Month headers (innerHTML) | HTML injection |
| `getUnifiedHeaderCallback` | Unified header (innerHTML) | HTML injection |
| `customStylesCallback` | Style tag (textContent) | CSS injection |
| `actionButtons[].label` | Button labels (innerHTML) | HTML injection |

**Safe callbacks** (output is escaped or used as data):

- `beforeDateSelectCallback`, `beforeMonthChangedCallback` (return action objects)
- `onSelect`, `onChange` (event handlers)
- `getDateMetadataCallback` (`isDisabled`, `dayClass`, `badgeClass` — CSS class names only)

**If displaying user-generated content**, sanitize it before passing
it to these callbacks or methods.

## Known Limitations

### Consumer-data class convention — `.holiday` / `.event` / `.badge-{count,number,text}`

The shipped CSS includes default styles for a small set of class names
the picker doesn't emit itself — they're applied by your code via the
`dayClassMember` / `badgeClassMember` callbacks (or the equivalent
`getDateMetadataCallback` return shape). The component ships compound
selectors (`.drp__day.holiday`, `.drp__day.event`,
`.drp__badge-cell.badge-count`, `.drp__badge-cell.badge-number`,
`.drp__badge-cell.badge-text`) as ready-to-use hooks for these common
conventions so the most frequent decoration cases work without writing
any CSS.

This means a few CSS classes inside the shadow root don't follow
strict BEM (`.<prefix>__element--modifier`) — they're consumer-data
values used as discriminators next to a BEM block, not
component-emitted modifiers. The BEM block (`.drp__day`,
`.drp__badge-cell`) carries the component scope; the discriminator
carries the data convention.

If your data uses different class names, just supply them via the
callback and provide your own CSS — the defaults won't fight you. To
retheme the existing defaults without rewriting the CSS, override the
backing variables:

- **Holiday cell:** `--drp-holiday-color`, `--drp-holiday-bg-opacity`, `--drp-holiday-hover-bg-opacity`
- **Event cell:** `--drp-event-color`, `--drp-event-bg-opacity`, `--drp-event-hover-bg-opacity`
- **Badge types:** `--drp-badge-number-{bg,color}`, `--drp-badge-count-{bg,color}`, `--drp-badge-text-{bg,color}`

These variables are part of the public theming surface (added in
v1.6.0; see [`CHANGELOG.md`](./CHANGELOG.md)).

## Changelog

See [`CHANGELOG.md`](./CHANGELOG.md) for version history and migration
guides.

## License

MIT — see [LICENSE](./LICENSE) if present, otherwise the MIT terms
apply by default per `package.json`.

## Credits

Extracted from the [Pure Admin](https://github.com/keenmate/pure-admin)
design system.
