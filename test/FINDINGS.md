# E2E findings — bugs, surprising behaviors, missing classes

Running notes captured while writing the e2e suite. Each entry says **what
the test discovered** and **why it surprised me** so we can decide later
whether to fix the picker, change the docs, or accept the behavior.

## Confirmed odd behavior (worth a look)

1. **`custom-action` event is double-dispatched on the web component.**
   `DateRangePicker.fireCustomActionEvent` dispatches on `this.calendar`
   with `{ bubbles: true, composed: true }`, AND `web-component.ts:412`
   listens on the calendar and re-emits a new event on the host. Because
   the original is `composed`, it already crosses the shadow boundary and
   bubbles up to the host — so an outside listener on `<web-daterangepicker>`
   receives two events per click. See `e2e/events-api.spec.ts` —
   "custom-action event fires" — relaxed to `expect ≥ 1`.

2. **`disabled` setter only flags the input element; it doesn't suppress
   open-on-click.** Setting `el.disabled = true` flips
   `inputElement.disabled` (correct) but `attachInputListeners` doesn't
   guard `show()` against `this.input.disabled`. A programmatic
   `click({ force: true })` (or any synthetic dispatch) still opens the
   calendar. Real users can't click a disabled input via mouse, but the
   feature could plausibly be expected to inhibit `pointerdown` /
   programmatic clicks too.

3. **Range-typing separator differs from committed-range separator.**
   Typing into a range input uses `" to "` (auto-injected when start side
   completes, per `applyRangeMask`). But the committed value rendered after
   clicks uses `" - "`. The user has to remember two different separators
   for the same field. See `e2e/input-behavior.spec.ts` for both forms.

4. **`actionButtons` setter merges via `updateOptions` but the resulting
   re-render happens *only* inside `renderCalendar`'s
   `if (picker.actionsContainer)` branch.** Means: setting `actionButtons`
   on a not-yet-upgraded element (inline script before module load) ends
   up as an own-property shadow over the accessor and the picker never
   sees it. Fixture has to wrap the setter in
   `await customElements.whenDefined(...)`. Could be solved by lifting
   pre-upgrade own-properties in `connectedCallback`.

## Things on the original checklist that don't actually exist

5. **No `--weekend` class on day cells.** The checklist (and CLAUDE.md
   feature list) mention weekend styling, but no `--weekend` modifier is
   ever applied. Saturday/Sunday cells look identical to weekdays unless
   the consumer wires custom styling via `renderDayCallback` or
   `customStylesCallback`. Marked `n/a` in COVERAGE.md.

6. **No hover-preview class for in-progress range selection.** The picker
   shows a hover preview via the browser's native `:hover` CSS only —
   there's no JS-applied class to assert against. So "hover preview
   during range selection" can't be tested by class. Marked `n/a`.

7. **No separate `apply` / `cancel` events.** Apply dispatches `change`;
   cancel (Escape with pending) fires nothing — input value silently
   restores. The CLAUDE.md and changelog reference "apply event" but
   only `change` and `custom-action` actually exist. Marked `n/a`.

## API gaps

8. **No declarative or property setter for `customStrings` on the web
   component.** `web-component.ts` exposes property accessors for ~35
   options, but `customStrings` has neither attribute nor getter/setter.
   Consumers using HTML have to drop into `picker.updateOptions(...)` via
   script, which leaks the internal `picker` instance. Same applies to
   `monthNames` — there's a public `setMonthNames(arr)` method but no
   ergonomic property setter that matches the rest of the API. (`monthNames`
   IS reachable via the same `picker.updateOptions` path.)

9. **Range-mode "block" `disabledDatesHandling` snaps end backward rather
   than reporting a range with disabled days excluded.** I expected the
   snap to mean "the in-range middle skips the disabled cells" (so a
   10→15 click yields the visible range 10..15 with 12/13 not in-range).
   Actually it shortens the committed range to 10→11 (last enabled before
   the gap). That may be what the docs say; just worth confirming the
   UX is intentional vs. a misnamed strategy.

10. **`disabledDates` accepts an array but isn't an HTML attribute either**
    — has to be set via the property after `whenDefined`. Workable but
    inconsistent with `disabled-weekdays` (which IS attribute-driven).

11. **CLAUDE.md documents `spacing` / `font-size` / `cell-size` HTML
    attributes that don't actually exist.** The "Size System" section
    promises five-level scales for spacing/font/cell, with classes like
    `.drp-spacing-lg`. Neither the attributes nor the classes are present
    in `web-component.ts` or any CSS partial. `input-size` is the only
    member of the family that works. The docs need pruning.

12a. **`dateMember` / `badgeTextMember` / `dayClassMember` etc. have
    property setters but no HTML attributes.** Inconsistent with sibling
    `specialDates` (also no attribute) and with options like
    `disabled-dates-handling` (attribute-driven). Documenting which paths
    are attribute-eligible vs property-only would help, or wire up the
    parser for these short string props.

12. **`displayFormatMask` is documented and accepted but never applied.**
    The option appears in `types.ts`, is parsed in `web-component.ts`
    (`display-format-mask` attribute), and is copied into
    `picker.options.displayFormatMask` in the constructor — but no code
    path ever reads it. Setting `date-format-mask="YYYY-MM-DD"` +
    `display-format-mask="DD/MM/YYYY"` produces "2026-06-20" in the
    input, not "20/06/2026". Either implement the second format hook or
    remove the option from types.ts + web-component attributes.

---

Add new entries below as more specs land.
