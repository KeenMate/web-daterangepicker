# E2E findings — bugs, surprising behaviors, missing classes

Running notes captured while writing the e2e suite. Each entry says **what
the test discovered** and **why it surprised me** so we can decide later
whether to fix the picker, change the docs, or accept the behavior.

## Confirmed odd behavior (worth a look)

1. **~~`custom-action` event is double-dispatched on the web component.~~** ✅ FIXED
   `DateRangePicker.fireCustomActionEvent` dispatches on `this.calendar`
   with `{ bubbles: true, composed: true }`, which already crosses the
   shadow boundary and bubbles up to the host. The manual re-emit in
   `web-component.ts` was redundant and doubled every event for outside
   listeners. Fix: removed the redundant listener; spec now expects
   exactly 1 event per click.

2. **~~`disabled` setter only flags the input element; it doesn't suppress
   open-on-click.~~** ✅ FIXED
   `show()` in `date-picker-ui.ts` now early-returns if `picker.input?.disabled`,
   so programmatic clicks (and any other event path that bypasses the
   browser's pointer-events block) can't open a disabled picker. New spec
   verifies the suppression.

3. **Range-typing separator differs from committed-range separator.**
   Typing into a range input uses `" to "` (auto-injected when start side
   completes, per `applyRangeMask`). But the committed value rendered after
   clicks uses `" - "`. The user has to remember two different separators
   for the same field. See `e2e/input-behavior.spec.ts` for both forms.

4. **~~`actionButtons` setter requires waiting for `customElements.whenDefined`.~~** ✅ FIXED
   Properties assigned to a not-yet-upgraded element used to become own-
   properties that shadowed the class accessors forever. Fix: added
   `_liftPreUpgradeProperties()` to `connectedCallback`, which walks the
   prototype chain for `set` descriptors and re-routes any matching own-
   properties through their accessors. The `events-api.html` fixture now
   sets `actionButtons` in a plain inline script (no `whenDefined`) to
   prove the lifting works.

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

12. **~~`displayFormatMask` is documented and accepted but never applied.~~** ✅ FIXED
    The docs describe it as a "localized format hint shown to users"
    (tt.mm.jjjj, dd.mm.rrrr, dd/mm/aaaa) — for languages whose date words
    don't match English Y/M/D tokens. Fix: when `display-format-mask` is
    set and the consumer hasn't set an explicit `placeholder`, the mask
    is now used as the input's placeholder. Explicit `placeholder=` still
    wins. Two specs in `api-extras.spec.ts` cover both paths.

---

Add new entries below as more specs land.
