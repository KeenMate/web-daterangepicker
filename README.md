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

## What's New in v2.0.0-rc02

- **Scoped read-only lock — `lock()` / `unlock()` / `toggleLock()`** — A new imperative API freezes user interaction while keeping the selected value fully readable, unlike `disabled` (which greys the input out and blocks the whole field). The motivating flow: the user picks a range, a custom confirm button calls the server, and on success you call `lock()` so the confirmed range can no longer be edited. Locks are enforced at every user-interaction choke point across `date-picker.ts`, `date-picker-navigation.ts`, `date-picker-interaction.ts`, and `date-picker-ui.ts`, so day clicks, drag-to-adjust, typed input, keyboard month-crossing, and popover re-opening all respect it.

- **Four independent lock aspects — `selection`, `navigation`, `actions`, `open`** — `lock()` with no argument freezes everything; `lock(aspect | aspect[])` freezes a subset via the new exported `LockAspect` type. `selection` covers day/drag/typed/time picks and flips the `<input>` to `readOnly`; `navigation` covers `<` / `>`, PageUp/Down, Ctrl+arrows and the rolling year/month selector; `actions` covers Apply and custom buttons; `open` blocks re-opening the popover but never blocks closing, so a locked picker is never a keyboard trap. Partial locks compose — `lock(['selection','actions'])` freezes the range and buttons while leaving `<` / `>` live so a user can still browse other months after confirming.

- **Programmatic API stays live — the lock gates the end user, not your code** — Selection setters (`selectedRanges = …`), `clearSelection()`, and the navigation methods all keep working while locked, exactly like a `readOnly` `<input>` is still settable from JS. This keeps server-driven flows (confirm, amend, reset) fully scriptable against a locked picker.

- **Declarative `readonly` attribute + greyed affordance** — `<web-daterangepicker readonly>` or `picker.readonly = true` applies a full lock and survives the attribute-driven rebuild; it reads back `true` only when every aspect is locked. Locked regions grey out like disabled controls via the new `--drp-opacity-locked` token (default `0.6`, inherited from `--drp-opacity-disabled`; set to `1` to disable greying), driven by per-aspect root modifiers `.drp__picker--locked-{aspect}`.

## What's New in v2.0.0-rc01

- **Callbacks — one typed context object, everywhere** — Every callback now receives a single context object that extends the new exported `PickerContext` (`{ picker }`), replacing the old mix of positional args, raw `picker: any`, and anonymous inline types. `getDateMetadataCallback(date)` becomes `(ctx: DayContext)`; all six `ActionButton` callbacks take `(ctx: ActionButtonContext)` = `{ picker, action, button, data? }`; `beforeDateSelectCallback` reads `ctx.date` / `ctx.range` instead of narrowing a `Date | DateRange` union. The `DayRenderContext` / `SummaryDetail` / `BeforeMonthChangeContext` types were renamed to `DayContext` / `SummaryContext` / `MonthChangeContext`, and the month-header callbacks' anonymous shapes were promoted to exported `MonthHeaderContext` / `UnifiedHeaderContext`. This is a breaking change with a full migration table in the CHANGELOG.

- **`beforeDateSelectCallback` can now return multiple independent ranges** — A range-mode callback may return `adjustedRanges: DateRange[]` (with action `'accept'` or `'adjust'`) to replace the single proposed span with N independent ranges — e.g. carving a selection around unavailable days, or snapping a loose drag to whole weeks. `selectedRanges` reflects the pieces, the grid highlights each range's own start/end/in-range cells, the summary lists them, and `onSelect` receives the array; the read-only `selectedStartDate`/`selectedEndDate` envelope spans first-start to last-end. It applies identically whether the range was completed by **clicking, dragging, or typing** — and typed range completion now runs the validation callback at all, which it previously skipped.

- **`beforeDateSelectCallback` sees the split pieces** — In range mode with `disabledDatesHandling: 'split' | 'individual'`, the `SelectionContext` now carries `subRanges?: DateRange[]` (the envelope carved into enabled-only segments) and `enabledDates?: Date[]` (the flat enabled-day list), so the callback can validate the pieces a split selection will actually produce without re-deriving them itself.

- **Symmetric imperative feedback API — summary and loader join message** — The summary block gets a direct writer mirroring `showMessage`: `showSummary(html)` pins content that survives re-renders (including hover preview) until the next selection change, `hideSummary()` re-derives, and `refreshSummary()` re-runs derivation for async data. The loader becomes a scoped `showLoader(target?)` / `hideLoader(target?)` / `toggleLoader(target?)` where `target` is `'calendar' | 'message' | 'summary'` — the in-block targets render a spinner inside that block, enabling the "spinner in the summary while a price loads, then show the price" pattern. `toggleMessage` was added for verb-family completeness.

- **State accessors realigned — the clean name is the reactive property** — The `*Reactive` suffix is gone: `picker.selectedDate` / `selectedDates` / `selectedRanges` are now the get/set accessors a programmer expects (assigning re-renders and syncs the input), with raw storage made private. `selectedDatetime` is now **settable** and accepts a `Date` or ISO string, splitting it into date + time parts so you can round-trip a datetime straight from an API without splitting it yourself. Displayed state is exposed through derived, always-in-sync getters: `visibleMonths` (with per-column `firstDate`/`lastDate`/`gridStart`/`gridEnd`), `visibleMonthDates`, `visibleDateRange`, and a fresh `today` getter.

- **`custom-action` event detail is now `{ data, picker }`** — The event detail was flattened before (`e.detail.myKey`); it now nests the button's `data-*` attributes under `e.detail.data.myKey` and exposes the picker instance, matching the shape an action button's `onClick` receives. `date-select` / `change` details are now properly typed as `SelectEventDetail`.

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
