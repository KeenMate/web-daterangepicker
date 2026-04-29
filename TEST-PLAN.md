# Test Plan — refactor verification

Covers Phases 1-4 from `code-analysis.md`. Tests are grouped by what each one is actually checking; within each group they're ordered by likelihood of catching a regression.

**Setup once:**
```bash
make dev   # or: npm run dev
```
Vite picks a free port (12300, 12301, ...). The console output prints the URL; substitute it in the page paths below.

**Quick "does anything still work" smoke (run first, ~30 seconds):**
1. Open `examples-basic.html`. Pick a single date. Confirm the input fills with `YYYY-MM-DD`.
2. Open `examples-events.html`. Pick a range. Confirm the day/night summary appears at the bottom.
3. Open `examples-buttons.html`. Hover over Today / Clear / Apply. Confirm tooltips appear (~300 ms delay).

If those three work, the refactors didn't blow up. The rest of this plan covers the specific changes.

---

## 1. Phase 4 — selection survives attribute changes (the big behavior change)

**This is the highest-impact change in the whole refactor.** Reactive-framework users who toggled attributes per render previously lost selection on every cycle. Now they shouldn't.

### 1.1 Automated check page

Open `http://localhost:<port>/verify-phase4.html` in a browser.

The page programmatically:
- sets a known range selection
- toggles `locale`, `min-date`, `formatSummaryCallback`, `disabledDates`, `show-today-button`
- asserts selection survives each change
- toggles `visible-months-count` (structural) and asserts the picker is rebuilt

The inline report shows ✓ for each pass, ✗ for each fail, and prints `N pass, N fail` at the end. Open the console too — there's a one-line summary.

**Expected:** all 11 assertions pass.

### 1.2 Manual reactive-framework simulation

In a fresh `examples-basic.html`, with the picker open:

| Action | Expected (after the change) |
|---|---|
| `el = document.querySelector('web-daterangepicker'); el.setAttribute('min-date', '2026-05-01')` | Days before May 1 grey out. **Selection (if any) is unchanged.** Calendar position, focused day, rolling-selector state all survive. |
| `el.setAttribute('locale', 'de')` | Weekday + month names switch to German. **Selection unchanged.** |
| `el.setAttribute('locale', 'en')` | Switches back. **Selection unchanged.** |
| `el.setAttribute('show-today-button', 'false')` | Today button vanishes. **Selection unchanged.** |
| `el.setAttribute('disabled-dates-handling', 'block')` | Range-snap behavior changes for new ranges. **Existing selection unchanged.** |
| `el.disabledDates = ['2026-05-15']` | May 15 greys out. **Selection unchanged.** |
| `el.formatSummaryCallback = (d) => d.days + ' days'` (range mode) | Summary text changes. **Selection unchanged.** |

### 1.3 Structural carve-out (selection IS supposed to clear)

These should rebuild the picker — selection clearing is **correct**:

| Action | Expected |
|---|---|
| `el.setAttribute('visible-months-count', '3')` | Picker shows 3 months. **Selection clears, drag/focus state resets.** |
| `el.setAttribute('selection-mode', 'single')` | Single mode. **Selection clears.** |
| `el.setAttribute('month-layout', 'grid')` | Grid layout. **Selection clears.** |
| `el.customStylesCallback = () => '...'` | Custom styles inject. **Selection clears** (documented carve-out — custom styles need a fresh shadow-DOM `<style>` tag). |

**Regression risk: HIGH.** This is where most bugs would hide. Run §1.1 first, then spot-check §1.2.

---

## 2. Action-button tooltips (Phase 1 selector fix + Phase 3 class extraction)

**Pre-refactor state:** action-button tooltips silently never appeared in production (selector queried `.drp-date-picker__action`, but rendered class is `.drp-date-picker__button`). Now they do.

Open `examples-buttons.html`:

| Action | Expected |
|---|---|
| Hover over Today button for >300 ms | Tooltip appears above (or below if no room) the button. |
| Move the cursor away | Tooltip disappears after ~100 ms. |
| Hover over Today, then quickly hover over Clear without leaving the bar | Tooltip swaps to Clear's text without flashing or accumulating. |
| Open and close the calendar 5 times in a row, hovering Today each time | No tooltip elements pile up in the shadow DOM. (Inspect `<web-daterangepicker>` → shadow root → check that you have one `.drp-date-picker__tooltip` per visible button, not 5×.) |
| Configure custom action buttons via `el.actionButtons = [...]` with tooltips, hover them | Each gets its own tooltip. |
| Scroll the page while a tooltip is visible | Tooltip follows the button (Floating UI `autoUpdate`). |
| Custom button with a `getTooltipCallback` that returns dynamic text | Hover shows the dynamic text on each show, not a stale value. |

**Regression risk: HIGH** (this was a real prod bug + a class extraction).

