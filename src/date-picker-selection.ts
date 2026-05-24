/**
 * Date Picker Selection Methods
 *
 * Functions for date selection logic.
 */

import { showLoadingOverlay, hideLoadingOverlay, showMessage, hideMessage } from './date-picker-ui';
import type { BeforeSelectResult, DateRange } from './types';
import { validationLogger, selectionLogger } from './logger';
import log from './logger';

/**
 * Call beforeDateSelectCallback (supports both single and range modes)
 */
async function callBeforeSelectCallback(
    picker: any,
    selection: Date | DateRange
): Promise<{
    isValid: boolean;
    adjustedDate?: Date;
    adjustedStart?: Date;
    adjustedEnd?: Date;
    message?: string;
    showInvalidRange?: boolean;
    invalidStart?: Date;
    invalidEnd?: Date;
}> {
    if (!picker.options.beforeDateSelectCallback) {
        return { isValid: true };
    }

    try {
        picker.isValidating = true;
        showLoadingOverlay(picker);

        const result: BeforeSelectResult = await Promise.resolve(picker.options.beforeDateSelectCallback(selection));

        hideLoadingOverlay(picker);
        picker.isValidating = false;

        switch (result.action) {
            case 'accept':
                // Clear any previous message on successful selection
                hideMessage(picker);
                return { isValid: true };

            case 'adjust':
                if (selection instanceof Date && result.adjustedDate) {
                    // Single mode adjustment - show info message if provided
                    if (result.message) {
                        showMessage(picker, result.message, 'info');
                    }
                    return { isValid: true, adjustedDate: result.adjustedDate, message: result.message };
                } else if (typeof selection === 'object' && 'start' in selection && result.adjustedStartDate && result.adjustedEndDate) {
                    // Range mode adjustment - show info message if provided
                    if (result.message) {
                        showMessage(picker, result.message, 'info');
                    }
                    return {
                        isValid: true,
                        adjustedStart: result.adjustedStartDate,
                        adjustedEnd: result.adjustedEndDate,
                        message: result.message
                    };
                }
                return { isValid: false, message: result.message || 'Invalid adjustment' };

            case 'restore':
                // Handle showInvalidRange - return the proposed range for visual feedback
                if (result.showInvalidRange && typeof selection === 'object' && 'start' in selection) {
                    return {
                        isValid: false,
                        message: result.message,
                        showInvalidRange: true,
                        invalidStart: selection.start,
                        invalidEnd: selection.end
                    };
                }
                return { isValid: false, message: result.message };

            case 'clear':
                picker.clearSelection();
                return { isValid: false, message: result.message };

            default:
                return { isValid: false, message: 'Unknown validation action' };
        }
    } catch (error) {
        hideLoadingOverlay(picker);
        picker.isValidating = false;
        log.error('beforeDateSelectCallback error:', error);
        return { isValid: false, message: 'Validation error occurred' };
    }
}

/**
 * Re-render calendar + summary after a selection change.
 * Single hook so debounced events / bulk-op callbacks can be added later.
 */
function commitSelection(picker: any) {
    picker.renderCalendar();
    picker.updateSummary();
}

/**
 * Write to the input field, but only if there's an input AND we're not waiting
 * on Apply (in which case the value is shown after the user clicks Apply).
 */
export function commitInputValue(picker: any, value: string) {
    if (picker.input && !picker.requiresApplyButton()) {
        picker.input.value = value;
    }
}

/**
 * Walk the rendered month columns, find the one containing `target`, and move
 * keyboard focus (active column index + focused day index + DOM `--focused` class)
 * to that day. Used after a selection commit to keep the focus indicator in sync.
 */
function moveFocusToDate(picker: any, target: Date): void {
    for (let colIndex = 0; colIndex < picker.monthDates.length; colIndex++) {
        const monthDate = picker.monthDates[colIndex];
        if (target.getFullYear() !== monthDate.getFullYear() || target.getMonth() !== monthDate.getMonth()) {
            continue;
        }
        picker.activeMonthIndex = colIndex;

        const daysContainer = picker.calendar.querySelector(
            `.drp-date-picker__days[data-month-index="${colIndex}"]`
        );
        if (!daysContainer) return;

        const days = daysContainer.querySelectorAll(
            '.drp-date-picker__day:not(.drp-date-picker__day--other-month)'
        );
        const dayIndex = Array.from(days).findIndex((day: Element) => {
            const dateAttr = (day as HTMLElement).dataset.date;
            if (!dateAttr) return false;
            const [year, month, dayNum] = dateAttr.split('-').map(Number);
            const dayDate = new Date(year, month - 1, dayNum);
            return picker.isSameDay(dayDate, target);
        });
        if (dayIndex === -1) return;

        picker.focusedDayIndex = dayIndex;
        days.forEach((day: Element) => day.classList.remove('drp-date-picker__day--focused'));
        (days[dayIndex] as HTMLElement | undefined)?.classList.add('drp-date-picker__day--focused');
        return;
    }
}

