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
        if (picker.input) {
            // Only update input immediately if Apply button is NOT required
            if (!picker.requiresApplyButton()) {
                picker.input.value = picker.formatDate(finalDate);
            }
        }

        // Defer onSelect callback if Apply button is required
        if (picker.requiresApplyButton()) {
            picker.pendingSelection = finalDate;
        } else {
            if (picker.options.onSelect) picker.options.onSelect(finalDate);
        }

        // Auto-close handling
        if (picker.options.positioningMode === 'floating' && picker.shouldAutoClose()) {
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
        if (picker.input) {
            if (!picker.requiresApplyButton()) {
                const count = picker.selectedDates.length + picker.selectedRanges.length;
                picker.input.value = count > 0 ? `${count} selection(s)` : '';
            }
        }

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
            if (picker.input) {
                if (!picker.requiresApplyButton()) {
                    picker.input.value = `${picker.formatDate(picker.selectedStartDate)} - ...`;
                }
            }
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
                picker.renderCalendar();
                picker.updateSummary();
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

            if (picker.input) {
                // Only update input immediately if Apply button is NOT required
                if (!picker.requiresApplyButton()) {
                    picker.input.value = `${picker.formatDate(picker.selectedStartDate)} - ${picker.formatDate(picker.selectedEndDate)}`;
                }
            }

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

    picker.renderCalendar();
    picker.updateSummary();

    // Update focus to the adjusted date after rendering (for single mode)
    // This ensures the focus indicator appears on the adjusted date, not the originally clicked date
    if (singleModeAdjustedDate) {
        for (let colIndex = 0; colIndex < picker.monthDates.length; colIndex++) {
            const monthDate = picker.monthDates[colIndex];
            if (singleModeAdjustedDate.getFullYear() === monthDate.getFullYear() &&
                singleModeAdjustedDate.getMonth() === monthDate.getMonth()) {
                // Found the column containing the adjusted date
                picker.activeMonthIndex = colIndex;

                // Find the day index within this column
                const daysContainer = picker.calendar.querySelector(
                    `.drp-date-picker__days[data-month-index="${colIndex}"]`
                );
                if (daysContainer) {
                    const days = daysContainer.querySelectorAll(
                        '.drp-date-picker__day:not(.drp-date-picker__day--other-month)'
                    );
                    const adjustedDayIndex = Array.from(days).findIndex((day: Element) => {
                        const dateAttr = (day as HTMLElement).dataset.date;
                        if (!dateAttr) return false;
                        const [year, month, dayNum] = dateAttr.split('-').map(Number);
                        const dayDate = new Date(year, month - 1, dayNum);
                        return picker.isSameDay(dayDate, singleModeAdjustedDate!);
                    });
                    if (adjustedDayIndex !== -1) {
                        picker.focusedDayIndex = adjustedDayIndex;
                        // Re-apply the focused class to the correct day
                        days.forEach((day: Element) =>
                            day.classList.remove('drp-date-picker__day--focused')
                        );
                        if (days[adjustedDayIndex]) {
                            (days[adjustedDayIndex] as HTMLElement).classList.add(
                                'drp-date-picker__day--focused'
                            );
                        }
                    }
                }
                break;
            }
        }
    }

    // Update focus to the end date after rendering (for range mode)
    // This ensures the focus indicator appears on the end of the completed range
    if (picker.options.selectionMode === 'range' && picker.selectedEndDate) {
        const finalEndDate = picker.selectedEndDate;
        for (let colIndex = 0; colIndex < picker.monthDates.length; colIndex++) {
            const monthDate = picker.monthDates[colIndex];
            if (finalEndDate.getFullYear() === monthDate.getFullYear() && finalEndDate.getMonth() === monthDate.getMonth()) {
                // Found the column containing the end date
                picker.activeMonthIndex = colIndex;

                // Find the day index within this column
                const daysContainer = picker.calendar.querySelector(`.drp-date-picker__days[data-month-index="${colIndex}"]`);
                if (daysContainer) {
                    const days = daysContainer.querySelectorAll('.drp-date-picker__day:not(.drp-date-picker__day--other-month)');
                    const endDayIndex = Array.from(days).findIndex((day: Element) => {
                        const dateAttr = (day as HTMLElement).dataset.date;
                        if (!dateAttr) return false;
                        const [year, month, dayNum] = dateAttr.split('-').map(Number);
                        const dayDate = new Date(year, month - 1, dayNum); // month is 1-based in data-date, but Date constructor expects 0-based
                        return picker.isSameDay(dayDate, finalEndDate);
                    });
                    if (endDayIndex !== -1) {
                        picker.focusedDayIndex = endDayIndex;
                        // Re-apply the focused class to the correct day
                        days.forEach((day: Element) => day.classList.remove('drp-date-picker__day--focused'));
                        if (days[endDayIndex]) {
                            (days[endDayIndex] as HTMLElement).classList.add('drp-date-picker__day--focused');
                        }
                    }
                }
                break;
            }
        }
    }
}

export function selectToday(picker: any) {
    picker.monthDates[picker.activeMonthIndex] = new Date();
    picker.selectedDate = new Date();
    if (picker.input) {
        // Only update input immediately if Apply button is NOT required
        if (!picker.requiresApplyButton()) {
            picker.input.value = picker.formatDate(picker.selectedDate);
        }
    }

    // Defer onSelect callback if Apply button is required
    if (picker.requiresApplyButton()) {
        picker.pendingSelection = picker.selectedDate;
    } else {
        if (picker.options.onSelect) picker.options.onSelect(picker.selectedDate);
    }

    picker.renderCalendar();

    // Auto-close if appropriate
    if (picker.options.positioningMode === 'floating' && picker.shouldAutoClose()) {
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

    // Clear drag preview state
    picker.dragPreviewStart = null;
    picker.dragPreviewEnd = null;

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
    picker.renderCalendar();
    picker.updateSummary();
}

export function apply(picker: any) {
    // Always update input if dates are selected (handles custom buttons, programmatic setting)
    if (picker.input) {
        if (picker.options.selectionMode === 'range' && picker.selectedStartDate && picker.selectedEndDate) {
            picker.input.value = `${picker.formatDate(picker.selectedStartDate)} - ${picker.formatDate(picker.selectedEndDate)}`;
        } else if (picker.options.selectionMode === 'single' && picker.selectedDate) {
            picker.input.value = picker.formatDate(picker.selectedDate);
        } else if (picker.options.selectionMode === 'multiple') {
            const count = picker.selectedDates.length + picker.selectedRanges.length;
            picker.input.value = count > 0 ? `${count} selection(s)` : '';
        }
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

    // Always close on Apply (inline mode never closes)
    if (picker.options.positioningMode === 'floating') {
        picker.hide();
    }
}
