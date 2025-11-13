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

## Contributing

Have a feature request? Please:
1. Check if it's already listed here
2. Open an issue on GitHub describing your use case
3. Consider contributing a pull request