/**
 * Format the current selection for display in the input field.
 * Returns null for selection states that have no canonical input representation.
 */
function formatInputValue(picker: any): string | null {
    const mode = picker.options.selectionMode;
    // Time-only mode: selectedDate stays null. Format from selectedTime parts so
    // Apply writes "10:37:50" even though there's no date involved.
    if (picker.options.pickerMode === 'time') {
        const t = picker.selectedTime;
        const anyCommitted = t && (t.hour !== null || t.minute !== null || t.second !== null);
        return anyCommitted ? picker.formatTime(t) : null;
    }
    if (mode === 'range' && picker.selectedStartDate && picker.selectedEndDate) {
        return `${picker.formatDate(picker.selectedStartDate)} - ${picker.formatDate(picker.selectedEndDate)}`;
    }
    if (mode === 'single' && picker.selectedDate) {
        return picker.formatDate(picker.selectedDate);
    }
    if (mode === 'multiple') {
        const count = picker.selectedDates.length + picker.selectedRanges.length;
        return count > 0 ? `${count} selection(s)` : '';
    }
    return null;
}

/**
 * Validate range selection with async callback
 * Runs local validation first, then async callback if provided
 */
export async function validateRangeAsync(
    picker: any,
    startDate: Date,
    endDate: Date
): Promise<{
    isValid: boolean;
    adjustedStart?: Date;
    adjustedEnd?: Date;
    message?: string;
    showInvalidRange?: boolean;
    invalidStart?: Date;
    invalidEnd?: Date;
}> {
    validationLogger.debug(' validateRangeAsync called - mode:', picker.options.disabledDatesHandling, 'start:', startDate, 'end:', endDate);

    // 1. Local validation: check for disabled dates if mode requires it
    if (picker.options.disabledDatesHandling === 'prevent') {
        validationLogger.debug(' Checking PREVENT mode');
        if (picker.hasDisabledDatesInRange(startDate, endDate)) {
            validationLogger.debug(' PREVENT mode - range contains disabled dates');
            return { isValid: false, message: 'Range contains disabled dates' };
        }
    } else if (picker.options.disabledDatesHandling === 'block') {
        // 'block' = "yes, but shorter": accept the selection and snap the end to the
        // last enabled date BEFORE the first disabled gap. Not "exclude disabled days
        // from the middle while keeping the original end" — that's `split`/`individual`.
        // See showcase route /features/range-disabled-handling (section RDH04).
        validationLogger.debug(' Checking BLOCK mode');
        if (picker.hasDisabledDatesInRange(startDate, endDate)) {
            validationLogger.debug(' BLOCK mode - range contains disabled dates, adjusting');
            const adjustedEnd = picker.findLastEnabledBeforeGap(startDate, endDate);
            validationLogger.debug(' BLOCK mode - adjusted end:', adjustedEnd);
            return { isValid: true, adjustedStart: startDate, adjustedEnd };
        }
    }

    // 2. Async validation: call beforeDateSelectCallback if provided
    const callbackResult = await callBeforeSelectCallback(picker, { start: startDate, end: endDate });
    if (!callbackResult.isValid) {
        // Pass through showInvalidRange fields if present
        if (callbackResult.showInvalidRange) {
            return {
                isValid: false,
                message: callbackResult.message,
                showInvalidRange: true,
                invalidStart: callbackResult.invalidStart,
                invalidEnd: callbackResult.invalidEnd
            };
        }
        return { isValid: false, message: callbackResult.message };
    }
    // Partial adjustment is intentional: a callback may adjust only one side of the range.
    // Consumers fall back per-field (`validation.adjustedStart || originalStart`), so leaving
    // one side undefined means "keep the original value for this side."
    if (callbackResult.adjustedStart || callbackResult.adjustedEnd) {
        return {
            isValid: true,
            adjustedStart: callbackResult.adjustedStart,
            adjustedEnd: callbackResult.adjustedEnd,
            message: callbackResult.message
        };
    }

    // No validation issues
    return { isValid: true };
}

