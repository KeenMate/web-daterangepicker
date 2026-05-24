# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.14.0] - 2026-05-23

### Added — Time picker and datetime mode

- **New `picker-mode` attribute** with three values: `date` (default, unchanged), `time` (rolls-only popover for picking hours/minutes), and `datetime` (calendar grid and time rolls side-by-side in one popover). Orthogonal to the existing `selection-mode` — date mode keeps the full single/range/multiple matrix. Time and datetime modes are v1.14 single-only; range/multiple silently falls back with a console warning (range datetime will land later).
- **Rolling-list time rolls** reuse the existing year/month rolling-selector UI pattern (`.drp-date-picker__rolling-list` + `.drp-date-picker__rolling-item`) so they inherit theming hooks for free. Two-to-four columns: hours, minutes, optional seconds, optional AM/PM. Click an item to commit; the highlighted item snaps to the current selection.
- **Time configuration attributes:**
  - `time-format-mask` — tokens `HH`/`H`/`hh`/`h`/`mm`/`m`/`ss`/`s`/`a`. Default `HH:mm`. AM/PM column appears when the `a` token is present.
  - `display-time-format-mask` — parallel to `display-format-mask` for localized placeholder.
  - `time-step` — minute/second increment shown in the rolls (e.g., `time-step="15"`). Default `1`.
  - `hour-cycle` — `h12` or `h24`. Auto-derived from the mask (`a` token → h12); explicit attribute wins.
  - `show-seconds` — adds the seconds roll. Auto-derived from `s` token in the mask; explicit attribute wins.
  - `show-now-button` — adds a "Now" button next to Today/Clear/Apply. Default true in time/datetime, ignored in date mode.
- **`autoClose` default flips to `'apply'`** in time/datetime modes so each roll-click doesn't slam the popover shut between hour and minute. User-supplied `auto-close` still wins.
- **`normalizeDate()` gained a `preserveTime` flag** (default `false` — existing callers unchanged). `initialDate` parsing flips it on in time/datetime modes, so `initial-date="2026-05-23T14:30"` survives both the parse and ISO string handling. Other call sites (`minDate`, `maxDate`, `disabledDates`, day-iteration helpers) stay midnight by design.
- **Locale strings:** added `time`, `now`, `am`, `pm` to `LocaleStrings`. Hardcoded for the four bundled locales (en/de/fr/es). `customStrings` override still works.
- **CSS surface:** new `_time-picker.css` partial. New variables `--drp-time-picker-gap`, `--drp-time-picker-padding`, `--drp-time-picker-roll-min-width`, `--drp-time-picker-separator-color`, `--drp-time-picker-label-color`, `--drp-time-picker-main-gap`, `--drp-datetime-min-width` (560px default, popover comfort floor in datetime mode). New BEM classes `.drp-date-picker__main` (datetime row wrapper), `.drp-date-picker__time-picker`, `.drp-date-picker__time-rolls`, `.drp-date-picker__time-column`, `.drp-date-picker__time-column-header`, `.drp-date-picker__time-roll`, `.drp-date-picker__time-separator`, `.drp-date-picker__time-label`, plus root modifiers `.drp-date-picker--time` and `.drp-date-picker--datetime`. `@media (max-width: 600px)` collapses datetime to a vertical stack on narrow viewports / modal mode.
- **New `examples-time-picker.html`** with 8 scenarios covering the format mask permutations, time-step, seconds, datetime, the range fallback, and ISO-datetime `initial-date`.

### Fixed during dogfooding

- **Time selection split into three separate fields.** `selectedDate` stays date-only (date/datetime modes), `selectedTime: SelectedTime | null` holds nullable `{hour, minute, second, ampm}` parts, and a `selectedDatetime` derived getter composes the two when needed. Replaces the earlier "Y/M/D pinned to today + flags array" shape — single source of truth per field, no double-bookkeeping between the picker's internal `Date` and the committed values.
- **`showApplyButton` now flips alongside `autoClose`** in time/datetime modes. Previously only `autoClose='apply'` was set by default, so the Apply button was required to commit but never rendered — every time selection silently vanished on close. Both options now flip together; explicit user overrides still win.
- **`formatInputValue` recognized time-only mode**. The previous gate on `selectedDate` made the input stay empty in time mode even after Apply (no date is set in time mode by design). New `pickerMode === 'time'` branch formats from `selectedTime`.
- **Rolls re-center on every open with a pre-existing selection.** `show()` now sets a one-shot `forceTimePickerScroll` flag and re-renders the time picker on each open in time/datetime modes. The "already visible" early-return in `scrollFocusIntoView` is bypassed when the flag is set, so a `selectedTime` from `initial-date` (or from a prior committed value) always lands centered.
- **h12 hour click was a no-op.** The roll items emitted `data-hour-12` but the click router read `el.dataset.hour12` — per the DOMStringMap rule, a hyphen followed by a digit is not consumed, so `hour-12` stays `hour-12` in the dataset. Renamed to `data-hour12` so it camelCases cleanly. h24 mode was unaffected (already `data-hour`).
- **Datetime layout: calendar + time picker now actually render side-by-side.**
  - Removed `container-type: inline-size` on `.drp-date-picker--datetime`. Inline-size containment by spec makes the element's width independent of its contents, which pinned the popover at the `min-width` floor and squeezed the calendar below its 280px intrinsic minimum. The `@container` query was replaced with a `@media (max-width: 600px)` viewport breakpoint, which is the appropriate scoping for a `position: fixed` popover.
  - Set a 560px `min-width` floor on the popover via `--drp-datetime-min-width` so the row layout has room before the breakpoint kicks in.
  - Dropped `min-width: 0` on the inner `__main > __months` and `__time-picker` rules so each panel's intrinsic min-content propagates and the popover grows naturally to fit calendar (~280px) + time picker (~280-320px depending on `show-seconds` / `hour-cycle`) + gap.
- **Time-only mode skips the `__main` wrapper** entirely and mounts the time picker as the direct flex-column child of the popover. Avoids an unnecessary scroll container and matches the date-only path's "single primary child" shape.
- **`__main` scrollbar artifacts**. Originally had `overflow-y: auto`, which per CSS spec coerces `overflow-x: visible` to `auto` (the one-axis rule), producing a spurious horizontal scrollbar at the bottom of the popover. Now `overflow: hidden`, with the inner `__main > __months` carrying its own `overflow-y: auto; overflow-x: hidden` for tall multi-month layouts.
- **Focused-day outline no longer clipped at the calendar's left edge in datetime mode.** The `padding-inline: 4px` allowance from `_base.css` only matches `.drp-date-picker > __months` (direct child) and didn't apply once `__main` sat in between. Mirrored the padding onto the `__main > __months` rule.
- **Time rolls fill the available height to match the calendar.** Previously a fixed `max-height: 280px` cap left a gap below the rolls; the obvious fix (drop the cap, let the rolls flex-grow) made the rolls' 24-hour intrinsic content push the popover to ~960px. Final shape: `flex: 1 1 0` on the roll — basis 0 contributes no intrinsic height, so `__main` is driven by the calendar, `__time-picker` stretches to match via `align-items: stretch`, and the roll grows to fill whatever vertical space the time picker has left.
- **Roll item digits center horizontally.** The cell already had `justify-content: center`, but the `.__rolling-item-text` wrapper is `width: 100%` (for month-name ellipsis), so the short digit labels fell back to left-aligned text. Time-roll text now gets `text-align: center` (scoped to time rolls only, so month names keep their ellipsis layout).

### Out of scope for v1.14 (warnings or documented limitations)

