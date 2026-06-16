# Examples / cookbook — `@keenmate/web-daterangepicker`

Every example below is a runnable HTML file at the repo root. Open it
in a browser, or run `npm run dev` and navigate to it through the
[live demo site](https://web-daterangepicker.keenmate.dev). Examples
are listed in **rough learning order** — start with `basic.html`,
follow your nose from there.

For the picker's full API surface, see [`usage.md`](./usage.md). For
theming, see [`theming.md`](./theming.md). For keyboard / a11y, see
[`accessibility.md`](./accessibility.md).

## Starting points

### Basic features — [`examples-basic.html`](../examples-basic.html)

Single + range modes, every date format mask, locale switching, the
multi-month grid layouts, and the inline-vs-floating popover trigger
modes. The "see one of each thing" tour — the single best file to skim
when you first see the component.

### JavaScript instantiation — [`examples-javascript-instantiation.html`](../examples-javascript-instantiation.html)

Using the `DateRangePicker` class directly without the
`<web-daterangepicker>` custom element. Every callback wired up,
explicit CSS-loading recipe, the `injectGlobalStyles()` pattern. The
right starting point if you can't use custom elements or want full
programmatic control.

### API methods — [`examples-api-methods.html`](../examples-api-methods.html)

Driving the picker programmatically — `show()` / `hide()` / `toggle()`,
`setInputValue()`, `clearSelection()`, the property accessors, and the
"set properties before the element is upgraded" pattern.

## Selection, validation, events

### Range selection modes — [`examples-events.html`](../examples-events.html)

All five `disabled-dates-handling` modes (allow / prevent / block /
split / individual) plus the `beforeDateSelectCallback` validation
recipes from `usage.md`: minimum-nights, API availability check, the
`showInvalidRange` red-error state.

### Buttons & multi-range — [`examples-buttons.html`](../examples-buttons.html)

Custom action buttons, preset buttons ("This week" / "Last 30 days"),
controlling Today / Clear / Apply visibility via the
`is-*-button-shown` attributes, and the multi-range selection mode.

## Visual & data customization

### Badges & tooltips — [`examples-badges-tooltips.html`](../examples-badges-tooltips.html)

Static badges from `specialDates`, dynamic badges via
`getDateMetadataCallback`, plain-text and rich-HTML tooltip variants,
the four `Member` mappings for non-standard data shapes, and the
**consumer-data classifier convention** (`dayClass: 'event' | 'holiday'`
+ `badgeClass: 'badge-number' | 'badge-count' | 'badge-text'`) including
the custom-classifier `salsa / rumba / pilates` demo wired up through
`customStylesCallback`.

### Custom rendering — [`examples-custom-rendering.html`](../examples-custom-rendering.html)

`renderDayCallback` (full replacement) and `renderDayContentCallback`
(augmentation) — for when you need to render arbitrary HTML inside day
cells. Includes the security note from `usage.md` about untrusted
content + `innerHTML`.

## Theming, sizing, layout

### Theming — [`examples-theming.html`](../examples-theming.html)

Eight tests covering: default theme, color overrides (green / purple /
red / orange), dark theme, custom sizing & spacing, range mode under
themes, selection-hover states, pastel theme, **the four time-picker
UIs themed in one shot** (Test 8), and the **Test 9 classifier
retheming panel** (three pickers with identical data, different
`--drp-holiday-color` / `--drp-event-color` / `--drp-badge-*`
overrides). End with the full `--drp-*` reference list.

### Sizes & density — [`examples-sizes.html`](../examples-sizes.html)

The 5-level input-size scale (`xs` / `sm` / `md` / `lg` / `xl`), the
`--drp-rem` calendar scaling recipe, and per-token overrides for
fine-grained tweaks. Cross-references the input-size table in
[`theming.md`](./theming.md).

### Base variables — [`examples-base-variables.html`](../examples-base-variables.html)

The cross-component `--base-*` taxonomy in action — fonts, sizes,
weights, line heights, border radii. Set one `--base-*` declaration at
`:root` and see it cascade through. The right starting point if you're
themeing multiple KeenMate components together.

### Responsive — [`examples-responsive.html`](../examples-responsive.html)

The `positioning-mode="modal"` layout, viewport-tier widths
(xs / sm / md / lg), and the `mobile-modal-breakpoint` /
`mobile-modal-min-height` auto-engage rules that switch a floating
popover into a modal sheet on narrow screens.

## Time / datetime

### Time picker — [`examples-time-picker.html`](../examples-time-picker.html)

`picker-mode="time"` and `picker-mode="datetime"` across the four
time-display UIs: **rolls** (default scrollable columns), **clock**
(Material two-step face for hours then minutes, with h12 / h24 dual
ring), **wheel** (iOS UIPickerView snap-scroll columns with center
selection band), and **compact** (iOS 14+ pill with `contentEditable`
typing). All four work with `time-format-mask` token permutations,
`time-step`, seconds, and the `is-seconds-shown` / `is-now-button-shown`
flags.

## Debugging

### Logging — [`examples-logging.html`](../examples-logging.html)

The built-in `loglevel`-based logger system. Eight named categories
(`drp`, `ui`, `drag`, `selection`, …), runtime level control via
`window.components['web-daterangepicker'].logging.*`, and the
recommended pattern for narrowing logs to one category while
debugging.

## See also

- [`usage.md`](./usage.md) — full attribute / property / method / event reference.
- [`theming.md`](./theming.md) — the four theming contracts.
- [`accessibility.md`](./accessibility.md) — keyboard, ARIA, focus.
- [`../README.md`](../README.md) — quick start + "Known limitations".
- [Live demo site](https://web-daterangepicker.keenmate.dev) — every example above, deployed.