export async function selectDay(picker: any, dayElement: HTMLElement) {
    if (dayElement.classList.contains('drp-date-picker__day--disabled')) return;

    // Validate that we have a valid day element with data-date
    if (!dayElement.dataset || !dayElement.dataset.date) {
        log.warn('selectDay() - called with invalid element:', dayElement);
        return;
    }

    // Parse the date from the element
    const [year, month, day] = dayElement.dataset.date.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 1-based in data-date, but Date constructor expects 0-based

    // Track if single mode date was adjusted (for focus update after render)
    let singleModeAdjustedDate: Date | null = null;

    // Check if this is an "other month" day
    const isOtherMonth = dayElement.classList.contains('drp-date-picker__day--other-month');

    // Determine which column this click happened in
    const daysContainer = dayElement.closest('.drp-date-picker__days');
    if (daysContainer && daysContainer instanceof HTMLElement) {
        picker.activeMonthIndex = parseInt(daysContainer.dataset.monthIndex || '0') || 0;
        selectionLogger.debug(`Col${picker.activeMonthIndex} selectDay - activeMonthIndex:`, picker.activeMonthIndex);
        // For all days (including other-month), set focused index for keyboard navigation
        const days = daysContainer.querySelectorAll('.drp-date-picker__day:not(.drp-date-picker__day--other-month)');
        picker.focusedDayIndex = Array.from(days).indexOf(dayElement);
        selectionLogger.debug(`Col${picker.activeMonthIndex} selectDay - set focusedDayIndex to:`, picker.focusedDayIndex);
    }

    if (picker.options.selectionMode === 'single') {
        // Call beforeDateSelectCallback if provided
        const callbackResult = await callBeforeSelectCallback(picker, date);
        if (!callbackResult.isValid) {
            selectionLogger.debug('Single mode selection prevented by beforeDateSelectCallback');
            return;
        }

        // Clear any previous message on successful selection (if no adjustment message)
        if (!callbackResult.message) {
            hideMessage(picker);
        }

        // Use adjusted date if provided
        const finalDate = callbackResult.adjustedDate || date;

        // Track if date was adjusted for focus update after render
        if (callbackResult.adjustedDate && !picker.isSameDay(date, finalDate)) {
            singleModeAdjustedDate = finalDate;
        }

        picker.selectedDate = finalDate;
        commitInputValue(picker, picker.formatDate(finalDate));

        // In datetime mode, the payload to onSelect is the composed Date+time.
        const payload = picker.options.pickerMode === 'datetime' ? picker.selectedDatetime : finalDate;

        // Defer onSelect callback if Apply button is required
        if (picker.requiresApplyButton()) {
            picker.pendingSelection = payload;
        } else {
            if (picker.options.onSelect) picker.options.onSelect(payload);
        }

        // Auto-close handling
        if (picker.options.positioningMode !== 'inline' && picker.shouldAutoClose()) {
            picker.hide();
        }
    } else if (picker.options.selectionMode === 'multiple') {
        // Multiple mode: toggle individual dates or add ranges
        // For now, we'll implement toggling individual dates
        // Users can use custom buttons to add ranges programmatically

        // Check if date is already selected
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const existingIndex = picker.selectedDates.findIndex((d: Date) => {
            const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            return dStr === dateStr;
        });

        if (existingIndex !== -1) {
            // Remove the date (toggle off)
            picker.selectedDates.splice(existingIndex, 1);
        } else {
            // Add the date
            picker.selectedDates.push(new Date(date));
        }

        // Update input to show count (only if Apply button is NOT required)
        const count = picker.selectedDates.length + picker.selectedRanges.length;
        commitInputValue(picker, count > 0 ? `${count} selection(s)` : '');

        // Multiple mode always defers events (inherently requires Apply button)
        // Store pending selection for onSelect callback
        if (picker.selectedRanges.length > 0 && picker.selectedDates.length > 0) {
            picker.pendingSelection = [...picker.selectedRanges, ...picker.selectedDates];
        } else if (picker.selectedRanges.length > 0) {
            picker.pendingSelection = picker.selectedRanges;
        } else {
            picker.pendingSelection = picker.selectedDates;
        }
    } else { // range
        if (!picker.selectedStartDate || picker.selectedEndDate) {
            // Start new range - clear any previous invalid range
            picker.invalidRangeStart = null;
            picker.invalidRangeEnd = null;
            picker.selectedStartDate = date;
            picker.selectedEndDate = null;
            // Show first date in input immediately (only if Apply button is NOT required)
            commitInputValue(picker, `${picker.formatDate(picker.selectedStartDate)} - ...`);
        } else {
            // Complete range - determine start/end order
            let startDate = picker.selectedStartDate;
            let endDate = date;

            if (date < picker.selectedStartDate) {
                endDate = picker.selectedStartDate;
                startDate = date;
            }

            // Validate the range (local + async)
            selectionLogger.debug(' selectDay - calling validateRangeAsync with:', startDate, endDate);
            const validation = await validateRangeAsync(picker, startDate, endDate);
            selectionLogger.debug(' selectDay - validation result:', validation);

            if (!validation.isValid) {
                // Validation failed - restore previous state or clear
                if (validation.message) {
                    log.warn('selectDay() - range validation failed:', validation.message);
                }

                // Handle showInvalidRange - keep invalid range visible with error styling
                if (validation.showInvalidRange && validation.invalidStart && validation.invalidEnd) {
                    picker.invalidRangeStart = validation.invalidStart;
                    picker.invalidRangeEnd = validation.invalidEnd;
                    // Reset selection to start-only state so user can try again
                    picker.selectedStartDate = null;
                    picker.selectedEndDate = null;
                }

                // Range was already cleared if action was 'clear'
                commitSelection(picker);
                return;
            }

            // Apply validated/adjusted dates
            picker.selectedStartDate = validation.adjustedStart || startDate;
            picker.selectedEndDate = validation.adjustedEnd || endDate;

            // Clear any invalid range on successful selection
            picker.invalidRangeStart = null;
            picker.invalidRangeEnd = null;

            // Clear any previous message on successful selection (if no adjustment message)
            if (!validation.message) {
                hideMessage(picker);
            }

            commitInputValue(picker, `${picker.formatDate(picker.selectedStartDate)} - ${picker.formatDate(picker.selectedEndDate)}`);

            // Defer onSelect callback if Apply button is required
            const selection = { start: picker.selectedStartDate, end: picker.selectedEndDate };
            if (picker.requiresApplyButton()) {
                picker.pendingSelection = selection;
            } else {
                if (picker.options.onSelect) picker.options.onSelect(selection);
            }

            // Auto-close handling
            if (picker.options.positioningMode === 'floating' && picker.shouldAutoClose()) {
                picker.hide();
            }
        }
    }

    commitSelection(picker);

    // Keep the focus indicator on the date the picker actually committed to:
    // - single mode: the (possibly callback-adjusted) date
    // - range mode: the end of the completed range
    if (singleModeAdjustedDate) {
        moveFocusToDate(picker, singleModeAdjustedDate);
    }
    if (picker.options.selectionMode === 'range' && picker.selectedEndDate) {
        moveFocusToDate(picker, picker.selectedEndDate);
    }
}

