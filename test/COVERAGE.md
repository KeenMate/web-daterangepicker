# E2E Test Coverage Checklist

Tracks which features of `web-daterangepicker` have end-to-end test coverage in
`e2e/`. Each row is one user-observable feature. Status legend:

- `✗` — no coverage
- `△` — partial coverage (some paths)
- `✓` — covered

When a row is marked `✓`/`△`, the **Spec** column points at the file under
`e2e/` that exercises it, and **Fixture** at the dedicated HTML page under
`test/` (the spec hits no example pages, only fixtures).

---

## 1. Selection modes

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| Single-date selection                                         | ✓      | `selection-modes.spec.ts`    | `selection-modes.html`    |
| Range selection (click start → click end)                     | ✓      | `selection-modes.spec.ts`    | `selection-modes.html`    |
| Range: drag-to-adjust start                                   | ✗      |      |         |
| Range: drag-to-adjust end                                     | ✗      |      |         |
| Multiple-date selection (toggle individual days)              | ✓      | `selection-modes.spec.ts`    | `selection-modes.html`    |
| Apply-required: cancel restores `originalInputValue`          | ✓      | `selection-modes.spec.ts`    | `selection-modes.html`    |
| `autoClose`: `'never'` / `'selection'` (default) / `'apply'`  | △      | `selection-modes.spec.ts`    | `selection-modes.html`    |

## 2. Positioning modes

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `floating` mode: opens below input                            | ✗      |      |         |
| `floating` mode: flips above when no room below               | ✗      |      |         |
| `floating` mode: `calendar-placement` override                | ✗      |      |         |
| `floating`: escapes `overflow:auto` ancestor (SPFx fix)       | ✓      | `floating-overflow.spec.ts`  | `floating-overflow.html`  |
| `floating`: anchor stable when calendar content grows         | ✓      | `anchor-stability.spec.ts`   | `anchor-stability.html`   |
| `floating`: closes on viewport resize                         | ✓      | `anchor-stability.spec.ts`   | `anchor-stability.html`   |
| `floating`: `close-on-scroll` (default true / false)          | ✗      |      |         |
| `inline` mode: renders in-place, never hidden                 | ✗      |      |         |
| `modal` mode: centered overlay + backdrop                     | ✗      |      |         |
| `modal` mode: backdrop click closes                           | ✗      |      |         |
| `modal` mode: body scroll locked while open                   | ✗      |      |         |
| `modal` mode: input blurred to suppress mobile keyboard       | ✗      |      |         |
| `modal` mode: container-query inner layout tiers              | ✗      |      |         |
| `mobile-modal-breakpoint` auto-engages modal at small widths  | ✗      |      |         |

