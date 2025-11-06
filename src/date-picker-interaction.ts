/**
 * Date Picker Interaction Methods
 *
 * Pure functions for interaction logic including drag functionality
 * and input masking.
 */

// === DRAG FUNCTIONALITY ===

export function initDragListeners(picker: any) {
    // For range mode, add mousedown listeners to ALL enabled days
    // This allows drawing a range from scratch without clicking first
    if (picker.options.mode === 'range') {
        const allDays = picker.calendar.querySelectorAll('.pa-date-picker__day:not(.pa-date-picker__day--disabled):not(.pa-date-picker__day--other-month)');

        allDays.forEach(day => {
            day.addEventListener('mousedown', (e) => {
                // Determine drag type based on what's clicked and what's selected
                const dayElement = day as HTMLElement;
                const isRangeStart = dayElement.classList.contains('pa-date-picker__day--range-start');
                const isRangeEnd = dayElement.classList.contains('pa-date-picker__day--range-end');

                // If clicking on existing range endpoints, drag that endpoint
                // Otherwise, start a new range (draw from scratch)
                let dragType: 'start' | 'end';
                if (isRangeStart && picker.selectedStartDate && picker.selectedEndDate) {
                    dragType = 'start';
                } else if (isRangeEnd && picker.selectedStartDate && picker.selectedEndDate) {
                    dragType = 'end';
                } else {
                    // Drawing from scratch - set as start point
                    dragType = 'start';
                }

                startDrag(picker, e as MouseEvent, dragType);
            });
        });
    }
}

export function startDrag(picker: any, event: MouseEvent, type: 'start' | 'end') {
    event.preventDefault();
    event.stopPropagation();

    picker.isDragging = true;
    picker.draggingType = type;

    // If no selection exists (drawing from scratch), use the clicked day as the start point
    const clickedElement = event.currentTarget as HTMLElement;
    if (!picker.selectedStartDate && !picker.selectedEndDate) {
        // Parse date from the clicked element
        const dateAttr = clickedElement.dataset.date;
        if (dateAttr) {
            const [year, month, day] = dateAttr.split('-').map(Number);
            const clickedDate = new Date(year, month, day);
            picker.originalStartDate = clickedDate;
            picker.originalEndDate = null;
            // Set type to 'end' so we're dragging the end point from this start
            picker.draggingType = 'end';
        }
    } else {
        // Existing range - store original positions for drag
        if (picker.selectedStartDate) {
            picker.originalStartDate = new Date(picker.selectedStartDate);
        }
        if (picker.selectedEndDate) {
            picker.originalEndDate = new Date(picker.selectedEndDate);
        }
    }

    // Add dragging class to the day being dragged
    clickedElement.classList.add('pa-date-picker__day--dragging');

    console.log(`[DatePicker Drag] Started dragging ${type} date`);

    // Add document-level listeners
    picker.onDragMoveBound = (e: MouseEvent) => onDragMove(picker, e);
    picker.onDragEndBound = (e: MouseEvent) => onDragEnd(picker, e);
    document.addEventListener('mousemove', picker.onDragMoveBound);
    document.addEventListener('mouseup', picker.onDragEndBound);

    // Change body cursor
    document.body.style.cursor = 'grabbing';
}