export function selectToday(picker: any) {
    // Time mode has no calendar grid to seek to — Today is meaningless there.
    if (picker.options.pickerMode === 'time') return;

    picker.monthDates[picker.activeMonthIndex] = new Date();
    // In datetime mode keep selectedDate as date-only (time lives in selectedTime
    // and is untouched). In date mode the time portion is irrelevant.
    const today = new Date();
    picker.selectedDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const payload = picker.options.pickerMode === 'datetime' ? picker.selectedDatetime : picker.selectedDate;
    commitInputValue(picker, picker.formatDate(picker.selectedDate));

    // Defer onSelect callback if Apply button is required
    if (picker.requiresApplyButton()) {
        picker.pendingSelection = payload;
    } else {
        if (picker.options.onSelect) picker.options.onSelect(payload);
    }

    picker.renderCalendar();

    // Auto-close if appropriate
    if (picker.options.positioningMode !== 'inline' && picker.shouldAutoClose()) {
        picker.hide();
    }
}

export function clearSelection(picker: any) {
    picker.selectedDate = null;
    picker.selectedStartDate = null;
    picker.selectedEndDate = null;
    picker.selectedRanges = [];
    picker.selectedDates = [];
    picker.pendingSelection = null;
    picker.selectedTime = null;

    // Clear drag preview state
    picker.dragPreviewStart = null;
    picker.dragPreviewEnd = null;
    picker.hoverPreviewEnd = null;

    // Clear invalid range state
    picker.invalidRangeStart = null;
    picker.invalidRangeEnd = null;

    // Clear focused day state
    picker.focusedDayIndex = null;

    // Clear any message
    hideMessage(picker);

    if (picker.input) {
        picker.input.value = '';
    }
    commitSelection(picker);
}

/**
 * Ensure picker.selectedTime exists with all fields null. Each select* helper
 * then fills in the field the user clicked. Null fields stay null so the
 * renderer knows not to highlight that roll.
 */