---

## 3. Phase 2 dedup — behavior must be unchanged

These refactors collapsed duplicated code. Tests target the user-visible behavior to confirm I didn't break a semantic in the merge.

### 3.1 `moveFocusToDate` (selectDay focus indicator)

In `examples-basic.html`:
1. Range mode, type a start date in the input. Click a different end date.
2. **Expected:** the focused-day indicator (visible outline) moves to the end date, in the column where the end date lives.

In single mode with `beforeDateSelectCallback` adjusting the date (e.g., snap-to-Tuesday):
1. Click a Sunday.
2. **Expected:** focus indicator lands on the *adjusted* Tuesday, not the originally clicked Sunday.

### 3.2 `changeMonth` — prev/next month + collision

Multi-month mode (`visible-months-count="2"`):
1. Click ◀ on the second column. **Expected:** second column moves back 1 month. If that collides with the first column, the first column also moves back 1.
2. Click ▶ on the first column repeatedly. **Expected:** first column moves forward; second column gets pushed forward when the first catches up.
3. With `min-date="2026-01-01"`, click ◀ until the first column hits January 2026. **Expected:** the back-arrow stops working (no enabled days in the prior month).

### 3.3 `renderRollingItems` — year/month picker

In `examples-basic.html`:
1. Click on the month/year header to open the rolling selector.
2. **Expected:** scrollable list of years (current highlighted) and months. Years/months outside `rollingYearRange`/`rollingMonthRange` (or before `min-date` / after `max-date`) are greyed out.
3. Pick a different year/month from the list. **Expected:** calendar jumps to that month.

For a unified-navigation grid layout (`unified-navigation` attribute set):
1. Click the unified header. **Expected:** rolling selector shows the same year/month ranges, with `data-unified="true"` on items (inspect element).

### 3.4 `commitInputValue` — input field updates

In single mode:
1. Click a date. **Expected:** input shows the formatted date.

In single mode with Apply button (`show-apply-button="true"`):
1. Click a date. **Expected:** input does NOT update yet.
2. Click Apply. **Expected:** input updates.

In range mode:
1. Click start date. **Expected:** input shows `<start> - ...`.
2. Click end date. **Expected:** input shows `<start> - <end>`.

In multiple mode:
1. Click 3 different dates. **Expected:** input shows `3 selection(s)` (or stays empty until Apply, depending on apply-button config).

Drag-to-adjust:
1. In range mode, click and drag the start handle to a new date. **Expected:** input updates to reflect the new start.

### 3.5 `commitSelection` — clear button

1. Pick a single date or range.
2. Click Clear. **Expected:** input empties, selection clears, no day cell is highlighted, summary clears.

**Regression risk: MEDIUM.** Behavior was preserved on paper; visual spot-check confirms.

---

## 4. CSS theming hooks (Phase 2 CSS)

### 4.1 Per-component border-color overrides

In `examples-theming.html`, add a `<style>`:

```css
web-daterangepicker {
  --drp-nav-border-color: red;
  --drp-rolling-border-color: blue;
  --drp-summary-border-color: green;
  --drp-button-border-color: orange;
}
```

| Element | Expected color |
|---|---|
| Nav button border (◀ ▶) | red |
| Rolling-selector container border | blue |
| Summary section border | green |
| Action button border (Today/Clear/Apply) | orange |

**Pre-refactor:** these overrides did nothing — the `--drp-{section}-border` shorthand resolved straight to `var(--drp-border)` and ignored the per-section color. **Now:** each shorthand is `var(--drp-border-width-base) solid var(--drp-{section}-border-color)`.

### 4.2 Invalid-range theming

Trigger an invalid range (e.g., `beforeDateSelectCallback` returning `{ isValid: false, showInvalidRange: true, invalidStart, invalidEnd }`).

Add:
```css
web-daterangepicker {
  --drp-day-invalid-range-bg: #4c1d95;
  --drp-day-invalid-range-color: yellow;
}
```

**Expected:** the invalid start/end day cells now have a purple background with yellow text. Pre-refactor, the text color was hardcoded `white`.

**Regression risk: LOW.** Defaults are unchanged; only verify that the override now lands.

---

## 5. Phase 1 hygiene checks

### 5.1 Console noise

Open the browser console. With `show-debug-info` **off**:

| Action | Expected console output |
|---|---|
| Open the calendar | No `[showMessage]`, `[click handler]`, `[onDragEnd]` messages. |
| Drag-to-adjust a range | No `[onDragEnd]` spam. |
| Call `picker.showMessage(...)` from JS | No `[showMessage]` log; only `loglevel`-routed output gated by `show-debug-info`. |

Pre-refactor: 7 `console.log` calls fired in production hot paths regardless of debug setting.

### 5.2 No layout thrash on `show()`