export function onDragMove(picker: any, event: MouseEvent) {
    if (!picker.isDragging) return;

    // Check if hovering over navigation buttons during drag
    // Use shadow root's elementsFromPoint if available, otherwise use document
    let element: Element | null = null;
    if (picker.containerElement instanceof ShadowRoot && 'elementsFromPoint' in picker.containerElement) {
        const elements = (picker.containerElement as any).elementsFromPoint(event.clientX, event.clientY);
        element = elements[0] || null;
    } else {
        element = document.elementFromPoint(event.clientX, event.clientY);
    }

    // Unified navigation button handling
    const prevButton = element?.closest('.pa-date-picker__nav--prev');
    const nextButton = element?.closest('.pa-date-picker__nav--next');

    if (prevButton || nextButton) {
        // Hovering over a navigation button
        if (!picker.navInterval) {
            // Start navigation interval
            const button = (prevButton || nextButton) as Element;
            const monthContainer = button.closest('.pa-date-picker__month');
            if (monthContainer && monthContainer instanceof HTMLElement) {
                const monthIndex = parseInt(monthContainer.dataset.monthIndex || '0');
                const isPrev = !!prevButton;

                // Navigate immediately
                if (isPrev) {
                    picker.prevMonth(monthIndex);
                } else {
                    picker.nextMonth(monthIndex);
                }

                // Then continue navigating every 1 second
                picker.navInterval = window.setInterval(() => {
                    if (isPrev) {
                        picker.prevMonth(monthIndex);
                    } else {
                        picker.nextMonth(monthIndex);
                    }
                }, 1000);
            }
        }
        return; // Don't process day hover while over button
    } else {
        // Not over any navigation button - clear interval
        if (picker.navInterval) {
            clearInterval(picker.navInterval);
            picker.navInterval = null;
        }
    }

    // Find the day element under the cursor
    const dayElement = element;
    if (!dayElement || !dayElement.classList.contains('pa-date-picker__day')) return;

    const dateAttr = (dayElement as HTMLElement).dataset.date;
    if (!dateAttr) return;

    // Parse the date from the day element
    const [year, month, day] = dateAttr.split('-').map(Number);
    let hoveredDate = new Date(year, month, day);

    // If hovering over a disabled day, snap to nearest enabled date
    if (dayElement.classList.contains('pa-date-picker__day--disabled')) {
        const direction = picker.draggingType === 'start' ?
            (picker.originalEndDate && hoveredDate > picker.originalEndDate ? 'backward' : 'forward') :
            (picker.originalStartDate && hoveredDate < picker.originalStartDate ? 'forward' : 'backward');
        hoveredDate = findNearestEnabledDate(picker, hoveredDate, direction);
    }

    // Update preview based on what's being dragged
    if (picker.draggingType === 'start' && picker.originalEndDate) {
        picker.dragPreviewStart = hoveredDate;
        picker.dragPreviewEnd = picker.originalEndDate;

        // Swap if start is after end
        if (picker.dragPreviewStart > picker.dragPreviewEnd) {
            [picker.dragPreviewStart, picker.dragPreviewEnd] = [picker.dragPreviewEnd, picker.dragPreviewStart];
            picker.draggingType = 'end'; // Switch which end we're dragging
        }
    } else if (picker.originalStartDate) {
        picker.dragPreviewStart = picker.originalStartDate;
        picker.dragPreviewEnd = hoveredDate;

        // Swap if end is before start
        if (picker.dragPreviewEnd < picker.dragPreviewStart) {
            [picker.dragPreviewStart, picker.dragPreviewEnd] = [picker.dragPreviewEnd, picker.dragPreviewStart];
            picker.draggingType = 'start'; // Switch which end we're dragging
        }
    }

    // For 'block' mode, prevent range from crossing disabled dates
    if (picker.options.rangeDisabledMode === 'block' && picker.dragPreviewStart && picker.dragPreviewEnd) {
        if (picker.hasDisabledDatesInRange(picker.dragPreviewStart, picker.dragPreviewEnd)) {
            // Adjust the preview to stop at the last enabled date before the gap
            if (picker.draggingType === 'start' && picker.originalEndDate) {
                // Moving start, so find last enabled before hitting a disabled date going toward end
                const lastEnabled = picker.findLastEnabledBeforeGap(picker.dragPreviewStart, picker.originalEndDate);
                picker.dragPreviewEnd = lastEnabled;
            } else if (picker.originalStartDate) {
                // Moving end, so find last enabled before hitting a disabled date going from start
                const lastEnabled = picker.findLastEnabledBeforeGap(picker.originalStartDate, picker.dragPreviewEnd);
                picker.dragPreviewEnd = lastEnabled;
            }
        }
    }

    // Update preview visuals
    picker.updateDragPreview();
}

