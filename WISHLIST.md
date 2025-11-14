# Feature Wishlist

This document tracks potential features and enhancements for future versions of the Web Date Range Picker.

## Requested Features

### Range Separator Customization

**Status:** Not Implemented
**Priority:** TBD
**Requested:** 2025-11-12

Allow users to customize the separator used between start and end dates in range mode.

**Proposed API:**

```html
<!-- Web Component -->
<date-range-picker
  selection-mode="range"
  date-format-mask="MM/DD/YYYY"
  range-separator=" to "
  placeholder="Select date range">
</date-range-picker>
```

```javascript
// JavaScript API
const picker = new PureDatePicker(inputElement, {
  selectionMode: 'range',
  dateFormatMask: 'MM/DD/YYYY',
  rangeSeparator: ' to ',  // Custom separator instead of default " - "
});
```

**Use Cases:**
- **Reports:** "01/01/2024 to 01/31/2024"
- **Bookings:** "12/15/2024 → 12/22/2024"
- **Analytics:** "Start: 03/01/2024 | End: 03/31/2024"
- **Localization:** Different languages may prefer different separators

**Example Separators:**
- `" - "` (default, hyphen with spaces)
- `" to "` (text)
- `" → "` (arrow symbol)
- `" – "` (en dash)
- `" / "` (slash)
- Custom text like `" jusqu'à "` (French: "until")

**Implementation Notes:**
- Should apply to input value display
- Should work with all date format masks
- Should be escapable in validation/parsing
- Consider impact on input masking logic
- Consider accessibility (screen readers)

**Related Features:**
- Could extend to customize how ranges are read by screen readers
- Could support templates like `"From {start} to {end}"`

---

### Range Mode Keyboard Shortcuts

**Status:** Not Implemented
**Priority:** TBD
**Requested:** 2025-11-13

Add keyboard shortcuts specifically for range selection mode to improve keyboard-only date range selection.

**Proposed Shortcuts:**

- **Shift + Arrow Keys** - Extend selection from the current focused date
  - `Shift + →` - Extend range to next day
  - `Shift + ←` - Extend range to previous day
  - `Shift + ↑` - Extend range to same day previous week
  - `Shift + ↓` - Extend range to same day next week

- **Ctrl + A** - Select full month
  - When calendar is open and a date is focused, select the entire month containing that date

**Use Cases:**
- **Quick range selection:** Select multi-day ranges without mouse
- **Accessibility:** Power users and users with mobility impairments
- **Efficiency:** Faster than clicking start and end dates
- **Calendar applications:** Common pattern in calendar UIs

**Implementation Notes:**
- Should only work when `selection-mode="range"`
- Shift+Arrow should set start date on first use, then extend end date
- Ctrl+A should select from first to last day of currently focused month
- Should respect disabled dates (skip over them)
- Should work with keyboard navigation already implemented

**Related Features:**
- Could add Shift+PageUp/PageDown for month-based extension
- Could add Shift+Home/End for extending to month boundaries
- Could support Ctrl+Shift combinations for year-based selection

---

### Screen Reader Support (ARIA Compliance)

**Status:** Not Implemented
**Priority:** High (Accessibility)
**Requested:** 2025-11-13

Add comprehensive screen reader support with full ARIA attributes for WCAG 2.1 Level AA compliance.

**Proposed Features:**

**ARIA Attributes:**
- `role="dialog"` - Calendar popup identified as dialog
- `role="grid"` - Calendar dates in grid structure
- `aria-label` - Descriptive label for calendar
- `aria-selected` - Mark selected dates
- `aria-disabled` - Mark disabled dates
- `aria-describedby` - Link to instructions
- `aria-live` - Live region for announcements

**Proposed API:**

```html
<!-- Web Component -->
<date-range-picker
  selection-mode="single"
  aria-label="Select appointment date"
  aria-described-by="date-instructions"
  announce-selections="true"
  placeholder="Accessible date picker">
</date-range-picker>
```

```javascript
// JavaScript API
const picker = new PureDatePicker(inputElement, {
  ariaLabel: 'Select appointment date',
  ariaDescribedBy: 'date-instructions',
  announceSelections: true,

  // Custom announcements
  customAnnouncements: {
    dateSelected: (date) => {
      return `Selected ${date.toLocaleDateString()}`;
    },
    monthChanged: (month, year) => {
      return `Showing ${month} ${year}`;
    },
    dateDisabled: (date, reason) => {
      return `${date.toLocaleDateString()} is not available. ${reason}`;
    }
  }
});
```

**Announcements:**
Screen readers should announce:
- Date focused during navigation (e.g., "Monday, November 7, 2024")
- Date selected (e.g., "Selected Monday, November 7, 2024")
- Month/year changes (e.g., "Calendar showing November 2024")
- Disabled dates with reason (e.g., "November 25, 2024 is disabled. Holiday")
- Range selection progress (e.g., "Range start selected. Select end date.")

**Use Cases:**
- **Legal compliance** - Meet WCAG 2.1 Level AA requirements
- **Government websites** - Required for Section 508 compliance
- **Inclusive design** - Support users with visual impairments
- **Better UX for all** - Improves usability for keyboard-only users

**Implementation Notes:**
- Follow ARIA 1.2 date picker pattern specification
- Add live region (aria-live="polite") for announcements
- Ensure all interactive elements have proper roles
- Test with NVDA, JAWS, VoiceOver screen readers
- Support both Web Component and JavaScript API
- Consider performance impact of frequent announcements

**Standards Compliance:**
- WCAG 2.1 Level AA
- ARIA 1.2 date picker pattern
- Section 508 (US)
- EN 301 549 (EU)

**Related Features:**
- Could add `reducedMotion` option to respect prefers-reduced-motion
- Could add audio cues for selection feedback
- Could support custom ARIA live region element

---

## Contributing

Have a feature request? Please:
1. Check if it's already listed here
2. Open an issue on GitHub describing your use case
3. Consider contributing a pull request
