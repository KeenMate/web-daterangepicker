/**
 * Date Picker Selection Methods
 *
 * Pure functions for date selection logic.
 */

export function selectDay(picker: any, dayElement: HTMLElement) {
    if (dayElement.classList.contains('pa-date-picker__day--disabled')) return;

    // Validate that we have a valid day element with data-date
    if (!dayElement.dataset || !dayElement.dataset.date) {
        console.warn('[DatePicker] selectDay called with invalid element:', dayElement);
        return;
    }

    // Parse the date from the element
    const [year, month, day] = dayElement.dataset.date.split('-').map(Number);
    const date = new Date(year, month, day);

    // Check if this is an "other month" day
    const isOtherMonth = dayElement.classList.contains('pa-date-picker__day--other-month');

    // Determine which column this click happened in
    const daysContainer = dayElement.closest('.pa-date-picker__days');
    if (daysContainer && daysContainer instanceof HTMLElement) {
        picker.activeMonthIndex = parseInt(daysContainer.dataset.monthIndex || '0') || 0;
        console.log(`[DatePicker Col${picker.activeMonthIndex}] selectDay - activeMonthIndex:`, picker.activeMonthIndex);
        // For all days (including other-month), set focused index for keyboard navigation
        const days = daysContainer.querySelectorAll('.pa-date-picker__day:not(.pa-date-picker__day--other-month)');
        picker.focusedDayIndex = Array.from(days).indexOf(dayElement);
        console.log(`[DatePicker Col${picker.activeMonthIndex}] selectDay - set focusedDayIndex to:`, picker.focusedDayIndex);
    }

    if (picker.options.mode === 'single') {
        picker.selectedDate = date;
        if (picker.input) {
            picker.input.value = picker.formatDate(date);
        }
        if (picker.options.onSelect) picker.options.onSelect(date);
        // Only auto-hide for floating mode
        if (picker.options.display === 'floating') {
            picker.hide();
        }
    } else { // range
        if (!picker.selectedStartDate || picker.selectedEndDate) {
            // Start new range
            picker.selectedStartDate = date;
            picker.selectedEndDate = null;
            // Show first date in input immediately
            if (picker.input) {
                picker.input.value = `${picker.formatDate(picker.selectedStartDate)} - ...`;
            }
        } else {
            // Complete range
            if (date >= picker.selectedStartDate) {
                picker.selectedEndDate = date;
            } else {
                picker.selectedEndDate = picker.selectedStartDate;
                picker.selectedStartDate = date;
            }

            // For 'block' mode, if there are disabled dates in range, snap to last enabled before gap
            if (picker.options.rangeDisabledMode === 'block' &&
                picker.hasDisabledDatesInRange(picker.selectedStartDate, picker.selectedEndDate)) {
                picker.selectedEndDate = picker.findLastEnabledBeforeGap(picker.selectedStartDate, picker.selectedEndDate);
            }

            if (picker.input) {
                picker.input.value = `${picker.formatDate(picker.selectedStartDate)} - ${picker.formatDate(picker.selectedEndDate)}`;
            }
            if (picker.options.onSelect) picker.options.onSelect({ start: picker.selectedStartDate, end: picker.selectedEndDate });
            // Don't close - let user click Apply button or click outside
        }
    }

    picker.renderCalendar();
    picker.updateSummary();
}

export function selectToday(picker: any) {
    picker.monthDates[picker.activeMonthIndex] = new Date();
    picker.selectedDate = new Date();
    if (picker.input) {
        picker.input.value = picker.formatDate(picker.selectedDate);
    }
    if (picker.options.onSelect) picker.options.onSelect(picker.selectedDate);
    picker.renderCalendar();
    if (picker.options.mode === 'single') picker.hide();
}

export function clear(picker: any) {
    picker.selectedDate = null;
    picker.selectedStartDate = null;
    picker.selectedEndDate = null;
    if (picker.input) {
        picker.input.value = '';
    }
    picker.renderCalendar();
    picker.updateSummary();
}

export function apply(picker: any) {
    if (picker.selectedStartDate && picker.selectedEndDate) {
        picker.hide();
    }
}