export function onDragEnd(picker: any, event: MouseEvent) {
    if (!picker.isDragging) return;

    console.log(`[DatePicker Drag] Ended dragging, finalizing selection`);

    // Finalize the selection
    if (picker.dragPreviewStart && picker.dragPreviewEnd) {
        // Ensure both dates are enabled (snap if necessary)
        picker.selectedStartDate = findNearestEnabledDate(picker, picker.dragPreviewStart, 'forward');
        picker.selectedEndDate = findNearestEnabledDate(picker, picker.dragPreviewEnd, 'backward');

        // For 'block' mode, if there are disabled dates in range, snap to last enabled before gap
        if (picker.options.rangeDisabledMode === 'block' &&
            picker.hasDisabledDatesInRange(picker.selectedStartDate, picker.selectedEndDate)) {
            picker.selectedEndDate = picker.findLastEnabledBeforeGap(picker.selectedStartDate, picker.selectedEndDate);
        }

        // Ensure start is before end after snapping
        if (picker.selectedStartDate > picker.selectedEndDate) {
            [picker.selectedStartDate, picker.selectedEndDate] = [picker.selectedEndDate, picker.selectedStartDate];
        }

        if (picker.input) {
            picker.input.value = `${picker.formatDate(picker.selectedStartDate)} - ${picker.formatDate(picker.selectedEndDate)}`;
        }

        if (picker.options.onSelect) {
            picker.options.onSelect({ start: picker.selectedStartDate, end: picker.selectedEndDate });
        }
    }

    // Clean up
    picker.isDragging = false;
    picker.draggingType = null;
    picker.dragPreviewStart = null;
    picker.dragPreviewEnd = null;

    // Remove dragging class
    picker.calendar.querySelectorAll('.pa-date-picker__day--dragging').forEach(day => {
        day.classList.remove('pa-date-picker__day--dragging');
    });

    // Remove document-level listeners
    if (picker.onDragMoveBound) {
        document.removeEventListener('mousemove', picker.onDragMoveBound);
    }
    if (picker.onDragEndBound) {
        document.removeEventListener('mouseup', picker.onDragEndBound);
    }

    // Clear navigation interval
    if (picker.navInterval) {
        clearInterval(picker.navInterval);
        picker.navInterval = null;
    }

    // Reset body cursor
    document.body.style.cursor = '';

    // Re-render to show final selection
    picker.renderCalendar();
    picker.updateSummary();
}

/**
 * Find nearest enabled date to a given date
 * Searches in preferred direction first, then opposite direction
 */
export function findNearestEnabledDate(picker: any, targetDate: Date, preferredDirection: string = 'forward'): Date {
    const maxDays = 60; // Search up to 60 days in each direction
    let date = new Date(targetDate);
    date.setHours(0, 0, 0, 0);

    // If target date is already enabled, return it
    if (!picker.isDateDisabledInternal(date)) {
        return date;
    }

    // Search in preferred direction
    const primaryOffset = preferredDirection === 'forward' ? 1 : -1;
    for (let i = 1; i <= maxDays; i++) {
        const testDate = new Date(targetDate);
        testDate.setDate(testDate.getDate() + (i * primaryOffset));
        testDate.setHours(0, 0, 0, 0);

        if (!picker.isDateDisabledInternal(testDate)) {
            return testDate;
        }
    }

    // Search in opposite direction
    const secondaryOffset = -primaryOffset;
    for (let i = 1; i <= maxDays; i++) {
        const testDate = new Date(targetDate);
        testDate.setDate(testDate.getDate() + (i * secondaryOffset));
        testDate.setHours(0, 0, 0, 0);

        if (!picker.isDateDisabledInternal(testDate)) {
            return testDate;
        }
    }

    // No enabled date found, return original
    return targetDate;
}

// === INPUT MASKING ===

