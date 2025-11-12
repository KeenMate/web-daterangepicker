/**
 * Date Picker Selection Methods
 *
 * Pure functions for date selection logic.
 */

import { showLoadingOverlay, hideLoadingOverlay } from './date-picker-ui';
import type { AsyncValidationResult } from './types';
import { validationLogger, selectionLogger } from './logger';
import log from './logger';

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

    // 2. Async validation: call external callback if provided
    if (picker.options.validateRangeCallback) {
        try {
            picker.isValidating = true;
            showLoadingOverlay(picker);

            const result: AsyncValidationResult = await picker.options.validateRangeCallback(startDate, endDate);

            hideLoadingOverlay(picker);
            picker.isValidating = false;

            switch (result.action) {
                case 'accept':
                    return { isValid: true };

                case 'adjust':
                    if (result.adjustedStartDate && result.adjustedEndDate) {
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
            log.error('validateRangeAsync() - async validation error:', error);
            return { isValid: false, message: 'Validation error occurred' };
        }
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
    const date = new Date(year, month, day);

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
        picker.selectedDate = date;
        if (picker.input) {
            picker.input.value = picker.formatDate(date);
        }
        if (picker.options.onSelect) picker.options.onSelect(date);
        // Only auto-hide for floating mode
        if (picker.options.positioningMode === 'floating') {
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
                picker.input.value = `${picker.formatDate(picker.selectedStartDate)} - ${picker.formatDate(picker.selectedEndDate)}`;
            }
            if (picker.options.onSelect) picker.options.onSelect({ start: picker.selectedStartDate, end: picker.selectedEndDate });
            // Don't close - let user click Apply button or click outside
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
                        const dayDate = new Date(year, month, dayNum);
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
        picker.input.value = picker.formatDate(picker.selectedDate);
    }
    if (picker.options.onSelect) picker.options.onSelect(picker.selectedDate);
    picker.renderCalendar();
    if (picker.options.selectionMode === 'single') picker.hide();
}

export function clearSelection(picker: any) {
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