function ensureSelectedTime(picker: any) {
    if (!picker.selectedTime) {
        picker.selectedTime = { hour: null, minute: null, second: null, ampm: null };
    }
    return picker.selectedTime;
}

function commitTimeSelection(picker: any) {
    const mode = picker.options.pickerMode;
    let formatted: string;
    if (mode === 'time') {
        formatted = picker.formatTime(picker.selectedTime);
    } else if (mode === 'datetime' && picker.selectedDate) {
        formatted = picker.formatDate(picker.selectedDate);
    } else {
        // datetime mode without a committed date — show just the time so the
        // user sees feedback for their click. Day-click later replaces the input.
        formatted = picker.formatTime(picker.selectedTime);
    }
    commitInputValue(picker, formatted);
    // onSelect receives the composed Date when the picker has time semantics.
    const payload = picker.selectedDatetime;
    if (picker.requiresApplyButton()) {
        picker.pendingSelection = payload;
    } else if (picker.options.onSelect) {
        picker.options.onSelect(payload);
    }
    picker.renderCalendar();
}

export function selectHour(picker: any, hour: number, is12Hour: boolean) {
    const time = ensureSelectedTime(picker);
    let h24 = hour;
    if (is12Hour) {
        // Translate 1-12 + current AM/PM into 0-23. If user hasn't picked AM/PM
        // yet, default to AM (matches old behavior where the seed was 00:00:00).
        const wasPm = time.ampm === 'pm' || (time.ampm === null && (time.hour ?? 0) >= 12);
        if (hour === 12) h24 = wasPm ? 12 : 0;
        else h24 = wasPm ? hour + 12 : hour;
        // Auto-commit ampm so the AM/PM roll highlights the implied half.
        time.ampm = h24 >= 12 ? 'pm' : 'am';
    }
    time.hour = h24;
    commitTimeSelection(picker);
}

export function selectMinute(picker: any, minute: number) {
    const time = ensureSelectedTime(picker);
    time.minute = minute;
    commitTimeSelection(picker);
}

export function selectSecond(picker: any, second: number) {
    const time = ensureSelectedTime(picker);
    time.second = second;
    commitTimeSelection(picker);
}

export function selectAmpm(picker: any, ampm: 'am' | 'pm') {
    const time = ensureSelectedTime(picker);
    // If hour is already set, shift it into the right half.
    if (time.hour !== null) {
        const isPm = time.hour >= 12;
        if (ampm === 'pm' && !isPm) time.hour += 12;
        else if (ampm === 'am' && isPm) time.hour -= 12;
    }
    time.ampm = ampm;
    commitTimeSelection(picker);
}

export function selectNow(picker: any) {
    const now = new Date();
    if (picker.options.pickerMode === 'datetime') {
        // Set both date and time to now, and re-seek calendar to today.
        picker.selectedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (picker.monthDates && picker.monthDates.length > 0) {
            picker.monthDates[picker.activeMonthIndex || 0] = new Date(now.getFullYear(), now.getMonth(), 1);
        }
    }
    // "Now" is an explicit commitment of every time field.
    picker.selectedTime = {
        hour: now.getHours(),
        minute: now.getMinutes(),
        second: now.getSeconds(),
        ampm: now.getHours() >= 12 ? 'pm' : 'am',
    };
    commitTimeSelection(picker);
}

export function apply(picker: any) {
    // Always update input if dates are selected (handles custom buttons, programmatic setting).
    // Bypasses the requiresApplyButton gate — this is the Apply action itself.
    if (picker.input) {
        const formatted = formatInputValue(picker);
        if (formatted !== null) picker.input.value = formatted;
    }

    // Fire deferred callback if there was a pending selection
    if (picker.pendingSelection) {
        if (picker.options.onSelect) {
            picker.options.onSelect(picker.pendingSelection);
        }
        picker.pendingSelection = null;
    }

    // Store committed values
    if (picker.options.selectionMode === 'range') {
        picker.committedStartDate = picker.selectedStartDate;
        picker.committedEndDate = picker.selectedEndDate;
    } else if (picker.options.selectionMode === 'single') {
        picker.committedDate = picker.selectedDate;
    }
    // Time/datetime modes also commit the time parts so hide() can revert.
    if (picker.options.pickerMode !== 'date') {
        picker.committedTime = picker.selectedTime ? { ...picker.selectedTime } : null;
    }

    // Always close on Apply (inline mode never closes; floating and modal both close)
    if (picker.options.positioningMode !== 'inline') {
        picker.hide();
    }
}
