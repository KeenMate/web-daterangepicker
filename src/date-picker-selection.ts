/**
 * Date Picker Selection Methods
 *
 * Functions for date selection logic.
 */

import { showLoadingOverlay, hideLoadingOverlay } from './date-picker-ui';
import type { BeforeSelectResult, DateRange } from './types';
import { validationLogger, selectionLogger } from './logger';
import log from './logger';

/**
 * Call beforeDateSelect callback (supports both single and range modes)
 */
async function callBeforeSelectCallback(
    picker: any,
    selection: Date | DateRange
): Promise<{ isValid: boolean; adjustedDate?: Date; adjustedStart?: Date; adjustedEnd?: Date; message?: string }> {
    if (!picker.options.beforeDateSelect) {
        return { isValid: true };
    }

    try {
        picker.isValidating = true;
        showLoadingOverlay(picker);

        const result: BeforeSelectResult = await Promise.resolve(picker.options.beforeDateSelect(selection));

        hideLoadingOverlay(picker);
        picker.isValidating = false;

        switch (result.action) {
            case 'accept':
                return { isValid: true };

            case 'adjust':
                if (selection instanceof Date && result.adjustedDate) {
                    // Single mode adjustment
                    return { isValid: true, adjustedDate: result.adjustedDate, message: result.message };
                } else if (typeof selection === 'object' && 'start' in selection && result.adjustedStartDate && result.adjustedEndDate) {
                    // Range mode adjustment
                    return {
                        isValid: true,
                        adjustedStart: result.adjustedStartDate,
                        adjustedEnd: result.adjustedEndDate,
                        message: result.message
                    };
                }
                return { isValid: false, message: result.message || 'Invalid adjustment' };

            case 'restore':
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
        log.error('beforeDateSelect callback error:', error);
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
): Promise<{ isValid: boolean; adjustedStart?: Date; adjustedEnd?: Date; message?: string }> {
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

    // 2. Async validation: call beforeDateSelect callback if provided
    const callbackResult = await callBeforeSelectCallback(picker, { start: startDate, end: endDate });
    if (!callbackResult.isValid) {
        return callbackResult;
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
        // Call beforeDateSelect callback if provided
        const callbackResult = await callBeforeSelectCallback(picker, date);
        if (!callbackResult.isValid) {
            selectionLogger.debug('Single mode selection prevented by beforeDateSelect callback');
            return;
        }

        // Use adjusted date if provided
        const finalDate = callbackResult.adjustedDate || date;

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
            // Start new range
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
                // Range was already cleared if action was 'clear'
                picker.renderCalendar();
                picker.updateSummary();
                return;
            }

            // Apply validated/adjusted dates
            picker.selectedStartDate = validation.adjustedStart || startDate;
            picker.selectedEndDate = validation.adjustedEnd || endDate;

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
    if (picker.input) {
        picker.input.value = '';
    }
    picker.renderCalendar();
    picker.updateSummary();
}

export function apply(picker: any) {
    // Commit pending selection: update input value and fire deferred callback
    if (picker.pendingSelection) {
        // Update input value now (commit the selection)
        if (picker.input) {
            if (picker.options.selectionMode === 'range') {
                // Range mode: format as "start - end"
                picker.input.value = `${picker.formatDate(picker.selectedStartDate)} - ${picker.formatDate(picker.selectedEndDate)}`;
            } else if (picker.options.selectionMode === 'single') {
                // Single mode: format single date
                picker.input.value = picker.formatDate(picker.selectedDate);
            } else if (picker.options.selectionMode === 'multiple') {
                // Multiple mode: show count
                const count = picker.selectedDates.length + picker.selectedRanges.length;
                picker.input.value = count > 0 ? `${count} selection(s)` : '';
            }
        }

        // Fire deferred onSelect callback
        if (picker.options.onSelect) {
            picker.options.onSelect(picker.pendingSelection);
        }

        // Store committed values
        if (picker.options.selectionMode === 'range') {
            picker.committedStartDate = picker.selectedStartDate;
            picker.committedEndDate = picker.selectedEndDate;
        } else if (picker.options.selectionMode === 'single') {
            picker.committedDate = picker.selectedDate;
        }

        // Clear pending selection
        picker.pendingSelection = null;
    }

    // Only close if autoClose is not 'never'
    if (picker.options.autoClose !== 'never' && picker.options.positioningMode === 'floating') {
        picker.hide();
    }
}
