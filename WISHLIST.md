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

### Keep Selection on Validation Failure

**Status:** Not Implemented
**Priority:** Medium
**Requested:** 2025-12-08

When `beforeDateSelectCallback` returns `action: 'restore'` (validation fails), the user's selection disappears. There should be an option to keep the invalid selection visible so users can see what they selected and understand why it failed.

**Current Behavior:**
- User selects a date range
- Async validation fails
- Selection reverts to previous state (or clears)
- User loses visual context of what they tried to select

**Proposed API:**

```javascript
// Return corrected/fallback dates when validation fails
beforeDateSelectCallback: async (selection) => {
  if (!isAvailable) {
    return {
      action: 'restore',
      message: 'Selected dates are not available',
      // NEW: Keep showing the attempted selection (visually marked as invalid)
      showAttemptedSelection: true,
      // OR: Provide corrected dates to display
      suggestedStartDate: nearestAvailableStart,
      suggestedEndDate: nearestAvailableEnd
    };
  }
  return { action: 'accept' };
}
```

**Use Cases:**
- **Hotel bookings:** Show unavailable dates with visual indicator, suggest nearest available
- **Appointment scheduling:** Keep selection visible so user understands the conflict
- **Better UX:** Users don't lose context of what they were trying to select

**Implementation Notes:**
- Could add CSS class like `drp-date-picker__day--attempted` for styling
- Could show attempted selection with different visual treatment (strikethrough, red highlight)
- Should work with the message display feature (see below)

---

### Display Validation Messages in Calendar

**Status:** Not Implemented
**Priority:** Medium
**Requested:** 2025-12-08

When `beforeDateSelectCallback` returns a validation failure with a `message`, there is currently no built-in way to display this message to the user. The message is only logged or available programmatically.

**Current Behavior:**
- Callback returns `{ action: 'restore', message: 'Dates not available' }`
- Message is not displayed anywhere in the UI
- Developer must manually create and manage a message element outside the picker

**Proposed API:**

```html
<!-- Web Component -->
<web-daterangepicker
  selection-mode="range"
  show-validation-messages="true"
  validation-message-position="bottom">
</web-daterangepicker>
```

```javascript
// JavaScript API
const picker = new DateRangePicker(input, {
  selectionMode: 'range',
  showValidationMessages: true,
  validationMessagePosition: 'bottom', // 'top', 'bottom', 'tooltip'
  validationMessageDuration: 5000, // Auto-hide after 5s, 0 = persist

  // Custom message styling
  validationMessageClass: 'my-custom-message',

  // Or fully custom rendering
  renderValidationMessage: (message, type) => {
    return `<div class="alert alert-${type}">${message}</div>`;
  }
});
```

**Message Types:**
- `error` - Validation failed, selection blocked
- `warning` - Selection adjusted or has issues
- `info` - Informational message
- `success` - Selection accepted (optional confirmation)

**Proposed UI Locations:**
- **Bottom:** Message bar below the calendar (default)
- **Top:** Message bar above the calendar
- **Tooltip:** Floating tooltip near the selection
- **Summary:** Integrate with existing summary section (range mode)

**CSS Variables:**
```css
--drp-validation-message-background: #fee2e2;
--drp-validation-message-text-color: #991b1b;
--drp-validation-message-border-color: #fca5a5;
--drp-validation-message-padding: 0.5rem 1rem;
```

**Use Cases:**
- **Hotel bookings:** "These dates are fully booked. Try different dates."
- **Min/max stay:** "Minimum stay is 3 nights"
- **Blackout dates:** "Selected range includes holidays - not available"
- **API errors:** "Unable to check availability. Please try again."

**Implementation Notes:**
- Should auto-clear message when user makes new selection
- Should support HTML content for rich messages (links, formatting)
- Should be dismissible (close button or auto-hide)
- Should be accessible (aria-live region for screen readers)
- Consider animation for showing/hiding messages

**Related Features:**
- Works together with "Keep Selection on Validation Failure" feature
- Could integrate with existing summary section in range mode

---

### Input Validation Event (Real-time Feedback)

**Status:** Not Implemented
**Priority:** Medium
**Requested:** 2025-12-08

Fire an event as the user types to indicate whether the current input value is a valid date. This enables real-time visual feedback like red borders for invalid input.

**Current Behavior:**
- User types in the input field
- No event fires until a complete, valid date is selected
- No way to show validation state during typing
- Calendar doesn't navigate if the typed date is invalid (e.g., month 13)

**Proposed API:**

```html
<!-- Web Component -->
<web-daterangepicker
  selection-mode="single"
  date-format-mask="MM/DD/YYYY">
</web-daterangepicker>

<script>
picker.addEventListener('input-validation', (e) => {
  const { isValid, value, parsedDate, error } = e.detail;

  if (!isValid) {
    picker.classList.add('invalid');
    showError(error); // e.g., "Invalid month: 13"
  } else {
    picker.classList.remove('invalid');
    clearError();
  }
});
</script>
```

```javascript
// JavaScript API
const picker = new DateRangePicker(input, {
  dateFormatMask: 'MM/DD/YYYY',
  onInputValidation: (validation) => {
    // Called on every input change
    const { isValid, value, parsedDate, error, isComplete } = validation;

    if (isComplete && !isValid) {
      input.classList.add('is-invalid');
    } else {
      input.classList.remove('is-invalid');
    }
  }
});
```

**Event Detail Properties:**
- `isValid` - Boolean: Is the current input a valid date?
- `isComplete` - Boolean: Is the input complete (all segments filled)?
- `value` - String: Current input value
- `parsedDate` - Date | null: Parsed date if valid, null otherwise
- `error` - String | null: Error message if invalid (e.g., "Invalid month", "Day out of range")
- `segment` - String: Which segment has error ('month', 'day', 'year')

**Validation States:**
- **Empty** - `isValid: true, isComplete: false` (no error for empty)
- **Partial valid** - `isValid: true, isComplete: false` (e.g., "12/" is valid so far)
- **Partial invalid** - `isValid: false, isComplete: false` (e.g., "13/" invalid month)
- **Complete valid** - `isValid: true, isComplete: true` (fires `date-select` too)
- **Complete invalid** - `isValid: false, isComplete: true` (e.g., "02/30/2024")

**Use Cases:**
- **Form validation:** Show red border on input as user types invalid date
- **Submit button:** Disable submit until valid date entered
- **Error messages:** Display specific error like "Month must be 1-12"
- **Accessibility:** Announce validation errors to screen readers

**Implementation Notes:**
- Should fire on every input change (debounced optional)
- Should distinguish between "incomplete but valid so far" vs "invalid"
- Should provide specific error messages for different failure modes
- Consider `validate-on-blur` option to only validate when leaving field
- For range mode, should validate both start and end inputs independently

**CSS Classes (optional built-in):**
```css
/* Auto-applied based on validation state */
.drp-input--valid { border-color: green; }
.drp-input--invalid { border-color: red; }
.drp-input--incomplete { border-color: orange; }
```

**Related Features:**
- Could integrate with "Display Validation Messages" feature
- Could add `aria-invalid` attribute automatically

---

## Contributing

Have a feature request? Please:
1. Check if it's already listed here
2. Open an issue on GitHub describing your use case
3. Consider contributing a pull request