## 3. Trigger / open-close

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `calendar-open-trigger="focus"` — opens on input focus        | ✓      | `triggers.spec.ts`           | `triggers.html`           |
| `calendar-open-trigger="typing"` — opens when user types      | ✓      | `triggers.spec.ts`           | `triggers.html`           |
| `calendar-open-trigger="manual"` — only opens via show()      | ✓      | `triggers.spec.ts`           | `triggers.html`           |
| Click outside closes (floating)                               | ✓      | `triggers.spec.ts`           | `triggers.html`           |
| Escape closes                                                 | ✓      | `keyboard-navigation.spec.ts`| `keyboard-navigation.html`|
| Re-click input after scroll-close reopens (#3 regression)     | ✓      | `triggers.spec.ts`           | `triggers.html`           |
| `show()` is idempotent (no double-init on focus+mousedown)    | △      | `triggers.spec.ts`           | `triggers.html`           |

## 4. Multi-month layout

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `visible-months-count="2"` shows two adjacent months          | ✓      | `multi-month.spec.ts`        | `multi-month.html`        |
| Horizontal multi-month layout (flex row)                      | ✓      | `multi-month.spec.ts`        | `multi-month.html`        |
| Grid layout (`grid-rows` × `grid-columns`)                    | ✓      | `multi-month.spec.ts`        | `multi-month.html`        |
| Collision prevention: adjacent columns can't show same month  | ✓      | `multi-month.spec.ts`        | `multi-month.html`        |
| Per-column independent navigation                             | ✓      | `multi-month.spec.ts`        | `multi-month.html`        |
| `unified-navigation`: single header drives all columns        | △      | `multi-month.spec.ts`        | `multi-month.html`        |
| `unified-navigation-anchor-index`                             | ✗      |      |         |
| `unified-header-interactive` opens unified rolling selector   | ✗      |      |         |
| Always-6-week rendering (stable height in modal)              | ✗      |      |         |

## 5. Navigation

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| Prev / next month buttons                                     | ✗      |      |         |
| Rolling year/month selector toggles via month-year header     | ✗      |      |         |
| Rolling list scrolls without chaining to page                 | ✓      | `rolling-selector.spec.ts`   | `rolling-selector.html`   |
| Rolling list border-box (no overflow into elements below)     | ✓      | `rolling-selector.spec.ts`   | `rolling-selector.html`   |
| Keyboard: arrows (day), Ctrl+arrows / PgUp/PgDn (month)       | △      | `keyboard-navigation.spec.ts` | `keyboard-navigation.html` |
| Keyboard: Home/End (start/end of month)                       | △      | `keyboard-navigation.spec.ts` | `keyboard-navigation.html` |
| Keyboard: Ctrl+Home/End (year jump, step year-by-year)        | ✗      |      |         |
| Keyboard: `t` jumps to today                                  | ✓      | `keyboard-navigation.spec.ts` | `keyboard-navigation.html` |
| Keyboard: Enter selects, Escape closes                        | ✓      | `keyboard-navigation.spec.ts` | `keyboard-navigation.html` |
| Keyboard: Tab cycles between month columns                    | ✗      |      |         |

## 6. Input behavior

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| Input mask: progressive auto-format as user types             | ✗      |      |         |
| Custom `date-format-mask` (YYYY-MM-DD, DD.MM.YYYY, etc.)      | ✗      |      |         |
| Progressive parsing: calendar follows valid typed segments    | ✗      |      |         |
| `input-size` variants (xs, sm, md, lg, xl)                    | ✗      |      |         |
| `displayFormatMask` differs from `dateFormatMask`             | ✗      |      |         |

## 7. Date restrictions

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `min-date` / `max-date` disable out-of-range days             | ✗      |      |         |
| `disabled-weekdays` (Sat/Sun, etc.)                           | ✗      |      |         |
| `disabledDates` (specific dates)                              | ✗      |      |         |
| `initial-date` controls opening month                         | ✗      |      |         |
| `rolling-year-range` / `rolling-month-range`                  | ✗      |      |         |
| Rolling selector disables out-of-range entries                | ✗      |      |         |

## 8. Range over disabled dates (`disabledDatesHandling`)

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `'allow'`: range crosses disabled days                        | ✗      |      |         |
| `'prevent'`: blocks selection crossing disabled               | ✗      |      |         |
| `'block'`: snaps to last enabled before disabled gap          | ✗      |      |         |
| `'split'`: yields multiple ranges in event detail             | ✗      |      |         |
| `'individual'`: yields flat enabled-dates array               | ✗      |      |         |
| `highlight-disabled-in-range` toggles styling                 | ✗      |      |         |

## 9. Action buttons & summary

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| Today button jumps + selects today                            | ✗      |      |         |
| Clear button clears selection + input                         | ✗      |      |         |
| Apply commits pending selection, closes picker                | ✗      |      |         |
| `show-today-button` / `show-clear-button` / `show-apply-button` | ✗    |      |         |
| Custom `actionButtons` array (incl. `custom-action` event)    | ✗      |      |         |
| Action-button tooltip on hover                                | ✗      |      |         |
| `show-summary="false"` omits summary block entirely           | ✗      |      |         |
| Actions `border-top` only when summary is visible             | ✓      | `summary-actions.spec.ts`    | `summary-actions.html`    |
| Visible summary has `margin-top` (gap from months)            | ✓      | `summary-actions.spec.ts`    | `summary-actions.html`    |
| Range summary text reflects selected days/nights              | ✗      |      |         |
| `formatSummaryCallback` overrides summary HTML                | ✗      |      |         |

## 10. Custom rendering / callbacks

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `renderDayCallback` (full replacement)                        | ✗      |      |         |
| `renderDayContentCallback` (augmentation)                     | ✗      |      |         |
| `getMonthHeaderCallback` overrides per-month header           | ✗      |      |         |
| `getUnifiedHeaderCallback` overrides unified-mode header text | ✗      |      |         |
| `customStylesCallback` injects styles into Shadow DOM         | ✗      |      |         |
| `beforeDateSelectCallback`: accept / adjust / restore / clear | ✗      |      |         |
| `beforeMonthChangedCallback`: bulk metadata, block            | ✗      |      |         |
| `specialDates` + `*Member` property mapping                   | ✗      |      |         |
| `getDateMetadataCallback` per-date                            | ✗      |      |         |

## 11. Tooltips

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| Day-cell tooltip on hover                                     | ✗      |      |         |
| Badge tooltip                                                 | ✗      |      |         |
| Action-button tooltip                                         | ✗      |      |         |
| Tooltips escape `overflow:auto` ancestor (position: fixed)    | ✗      |      |         |

## 12. Locale & i18n

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `locale="auto"` detects from browser                          | ✗      |      |         |
| Explicit `locale="de"` / `"fr"` / etc.                        | ✗      |      |         |
| `customStrings` overrides individual UI strings               | ✗      |      |         |
| `monthNames` override                                         | ✗      |      |         |
| `week-start-day="auto"` follows locale                        | ✗      |      |         |
| Explicit `week-start-day` integer                             | ✗      |      |         |

## 13. Events & API

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `change` event with full detail                               | ✗      |      |         |
| `apply` event                                                 | ✗      |      |         |
| `cancel` event                                                | ✗      |      |         |
| `custom-action` event (per v1.12.0 docs)                      | ✗      |      |         |
| `selectedDate` / `selectedRanges` / `selectedDates` setters   | ✗      |      |         |
| `isOpen` setter opens/closes programmatically                 | ✗      |      |         |
| `updateOptions(partial)` survives without losing selection    | ✗      |      |         |
| `showMessage` / `hideMessage`                                 | ✗      |      |         |
| `value` setter populates input + selection                    | ✗      |      |         |
| `disabled` setter disables input + suppresses open            | ✗      |      |         |

## 14. Visual states

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| Selected day class                                            | ✗      |      |         |
| Range start / middle / end classes                            | ✗      |      |         |
| Today highlight                                               | ✗      |      |         |
| Disabled day styling                                          | ✗      |      |         |
| Hover preview during range selection                          | ✗      |      |         |
| Drag-preview classes during drag-adjust                       | ✗      |      |         |
| Keyboard-focused day class                                    | ✗      |      |         |
| Weekend styling                                               | ✗      |      |         |
| Adjacent-month (faded) days                                   | ✗      |      |         |
| Invalid-range error styling (`showInvalidRange`)              | ✗      |      |         |

## 15. Sizing & theming

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `spacing` / `font-size` / `cell-size` scale variants          | ✗      |      |         |
| CSS-variable overrides flow through                           | ✗      |      |         |