With DevTools Performance tab recording, open and close the calendar 10 times. Look for the `show()` traces — each one should NOT have a 100 ms-deferred `getComputedStyle` call.

(Hard to see explicitly — the deletion is more about avoiding layout flushes per open. If the calendar opens snappily, you're fine.)

### 5.3 `disabled` attribute doesn't rebuild

1. Open the calendar. Pick a date. Note the focused day, scroll position of any open rolling selector, etc.
2. From the console: `el.setAttribute('disabled', '')` — input should disable.
3. `el.removeAttribute('disabled')` — input re-enables.
4. **Expected:** through both toggles, the calendar's internal state (selection, focus, scroll, rolling selector) is preserved. Pre-refactor: the picker tore down and rebuilt on every toggle.

---

## 6. Cross-cutting regression suite

These exercise feature areas the refactor *touched* but shouldn't have changed semantically. Spot-check each.

### Calendar lifecycle
- Open by focusing the input (`calendar-open-trigger="focus"`) — calendar appears
- Open by typing — calendar appears once a valid character lands
- Click outside — calendar closes
- ESC key — calendar closes
- Auto-close on selection (`auto-close="selection"`) — closes immediately after picking
- Auto-close on apply (`auto-close="apply"`) — closes after Apply button click

### Keyboard navigation
- Arrow keys move focus day-by-day / week-by-week
- Page Up / Page Down jump month-by-month
- Home / End jump to start/end of current month
- Ctrl+Home / Ctrl+End jump within year (repeat to step year)
- `t` jumps to today
- Enter selects focused day
- Tab cycles between month columns in multi-month mode

### Range mode
- Pick start, pick end → range fills
- Pick end before start → automatic swap (start becomes the earlier of the two)
- Drag the start or end handle → range adjusts; input updates
- Range over disabled dates with each `disabled-dates-handling` mode (`allow`, `prevent`, `block`, `split`, `individual`) — visual + event payload behaves per docs

### Multi-month + grid layouts
- `visible-months-count="2"` horizontal — two columns, navigate independently or with collision
- `month-layout="grid" grid-rows="2" grid-columns="3"` — 6 months in a grid
- `unified-navigation` — single arrow set steps the whole grid

### Min/max + disabled
- `min-date="2026-05-01"` — earlier days greyed and unselectable
- `max-date="2026-12-31"` — later days greyed
- `disabled-weekdays="0,6"` — weekends greyed
- `disabled-dates="['2026-12-25']"` — Christmas greyed

### Special dates / decorators
- `el.specialDates = [{date: '2026-05-15', badgeText: 'X'}]` → badge appears on May 15
- Member mapping: `el.dateMember = 'when'`, `el.badgeTextMember = 'label'` then `specialDates` array uses those keys → badges still render
- `el.getDateMetadataCallback = (d) => ({...})` — applies per-day classes/badges/tooltips

### Custom buttons
- `el.actionButtons = [{action: 'custom', text: 'X', tooltip: 'hi', onClick: () => ...}]` — button renders, click fires, tooltip appears on hover
- Custom button with `getTooltipCallback`/`getTextCallback`/`isVisibleCallback`/`isDisabledCallback`/`getClassCallback` — each callback runs and updates per re-render

### Inline vs floating mode
- `positioning-mode="floating"` (default) — calendar pops out below input
- `positioning-mode="inline"` — calendar shown inline, no input element

### Locales
- `locale="auto"` (default) — uses browser locale
- `locale="de"` — German strings, week starts Monday
- `locale="ar"` (RTL) — week direction flips, layout still correct

---

## What to do if a test fails

1. Note which test, the steps to reproduce, and which Phase touched that area (Phases listed at the top of `code-analysis.md`).
2. The `git log` between the Phase 1 starting commit and HEAD has clean per-phase commits — `git bisect` will narrow it down to a Phase quickly.
3. The `code-analysis.md` Status sections describe what each Phase changed, with file:line references for the helper extractions.

---

## Test pages by feature

| What you're testing | File |
|---|---|
| Phase 4 selection survival | `verify-phase4.html` (created for this) |
| Single mode, range mode, drag | `examples-basic.html` |
| Action buttons + tooltips | `examples-buttons.html` |
| Custom callbacks (events) | `examples-events.html` |
| `disabled-dates-handling` modes | `examples-events.html` (mode tab) or `examples-api-methods.html` |
| Theming overrides | `examples-theming.html` |
| Custom render callbacks | `examples-custom-rendering.html` |
| Sizes (`input-size`, `cell-size`, etc.) | `examples-sizes.html` |
| JS-direct instantiation (no web component) | `examples-javascript-instantiation.html` |
| Logging / debug | `examples-logging.html` |
| Special-date badges + day tooltips | `examples-badges-tooltips.html` |