export function handleInputMask(picker: any, event: Event) {
    const input = event.target as HTMLInputElement;
    const currentValue = input.value;
    const currentCursorPos = input.selectionStart || 0;

    // Get previous value (stored before this input event)
    const previousValue = picker._previousInputValue || '';
    const wasDeleting = currentValue.length < previousValue.length;

    const { separator } = picker.formatInfo;

    // For range mode, handle " to " separator
    if (picker.options.mode === 'range') {
        // Keep digits, date separators, and allow 'to' with spaces
        const cleanValue = currentValue.replace(new RegExp(`[^0-9${separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}to ]`, 'gi'), '');

        // Apply range mask
        const formatted = applyRangeMask(picker, cleanValue);

        if (formatted !== currentValue) {
            input.value = formatted;

            // Calculate new cursor position
            let newCursorPos = currentCursorPos;

            if (wasDeleting) {
                newCursorPos = currentCursorPos;
            } else if (formatted.length > currentValue.length) {
                // Check if " to " was just inserted
                if (formatted.includes(' to ') && !currentValue.includes(' to ')) {
                    // " to " was auto-inserted, move cursor after it
                    const toIndex = formatted.indexOf(' to ');
                    if (currentCursorPos >= toIndex && currentCursorPos <= toIndex + 4) {
                        newCursorPos = toIndex + 4; // Move after " to "
                    } else {
                        newCursorPos = currentCursorPos + (formatted.length - currentValue.length);
                    }
                } else {
                    // Regular separator insertion
                    newCursorPos = currentCursorPos + (formatted.length - currentValue.length);
                }
            }

            input.setSelectionRange(newCursorPos, newCursorPos);
        }
    } else {
        // Single date mode - original logic
        const cleanValue = currentValue.replace(new RegExp(`[^0-9${separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`, 'g'), '');
        const formatted = applyMask(picker, cleanValue);

        if (formatted !== currentValue) {
            input.value = formatted;

            let newCursorPos = currentCursorPos;

            if (wasDeleting) {
                newCursorPos = currentCursorPos;
            } else if (formatted.length > currentValue.length && formatted[currentCursorPos] === separator) {
                newCursorPos = currentCursorPos + 1;
            } else if (formatted.length > currentValue.length) {
                const oldSeparatorsBefore = (currentValue.substring(0, currentCursorPos).match(new RegExp(separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
                const newSeparatorsBefore = (formatted.substring(0, currentCursorPos).match(new RegExp(separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
                const separatorDiff = newSeparatorsBefore - oldSeparatorsBefore;
                newCursorPos = currentCursorPos + separatorDiff;
            }

            input.setSelectionRange(newCursorPos, newCursorPos);
        }
    }

    // Store current value for next time
    picker._previousInputValue = input.value;

    // Update calendar if a valid date was typed
    updateCalendarFromInput(picker);
}

export function applyMask(picker: any, value: string): string {
    const { separator, parts, maxLength } = picker.formatInfo;

    // Remove existing separators for clean processing
    const digitsOnly = value.replace(new RegExp(separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');

    // Calculate segment lengths
    const yearLen = parts.year ? parts.year.length : 4;
    const segments = [
        { type: 'year', pos: parts.year?.index ?? 0, length: yearLen },
        { type: 'month', pos: parts.month?.index ?? 1, length: 2 },
        { type: 'day', pos: parts.day?.index ?? 2, length: 2 }
    ].sort((a, b) => a.pos - b.pos);

    let result = '';
    let digitIndex = 0;

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const segmentValue = digitsOnly.substring(digitIndex, digitIndex + segment.length);

        if (!segmentValue) break;

        result += segmentValue;
        digitIndex += segmentValue.length;

        // Add separator after this segment (except after last segment)
        if (i < segments.length - 1 && segmentValue.length === segment.length) {
            result += separator;
        }
    }

    // Limit to max length
    return result.substring(0, maxLength);
}

export function applyRangeMask(picker: any, value: string): string {
    const { separator, maxLength } = picker.formatInfo;

    // Split by " to " to get start and end dates
    const toSeparator = ' to ';
    let startPart = '';
    let endPart = '';

    if (value.includes(toSeparator)) {
        const parts = value.split(toSeparator);
        startPart = parts[0];
        endPart = parts.slice(1).join(toSeparator); // In case there are multiple "to"
    } else {
        startPart = value;
    }

    // Apply mask to start date
    const formattedStart = applyMask(picker, startPart);

    // Check if start date is complete (maxLength characters)
    if (formattedStart.length === maxLength) {
        // Start date is complete, auto-append " to " if not already there
        if (!value.includes(toSeparator)) {
            return formattedStart + toSeparator;
        } else {
            // Apply mask to end date
            const formattedEnd = applyMask(picker, endPart);
            return formattedStart + toSeparator + formattedEnd;
        }
    } else {
        // Start date not complete yet
        return formattedStart;
    }
}

export function handleKeydown(picker: any, event: KeyboardEvent) {
    const { key, ctrlKey, metaKey } = event;
    const { separator } = picker.formatInfo;

    // If calendar is open, let document handler deal with navigation keys
    if (picker.calendar.classList.contains('pa-date-picker--visible')) {
        const navigationKeys = ['ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'];
        if (navigationKeys.includes(key)) {
            event.preventDefault(); // Prevent default input behavior
            return; // Let document handler manage calendar navigation
        }
    }

    // Allow: Backspace, Delete, Tab, Escape, Enter, Arrows, Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
                         'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];

    if (allowedKeys.includes(key) || ctrlKey || metaKey) {
        return; // Allow these keys
    }

    // Auto-pad single digit with leading zero when separator is pressed
    if (key === separator) {
        const input = event.target as HTMLInputElement;
        const cursorPos = input.selectionStart || 0;
        const currentValue = input.value;

        // Find the start of the current segment (after last separator or start of string)
        let segmentStart = 0;
        for (let i = cursorPos - 1; i >= 0; i--) {
            if (currentValue[i] === separator || currentValue[i] === ' ') {
                segmentStart = i + 1;
                break;
            }
        }

        // Extract the current segment
        const segment = currentValue.substring(segmentStart, cursorPos);

        // If segment is a single digit, prepend a 0
        if (/^\d$/.test(segment)) {
            event.preventDefault();

            const newValue = currentValue.substring(0, segmentStart) +
                           '0' + segment +
                           separator +
                           currentValue.substring(cursorPos);

            input.value = newValue;

            // Position cursor after the separator
            const newCursorPos = segmentStart + 2 + separator.length; // 0 + digit + separator
            input.setSelectionRange(newCursorPos, newCursorPos);

            // Store updated value for deletion tracking
            picker._previousInputValue = newValue;

            // Trigger input event to apply mask and update calendar
            input.dispatchEvent(new Event('input', { bubbles: true }));

            return;
        }
        // Otherwise allow normal separator insertion (will be handled by input mask)
    }

    // For range mode, also allow space and letters 't', 'o' (for " to ")
    if (picker.options.mode === 'range') {
        if (!/^\d$/.test(key) && key !== separator && key !== ' ' && key.toLowerCase() !== 't' && key.toLowerCase() !== 'o') {
            event.preventDefault();
        }
    } else {
        // For single mode, allow only digits and separator
        if (!/^\d$/.test(key) && key !== separator) {
            event.preventDefault();
        }
    }
}

export function handlePaste(picker: any, event: ClipboardEvent) {
    event.preventDefault();

    const pastedText = event.clipboardData?.getData('text') || '';
    const { separator } = picker.formatInfo;

    // Clean pasted content: keep only digits and separators
    const cleaned = pastedText.replace(new RegExp(`[^0-9${separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`, 'g'), '');

    // Apply mask to cleaned content
    const formatted = applyMask(picker, cleaned);

    // Insert formatted text at cursor position
    const input = event.target as HTMLInputElement;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const currentValue = input.value;

    const newValue = currentValue.substring(0, start) + formatted + currentValue.substring(end);
    input.value = applyMask(picker, newValue);

    // Set cursor after pasted content
    const newCursorPos = start + formatted.length;
    input.setSelectionRange(newCursorPos, newCursorPos);

    // Trigger input event to ensure any validation runs
    input.dispatchEvent(new Event('input', { bubbles: true }));

    // Update calendar if a valid date was pasted
    updateCalendarFromInput(picker);
}

export function updateCalendarFromInput(picker: any) {
    // Parse current input value and update calendar progressively
    if (!picker.input) return;

    const value = picker.input.value;
    console.log('[DatePicker] updateCalendarFromInput - value:', value);

    if (!value) return;

    const { separator, parts, maxLength } = picker.formatInfo;
    console.log('[DatePicker] Format info:', { separator, parts, maxLength });

    // For range mode, split by " to " first
    if (picker.options.mode === 'range' && value.includes(' to ')) {
        const rangeParts = value.split(' to ');
        const startValue = rangeParts[0];
        const endValue = rangeParts[1];

        console.log('[DatePicker] Range parts - start:', startValue, 'end:', endValue);

        // Parse start date
        parseAndUpdateSingleDate(picker, startValue, 'start');

        // Parse end date if present
        if (endValue) {
            parseAndUpdateSingleDate(picker, endValue, 'end');
        }

        return;
    }

    // Single mode or range without " to " yet
    // Use helper to parse and update
    const dateType = picker.options.mode === 'range' ? 'start' : 'single';
    parseAndUpdateSingleDate(picker, value, dateType);
}

export function parseAndUpdateSingleDate(picker: any, value: string, dateType: string = 'single') {
    // Helper to parse a single date string and update calendar
    // dateType: 'single', 'start', or 'end'
    const { separator, parts, maxLength } = picker.formatInfo;

    const segments = value.split(separator);
    let year: number | null = null;
    let month: number | null = null;
    let day: number | null = null;

    segments.forEach((segment, index) => {
        if (!segment) return;

        if (parts.year && parts.year.index === index) {
            const yearValue = parseInt(segment, 10);
            if (parts.year.length === 4 && segment.length === 4) {
                year = yearValue;
            } else if (parts.year.length === 2 && segment.length === 2) {
                year = yearValue < 100 ? yearValue + 2000 : yearValue;
            }
        } else if (parts.month && parts.month.index === index) {
            const monthValue = parseInt(segment, 10);
            if (segment.length === 2 && monthValue >= 1 && monthValue <= 12) {
                month = monthValue;
            }
        } else if (parts.day && parts.day.index === index) {
            const dayValue = parseInt(segment, 10);
            if (segment.length === 2 && dayValue >= 1 && dayValue <= 31) {
                day = dayValue;
            }
        }
    });

    console.log(`[DatePicker] parseAndUpdateSingleDate(${dateType}) - year:`, year, 'month:', month, 'day:', day);

    // Update calendar display if we have year or month
    if (year !== null || month !== null) {
        const newYear = year || new Date().getFullYear();
        const newMonth = month !== null ? month - 1 : new Date().getMonth();

        if (picker.options.mode === 'single') {
            picker.monthDates = [];
            for (let i = 0; i < picker.options.monthsToShow; i++) {
                const date = new Date(newYear, newMonth + i, 1);
                picker.monthDates.push(date);
            }
        } else if (picker.options.mode === 'range') {
            // For start date or first date typed, update first month
            if (dateType === 'start' || !picker.selectedStartDate) {
                picker.displayMonths = [
                    { month: newMonth, year: newYear }
                ];
                if (picker.options.monthsToShow > 1) {
                    const nextMonth = new Date(newYear, newMonth + 1, 1);
                    picker.displayMonths.push({
                        month: nextMonth.getMonth(),
                        year: nextMonth.getFullYear()
                    });
                }

                picker.monthDates = [];
                for (let i = 0; i < picker.options.monthsToShow; i++) {
                    const monthData = picker.displayMonths[i];
                    const date = new Date(monthData.year, monthData.month, 1);
                    picker.monthDates.push(date);
                }
            }
        }

        picker.renderCalendar();
    }

    // Update selected date if we have complete date
    if (year !== null && month !== null && day !== null) {
        const date = new Date(year, month - 1, day);
        if (date.getMonth() === month - 1) { // Validates date
            if (dateType === 'single') {
                picker.selectedDate = date;
            } else if (dateType === 'start') {
                picker.selectedStartDate = date;
            } else if (dateType === 'end') {
                picker.selectedEndDate = date;
            }
            picker.renderCalendar();

            // Update summary for range mode when both dates are complete
            if (picker.options.mode === 'range') {
                picker.updateSummary();
            }

            console.log(`[DatePicker] Set ${dateType} date:`, date);
        }
    }
}