- Time/datetime + `selection-mode="range"` or `"multiple"` — falls back to single, warning logged once.
- `picker-mode="datetime"` + `month-layout="grid"` — forces horizontal, warning logged once (the grid wants 100% width and the time roll can't share the row).
- Input mask for time tokens — typing into the input field still triggers the date mask only. On reopen, the committed H/M/S survive because `updateCalendarFromInput` no-ops in time/datetime modes (the picker's `selectedDate` is authoritative).
- Per-hour disabling — `disabledDates` still disables whole days only.
- Keyboard navigation in time mode — arrow keys are short-circuited; selecting from the rolls is click-only. Escape closes.
- `min-time` / `max-time` constraint attributes — deferred.

## [1.13.0] - 2026-05-22

### Added — Hover preview for half-selected range mode

- After the first click sets a start date in range mode, hovering over candidate end dates now paints the would-be range live with `--hover-preview` (or `--hover-preview-invalid` when the click would be rejected). Behavior is mode-aware per `disabled-dates-handling` so the preview is *honest* about what a commit would produce:
  - `allow` / `individual` — full range painted; disabled days keep their disabled overlay layered on top.
  - `prevent` — `--hover-preview-invalid` when the range would cross a disabled gap (telegraphs the rejection).
  - `block` — preview snaps backward to the last enabled day before the gap (teaches the snap behavior in advance).
  - `split` — disabled days stay bare so the visual gaps communicate the upcoming sub-range split.
  - Auto-swap when hovering before the committed start: preview paints (hovered)..(start) so the user can grow the range in either direction.
- Cleanup wired on commit, mouseleave, drag-start, hide, and destroy. The committed start day keeps its `--range-start` solid styling — `updateHoverPreview()` skips it so the cascade doesn't override the solid accent background with a translucent one (which would leave the on-accent text visually mismatched).
- New CSS hooks: `--drp-day-hover-preview-bg-opacity: 0.18` and `--drp-day-hover-preview-invalid-bg-opacity: 0.18`. The classes themselves derive their colors from `--drp-day-range-bg` and `--drp-day-drag-invalid-bg` via `color-mix`. 10 specs in `e2e/hover-preview.spec.ts`.

### Added — Other features

- **Weekend CSS hooks on day cells**: `.drp-date-picker__day--weekend` modifier on Saturday/Sunday, plus `data-weekday="0..6"` (matching `Date.prototype.getDay()`) on every cell. No default styling shipped — pure theming surface. `[data-weekday="5"]` for Friday-only treatment, `--weekend` for the standard Sat/Sun pair.
- **HTML attribute `disabled-dates`** — comma-separated ISO dates as a declarative alternative to the `disabledDates` property (e.g., `disabled-dates="2026-06-13, 2026-06-14, 2026-12-25"`). Whitespace tolerated; invalid entries silently dropped. The property still wins if both paths are populated (consistent with the other complex-data options' escape-hatch semantics).
- **HTML attributes for the `specialDates` member-mapping family**: `date-member`, `badge-text-member`, `badge-class-member`, `day-class-member`, `badge-tooltip-member`, `day-tooltip-member`, `is-disabled-member`. Brings the seven `*Member` props to attribute parity. Same property-wins precedence as `disabled-dates`.
- **Property setters for `customStrings` and `monthNames`** on the web component. Previously only reachable via `picker.updateOptions(...)` (which leaked the internal `picker` instance) or the dedicated `setMonthNames()` method. Both now work like the other ~35 property setters: `el.customStrings = { today: 'Jump' }` or `el.monthNames = ['01','02',...]`. `setMonthNames()` kept as a deprecated alias that forwards to the new setter.
- **`displayFormatMask` is now also used as the input placeholder** when no explicit `placeholder` is set. Explicit `placeholder=` still wins. Closes the loop on the option's documented purpose: localized format hint (`tt.mm.jjjj`, `dd.mm.rrrr`, `dd/mm/aaaa`) that consumers want shown to users in their language.
- **Compact `-` accepted in range typing mode** — `2026-06-10-2026-06-15` normalizes to `2026-06-10 - 2026-06-15`. Position-based fallback (anything past `maxLength` is the end side, with leading dashes/spaces stripped) so paste-style compact dashes Just Work alongside the new spaced separator.
- **Playwright e2e harness** with 172 specs covering selection, triggers, multi-month, keyboard, input behavior, date restrictions, disabled-handling, visual states, positioning, locale, theming, callbacks, tooltips, and the hover preview. Run with `npm run test:e2e` or `make test-e2e`.

### Changed

- **Range typing separator: `" to "` → `" - "`**. The auto-injected separator after a complete start date now matches the committed range format (`"YYYY-MM-DD - YYYY-MM-DD"`), and the keydown whitelist allows `-` and space instead of the English-only letters `t`/`o`. The old `" to "` was unusable in non-English locales anyway. Migration: anyone relying on literal `to` typing needs to switch to `-`.
- **`setMonthNames(arr)` deprecated** — use the `monthNames` property setter. The method now forwards to the setter; behavior is unchanged.
- **CLAUDE.md "Size System" section pruned** to reflect reality. The `spacing` / `font-size` / `cell-size` attributes and `.drp-spacing-*` / `.drp-font-*` / `.drp-cell-*` classes documented previously never existed in the code. Only `input-size` is an attribute; calendar sizing is theming-only via the `--drp-spacing-*` and `--drp-font-size-*` CSS tokens, with `--drp-rem` (default `10px`) as the global rescale knob (every size token is `calc(N * var(--drp-rem))`).
- **API.md events section** got a clarifying note: there are no separate `apply` or `cancel` events. The Apply button commits and dispatches `change`; Escape with an uncommitted selection silently restores the previous input value and fires nothing.

### Fixed

- **`custom-action` event was double-dispatched** on the web component. The picker's internal dispatcher already crosses the shadow boundary via `{ bubbles: true, composed: true }`; the manual re-emit in `web-component.ts` was redundant and outside listeners saw every event twice.
- **`disabled` setter only flagged the input element** — it didn't suppress programmatic `show()`. The picker could still be opened by `picker.show()` or any event path bypassing the browser's pointer-events block. `show()` now early-returns when `picker.input?.disabled` is true.
- **`actionButtons` setter required `customElements.whenDefined()`**. Properties assigned to a not-yet-upgraded element used to become own-properties that shadowed the class accessors forever. Added `_liftPreUpgradeProperties()` in `connectedCallback`: walks the prototype chain for `set` descriptors and re-routes any matching own-properties through their accessors. Fixes the issue for all 35+ property setters, not just `actionButtons` — consumers can now drop `whenDefined` calls before setting complex data.
- **Range-start day's font color was nearly invisible during hover-preview**. The new `--hover-preview` class (declared later in the cascade than `--range-start`) was overriding the solid accent background with a translucent one, leaving the white on-accent text visually mismatched. `updateHoverPreview()` now skips the committed start day so the cascade doesn't get crossed.
- **Horizontal scrollbar appeared on the months area when hovering a badge cell on the rightmost column**. The badge cell's `transform: scale(1.05)` hover effect pushed ~1–2px past the right edge; combined with the CSS-spec coercion (`overflow-y: auto` implicitly making `overflow-x` `auto`), that was enough to trip a scrollbar. **Fix:** `padding-inline: 4px` on the months container — gives breathing room for both the badge scale AND the focused-day outline (4px extent: 2px offset + 2px width), so neither overflows.
- **`'block' mode disabled-dates-handling`** — added a clarifying source comment above the `block` branch in `validateRangeAsync()`. Not a behavior change: `block` always meant "Yes, but shorter" (snap end to the last enabled day before the first disabled gap). The comment now documents the contract so the next reader doesn't mistake it for `prevent` (rejects) or `split` (returns sub-ranges with disabled days excluded from the middle).

## [1.12.0] - 2026-05-02 - PUBLISHED

### Added — Modal positioning mode

- **`positioning-mode="modal"`** — new third value for `positioningMode` alongside `floating` and `inline`. Renders the calendar as a centered overlay with a semi-transparent backdrop scrim instead of anchoring to the input. Solves the small-screen overflow problem: multi-month horizontal layouts that horizontally scrolled off-screen in floating mode now fit. Closes via backdrop click, Escape, Apply (range mode), or `autoClose='selection'`. Body scroll is locked while open (reference-counted so multiple modal pickers don't fight over `document.body.style.overflow`). The input is `blur()`-ed when the modal opens (suppresses the mobile soft keyboard) and re-focused on close. Demo in `examples-buttons.html` section 1b.

- **Per-tier modal width** (CSS variables, aligned with the `_base.css` 480 / 768 / 1200 breakpoint set):
  - `--drp-modal-width-xs` (≤ 480px) — fills viewport minus gap (~95vw)
  - `--drp-modal-width-sm` (481–768px) — fills viewport minus gap
  - `--drp-modal-width-md` (769–1200px) — `900px` (room for 2-month layouts)
  - `--drp-modal-width-lg` (≥ 1201px) — `1100px` (room for 3-month layouts and 2×3 grids as configured)

  Plus shared hooks: `--drp-modal-gap` (16px default), `--drp-modal-backdrop-bg`, `--drp-modal-transition`, `--drp-z-index-modal`, `--drp-z-index-modal-backdrop`. Override per-instance via the host element to retheme.

- **Responsive inner-content tiers (container-query driven)** — the modal scales not just its outer width but how many months it shows side-by-side, based on the modal's *actual* width rather than the viewport:

  | Modal width | Behavior |
  |-------------|----------|
  | ≤ 600px | 1 visible month — sibling columns hidden via `display: none`. Hidden columns still update in lockstep through the existing collision-resolve logic, so range selection across more months still works; the user navigates time linearly with prev/next. |
  | 601–900px | 2 columns. Flex-layout pickers hide months 3+; grid-layout pickers keep all configured months visible and just wrap into more rows. |
  | 901–1200px | 3 columns, same flex/grid distinction. |
  | > 1200px | Configured layout as-is. |

  All driven by `@container drp-modal (...)` rules in `_modal.css` — no JS state changes, no rebuild on resize.

- **Auto-engage modal at small viewports** — two new web component attributes that flip `positioning-mode` from the configured value to `modal` and back as the viewport crosses thresholds:
  - `mobile-modal-breakpoint="640px"` — viewport width threshold
  - `mobile-modal-min-height="500px"` — viewport height threshold

  Either attribute alone works; both together OR. Implemented with `matchMedia` listeners; only auto-engages when the configured mode is `floating` (pickers explicitly set to `inline` or `modal` are left alone). Uses the existing reactive `positioning-mode` rebuild path, so selection survives the transition (input value persists across rebuild and is re-parsed). Demo in `examples-buttons.html` section 1b.

### Added — Other features

- **`showSummary` option (web component attribute: `show-summary`)** — boolean flag to omit the range-mode selection summary block entirely. Default `true` (current behavior). Set to `false` (or `show-summary="false"`) when you want a clean range picker without the days/nights count line — previously the only workaround was `formatSummaryCallback = () => ''`, which still rendered an empty `<div>` with margin and border-top, causing a small layout jump. Structural option (toggling at runtime triggers a rebuild, since the `<div>` needs to be added/removed from DOM). Demo in `examples-buttons.html` section 1.

### Changed — Layout architecture

- **Flex-column scroll layout for floating + modal pickers** (lives in `_base.css` under `.drp-date-picker:not(.drp-date-picker--inline)`). Previously the entire picker was one big `overflow: auto` block; tall content (multi-month grids, 6-row months, etc.) caused the action bar to scroll out of view in floating mode and made days bleed visually behind the action bar in modal mode. Now:
  - Calendar is `display: flex; flex-direction: column; overflow: hidden`
  - Months area is the only scrollable region (`overflow-y: auto; flex: 1; min-height: 0`)
  - Header / unified-header / summary / action bar all `flex-shrink: 0` — pinned at top/bottom
  - The Floating UI `size` middleware no longer forces inline `overflow-y: auto` on the calendar; `_base.css` handles it via the flex layout

  Side benefit: the action bar (`Today` / `Clear` / `Apply`) is always visible regardless of how tall the multi-month content is.

- **Sticky per-month headers** — the per-month header (month name + prev/next, or static label in unified mode) is now `position: sticky; top: 0` within the scrolling months area. Single-row multi-month layouts get a continuous header strip; grid layouts stack-stick on each row as it scrolls past.

- **Always render 6 weeks per month** — the day grid now always renders exactly 42 cells (6 weeks × 7 days), regardless of whether the month fits in 5 or 6 weeks. Previously, 5-week months left empty space at the bottom when laid out next to 6-week months in a grid (rows equalize to the tallest item), creating visible gaps. This is also the standard convention in most date pickers (Google, Apple, Bootstrap datepicker) — clicking through months no longer makes the calendar jump in size. Side effect: single-month inline pickers now show one extra row of dimmed `--other-month` days; if that's unwelcome, scope the change to non-inline pickers only (revert at `date-picker-rendering.ts` line 327 — change `42` back to the previous `Math.ceil(...)` formula but only when `positioningMode !== 'inline'`).

### Fixed

- **Input on a non-focused window required two clicks to open the picker.** When the browser window had lost focus, the first click on the input was consumed by the OS/browser solely to refocus the window — the synthesized `mousedown` and `click` events were suppressed and never reached our listeners. Pointer events sit at a lower level and survive that suppression. Added a `pointerdown` listener on the input alongside the existing `focus` / `mousedown` / `click` handlers. `show()` is idempotent so doubled firings on the normal-click path are harmless.

- **Range mode crashed on `show()` with a partial-range input value when `visible-months-count >= 3`.** `Cannot read properties of undefined (reading 'year')` at `parseAndUpdateSingleDate`. The function built `displayMonths` with at most 2 entries but then iterated `visibleMonthsCount` times — for the 2×3 grid (6 months) or any 3+-month range picker, indices 2+ were `undefined`. **Fix:** build `displayMonths` and `monthDates` with all `visibleMonthsCount` slots upfront, mirroring how single-mode does it. Pre-existing bug; not introduced by the modal work.

- **Click on the input after scroll-close still didn't always reopen the calendar.** v1.11.0 added a `mousedown` listener to handle the "input still focused, calendar got closed" case (since `focus` doesn't re-fire when focus didn't change), but in some pointer/touch sequences and accessibility scenarios `mousedown` alone wasn't enough. Added an early-return guard at the top of `show()` so repeated calls during the same open are no-ops (also stops the silent `cleanupAutoUpdate` leak that occurred when `focus` and `mousedown` both fired on the same click and each re-registered Floating UI's `autoUpdate`); wired both `mousedown` *and* `click` on the input. Three handlers (`focus` + `mousedown` + `click` + later `pointerdown`) all calling `show()` is fine because the `show()` guard makes doubled calls cheap no-ops.

- **Floating UI grid-layout collapse** — `.drp-date-picker__months--grid` had `width: 100%` + `grid-template-columns: repeat(N, minmax(0, 1fr))` from `_base.css`. Inside an auto-sized parent (modal `width: max-content`, or anything with intrinsic sizing), the `minmax(0, ...)` columns let the grid collapse to 0, which made the modal snap back to its `min-width: 280px` floor — looking like a single-month picker at any viewport. **Fix in modal mode:** override grid to `width: auto` + `grid-template-columns: repeat(N, minmax(var(--drp-month-min-width), 1fr))` so columns honor the per-month floor and the grid actually expands.

### Fixed — Examples

- **Code-block styling regression introduced in v1.10.1** — `examples-shared.css` was refactored to scope the dark-background / `white-space: pre` / monospace rules to `.code-block pre` only, and the syntax-highlight span colors (`.keyword`, `.string`, `.comment`, `.function`, `.property`) were dropped entirely. Pages that put `<code>` directly inside `.code-block` (without a `<pre>` wrapper) — `examples-buttons.html` is the most affected, with 14 of 15 code blocks shaped that way — lost all formatting and rendered as flowing plain text. Restored the box styling on `.code-block` itself so it works for both shapes, reset the inner `<pre>` to a transparent zero-margin pass-through to avoid double-padding on pages that do wrap, and re-added the syntax-highlight span colors (scoped to `.code-block` to avoid clashing with anyone else's `.string` / `.function` / etc.). No HTML changes needed; one CSS edit fixes every affected page.

- **`examples-custom-rendering.html` "Hotel Booking with Prices" demo** rendered prices inline next to day numbers instead of stacked below them. The styles for `.custom-day-content` and `.price-tag` lived in the page's `<style>` block, but the picker renders inside Shadow DOM which is style-isolated — page-level CSS doesn't penetrate. **Fix:** added a `customStylesCallback` on the affected picker that injects those styles into the shadow root.

## [1.11.0] - 2026-05-01 - PUBLISHED

### Documentation — Working with Dates Across Timezones

- Added a prominent **⚠️ Working with Dates Across Timezones** section to `README.md` (above Advanced Features). Covers: how the picker represents dates (local-midnight `Date` objects, no UTC anywhere), the `toISOString()` trap and why it shifts dates by ±1 day, the `toLocalISO()` helper pattern for picker callbacks, a server/client transmission table, the `new Date("YYYY-MM-DD")` UTC-midnight gotcha, and a quick checklist. Includes worked examples for the Russia → LA round-trip case.
- Fixed three buggy `toISOString()` snippets in the existing README docs (`getDateMetadataCallback`, `beforeDateSelectCallback` server fetch, `beforeMonthChangedCallback` server fetch) — they were teaching users the same UTC-shift bug we just fixed in the example pages. Each snippet now uses `toLocalISO()` with a comment pointing back to the timezone section.

### Fixed (examples — UTC vs local date in `getDateMetadataCallback` lookups)

- **Badges in `examples-badges-tooltips.html` rendered one day late in any timezone east of UTC** (e.g., CEST). The lookup keys were built from local date components via `dayOffset()`, but `getDateMetadataCallback` used `date.toISOString().split('T')[0]` to derive the key — which converts to UTC. For a user in UTC+2, local **April 30 00:00** is UTC **April 29 22:00**, so the metadata callback queried `"2026-04-29"` and missed; meanwhile querying May 1 returned April 30's value. The icon ended up on May 1 while the tooltip (which uses `data.dateString`, already local) correctly fired on April 30. Most visible in *Method 3: Advanced HTML Tooltips → Event Details Tooltips*.

  **Fix:** added a `toLocalISO(date)` helper to the example scripts and replaced **every** `toISOString().split('T')[0]` callsite — both in live code (~30 callsites across `examples-events.html`, `examples-badges-tooltips.html`, `examples-custom-rendering.html`) and in the documentation `<pre><code>` blocks (5 more) so the docs don't keep teaching the bug. The picker core itself was unaffected; only example code that did its own `Date → string` formatting was wrong.

### Examples — anchored to today (won't go stale next year)

- All example data that was previously hardcoded to 2025/2024 dates is now built relative to today via `dayOffset(N)` / `monthFirstISO()` / `yearFirstISO()` helpers in each `<script>` block:
  - `examples-badges-tooltips.html` — 8 date arrays/maps (specialDates × 4, bookedRanges, bookingInfo, eventInfo, priceData)
  - `examples-basic.html` — `disabledDatesDemo`, `inlineHolidays`, plus 6 HTML pickers (`prefilled-single`, `prefilled-range`, `prefilled-disabled`, `range-limits-demo`, `year-limit-demo`, `q4-demo`) — values + min-date + max-date set via JS at load time
  - `examples-custom-rendering.html` — `prices`, `events`, `cloudyDates`, `bookingData`; all 6 demo pickers' `min-date`/`max-date` constrained to the current month via JS
  - `examples-api-methods.html` — `btn-set-single` and `btn-set-range` button handlers
  - `examples-logging.html` — `drag-debug` picker's pre-filled value
- Labels updated where they referenced specific years ("Only November 2025" → "Only the current month"; "Limited to 2025 Only" → "Limited to Current Year Only"; "Q4 Business Planning (Oct-Dec 2024)" → "Oct-Dec, current year") so the demo descriptions stay truthful.
- `examples-javascript-instantiation.html` — fixed two stale `src/scss/main.scss` imports that referenced a path which never existed in the TS rewrite. Now imports `src/css/main.css`.

### Fixed (pre-existing — calendar opens off-screen below input)

- **Calendar opened below the input even when the input had no room below it (e.g., the 2×3 grid layout near the bottom of the viewport).** Floating UI's `flip()` should have flipped the calendar above, but didn't. Two issues combined:
  1. The author cached the resolved placement (`lockedPlacement`) after the first `computePosition` and removed `flip()` from the middleware on subsequent calls — to prevent "jitter" during `autoUpdate`. But if the first compute happened before the calendar's layout flushed (height ≈ 0), `flip()` wrongly concluded the calendar fit below, locked there, and the cache stuck for the rest of the session.
  2. No `size` middleware, so even when flipping worked, a calendar taller than the viewport (the 2×3 grid is ~900 px) would extend off-screen in either direction.

  **Fix:** dropped the placement cache — `flip({ padding: 8 })` runs on every `position()` call now, so the calendar repositions correctly across the lifecycle. Added Floating UI's `size` middleware to cap the calendar's `max-height` to the available viewport space and turn on internal scrolling when it doesn't fit. The `lockedPlacement` field on the picker class is removed.

  Pre-existing — the cache predates this refactor. Bundle: +1.4 kB UMD (the `size` middleware import).

### Fixed (pre-existing — input click after auto-close)

- **Clicking the input after scroll-close did nothing** until the user clicked elsewhere first. With `calendarOpenTrigger: 'focus'` (the default), `show()` was wired only to the `focus` event. After `closeOnScroll` closed the calendar, the input still had focus, so clicking it again fired no focus event and the calendar stayed closed. **Fix:** added a `mousedown` listener that re-opens the calendar if it's closed and the input is already focused. Pre-existing — predates this refactor.

### Fixed (pre-existing — keyboard navigation scope)

- **Arrow keys fired on every picker on the page simultaneously**, causing focused-day indicators to jump in lockstep across multiple inline pickers and (where the page had room) the page to scroll. Pre-existing since commit `2c57170a` (Nov 6, 2025). The keydown listener lives on `document` and every inline picker set `isCalendarActive = true` at init, so the per-picker `if (!this.isCalendarActive) return` guard was always false for all of them at once.

  **Fix:** new `picker.setCalendarActive()` method broadcasts a `drp-picker-activated` custom event when a picker becomes active. Other pickers listen for it and set their own `isCalendarActive = false`. Inline pickers no longer auto-activate at init — clicking, focusing, or programmatically `show()`-ing a picker activates it and deactivates the others.

  Behavior change: on a page with multiple inline pickers, the user now needs to click any cell or button in a picker once before arrow keys take effect. (Previously arrow keys "worked" but operated on every picker at once, which wasn't useful.) Floating-mode pickers are unaffected — they activate on `show()`.

### Added (Phase 4 — public API)

- **`picker.updateOptions(partial)`** on `DateRangePicker`. Merges a partial `DatePickerOptions` into the live picker, refreshes derived state (locale strings, format info, normalized min/max/disabled/special date sets), and re-renders — **without** destroying selection, focus, scroll, or drag state. Returns `true` when fully applied. Returns `false` for genuinely structural changes (`positioningMode`, `selectionMode`, `visibleMonthsCount`, `monthLayout`, `gridRows`, `gridColumns`, `unifiedNavigation`, `unifiedNavigationAnchorIndex`, `calendarOpenTrigger`) so callers can fall back to a full reinit.
- **`Tooltip` class** exported from `src/tooltip.ts` — self-contained Floating-UI tooltip with hover-delay lifecycle, autoUpdate cleanup, and `destroy()`. Replaces the inline action-button tooltip code that previously lived in `date-picker.ts`.

### Behavior changes (no public API breaks)

- **Attribute changes no longer destroy the picker** for non-structural attributes. Toggling `min-date`, `max-date`, `locale`, `display-format-mask`, `disabled-dates-handling`, `show-today-button`, `show-clear-button`, `show-apply-button`, `auto-close`, `close-on-scroll`, `rolling-year-range`, `rolling-month-range`, `highlight-disabled-in-range`, `show-debug-info`, `disabled-weekdays`, `week-start-day`, `initial-date`, or `calendar-placement` now goes through `updateOptions` and preserves selection state. Reactive frameworks toggling these attributes per render no longer wipe the user's selection on every cycle.
- **Callback-property assignment routes through `updateOptions`** — setting `getDateMetadataCallback`, `badgeTooltipCallback`, `dayTooltipCallback`, `renderDayCallback`, `renderDayContentCallback`, `beforeDateSelectCallback`, `beforeMonthChangedCallback`, `formatSummaryCallback`, `getUnifiedHeaderCallback`, or `getMonthHeaderCallback` no longer rebuilds the picker. (`customStylesCallback` continues to require a full reinit because it injects a `<style>` tag into shadow DOM.)
- **Complex-data setters route through `updateOptions`** — `specialDates`, `disabledDates`, `actionButtons`, and the seven member-mapping properties (`dateMember`, `badgeTextMember`, `badgeClassMember`, `dayClassMember`, `badgeTooltipMember`, `dayTooltipMember`, `isDisabledMember`) update in place. Previously each triggered an immediate destroy + reinit on every assignment.
- **`initializeDateRestrictions` is now idempotent** — clears `normalizedDisabledDates` / `normalizedSpecialDates` before rebuilding, so removing entries via `updateOptions` actually removes them. Also recomputes `normalizedMinDate` / `normalizedMaxDate` (rather than leaving stale values when those options are cleared).

### Internal (Phase 4)

- Single `ATTRIBUTE_TABLE` in `web-component.ts` is now the source of truth for all 29 picker-affecting attributes. Each entry maps `{ attr, key, parser }`. Drives `observedAttributes`, the initial parse in `initializePicker`, and live updates in `attributeChangedCallback`. Replaces the previous hand-coded ~70-line attribute → option block plus the parallel hand-listed `observedAttributes` array.
- Reusable attribute parsers extracted: `parseStringOrUndefined`, `parsePositiveIntOrUndefined`, `parseBoolPresence`, `parseTriStateBool`, `parseTriStateBoolDefaultTrue`, `parseEnum`, `parseDisabledWeekdays`, `parseWeekStartDay`. Adding a new attribute is now one table entry.

### Refactor (Phase 3 — Tooltip class)

- Three methods (`createActionButtonTooltip`, `positionActionButtonTooltip`, `destroyAllActionButtonTooltips`) plus their two state maps in `date-picker.ts` collapse into a single `Tooltip[]` field and a per-button `new Tooltip(target, text, { container })`. Each Tooltip instance owns its DOM element, hover-delay timers, and Floating UI autoUpdate cleanup; `destroy()` releases everything. Same pattern as multiselect 1.9.0's tooltip consolidation.

### Refactor (Phase 2 — internal dedup, behavior-preserving)

- **`moveFocusToDate(picker, target)`** — extracted the duplicated 40-line "walk monthDates → find column → query day cell → toggle `--focused` class" loop in `selectDay`. Single helper replaces the single-mode-adjusted-date and range-end-date blocks.
- **`changeMonth(picker, monthIndex, offset)`** — `prevMonth` and `nextMonth` (mirror images) collapsed into one async function. Public `prevMonth`/`nextMonth` exports kept as thin arrow-function wrappers for source compatibility. Collision-with-neighbour propagation uses the same `offset` direction.
- **Rolling-selector list rendering** — four near-identical render blocks (years/months × per-column/unified) collapsed into `renderRollingItems` + `renderRollingLists`. Both `renderRollingSelector` and `renderUnifiedRollingSelector` now build a small data array and delegate to the shared renderer; HTML output is byte-for-byte identical.
- **`commitInputValue(picker, value)`** — five sites (selectDay single/range/multiple, selectToday, drag-end) gated on `if (picker.input && !picker.requiresApplyButton())` are now a one-liner. `commitInputValue` is exported and reused from `date-picker-interaction.ts` so the gate lives in one place.
- **`formatInputValue(picker)`** — `apply()`'s mode-dispatch input formatting (range / single / multiple) extracted to a pure helper.
- **`commitSelection(picker)`** — three sites of `picker.renderCalendar(); picker.updateSummary();` go through one hook. Single seat for adding debounced events / bulk-op callbacks later.

Net: TS line count across the four affected files dropped by 73 lines (3256 → 3183, −2.2%) after factoring in ~52 lines of new helpers. UMD bundle: 173.72 kB → 172.02 kB (−1.7 kB). No behavior changes, no public API changes.

### Refactor (Phase 2 — CSS)

- **Per-component `*-border-color` hooks now actually do something** — `--drp-nav-border`, `--drp-rolling-border`, `--drp-summary-border`, `--drp-button-border` were defaulting to `var(--drp-border)` directly, ignoring their per-section `*-border-color` siblings. Rebuilt each shorthand from `var(--drp-border-width-base) solid var(--drp-{section}-border-color)` so overriding (e.g.) `--drp-nav-border-color: red;` actually changes the nav border. Defaults unchanged — the per-section `*-border-color` defaults to `--drp-border-color`. Same fix pattern as multiselect 1.9.0 §6.6.
- **Hardcoded `white` replaced** — `.drp-date-picker__day--invalid-range-start/end` had a hardcoded `color: white` bypassing theming. Added `--drp-day-invalid-range-bg` and `--drp-day-invalid-range-color` (defaulting to `--drp-message-error-border` and `--drp-text-color-on-accent` respectively); rule now references the variables. Theme designers can now adjust the invalid-range text/background.

### Fixed

- **Action-button tooltips never attached** — `attachActionButtonTooltips` queried `.drp-date-picker__action`, but rendered buttons use `.drp-date-picker__button`. The selector matched nothing, so tooltips on Today/Clear/Apply/custom buttons silently never appeared. Same flavor as the multiselect 1.9.0 selector bug.
- **Action-button tooltip ID churn** — tooltip IDs used `Date.now()-Math.random()`, regenerated on every render. Switched to a stable per-slot ID (`action-{index}`) stamped onto `data-tooltip-id`. Removes a class of race conditions where an in-flight `hideTooltip` timeout would try to clean up an ID the new render had already replaced.
- **`disabled` attribute triggered full picker rebuild** — `attributeChangedCallback` was missing `disabled` from its surgical-update exclusion list, so toggling `disabled` tore down the calendar and rebuilt it before applying the trivial input-state change. Selection state was lost on every toggle. Added to the exclusion list; the surgical handler immediately below already does the right thing.

### Changed

- **Removed seven `console.log` calls** from production hot paths (drag-end, click handler, `showMessage`, web-component `showMessage`). One genuinely useful `messageElement is null` diagnostic was converted to `uiLogger.warn` so it routes through `loglevel` and respects the configured log level.
- **Removed a `setTimeout` + `getComputedStyle` block in `show()`** that forced layout flush on every calendar open purely to log computed styles. The result was never used by anything but the log call.
- **Documented the HTML-trusted callback contract** — `renderDayCallback`, `renderDayContentCallback`, `formatSummaryCallback`, and `getUnifiedHeaderCallback` splice their string return values directly into `innerHTML`. Added `SECURITY:` JSDoc notes recommending callers sanitize untrusted data or return an `HTMLElement` instead.
- **Locked in `||` semantics in `validateRangeAsync`** — partial adjustment (`adjustedStart` set without `adjustedEnd`, or vice versa) is intentional; consumers fall back per-field. Added a comment so the intent isn't lost in future refactors.
- **`CLAUDE.md`** — rewrote the Architecture section to describe the actual TypeScript module split (`-rendering`, `-navigation`, `-interaction`, `-selection`, `-ui`, `-validation`, `-locales`). Removed stale references to `src/js/`, `src/scss/`, the `[data-date-picker]` auto-init, and the `Sass` build tool.

### Added

- **Selection Hover Text Color Variables**: New CSS variables for full color control on hover states of selected/range days
  - `--drp-day-selected-color-hover` — text color when hovering over a selected day (defaults to `--drp-day-selected-color`)
  - `--drp-day-range-color-hover` — text color when hovering over range start/end days (defaults to `--drp-day-range-color`)
  - Enables full color inversion on hover (e.g., black bg + white text → white bg + black text)
  - Backwards compatible — defaults match non-hover values so existing themes are unaffected
  - Updated `examples-theming.html` to demonstrate full black↔white inversion on selection hover

## [1.10.1] - 2026-01-22 - PUBLISHED

### Fixed

- **Message Alert Horizontal Margins**: Removed unwanted left/right external margins from standard alert messages (error, warning, info, success)
  - Changed `margin: 0 var(--drp-spacing-sm)` to `margin: 0` in `.drp-date-picker__message`
  - Messages now span the full width of the calendar popup without side gaps
  - Bottom margin preserved for proper vertical spacing

## [1.10.0] - 2026-01-22 - PUBLISHED

### Added

- **`custom-action` Event**: New unified event for custom action buttons in both action buttons and messages
  - Fires when any button with `data-action="custom"` is clicked
  - Event detail contains all `data-*` attributes (except `data-action`) as a camelCase key-value map
  - Works identically for action buttons and message buttons
  - Enables declarative custom buttons in `showMessage()` HTML that communicate back to JavaScript
  - Example usage:
    ```javascript
    picker.showMessage(`
      <button data-action="custom" data-start-date="2026-01-14" data-end-date="2026-01-17">
        Apply Jan 14 - Jan 17
      </button>
    `);

    picker.addEventListener('custom-action', (e) => {
      console.log(e.detail); // { startDate: '2026-01-14', endDate: '2026-01-17' }
      picker.selectedRanges = [{
        start: new Date(e.detail.startDate),
        end: new Date(e.detail.endDate)
      }];
      picker.hideMessage();
    });
    ```

- **`data-action="close-message"` Built-in Action**: Simple way to close messages from button clicks
  - Any button with `data-action="close-message"` inside a message will close the message when clicked
  - No JavaScript event listener required for basic close functionality

### Fixed

- **Custom Action Button Click Detection**: Fixed clicks on button child elements (like text nodes or inner spans) not triggering custom actions
  - Now uses `target.closest('[data-action="custom"]')` to properly detect button clicks

- **Selected Ranges Not Re-rendering**: Fixed bug where programmatically setting `selectedRanges` via the reactive setter would not clear invalid range state
  - Now properly clears `invalidRangeStart`, `invalidRangeEnd`, and `focusedDayIndex` when ranges are set

### Documentation

- **XSS Security Notice**: Added security warning to README about callbacks and methods that allow raw HTML injection
  - Lists all affected callbacks: `showMessage()`, `renderDayCallback`, `formatSummaryCallback`, etc.
  - Recommends sanitizing user-generated content before display

## [1.9.6] - 2026-01-21

### Added

- **Event Manager Architecture**: Introduced Pub/Sub event managers for cleaner, more maintainable event handling
  - **ScrollEventManager** (`src/modules/scroll-events/index.ts`):
    - Centralizes scroll event handling with single listener per source
    - Supports `window` and `container` scroll sources
    - Enables multiple subscribers without duplicate listeners
  - **ClickEventManager** (`src/modules/click-events/index.ts`):
    - Centralizes click event handling for inside/outside calendar detection
    - Supports `outsideClick` and `calendarClick` event types
    - Uses `composedPath()` for Shadow DOM compatibility
    - Tracks mousedown/mouseup to survive DOM rebuilds between events

### Fixed

- **Calendar Not Closing on Window Scroll**: Fixed critical bug where the floating calendar would not close when scrolling the page
  - Root cause: No window scroll listener was attached to close the calendar
  - Solution: ScrollEventManager now subscribes to window scroll and closes the calendar in floating mode
  - This was a regression that went unnoticed due to scattered event handling

### Changed

- **Event Handling Architecture**: Migrated from scattered `addEventListener` calls to centralized Pub/Sub pattern
  - Removed `clickOutsideHandler` property and manual listener management
  - Event subscriptions are now tracked and properly cleaned up in `destroy()`
  - Pattern follows web-grid's proven event manager architecture
  - Improves code maintainability and reduces potential for listener leaks

### Documentation

- **Unified Example Page Styling**: Refactored all example pages to use consistent shared CSS
  - New `examples-shared.css` with comprehensive base styles matching web-grid's demo page style
  - Fixed button text visibility (white text on white background) in examples-api-methods.html
  - Fixed code block styling - `<code>` inside `<pre>` and `.code-block` now properly inherits colors
  - Added `.copy-button` styling for code blocks with proper positioning
  - Standardized header styling with gradient cards across all example pages

## [1.9.5] - 2026-01-03

### Added

- **Package Export**: Added `component-variables.manifest.json` to package exports for theme-designer integration

## [1.9.4] - 2026-01-03

### Added

- **Disabled Day Background** - New `--drp-day-disabled-bg` CSS variable for disabled day cell backgrounds
  - References `var(--base-disabled-bg, transparent)` from theme-designer
  - Provides subtle background tint underneath the striped disabled pattern
  - Helps distinguish disabled dates when theme-designer is used

## [1.9.3] - 2025-12-28

### Changed

- **BREAKING: Variable Naming Consistency** - Aligned with theme-designer naming conventions:

  **background → bg:**
  | Old | New |
  |-----|-----|
  | `--drp-dropdown-background` | `--drp-dropdown-bg` |
  | `--drp-tooltip-background` | `--drp-tooltip-bg` |
  | `--drp-loading-overlay-background` | `--drp-loading-overlay-bg` |
  | `--drp-input-background` | `--drp-input-bg` |
  | `--drp-input-background-disabled` | `--drp-input-bg-disabled` |

  **Added -color suffix:**
  | Old | New |
  |-----|-----|
  | `--drp-text-on-accent` | `--drp-text-color-on-accent` |

## [1.9.2] - 2025-12-28

### Changed

- **BREAKING: Renamed `--drp-button-text-color` → `--drp-button-accent-text-color`**
  - Clarifies this is for text on accent backgrounds (Apply button)
  - New `--drp-button-color` is the base button text color

## [1.9.1] - 2025-12-28

### Added

- **Additional CSS Variables**:
  - `--drp-button-bg` - Action button background (default: transparent)
  - `--drp-button-color` - Action button text color (default: --drp-text-primary)
  - `--drp-day-border` - Day cell border
  - `--drp-day-drag-border` - Drag preview border (dashed)
  - `--drp-loading-spinner-size` (default: 40px)
  - `--drp-loading-spinner-border-width` (default: 4px)

### Fixed

- Summary/actions dividers now use `--drp-summary-border` variable instead of hardcoded pattern

## [1.9.0] - 2025-12-28

### Changed

- **BREAKING: Border Variables Aligned with Theme-Designer Spec**

  Input border variables now use full border strings (matching `--base-input-border` pattern) instead of color-only variables:

  | Old Variable | New Variable |
  |--------------|--------------|
  | `--drp-input-border-color` | `--drp-input-border` |
  | `--drp-input-border-color-hover` | `--drp-input-border-hover` |
  | `--drp-input-border-color-focus` | `--drp-input-border-focus` |

  **Migration:** If you were overriding `--drp-input-border-color: #999`, change to `--drp-input-border: 1px solid #999`

### Added

- **Generic Border Variable**: Added `--drp-border` as base full-border variable
  - References `--base-border` from theme-designer (new in theme-designer)
  - Fallback: `var(--drp-border-width-base) solid var(--drp-border-color)`

- **Full Border Variables for Component Elements**:
  - `--drp-nav-border`, `--drp-nav-border-hover-full` - Navigation buttons
  - `--drp-rolling-border` - Rolling selectors
  - `--drp-button-border`, `--drp-button-border-hover-full` - Action buttons
  - `--drp-summary-border` - Summary section

  All inherit from `--drp-border` by default, allowing unified border styling across the component.

- **Theme-Designer Integration**: Input borders now correctly reference:
  - `--base-input-border` (full border string like `1px solid #374151`)
  - `--base-input-border-hover`
  - `--base-input-border-focus`

## [1.8.1] - 2025-12-19

### Added

- **Border Radius Theme Integration**: Added `--drp-border-radius-sm/md/lg` CSS variables with theme-designer support
  - Variables reference `--base-border-radius-sm/md/lg` from theme-designer with fallback defaults
  - Pattern: `calc(var(--base-border-radius-md, 0.6) * var(--drp-rem))` (unitless multiplier × rem base)
  - `--drp-border-radius` alias points to `--drp-border-radius-md` for backward compatibility

- **Input Border Color Theme Integration**: Connected input border colors to theme-designer
  - `--drp-input-border-color` → `var(--base-input-border-color, ...)`
  - `--drp-input-border-color-hover` → `var(--base-input-border-color-hover, ...)`
  - `--drp-input-border-color-focus` → `var(--base-input-border-color-focus, ...)`

- **Input Size Heights Theme Integration** - Input height variables now reference `--base-input-size-*-height` from theme-designer
  - `--drp-input-size-xs-height`: `calc(var(--base-input-size-xs-height, 3.1) * var(--drp-rem))` (31px)
  - `--drp-input-size-sm-height`: `calc(var(--base-input-size-sm-height, 3.3) * var(--drp-rem))` (33px)
  - `--drp-input-size-md-height`: `calc(var(--base-input-size-md-height, 3.5) * var(--drp-rem))` (35px)
  - `--drp-input-size-lg-height`: `calc(var(--base-input-size-lg-height, 3.8) * var(--drp-rem))` (38px)
  - `--drp-input-size-xl-height`: `calc(var(--base-input-size-xl-height, 4.1) * var(--drp-rem))` (41px)
  - Ensures consistent input heights across all KeenMate components when using theme-designer

### Changed

- **BREAKING: SCSS to Pure CSS Migration** - Converted all styles from SCSS to pure CSS
  - Removed SCSS dependency entirely - no more `sass` package required
  - All CSS custom properties now defined in `_variables.css` with hardcoded fallback values
  - Styles now use native CSS `color-mix()` function for opacity calculations (replaces SCSS `color.mix()`)
  - Package exports changed: `./scss` → `./css`, `./scss/variables` → `./css/variables`
  - Import path updated: `@keenmate/web-daterangepicker/css` instead of `@keenmate/web-daterangepicker/scss`

- **Semantic Border Radius**: Applied industry-standard border-radius scale to components
  - **sm** (4px): Day cells, disabled overlay, tooltips - small/compact elements
  - **md** (6px): Input, buttons, nav buttons, month-year header - standard controls
  - **lg** (8px): Calendar container, rolling selectors, loading overlay - larger containers

### Fixed

- **Auto-Close Behavior Fixes**:
  - `requiresApplyButton()` no longer incorrectly defers selection when `show-apply-button="true"` with `auto-close="never"` - selection now commits immediately
  - Apply button now correctly closes the picker in `auto-close="never"` mode (never refers to auto-close on selection, not Apply button)
  - `clearSelection()` now properly clears all visual state including `focusedDayIndex` and drag preview state
  - Calendar now syncs with manually cleared input when reopened via `updateCalendarFromInput()` in `show()`
  - Partial input edit (removing end date portion) now correctly clears `selectedEndDate`

- **Apply Button with Custom Preset Buttons** - `apply()` now always updates input when dates are selected, not just when `pendingSelection` exists. Fixes custom preset buttons (like "Last Week") not committing to input on Apply click.

- **Badge Vertical Alignment** - Fixed badges aligning to top instead of center in calendar cells
  - Removed `height: 100%` from `.drp-date-picker__badge-cell` which caused flex alignment issues

### Removed

- `sass` devDependency - SCSS compiler no longer needed
- `src/scss/` folder - replaced by `src/css/`
- SCSS-specific features like `@use`, `@forward`, `#{interpolation}`, `$variables`

### Migration Guide

**For users importing source styles:**
```css
/* Before */
@import '@keenmate/web-daterangepicker/scss';
@import '@keenmate/web-daterangepicker/scss/variables';

/* After */
@import '@keenmate/web-daterangepicker/css';
@import '@keenmate/web-daterangepicker/css/variables';
```

**For users using the compiled CSS:**
No changes needed - `dist/style.css` works the same way.

**Browser Compatibility:**
The `color-mix()` function requires modern browsers (Chrome 111+, Firefox 113+, Safari 16.2+).
For older browser support, use the compiled `dist/style.css` which is processed by Vite.

## [1.7.0] - 2025-12-08

### Changed

- **Simplified Sizing System - Removed Scale Variables**: Removed the intermediate scale variable system (`--drp-font-scale`, `--drp-spacing-scale`, `--drp-cell-scale`) and associated modifier classes
  - **What was removed**:
    - SCSS variables: `$drp-density-xs` through `$drp-density-xl`
    - CSS modifier classes: `.drp-font-xs/sm/md/lg/xl`, `.drp-spacing-xs/sm/md/lg/xl`, `.drp-cell-xs/sm/md/lg/xl`
    - Responsive scaling classes: `.drp-responsive`
    - Legacy size classes: `.drp-date-picker--xs/sm/lg/xl`
    - Web component attributes: `spacing`, `font-size`, `cell-size`
    - Web component properties: `spacing`, `fontSize`, `cellSize`
  - **Why**: The `--drp-rem` base unit provides cleaner, more flexible scaling without intermediate multipliers
  - **New approach**: Set CSS variables directly on the `<web-daterangepicker>` element
    - Global scaling: `--drp-rem: 8px` (scales everything to 80%)
    - Fine-grained control: `--drp-spacing-xs: 2px`, `--drp-font-size-base: 18px`
  - **Shadow DOM note**: CSS variables must be set on the element itself (via class or inline style), not on wrapper divs
  - **Migration**:
    ```html
    <!-- Before (removed) -->
    <web-daterangepicker spacing="lg" font-size="lg" cell-size="lg">

    <!-- After (CSS variables on element) -->
    <web-daterangepicker style="--drp-rem: 15px;">

    <!-- Or via CSS class -->
    <style>
      web-daterangepicker.large { --drp-rem: 15px; }
    </style>
    <web-daterangepicker class="large">
    ```
  - **Files modified**: `_base.scss`, `_modifiers.scss`, `_calendar-grid.scss`, `_header-navigation.scss`, `_badges.scss`, `_variables.scss`, `web-component.ts`
  - See `examples-sizes.html` for comprehensive CSS variable sizing examples

- **Font Size Variables - Unitless Multipliers**: Changed `--base-font-size-*` variables from expecting rem/em units to unitless multipliers
  - Theme-designer now outputs: `--base-font-size-sm: 1.4` (unitless)
  - Component computes: `calc(1.4 * var(--drp-rem))` = 14px
  - Fixes issue where CSS `em`/`rem` units were computed at assignment time on `:root`, not relative to component's `--drp-rem`
  - Font-size-base variables now use format: `calc(var(--base-font-size-sm, 1.4) * var(--drp-rem))`

### Added

- **`--drp-badge-row-height` CSS Variable**: New custom property for configuring badge row height at runtime
  - Default: `16px` (SCSS variable `$drp-badge-max-height`)
  - Override in your styles: `--drp-badge-row-height: 20px`
  - Replaces hard-coded SCSS calculation with configurable CSS variable

- **Base Variables Example** (`examples-base-variables.html`): New interactive demo for testing theme-designer typography integration
  - Google Fonts loader with auto font-family detection
  - Real-time controls for font sizes (2xs-2xl), weights, and line heights
  - Live CSS output panel showing current variable values
  - Floating and inline date picker demos with special dates

### Fixed

- **'block' Mode Forward Selection**: Fixed `disabled-dates-handling="block"` mode where forward selection (left to right) was behaving like 'prevent' mode
  - Forward drag preview was immediately clipping at disabled dates, preventing users from seeing what they were trying to select
  - Now allows preview to span disabled dates visually, then snaps to last enabled date on completion
  - Both forward and backward selection now work consistently

- **Disabled Dates Visual Highlighting in Range**: Fixed `highlight-disabled-in-range` option not showing visible difference
  - When `highlight-disabled-in-range="true"`, disabled dates within a range now show blue tint behind the disabled overlay
  - When `highlight-disabled-in-range="false"`, disabled dates remain gray (no blue tint)
  - Added CSS rule for `.drp-date-picker__day--disabled.drp-date-picker__day--in-range` combination

- **Today Key ('t') Multi-Month Collision**: Pressing 't' to jump to today now correctly adjusts adjacent months in multi-month view
  - Previously, if right column showed Jan 2026 and you pressed 't', it would show Dec 2025 but left column stayed at Jan 2026 (out of order)
  - Now calls `checkAndResolveCollisions()` to ensure all visible months remain in chronological order

- **Badge Row Spacing**: Removed extra `margin-bottom` from `.drp-date-picker__badge-row`
  - Parent `.drp-date-picker__days` gap already provides spacing between rows
  - Reduces vertical whitespace around badge rows

- **Button Font Inheritance**: Added `font-family: inherit` to action buttons (Today, Clear, Apply)
  - Buttons now inherit the custom font from `--base-font-family`
  - Previously buttons used browser default font for `<button>` elements

- **Keyboard Navigation Boundary Enforcement**: Ctrl+Home and Ctrl+End now respect `rolling-year-range`, `min-date`, and `max-date` constraints
  - Previously these shortcuts could navigate outside allowed date ranges
  - Now stops at the configured boundaries

- **monthHeaders Key Format**: Fixed `monthHeaders` map key format to use 1-based months (YYYY-MM where January = 01)
  - Previously used 0-based months internally which didn't match the documented API
  - Keys like "2025-01" now correctly map to January 2025

## [1.6.0] - 2025-12-05

### Added

- **Custom Month Headers** - New `getMonthHeaderCallback` option to customize individual month header text
  - Callback receives `{ month, monthIndex, monthName, year }` and returns custom header string
  - Example: Display room availability like "Jan 2026 (10 rooms)"

- **Month Headers from beforeMonthChangedCallback** - The `beforeMonthChangedCallback` can now return a `monthHeaders` map
  - Key: `"YYYY-MM"` format (e.g., "2026-01")
  - Value: Custom header text to display
  - Useful when header content depends on async-loaded data
  - Priority order: `monthHeaders` > `getMonthHeaderCallback` > default format

- **Themeable Loading Overlay** - New CSS variables for async loading overlay styling
  - `--drp-loading-overlay-background` - Overlay background color (default: semi-transparent white)
  - `--drp-loading-spinner-color` - Spinner border color
  - `--drp-loading-spinner-accent` - Spinner accent/animated color
  - Enables proper dark theme support for loading states

### Changed

- **BREAKING: Unified Theming Variable Renames** - Renamed several CSS variables for consistency with unified theming system across KeenMate components
  - `--drp-accent-text-color` → `--drp-text-on-accent`
  - `--drp-input-disabled-background` → `--drp-input-background-disabled`
  - `--drp-card-bg` → `--drp-dropdown-background`
  - `--drp-tooltip-bg` → `--drp-tooltip-background`
  - `--drp-tooltip-color` → `--drp-tooltip-text-color`
  - This ensures consistent naming patterns across all KeenMate components (web-multiselect, web-daterangepicker, etc.)
  - Tier 1 variables (core colors, inputs, dropdowns, tooltips) now have identical suffixes across components
  - Enables better integration with the [Theme Designer](https://theme-designer.keenmate.dev) tool
  - **Migration**: Find and replace the old variable names with the new ones in your stylesheets

## [1.5.0] - 2025-11-28

### Changed

- **10px-Based Sizing System**: Converted all rem units to a 10px-based system using `--drp-rem: 10px`
  - All spacing, padding, border-radius, font-size, and height values now use `calc(multiplier * var(--drp-rem))`
  - Visual output remains **identical** - same pixel values, cleaner internal math
  - Enables easy scaling by overriding single `--drp-rem` variable
  - Formula: `multiplier = old_rem_value × 16 ÷ 10`

- **New Input Height Values**: Updated input sizes to match Pure Admin design system
  | Size | Value | Pixels |
  |------|-------|--------|
  | XS | 3.1rem | 31px |
  | SM | 3.3rem | 33px |
  | MD | 3.5rem | 35px |
  | LG | 3.8rem | 38px |
  | XL | 4.1rem | 41px |

### Added

- **`--drp-rem` CSS Variable**: New base unit variable for scaling
  - Default: `10px` (produces same visual output as before)
  - Override to scale entire component: `--drp-rem: 1rem` (inherits from document)
  - Three customization methods documented in README

### Documentation

- Updated README with Input Size Scale section and customization examples
- Documented three ways to customize input heights:
  1. Direct px override: `--drp-input-size-md-height: 42px`
  2. Scale via `--drp-rem`: `--drp-rem: 12px`
  3. Override with calc: `--drp-input-size-md-height: calc(4.2 * var(--drp-rem))`

## [1.4.0] - 2025-11-27 ✅ Published

### Added

- **Input Size Attribute**: New `input-size` attribute for controlling input field dimensions
  - Supports 5-level scale: `xs`, `sm`, `md` (default), `lg`, `xl`
  - Consistent with calendar sizing attributes (`spacing`, `font-size`, `cell-size`)
  - Added CSS variables for xs and xl sizes:
    - `--drp-input-size-xs-*` (font, padding-v, padding-h, height, icon-size)
    - `--drp-input-size-xl-*` (font, padding-v, padding-h, height, icon-size)
  - CSS classes: `.drp-input--xs`, `.drp-input--xl` and icon positioning classes

### Changed

- **Complete 5-Level Size Scale**: All size attributes now support consistent xs/sm/md/lg/xl scale
  - `input-size` - Input field size (floating mode only)
  - `spacing` - Calendar spacing scale
  - `font-size` - Calendar font size scale
  - `cell-size` - Calendar day cell size

### Documentation

- Updated API.md with size attributes in attributes table
- Updated AI documentation (ai/basic-usage.txt, ai/INDEX.txt) with correct size attribute usage
- Added Input Size Variants section to CSS Custom Properties documentation

## [1.3.0] - 2025-11-25

### Added

- **Comprehensive Input Styling**: Added complete styling system for input elements with CSS custom properties
  - New `.drp-input` class with full styling (borders, colors, focus states, disabled states)
  - Three size variants: small, medium (default), and large
  - Size variant classes: `.drp-input--sm`, `.drp-input--lg`
  - Proper calendar icon positioning for all sizes via `.drp-date-picker-input--sm/lg`
  - Input-specific CSS custom properties:
    - `--drp-input-background`, `--drp-input-color`
    - `--drp-input-border-color`, `--drp-input-border-color-hover`, `--drp-input-border-color-focus`
    - `--drp-input-placeholder-color`, `--drp-input-disabled-background`
    - `--drp-input-focus-shadow-color`, `--drp-input-focus-shadow-size`
    - `--drp-input-icon-opacity`
    - Size variant variables for sm/md/lg (font, padding, height, icon size)

### Changed

- **CSS Architecture: Decoupled Component Variables** - Eliminated tight coupling between component styles
  - **Problem**: All components directly referenced base variables (e.g., `var(--drp-text-primary)`, `var(--drp-accent-color)`), creating dependencies where changing one component affected unrelated components
  - **Solution**: Added semantic CSS custom property layer that maps component-specific properties to base variables
  - **Benefits**: Each component can now be styled independently without affecting others

  **New Semantic Variables Added** (in `_base.scss`):

  - **Header & Navigation**: `--drp-header-text-color`, `--drp-header-bg-hover`, `--drp-nav-text-color`, `--drp-nav-border-color`, `--drp-nav-bg-hover`, `--drp-rolling-*` variables
  - **Calendar Grid & Days**: `--drp-weekday-color`, `--drp-day-text-color`, `--drp-day-bg-hover`, `--drp-day-selected-bg`, `--drp-day-selected-color`, `--drp-day-focused-outline`, etc.
  - **Summary & Actions**: `--drp-summary-text-color`, `--drp-summary-count-color`, `--drp-button-border-color`, `--drp-button-today-color`, `--drp-button-apply-bg`, etc.
  - **Badges**: `--drp-badge-number-bg`, `--drp-badge-number-color`, `--drp-badge-count-bg`, `--drp-badge-text-bg`
  - **Unified Navigation**: `--drp-unified-range-text-color`, `--drp-unified-month-color`

  **Files Modified**:
  - `src/scss/_base.scss`: Added 60+ semantic CSS custom properties
  - `src/scss/_header-navigation.scss`: Updated to use semantic variables instead of base variables
  - `src/scss/_calendar-grid.scss`: Updated day cells, weekdays to use semantic variables
  - `src/scss/_summary-actions.scss`: Updated summary and buttons to use semantic variables
  - `src/scss/_badges.scss`: Converted from SCSS variables to CSS custom properties

  **Example Usage**:
  ```css
  /* Now you can customize components independently */
  :root {
    /* Customize just the input without affecting calendar */
    --drp-input-background: #f0f0f0;
    --drp-input-border-color: #999;

    /* Customize buttons without affecting day cells */
    --drp-button-today-color: green;
    --drp-button-apply-bg: purple;
  }
  ```

  **Pattern**: Semantic variables default to base variables (e.g., `--drp-input-color: var(--drp-text-primary)`), but can be overridden independently for fine-grained customization.

## [1.2.0] - 2025-01-24

### Fixed

- **Badge styling in Shadow DOM**: Fixed all examples where `badgeClass` or `dayClass` were used without corresponding `customStylesCallback`
  - **Root Cause**: Badge CSS classes (like `'holiday'`, `'event'`, `'price-high'`) were not defined anywhere. Since web component uses Shadow DOM, these styles must be explicitly injected using `customStylesCallback`.
  - **Files Fixed**:
    - `examples-badges-tooltips.html`: Fixed 8 examples (holidaysDemo, cottageDemo, methodMapping, methodTooltips, memberMappingExample, dynamicPricing, dynamicAvailability, combinedExample)
    - `examples-javascript-instantiation.html`: Updated API documentation from old `class`/`badge`/`tooltip` to new `badgeClass`/`badgeText`/`badgeTooltip`/`dayClass`/`dayTooltip`/`isDisabled`
  - **Pattern Applied**: All fixes inject CSS into Shadow DOM using proper selector format:
    ```javascript
    picker.customStylesCallback = () => {
      return `
        .drp-date-picker__badge-cell.your-class-name {
          background-color: ... !important;
          color: ... !important;
          border: ... !important;
        }
      `;
    };
    ```
  - **Badge Classes Styled**: 'holiday', 'event', 'booked', 'price-high', 'price-medium', 'price-low', 'low-availability', 'medium-availability'
  - **Day Classes Styled**: 'low-availability-day'
  - All badge styling now properly displays in Shadow DOM across all example files

### Added

- **Unified Navigation Enhancements**
  - **`unifiedHeaderInteractive` option**: Makes unified header range display clickable to open month/year rolling selector
    - Default: `false` (header is static text only)
    - When enabled, clicking the unified header (e.g., "January 2025 - June 2025") opens the rolling selector
    - Web component attribute: `unified-header-interactive`
    - Only applies when `unifiedNavigation` is enabled
    - **Example**:
      ```html
      <web-daterangepicker
        unified-navigation
        unified-header-interactive
        visible-months-count="6"
        month-layout="grid"
        grid-rows="2"
        grid-columns="3">
      </web-daterangepicker>
      ```

  - **`getUnifiedHeaderCallback` - Custom unified header text**
    - Callback to customize the unified header range display text
    - Receives: `{ firstMonth: Date, lastMonth: Date, anchorMonth: Date, monthNames: string[] }`
    - Returns: HTML string to display in unified header
    - Enables displaying only anchor month instead of full range
    - **Example** (display only anchor month):
      ```javascript
      const picker = new DateRangePicker(input, {
        unifiedNavigation: true,
        visibleMonthsCount: 9,
        unifiedNavigationAnchorIndex: 4,
        getUnifiedHeaderCallback: ({ anchorMonth, monthNames }) => {
          return `${monthNames[anchorMonth.getMonth()]} ${anchorMonth.getFullYear()}`;
          // Returns: "May 2025" for 3×3 grid with center anchor
        }
      });
      ```
    - **Example** (custom range format):
      ```javascript
      getUnifiedHeaderCallback: ({ firstMonth, lastMonth, monthNames }) => {
        return `${monthNames[firstMonth.getMonth()]} - ${monthNames[lastMonth.getMonth()]} ${lastMonth.getFullYear()}`;
        // Returns: "Jan - Sep 2025"
      }
      ```

  - **Multi-month cache improvement**: `beforeMonthChangedCallback` now calculates full visible range for unified navigation mode
    - Previously only calculated ~42 days for first month
    - Now calculates full range across all visible months (e.g., ~180 days for 2×3 grid)
    - Enables proper bulk metadata loading for multi-month displays
    - Significantly reduces API calls when using unified navigation with `beforeMonthChangedCallback`

- **`beforeMonthChangedCallback` - Performance optimization for bulk metadata loading**
  - New callback invoked BEFORE month navigation occurs (before rendering new month)
  - Enables loading bulk metadata for all visible dates in one API call instead of per-day callbacks
  - **Performance**: 1 API call per month vs 35-42 calls with `getDateMetadataCallback`
  - Can block navigation to unavailable months (returns `action: 'block'`)
  - Shows loading overlay automatically during async operations
  - Callback receives context: `{ year, month, monthIndex, firstVisibleDate, lastVisibleDate }`
  - Returns: `{ action: 'accept' | 'block', metadata?: Map<string, DateInfo>, message?: string }`
  - **Example** (hotel availability):
    ```javascript
    const picker = new DateRangePicker(input, {
      beforeMonthChangedCallback: async ({ firstVisibleDate, lastVisibleDate }) => {
        // Single API call for entire month
        const response = await fetch('/api/availability', {
          method: 'POST',
          body: JSON.stringify({
            start: firstVisibleDate.toISOString(),
            end: lastVisibleDate.toISOString()
          })
        });
        const data = await response.json();

        // Build metadata map
        const metadata = new Map();
        data.forEach(day => {
          metadata.set(day.date, {
            badgeText: `$${day.price}`,
            isDisabled: day.available === 0,
            dayTooltip: `${day.available} rooms available`
          });
        });

        return { action: 'accept', metadata };
      }
    });
    ```
  - **Web Component**: Available as property (not attribute)
    ```javascript
    const picker = document.querySelector('web-daterangepicker');
    picker.beforeMonthChangedCallback = async (context) => { ... };
    ```
  - **Priority**: Bulk metadata cache > `getDateMetadataCallback` > `specialDates`
  - See `examples-events.html` for complete examples

### Fixed

- **Unified Navigation: Year range drift in rolling selector**
  - Fixed bug where unified rolling selector's year range would drift after selecting years
  - When `rollingYearRange` not explicitly set, default range (today ± 1) now stays stable
  - Example: Default shows 2024-2026, selecting 2026 keeps range 2024-2026 (previously drifted to 2025-2027)
  - Centralized year/month range calculation via `getEffectiveYearRange()` and `getEffectiveMonthRange()`
  - Both rendering and validation now use same range logic (single source of truth)

- **Navigation buttons now respect rollingYearRange/rollingMonthRange boundaries**
  - Navigation buttons (< >) previously allowed navigating outside configured date ranges
  - Added two-layer boundary enforcement:
    1. Click handler checks if button is disabled before executing navigation
    2. Navigation functions validate target month has enabled days
  - Applies to both unified navigation and individual month navigation
  - Buttons are already visually disabled, now also functionally blocked

- **Unified rolling selector now closes on click outside**
  - Added document-level click handler for all positioning modes
  - **Inline mode**: Clicking outside calendar closes rolling selectors (calendar stays visible)
  - **Floating mode**: Clicking outside calendar closes entire calendar + selectors
  - Matches intuitive behavior of standard dropdown menus
  - Handler properly attached during initialization for inline mode

- **Non-interactive unified headers no longer show hover effects**
  - When `unifiedHeaderInteractive` is false, unified header appeared clickable with hover background
  - Added CSS modifier class `.drp-date-picker__unified-range--static`
  - Non-interactive headers now have default cursor and no hover/active effects
  - Clearly distinguishes clickable vs non-clickable headers

- **Unified Navigation: Individual month headers now non-interactive**
  - Fixed bug where individual month headers were still interactive (clickable) in unified navigation mode
  - Individual month headers now correctly display as static text-only with no prev/next buttons
  - Only the unified header should have navigation controls when `unifiedNavigation` is enabled
  - Eliminates user confusion about which navigation controls are active

- **Unified Navigation: Rolling selector constraints now properly applied**
  - Verified that `rollingYearRange` and `rollingMonthRange` constraints work correctly in unified rolling selector
  - Year and month selectors properly mark disabled years/months
  - Matches behavior of individual month rolling selectors

### Changed

- **BREAKING: Renamed `beforeDateSelect` to `beforeDateSelectCallback`**
  - **What Changed**: To maintain naming consistency across the codebase, the callback property has been renamed.
  - **Naming Convention**: Event handlers (passive) use no suffix (e.g., `onSelect`), while callbacks (active transforms/validation) use "Callback" suffix.
  - **Old API** (removed):
    ```javascript
    const picker = new DateRangePicker(input, {
      beforeDateSelect: async (selection) => {
        return { action: 'accept' };
      }
    });
    ```
  - **New API**:
    ```javascript
    const picker = new DateRangePicker(input, {
      beforeDateSelectCallback: async (selection) => {
        return { action: 'accept' };
      }
    });
    ```
  - **Why**: `beforeDateSelectCallback` actively participates in selection (validates, blocks, adjusts), making it a "callback" not just an "event handler"
  - **Migration**: Simply rename `beforeDateSelect` → `beforeDateSelectCallback` in your code

### Removed

- **BREAKING: Removed deprecated `validateRangeCallback`**
  - The old `validateRangeCallback` has been completely removed
  - Use `beforeDateSelectCallback` instead (works for both single and range modes)

## [1.1.0] - 2025-11-20

### Added

- **`formatSummaryCallback` now available as web component property**
  - Previously only available in JavaScript API, now exposed on `<web-daterangepicker>` element
  - Set directly on web component: `picker.formatSummaryCallback = (data) => { ... }`
  - Allows custom summary formatting in range mode (pricing, night counts, etc.)
  - See updated documentation in `ai/basic-usage.txt` and showcase examples
  - **Example**:
    ```javascript
    const picker = document.querySelector('web-daterangepicker');
    picker.formatSummaryCallback = (data) => {
      const total = data.nights * 150;
      return `${data.nights} nights × $150 = $${total}`;
    };
    ```

### Changed

- **Updated documentation to clarify callback availability**
  - `ai/basic-usage.txt`: Added comprehensive section on web component callback properties
  - `ai/INDEX.txt`: Added new "WEB COMPONENT CALLBACK PROPERTIES" section
  - Most callbacks are now properly exposed as web component properties
  - Only `customStrings` and `actionButtons` remain JavaScript API only

### Fixed

- **Updated `examples-basic.html` to use proper API**
  - Changed from accessing private `picker` property to using public `formatSummaryCallback` property
  - Removes reliance on internal implementation details

### Removed

- **BREAKING: Removed `isDateDisabled` callback option**
  - **What Changed**: The `isDateDisabled` callback has been completely removed from the API. Use `getDateMetadataCallback` instead.
  - **Old API** (removed):
    ```javascript
    const picker = new DateRangePicker(input, {
      isDateDisabled: (date) => {
        return date.getDay() === 0 || date.getDay() === 6; // Boolean return
      }
    });
    ```
  - **New API** (correct):
    ```javascript
    const picker = new DateRangePicker(input, {
      getDateMetadataCallback: (date) => {
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        return isWeekend ? { isDisabled: true } : null; // DateInfo object or null
      }
    });
    ```
  - **Why**: This removes API inconsistency. The `getDateMetadataCallback` is more powerful as it allows both disabling dates AND adding visual metadata (badges, tooltips, custom classes) in a single callback.
  - **Migration Guide**:
    1. Find all uses of `isDateDisabled` in your code
    2. Replace with `getDateMetadataCallback`
    3. Change return value from boolean to `{ isDisabled: true }` or `null`
    4. Optionally add visual metadata like badges or tooltips
  - **Files Modified**: `src/types.ts`, `src/web-component.ts`, `src/date-picker-validation.ts`, `src/date-picker.ts`

## [1.0.0] - PUBLISHED - 2025-11-20

### Changed

- **BREAKING: Logging System - Complete Rewrite**
  - **Global API Namespace**: Migrated from `window.keenmate.daterangepicker` to `window.components['web-daterangepicker']`
    - **Old**: `window.keenmate.daterangepicker.version()`
    - **New**: `window.components['web-daterangepicker'].version()`
  - **Logger Naming**: Renamed loggers to match hierarchical category system
    - `initLogger` → `drpLogger` (main logger for initialization and general logs)
    - All other loggers renamed to hierarchical categories: `DRP`, `DRP:RENDERING`, `DRP:INTERACTION`, `DRP:SELECTION`, `DRP:NAVIGATION`, `DRP:UI`, `DRP:VALIDATION`, `DRP:DRAG`
  - **Color-Coded Console Output**: Added styled console logs matching svelte-spa-router pattern
    - Blue for debug, green for info, orange for warn, red for error
    - Timestamps with milliseconds for precise debugging
    - Format: `[HH:MM:SS.mmm] [LEVEL] [CATEGORY] message`
  - **New Logging API**: Exposed via `window.components['web-daterangepicker'].logging`
    - `enableLogging()` - Enable all loggers at debug level
    - `disableLogging()` - Silence all loggers
    - `setLogLevel(level)` - Set all loggers to specific level ('trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent')
    - `setCategoryLevel(category, level)` - Set specific category level (e.g., 'DRP:RENDERING', 'debug')
    - `getCategories()` - Get array of all available categories
  - **Files Modified**:
    - `src/logger.ts` - Complete rewrite with loglevel-plugin-prefix, custom methodFactory, color scheme
    - `src/index.ts` - Changed global namespace, added logging property to API
    - `src/date-picker.ts` - Updated imports (`initLogger` → `drpLogger`, `setLoggingEnabled` → `enableLogging/disableLogging`)
  - **Usage Example**:
    ```javascript
    // Enable all logging
    window.components['web-daterangepicker'].logging.enableLogging()

    // Set specific category to debug
    window.components['web-daterangepicker'].logging.setCategoryLevel('DRP:RENDERING', 'debug')

    // Get all categories
    window.components['web-daterangepicker'].logging.getCategories()
    // Returns: ['DRP', 'DRP:RENDERING', 'DRP:INTERACTION', 'DRP:SELECTION', 'DRP:NAVIGATION', 'DRP:UI', 'DRP:VALIDATION', 'DRP:DRAG']

    // Disable all logging
    window.components['web-daterangepicker'].logging.disableLogging()
    ```

- **Callback property names** for clarity and consistency
  - `renderDay` → `renderDayCallback`
  - `renderDayContent` → `renderDayContentCallback`
  - `getDateMetadata` → `getDateMetadataCallback`

### Added

- **Size Control Attributes**: New `spacing` and `font-size` attributes for easy calendar sizing
  - **`spacing` attribute**: Controls gaps, padding, and calendar width
  - **`font-size` attribute**: Controls all text sizing
  - **Values**: `"xs"` (0.7×) | `"sm"` (0.85×) | `"md"` (1.0×, default) | `"lg"` (1.2×) | `"xl"` (1.4×)
  - **Usage**:
    ```html
    <!-- Small compact picker -->
    <web-daterangepicker spacing="sm" font-size="sm"></web-daterangepicker>

    <!-- Large picker for desktop -->
    <web-daterangepicker spacing="lg" font-size="lg"></web-daterangepicker>

    <!-- Independent control: large text, compact spacing -->
    <web-daterangepicker spacing="sm" font-size="lg"></web-daterangepicker>
    ```
  - **JavaScript API**:
    ```javascript
    const picker = document.querySelector('web-daterangepicker');
    picker.spacing = 'lg';      // Property setter
    picker.fontSize = 'xl';     // Property setter
    ```
  - **Implementation**: Applies existing `.drp-spacing-*` and `.drp-font-*` CSS classes to the component element
  - **Benefits**:
    - No wrapper divs needed (works with Shadow DOM)
    - Dynamic sizing via JavaScript properties
    - Independent font and spacing control
    - No re-initialization when size changes (just CSS updates)
  - **Files Modified**:
    - `src/web-component.ts`: Added size attribute handling, `applySizeStyles()` method, getters/setters
  - **Replaces**: Wrapper div approach with CSS classes (though CSS classes still work for advanced use)

## [1.0.0-rc08] - 2025-11-13

### Fixed

- **Critical: RC07 was published without today's fixes**: RC07 was built from outdated dist folder (Nov 12 build)
  - This version correctly includes all fixes from rc06 and rc07
  - Updated Makefile: `make publish` now runs `clean-dist` before building
  - Ensures published package always contains latest source code changes

## [1.0.0-rc07] - 2025-11-13

### Changed

- **BREAKING: Calendar Trigger Modes Renamed**: Replaced `calendar-open-trigger` values for better clarity
  - **Old values**: `"auto"` | `"button"`
  - **New values**: `"focus"` | `"typing"` | `"manual"`
  - **Migration Guide**:
    - `"auto"` → `"focus"` (default behavior - opens on input focus)
    - `"button"` → `"manual"` (opens only via button click or programmatic calls)
    - NEW: `"typing"` mode opens calendar when user starts typing
  - **Files Updated**:
    - `src/types.ts`: Updated DatePickerOptions interface
    - `src/date-picker.ts`: Implemented three distinct trigger modes with proper event listeners
    - `src/web-component.ts`: Updated attribute parsing, default is now `"focus"`
  - **New Examples**: Added "Calendar Trigger Modes" section in `examples-basic.html` demonstrating all three modes

### Added

- **Typing Trigger Mode**: New `calendar-open-trigger="typing"` mode that opens calendar when user starts typing in the input
  - Useful for search-as-you-type interfaces
  - Calendar opens automatically when input value length > 0
  - Example: Start typing "2025" and calendar opens showing that year

## [1.0.0-rc06] - 2025-11-13

### Fixed

- **Critical: Month Offset Bug**: Fixed +1 month offset when parsing `data-date` attributes
  - **Root Cause**: `data-date` stores months in 1-based format (1-12), but JavaScript `Date` constructor expects 0-based months (0-11)
  - **Impact**: When selecting November 3-4, the range was actually created for December 3-4. Drag interactions also selected wrong months.
  - **Files Fixed**:
    - `src/date-picker-selection.ts` (lines 99, 193): Added `month - 1` when creating Date from selected day and when tracking focused day
    - `src/date-picker-interaction.ts` (lines 100, 222, 373): Added `month - 1` in drag start, drag move, and drag end handlers
    - `src/date-picker-navigation.ts` (lines 179, 258, 312): Added `month - 1` in keyboard navigation functions
    - `src/date-picker-rendering.ts` (line 739): Added `month - 1` in updateDragPreview to fix drag visual preview
  - **Test File**: Added `test-month-bug.html` to verify fix with 3 test cases (single date, range, cross-month)
  - Now `data-date="2025-11-12"` correctly creates November 12, not December 12

- **Missing Function Import**: Fixed `normalizeDate is not defined` error
  - **Location**: `src/date-picker.ts` line 152
  - **Fix**: Changed `normalizeDate()` to `Validation.normalizeDate()` to use proper namespace
  - This error prevented ALL date pickers from initializing

- **Missing Script Import**: Fixed custom rendering examples not displaying
  - **Location**: `examples-custom-rendering.html`
  - **Fix**: Added `<script type="module" src="/src/index.ts"></script>` to load web component
  - All 6 custom rendering examples now work correctly

## [1.0.0-rc05] - 2025-11-13

### Added

- **Custom Day Cell Rendering**: Added comprehensive customization API with slots and render callbacks
  - **Named Slots per Day**: Declarative HTML customization using `<div slot="day-YYYY-MM-DD">`
    - Example: `<div slot="day-2025-01-15">Custom content</div>`
    - Perfect for marking specific special dates, events, or holidays
    - Highest priority - overrides callbacks and default rendering

  - **`renderDay` Callback**: Full replacement of day cell content
    - Signature: `(data: DayRenderData) => HTMLElement | string | null`
    - Replaces entire day cell content with custom rendering
    - Use for dynamic content like prices, availability, complex layouts
    - Second priority - used when no slot exists for that day

  - **`renderDayContent` Callback**: Augmentation of default day cell
    - Signature: `(data: DayRenderData) => HTMLElement | string | null`
    - Adds content to default day number display
    - Use for badges, icons, indicators that accompany the day number
    - Third priority - used when no slot and no `renderDay`

  - **DayRenderData Interface**: Complete context provided to callbacks
    - Date information: `date` (Date object), `dateString` (ISO format), `dayNumber` (1-31)
    - State flags: `isDisabled`, `isSelected`, `isStartDate`, `isEndDate`, `isInRange`, `isToday`, `isWeekend`
    - Context: `monthIndex`, `element` (default rendered element), `picker` (picker instance)

  - **Priority System**: Three-tier rendering with clear precedence
    1. Per-day slots (highest) - declarative HTML for specific dates
    2. `renderDay` callback - programmatic full replacement
    3. `renderDayContent` callback - programmatic augmentation
    4. Default rendering (lowest) - built-in day number display

  - **Web Component Integration**: Properties exposed on `<web-daterangepicker>` element
    - `picker.renderDay = (data) => { ... }` - Set callback via JavaScript
    - `picker.renderDayContent = (data) => { ... }` - Set callback via JavaScript
    - Callbacks trigger automatic re-render when changed

  - **Examples File**: Created `examples-custom-rendering.html` with 6 complete examples
    - Per-day slots with events and holidays
    - Hotel booking with dynamic pricing
    - Event calendar with indicators
    - Weekend highlighting based on state
    - Mixed slots + callbacks pattern
    - Real-world booking system with totals

  - **Files Modified**:
    - `src/types.ts`: Added `DayRenderData` interface and `renderDay`/`renderDayContent` options
    - `src/date-picker.ts`: Added callback options to constructor (lines 117-118)
    - `src/date-picker-rendering.ts`:
      - Refactored `renderDays()` to wrap content in `<slot>` tags (line 377)
      - Added `processRenderCallbacks()` function to handle callback execution (lines 391-490)
      - Checks slot content, calls callbacks, injects results into DOM
    - `src/web-component.ts`:
      - Added `_renderDay` and `_renderDayContent` private properties
      - Added public getters/setters with auto re-render (lines 429-456)
      - Pass callbacks to picker options (lines 172-173)

### Technical Details

- **Slot Implementation**: Uses HTML `<slot>` elements with named slots for each day
  - Slot names follow format: `day-YYYY-MM-DD` (e.g., `day-2025-01-15`)
  - Default content is day number, replaced by user's slotted content
  - Uses `assignedNodes()` to detect if user provided content

- **Callback Processing**: Runs after DOM update in `renderDays()`
  - Queries all `.drp-date-picker__day` elements
  - Builds `DayRenderData` object with complete state
  - Checks for slot content first (skip callback if slot exists)
  - Executes callback and injects result (HTML string or HTMLElement)
  - Error handling with try-catch and console logging

- **State Classes**: Component ALWAYS adds state CSS classes to container
  - `drp-date-picker__day--disabled`, `--selected`, `--range-start`, etc.
  - Users can leverage these for styling or ignore for complete custom styling
  - Hybrid approach: component manages container, callbacks manage content

## [1.0.0-rc04] - 2025-11-13

### Added

- **Rolling Selector Range Constraints**: Added `rollingYearRange` and `rollingMonthRange` options to limit date selection
  - `rollingYearRange`: Control which years appear in rolling selector and are selectable
    - Examples: `"2025"` (single year), `"2024-2026"` (range)
    - Acts as PRIMARY constraint - dates outside this range are disabled
  - `rollingMonthRange`: Control which months appear in rolling selector and are selectable
    - Format: `"MM-MM"` (e.g., `"06-08"` for summer months, `"11-12"` for year-end)
    - Acts as PRIMARY constraint - dates outside this range are disabled
  - Both options filter the rolling selector lists AND disable dates in the calendar grid
  - Added to `types.ts`, `date-picker.ts`, `web-component.ts` as `rolling-year-range` and `rolling-month-range` attributes
  - Default year range changed from ±50 years to ±1 year (3 years total) when no constraints specified

- **Initial Date Option**: Added `initialDate` option to control which month/year displays when calendar opens
  - Format: Date object or date string (e.g., `"2024-10-01"`)
  - Web component attribute: `initial-date`
  - Smart defaults when not specified:
    - If rolling ranges set: Uses first day of first allowed year/month
    - Else if today is before `minDate`: Uses `minDate`
    - Else if today is after `maxDate`: Uses `maxDate`
    - Else: Uses today
  - Added to `types.ts`, `date-picker.ts`, `web-component.ts`

- **Rolling Selector Examples**: Added comprehensive examples section in `examples-basic.html`
  - Current Year Only
  - Limited to 2025 (via date constraints)
  - Summer Months Only (June-August)
  - Q4 Business Planning (Oct-Dec 2024)
  - Year-End Booking (Nov-Dec only)
  - Multi-Year Range (2024-2026)

### Fixed

- **Rolling Selector Parameters Not Working**: Fixed critical bug where `rollingYearRange` and `rollingMonthRange` were not being applied
  - Root cause: Options were read by web component but never copied to `this.options` in `PureDatePicker` constructor
  - Added missing properties to options object in `date-picker.ts` (lines 114-115)

- **Date Validation Logic**: Made rolling ranges PRIMARY constraints, min/max dates SECONDARY
  - Updated `isDateDisabledInternal()` to check year/month ranges FIRST before other constraints
  - Example: `rolling-month-range="06-07"` only allows June-July dates, even if `min-date/max-date` span full year
  - If ranges are outside min/max dates, all dates are disabled (correct behavior)
  - Added parser helper methods `parseYearRange()` and `parseMonthRange()` to picker class

- **Rolling Selector Width Jump**: Fixed calendar width shrinking by ~0.5rem when opening month/year selector
  - Root cause: Rolling selector had different gap spacing than calendar grid
  - Solution 1: Changed rolling selector gap from `--drp-spacing-md` to `--drp-spacing-xs` in `_header-navigation.scss`
  - Solution 2: Added dynamic width calculation (like height) in `date-picker-rendering.ts`
    - Captures `offsetWidth` of days grid on first render
    - Rounds up with `Math.ceil()` for consistency
    - Sets explicit `style.width` on rolling selector
  - Calendar now maintains consistent width when toggling views

- **Auto-scroll on Rolling Selector Open**: Removed automatic scroll-to-selected-item behavior
  - Removed `scrollIntoView()` calls from `renderRollingSelector()` (lines 395, 414 in `date-picker-rendering.ts`)
  - Selector now stays at top position when opened, providing better UX

- **Month Range Rendering**: Fixed month list to only show months within configured range
  - Changed from rendering all 12 months (with some disabled) to only rendering months in `rolling-month-range`
  - Loop now iterates from `monthRange.min` to `monthRange.max` only
  - Disabled validation still applies to rendered months based on min/max dates

- **Year Range Default**: Reduced default year range for better UX
  - Changed from ±50 years (101 years!) to ±1 year (3 years total)
  - When `min-date/max-date` set but no `rolling-year-range`, automatically constrains to years from those dates
  - Much more sensible default for most use cases

### Changed

- **Validation Logic Priority**: Rolling selector ranges now act as primary constraints
  - Order of validation in `isDateDisabledInternal()`:
    1. Check `rollingYearRange` - disable if outside year range
    2. Check `rollingMonthRange` - disable if outside month range
    3. Check `minDate/maxDate` - disable if outside date range
    4. Check disabled weekdays, disabled dates, custom callbacks
  - This ensures month/year ranges define the "allowed universe" of dates

## [1.0.0-rc03] - 2025-11-11

### Fixed

- **Range Mode Selection Border (Multi-Month)**: Completed fix for visual bug where original clicked date retained focused styling when dragging a range from a different month column
  - Previously only worked within same month column
  - Now properly clears both visual classes and focus state across all month columns in multi-month display
  - Fixed in `date-picker-interaction.ts` lines 119-125:
    - Clears `focusedDayIndex` to prevent re-applying focus during re-render
    - Removes all selection-related CSS classes (`--range-start`, `--range-end`, `--selected`, `--focused`) from all day elements
  - Ensures clean visual state when starting new range from different month

### Removed

- **Old SCSS File**: Removed `src/scss/_date-picker.scss.old` (replaced by modular SCSS architecture)

### Added

- **Example Files**: Added comprehensive example HTML files
  - `examples-basic.html` - Basic usage examples
  - `examples-logging.html` - Logging and debugging examples
  - `examples-theming.html` - Theming and customization examples

## [1.0.0-rc02] - 2025-11-11

### Added

- **Convenience Package Exports**: Added direct exports for commonly used SCSS files
  - `@keenmate/web-daterangepicker/scss/variables` - Direct access to SCSS variables
  - `@keenmate/web-daterangepicker/scss/base` - Direct access to CSS custom properties definitions
  - Makes it easier to import just the variables or base styles without traversing paths

### Fixed

- **Dark Theme Color System**: Fixed theming system to support proper dark mode and custom color schemes
  - **Root Cause**: CSS color properties were missing from month titles and day cells, causing text to default to black
  - **Added Missing Color Declarations**:
    - Added `color: var(--drp-text-primary)` to `.drp-date-picker__month-year` in `_header-navigation.scss`
    - Added `color: var(--drp-text-primary)` to `.drp-date-picker__day` in `_calendar-grid.scss`
  - **New CSS Variables for Themeable Text Colors**:
    - Added `--drp-accent-text-color` for text on accent-colored backgrounds (default: white)
    - Added `--drp-button-text-color` for button text (default: white)
  - **Replaced Hardcoded Colors**: Converted all hardcoded white text colors to CSS variables:
    - Selected days, range dates, and drag preview edges now use `var(--drp-accent-text-color)`
    - Apply button now uses `var(--drp-button-text-color)`
    - Rolling selector selected items now use `var(--drp-accent-text-color)`
  - **Updated Dark Theme Example**: Enhanced `examples-theming.html` with proper dark mode colors:
    - `--drp-text-primary: #f1f5f9` (light text for dark backgrounds)
    - `--drp-accent-text-color: #ffffff` (white text on blue accents)
    - `--drp-button-text-color: #ffffff` (white text on buttons)
  - This enables full theming support where accent colors, backgrounds, and text colors can all be customized independently
- **SCSS Import Structure**: Fixed web component to use new modular SCSS architecture
  - Changed `web-component.ts` to import `./scss/main.scss` instead of old monolithic `_date-picker.scss`
  - Ensures all color properties from modular files are included in the build
  - Renamed old file to `_date-picker.scss.old` to prevent confusion
- **Range Mode Selection Border**: Fixed visual bug where the original clicked date retained its selection border when dragging a range from a different date
  - When clicking a date and then dragging from a different date, the picker now correctly clears the old selection
  - Prevents confusing visual state where multiple dates appear selected
  - Fixed in `date-picker-interaction.ts` startDrag function
- **Month/Year Selector Navigation Interference**: Fixed selector staying open when navigation buttons are clicked
  - Month/year rolling selector now automatically closes when users click previous/next month buttons (< >)
  - Prevents scroll jumping and layout issues caused by open selector during month navigation
  - Fixed in `date-picker-navigation.ts` prevMonth and nextMonth functions

### Documentation

- **Input Styling Limitation**: Documented Shadow DOM limitation for input field styling
  - Added comprehensive warning section in Custom Styling documentation page
  - Explained why component cannot style the `<input>` element directly (Shadow DOM encapsulation)
  - Provided CSS examples for styling inputs in global styles
  - Included framework examples for Tailwind CSS and Bootstrap
  - Cross-referenced with API documentation Known Limitations section
- **Placeholder Clarification**: Documented that `placeholder` attribute must be set explicitly even when using `display-format-mask`
  - The `display-format-mask` only provides localized format tokens for display
  - The `placeholder` attribute controls the actual input placeholder text
  - Both should be set for optimal user experience

## [2.0.0] - 2025-11-06

### BREAKING CHANGES - Comprehensive Naming Refactor

This release focuses entirely on improving naming clarity and self-documentation across the entire API. All changes are **breaking** and require migration.

### Added

#### Internationalization (i18n)

Complete i18n support with automatic locale detection, built-in translations, and full customization:

- **Auto Locale Detection**: Set `locale="auto"` to automatically detect user's browser language
- **Built-in Locales**: English (`en`), German (`de`), French (`fr`), Spanish (`es`)
- **Intl API Integration**: Automatically localized weekday and month names via `Intl.DateTimeFormat`
- **Dual Mask System**:
  - `date-format-mask`: Used for validation (always English tokens: YYYY, MM, DD)
  - `display-format-mask`: Shown to users (localized tokens: aaaa for Spanish año, jjjj for German jahr)
  - Example: `date-format-mask="YYYY-MM-DD"` with `display-format-mask="dd/mm/aaaa"` for Spanish
- **Custom String Overrides**: Override any UI string via `customStrings` option
  - Button labels: `today`, `clear`, `apply`
  - Summary text: `preview`, `day`/`days`, `night`/`nights`
- **New Attributes**:
  - `locale`: Set language (`'auto'`, `'en'`, `'de'`, `'fr'`, `'es'`)
  - `display-format-mask`: Localized format hint for users
- **New Options**:
  - `locale`: Language code or `'auto'`
  - `displayFormatMask`: Localized format mask
  - `customStrings`: Partial<LocaleStrings> for overriding UI text
- **New TypeScript Interface**: `LocaleStrings` for type-safe custom translations

**Example Usage:**

```html
<!-- Spanish with auto-detection -->
<web-daterangepicker locale="auto"></web-daterangepicker>

<!-- Explicit Spanish with localized display mask -->
<web-daterangepicker
  locale="es"
  date-format-mask="YYYY-MM-DD"
  display-format-mask="dd/mm/aaaa"
  placeholder="Selecciona una fecha">
</web-daterangepicker>
```

```javascript
// German with custom string overrides
const picker = new PureDatePicker(input, {
  locale: 'de',
  dateFormatMask: 'DD.MM.YYYY',
  displayFormatMask: 'tt.mm.jjjj',
  customStrings: {
    today: 'Jetzt',
    clear: 'Zurücksetzen'
  }
});
```

### Fixed

- **Grid Layout Overflow**: Fixed floating calendar popups with grid layouts not being visible on smaller screens
  - Added `max-width: calc(100vw - 2rem)` to prevent calendar from extending beyond viewport
  - Added `box-sizing: border-box` to include padding in width calculation
  - Grid layouts (especially 2×3 with 6 months) now properly constrain to viewport width

#### Renamed Web Component Attributes (HTML)

| Old Name | New Name | Reason |
|----------|----------|--------|
| `mode` | `selection-mode` | Clarifies this controls selection behavior |
| `format` | `date-format-mask` | Specifies this is for date formatting |
| `months-to-show` | `visible-months-count` | More explicit about what the number represents |
| `trigger` | `calendar-open-trigger` | Clarifies what is being triggered |
| `disabled-days` | `disabled-weekdays` | Distinguishes from days of month (0-6 are weekdays) |
| `display` | `positioning-mode` | More explicit about what is being displayed |
| `layout` | `month-layout` | Clarifies this controls month arrangement |
| `range-disabled-mode` | `range-disabled-handling` | Better describes the behavior |
| `position` | `calendar-placement` | More specific about what is being positioned |

#### Renamed DatePicker Options (JavaScript/TypeScript)

| Old Name | New Name |
|----------|----------|
| `mode` | `selectionMode` |
| `position` | `calendarPlacement` |
| `monthsToShow` | `visibleMonthsCount` |
| `format` | `dateFormatMask` |
| `calendarTrigger` | `calendarOpenTrigger` |
| `display` | `positioningMode` |
| `layout` | `monthLayout` |
| `disabledDays` | `disabledWeekdays` |
| `getDateInfo` | `getDateMetadata` |
| `rangeDisabledMode` | `rangeDisabledHandling` |

#### Renamed Public Methods

| Old Name | New Name | Reason |
|----------|----------|--------|
| `getValue()` | `getInputValue()` | Clarifies it returns the input's value |
| `setValue()` | `setInputValue()` | Clarifies it sets the input's value |
| `clear()` | `clearSelection()` | Explicit about what is being cleared |

#### Renamed TypeScript Interfaces

| Old Name | New Name | Reason |
|----------|----------|--------|
| `SpecialDate` | `DecoratedDate` | Better describes dates with custom styling/labels |

#### Renamed CSS Classes (ALL)

**All CSS classes** have been renamed from `pa-*` prefix to `drp-*` prefix (Date Range Picker):

- `pa-date-picker` → `drp-date-picker`
- `pa-input` → `drp-input`
- `pa-date-picker__day` → `drp-date-picker__day`
- ... and 100+ other classes

### Migration Guide

#### For HTML/Web Component Users

```html
<!-- BEFORE (v1.0.0-rc01) -->
<web-daterangepicker
  mode="range"
  format="DD/MM/YYYY"
  months-to-show="2"
  trigger="auto"
  disabled-days="0,6"
  range-disabled-mode="block"
  display="floating"
  layout="grid"
  position="bottom">
</web-daterangepicker>

<!-- AFTER (v2.0.0) -->
<web-daterangepicker
  selection-mode="range"
  date-format-mask="DD/MM/YYYY"
  visible-months-count="2"
  calendar-open-trigger="auto"
  disabled-weekdays="0,6"
  range-disabled-handling="block"
  positioning-mode="floating"
  month-layout="grid"
  calendar-placement="bottom">
</web-daterangepicker>
```

#### For JavaScript/TypeScript Users

```javascript
// BEFORE (v1.0.0-rc01)
const picker = new PureDatePicker(input, {
  mode: 'range',
  format: 'DD/MM/YYYY',
  monthsToShow: 2,
  calendarTrigger: 'auto',
  display: 'floating',
  layout: 'horizontal',
  position: 'bottom-start',
  disabledDays: [0, 6],
  specialDates: [...],
  getDateInfo: (date) => {...},
  rangeDisabledMode: 'allow'
});

picker.setValue('2025-01-01');
const value = picker.getValue();
picker.clear();

// AFTER (v2.0.0)
const picker = new PureDatePicker(input, {
  selectionMode: 'range',
  dateFormatMask: 'DD/MM/YYYY',
  visibleMonthsCount: 2,
  calendarOpenTrigger: 'auto',
  positioningMode: 'floating',
  monthLayout: 'horizontal',
  calendarPlacement: 'bottom-start',
  disabledWeekdays: [0, 6],
  specialDates: [...],  // Uses DecoratedDate interface
  getDateMetadata: (date) => {...},
  rangeDisabledHandling: 'allow'
});

picker.setInputValue('2025-01-01');
const value = picker.getInputValue();
picker.clearSelection();
```

#### For CSS Customization

```css
/* BEFORE (v1.0.0-rc01) */
.pa-date-picker { ... }
.pa-date-picker__day { ... }
.pa-input { ... }

/* AFTER (v2.0.0) */
.drp-date-picker { ... }
.drp-date-picker__day { ... }
.drp-input { ... }
```

#### For Size Wrapper Classes

Size wrapper classes remain unchanged:
- `.drp-font-xs/sm/md/lg/xl` (no change - already used drp prefix)
- `.drp-spacing-xs/sm/md/lg/xl` (no change - already used drp prefix)

---

## [1.0.0-rc01] - 2025-11-06

### Added

#### Core Features
- **Grid Layout Support**: Added 2×3 grid calendar layout for displaying multiple months
  - New `layout` option: `'horizontal'` (default) or `'grid'`
  - New `gridRows` and `gridColumns` options for controlling grid dimensions
  - Responsive grid that adapts to screen size (3 columns → 2 columns → 1 column)
  - Support for both inline and floating display modes
- **Position Control**: Added `position` attribute for controlling popup placement
  - Supports all Floating UI positions: `bottom`, `bottom-start`, `bottom-end`, `top`, `top-start`, `top-end`, `left`, `right`
  - Smart default positioning: center for grid layouts, left-aligned for horizontal layouts
- **Pre-filled Value Support**: Calendar now correctly displays dates from pre-filled input values on initialization

#### Independent Font & Spacing System
- **BREAKING CHANGE**: Replaced `.drp-size-*` classes with independent control
  - New `.drp-font-xs/sm/md/lg/xl` classes - Control text sizing only (0.7×, 0.85×, 1×, 1.2×, 1.4× scales)
  - New `.drp-spacing-xs/sm/md/lg/xl` classes - Control gaps/density only (0.7×, 0.85×, 1×, 1.2×, 1.4× scales)
  - Mix any font size with any spacing density (e.g., large readable text in compact layout)
- **Enhanced Responsive Behavior**: Font and spacing now scale independently at breakpoints
  - Desktop (>1200px): Applied size
  - Tablet (768px-1200px): Scales down one level
  - Mobile (<768px): Scales down two levels

#### Navigation Improvements
- **Smart Navigation Buttons**: Previous/next month buttons now disable when adjacent months have no enabled days
  - Added `hasEnabledDaysInMonth()` function to check date availability
  - Visual disabled state with reduced opacity and pointer-events disabled

#### Range Selection Enhancements
- **Drag-to-Draw Ranges**: Users can now draw ranges by dragging without clicking first
  - Start dragging from any enabled day to create a new range
  - No need to click first, then drag - just drag from the start date
  - Works seamlessly with existing drag-to-adjust functionality

#### Architecture
- **Pure Functional Refactoring**: Converted from mixin-based to pure functional architecture
  - Functions with explicit parameters instead of `this` context
  - Modular organization: separate files for validation, rendering, navigation, selection, interaction, UI
  - Improved maintainability and testability
  - Eliminated `this` binding issues

### Fixed
- **Spacing Consistency**: Fixed day cell spacing to scale proportionally with size modifiers
  - Vertical spacing between date rows now uses CSS variables (changed `gap: 0` → `gap: var(--drp-spacing-xs)`)
  - Badge row spacing now scales with size (changed hard-coded `2px` → `var(--drp-spacing-xs)`)
  - Badge dimensions now scale with font size (changed hard-coded `1rem` → `var(--drp-font-size-base)`)
  - Badge font size now scales properly (changed hard-coded `0.7rem` → `var(--drp-font-size-2xs)`)
- **Grid Layout Border/Overflow**: Fixed grid calendars to properly contain content
  - Inline calendars now use `width: fit-content` instead of `100%`
  - Grid columns use `minmax(0, 1fr)` to allow proper shrinking
  - Individual months in grid have `min-width: 0` to let grid control sizing

### Changed
- **Web Component Attributes**: Added new observed attributes for grid and positioning
  - `layout`: Controls calendar layout mode (`'horizontal'` or `'grid'`)
  - `grid-rows`: Number of rows for grid layout
  - `grid-columns`: Number of columns for grid layout
  - `position`: Controls popup positioning
- **Default Positioning Logic**: Smart defaults based on layout type
  - Grid layouts: centered below input (`'bottom'`)
  - Horizontal layouts: left-aligned below input (`'bottom-start'`)

### Migration Guide (Breaking Changes)

#### Size Modifier Classes
Old combined size classes have been replaced with independent font and spacing classes:

```html
<!-- Before (v0.x) -->
<div class="drp-size-lg">
  <web-daterangepicker></web-daterangepicker>
</div>

<!-- After (v1.0.0-rc01) -->
<div class="drp-font-lg drp-spacing-lg">
  <web-daterangepicker></web-daterangepicker>
</div>

<!-- Or mix sizes independently -->
<div class="drp-font-lg drp-spacing-xs">
  <web-daterangepicker></web-daterangepicker>
</div>
```

**Migration mapping:**
- `.drp-size-xs` → `.drp-font-xs .drp-spacing-xs`
- `.drp-size-sm` → `.drp-font-sm .drp-spacing-sm`
- `.drp-size-md` → `.drp-font-md .drp-spacing-md` (or omit for defaults)
- `.drp-size-lg` → `.drp-font-lg .drp-spacing-lg`
- `.drp-size-xl` → `.drp-font-xl .drp-spacing-xl`

### Documentation
- Added comprehensive examples for all new features in index.html
  - Grid layout examples (floating popup and inline)
  - Position control examples (6 different positions)
  - Independent font/spacing combinations
  - Responsive sizing examples

---

## [Earlier Versions]

Previous version history not documented. This is the first official changelog entry.
