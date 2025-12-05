/**
 * Date Picker Navigation Methods
 *
 * Functions for navigation logic including month/year navigation,
 * rolling selector, and keyboard focus movement.
 */

import type { BeforeMonthChangeContext, BeforeMonthChangeResult } from './types';
import { navigationLogger } from './logger';
import { showLoadingOverlay, hideLoadingOverlay } from './date-picker-ui';

/**
 * Check if a given month has any enabled (non-disabled) days
 * Used to determine if navigation buttons should be disabled
 */
export function hasEnabledDaysInMonth(picker: any, year: number, month: number): boolean {
    // Check each day of the month (1-31)
    // We check up to 31 even though not all months have 31 days
    // Invalid dates (e.g., Feb 31) will be handled by Date constructor
    for (let day = 1; day <= 31; day++) {
        const date = new Date(year, month, day);

        // Skip if this day doesn't exist in this month (e.g., day 31 in Feb)
        if (date.getMonth() !== month) continue;

        // If we find at least one enabled day, the month is navigable
        if (!picker.isDateDisabledInternal(date)) {
            return true;
        }
    }

    // All days in this month are disabled
    return false;
}

/**
 * Call beforeMonthChangedCallback for initial calendar load
 * This is called when calendar first opens to allow pre-loading metadata
 * Does NOT block/navigate, just calls callback to populate cache
 */
export async function handleInitialMonthLoad(picker: any): Promise<void> {
    if (!picker.options.beforeMonthChangedCallback) {
        return;
    }

    // Prevent concurrent month changes
    if (picker.isMonthChanging) {
        navigationLogger.debug('handleInitialMonthLoad() - already changing month, skipping');
        return;
    }

    try {
        picker.isMonthChanging = true;

        if (picker.options.unifiedNavigation) {
            // UNIFIED MODE: One callback for all visible months together
            const anchorIndex = picker.options.unifiedNavigationAnchorIndex ?? 0;
            const anchorMonth = picker.monthDates[anchorIndex];
            const targetYear = anchorMonth.getFullYear();
            const targetMonth = anchorMonth.getMonth();

            // Calculate range for ALL visible months
            let earliestYear = Infinity;
            let earliestMonth = Infinity;
            let latestYear = -Infinity;
            let latestMonth = -Infinity;

            for (let i = 0; i < picker.monthDates.length; i++) {
                const monthDate = picker.monthDates[i];
                const year = monthDate.getFullYear();
                const month = monthDate.getMonth();

                if (year < earliestYear || (year === earliestYear && month < earliestMonth)) {
                    earliestYear = year;
                    earliestMonth = month;
                }

                if (year > latestYear || (year === latestYear && month > latestMonth)) {
                    latestYear = year;
                    latestMonth = month;
                }
            }

            const firstMonth = new Date(earliestYear, earliestMonth, 1);
            const firstDayWeekday = firstMonth.getDay();
            const offset = (firstDayWeekday - picker.weekStartDay + 7) % 7;
            const firstVisibleDate = new Date(earliestYear, earliestMonth, 1 - offset);

            const lastDayOfLastMonth = new Date(latestYear, latestMonth + 1, 0).getDate();
            const lastDayDate = new Date(latestYear, latestMonth, lastDayOfLastMonth);
            const lastDayWeekday = lastDayDate.getDay();
            const daysToAdd = (picker.weekStartDay + 6 - lastDayWeekday) % 7;
            const lastVisibleDate = new Date(latestYear, latestMonth, lastDayOfLastMonth + daysToAdd);

            const context: BeforeMonthChangeContext = {
                year: targetYear,
                month: targetMonth,
                monthIndex: anchorIndex,
                firstVisibleDate: firstVisibleDate,
                lastVisibleDate: lastVisibleDate
            };

            navigationLogger.debug(`handleInitialMonthLoad() [UNIFIED] - calling callback for ${targetYear}-${targetMonth + 1}, range: ${firstVisibleDate.toISOString().split('T')[0]} to ${lastVisibleDate.toISOString().split('T')[0]}`);

            const callbackResult = picker.options.beforeMonthChangedCallback(context);
            const isAsync = callbackResult instanceof Promise;

            if (isAsync) {
                showLoadingOverlay(picker);
            }

            const result: BeforeMonthChangeResult = await Promise.resolve(callbackResult);

            if (isAsync) {
                hideLoadingOverlay(picker);
            }

            navigationLogger.debug(`handleInitialMonthLoad() [UNIFIED] - callback completed, metadata items: ${result.metadata?.size || 0}, monthHeaders: ${result.monthHeaders?.size || 0}`);

            if (result.metadata) {
                picker.bulkMetadataCache = result.metadata;
                navigationLogger.debug(`handleInitialMonthLoad() [UNIFIED] - bulk metadata cache updated with ${result.metadata.size} entries`);
            }

            // Store month headers if provided
            if (result.monthHeaders) {
                picker.monthHeadersCache = result.monthHeaders;
                navigationLogger.debug(`handleInitialMonthLoad() [UNIFIED] - month headers cache updated with ${result.monthHeaders.size} entries`);
            }

            if (result.metadata || result.monthHeaders) {
                picker.renderCalendar();
            }

        } else {
            // NON-UNIFIED MODE: Call callback for EACH visible month separately
            navigationLogger.debug(`handleInitialMonthLoad() [NON-UNIFIED] - calling callback for ${picker.monthDates.length} months`);

            // Initialize empty maps for combined data
            const combinedMetadata = new Map<string, any>();
            const combinedMonthHeaders = new Map<string, string>();
            let hadAsync = false;

            for (let i = 0; i < picker.monthDates.length; i++) {
                const monthDate = picker.monthDates[i];
                const targetYear = monthDate.getFullYear();
                const targetMonth = monthDate.getMonth();

                // Calculate visible date range for THIS month
                const firstDayOfMonth = new Date(targetYear, targetMonth, 1);
                const firstDayWeekday = firstDayOfMonth.getDay();
                const offset = (firstDayWeekday - picker.weekStartDay + 7) % 7;
                const firstVisibleDate = new Date(targetYear, targetMonth, 1 - offset);
                const lastVisibleDate = new Date(firstVisibleDate);
                lastVisibleDate.setDate(firstVisibleDate.getDate() + 41);

                const context: BeforeMonthChangeContext = {
                    year: targetYear,
                    month: targetMonth,
                    monthIndex: i,
                    firstVisibleDate: firstVisibleDate,
                    lastVisibleDate: lastVisibleDate
                };

                navigationLogger.debug(`handleInitialMonthLoad() [NON-UNIFIED] Col${i} - calling callback for ${targetYear}-${targetMonth + 1}, range: ${firstVisibleDate.toISOString().split('T')[0]} to ${lastVisibleDate.toISOString().split('T')[0]}`);

                const callbackResult = picker.options.beforeMonthChangedCallback(context);
                const isAsync = callbackResult instanceof Promise;

                if (isAsync && !hadAsync) {
                    hadAsync = true;
                    showLoadingOverlay(picker);
                }

                const result: BeforeMonthChangeResult = await Promise.resolve(callbackResult);

                navigationLogger.debug(`handleInitialMonthLoad() [NON-UNIFIED] Col${i} - callback completed, metadata items: ${result.metadata?.size || 0}, monthHeaders: ${result.monthHeaders?.size || 0}`);

                // Merge metadata into combined map
                if (result.metadata) {
                    result.metadata.forEach((value, key) => {
                        combinedMetadata.set(key, value);
                    });
                }

                // Merge month headers into combined map
                if (result.monthHeaders) {
                    result.monthHeaders.forEach((value, key) => {
                        combinedMonthHeaders.set(key, value);
                    });
                }
            }

            if (hadAsync) {
                hideLoadingOverlay(picker);
            }

            // Update bulk metadata cache with combined data from all months
            if (combinedMetadata.size > 0) {
                picker.bulkMetadataCache = combinedMetadata;
                navigationLogger.debug(`handleInitialMonthLoad() [NON-UNIFIED] - combined metadata cache updated with ${combinedMetadata.size} entries`);
            }

            // Update month headers cache with combined data from all months
            if (combinedMonthHeaders.size > 0) {
                picker.monthHeadersCache = combinedMonthHeaders;
                navigationLogger.debug(`handleInitialMonthLoad() [NON-UNIFIED] - combined month headers cache updated with ${combinedMonthHeaders.size} entries`);
            }

            if (combinedMetadata.size > 0 || combinedMonthHeaders.size > 0) {
                picker.renderCalendar();
            }
        }

    } catch (error) {
        // Hide loading overlay on error
        hideLoadingOverlay(picker);

        navigationLogger.debug(`handleInitialMonthLoad() - error in callback:`, error);
        console.error('[DateRangePicker] Error in beforeMonthChangedCallback (initial load):', error);
    } finally {
        picker.isMonthChanging = false;
    }
}

/**
 * Handle beforeMonthChangedCallback before month navigation
 * Returns true if navigation should proceed, false if blocked
 */
export async function handleBeforeMonthChange(
    picker: any,
    targetYear: number,
    targetMonth: number, // 0-11
    monthIndex: number
): Promise<boolean> {
    // If no callback is defined, proceed with navigation
    if (!picker.options.beforeMonthChangedCallback) {
        return true;
    }

    // Prevent concurrent month changes
    if (picker.isMonthChanging) {
        navigationLogger.debug('handleBeforeMonthChange() - already changing month, ignoring');
        return false;
    }

    try {
        picker.isMonthChanging = true;

        // Calculate first and last visible dates in the calendar grid
        let firstVisibleDate: Date;
        let lastVisibleDate: Date;

        if (picker.options.unifiedNavigation) {
            // Calculate range for ALL visible months in unified mode
            // Report the actual min/max dates across all visible months, not just anchor month

            // Find the earliest month across all visible columns
            let earliestYear = Infinity;
            let earliestMonth = Infinity;
            let latestYear = -Infinity;
            let latestMonth = -Infinity;

            for (let i = 0; i < picker.monthDates.length; i++) {
                const monthDate = picker.monthDates[i];
                const year = monthDate.getFullYear();
                const month = monthDate.getMonth();

                // Check if this is earlier than current earliest
                if (year < earliestYear || (year === earliestYear && month < earliestMonth)) {
                    earliestYear = year;
                    earliestMonth = month;
                }

                // Check if this is later than current latest
                if (year > latestYear || (year === latestYear && month > latestMonth)) {
                    latestYear = year;
                    latestMonth = month;
                }
            }

            // First visible date: from the earliest month in grid
            const firstMonth = new Date(earliestYear, earliestMonth, 1);
            const firstDayWeekday = firstMonth.getDay();
            const offset = (firstDayWeekday - picker.weekStartDay + 7) % 7;
            firstVisibleDate = new Date(earliestYear, earliestMonth, 1 - offset);

            // Last visible date: from the latest month in grid
            const lastDayOfLastMonth = new Date(latestYear, latestMonth + 1, 0).getDate();
            const lastDayDate = new Date(latestYear, latestMonth, lastDayOfLastMonth);
            const lastDayWeekday = lastDayDate.getDay();

            // Extend to end of week (to match calendar grid display)
            const daysToAdd = (picker.weekStartDay + 6 - lastDayWeekday) % 7;
            lastVisibleDate = new Date(latestYear, latestMonth, lastDayOfLastMonth + daysToAdd);
        } else {
            // Single month calculation (existing logic for non-unified mode)
            const firstDayOfMonth = new Date(targetYear, targetMonth, 1);
            const firstDayWeekday = firstDayOfMonth.getDay();
            const offset = (firstDayWeekday - picker.weekStartDay + 7) % 7;
            firstVisibleDate = new Date(targetYear, targetMonth, 1 - offset);
            lastVisibleDate = new Date(firstVisibleDate);
            lastVisibleDate.setDate(firstVisibleDate.getDate() + 41);
        }

        // Build context object
        const context: BeforeMonthChangeContext = {
            year: targetYear,
            month: targetMonth,
            monthIndex: monthIndex,
            firstVisibleDate: firstVisibleDate,
            lastVisibleDate: lastVisibleDate
        };

        navigationLogger.debug(`handleBeforeMonthChange() - calling callback for ${targetYear}-${targetMonth + 1}, range: ${firstVisibleDate.toISOString().split('T')[0]} to ${lastVisibleDate.toISOString().split('T')[0]}`);

        // Call the callback (might be async)
        const callbackResult = picker.options.beforeMonthChangedCallback(context);
        const isAsync = callbackResult instanceof Promise;

        // Show loading overlay if async
        if (isAsync) {
            showLoadingOverlay(picker);
        }

        // Await the result
        const result: BeforeMonthChangeResult = await Promise.resolve(callbackResult);

        // Hide loading overlay if it was shown
        if (isAsync) {
            hideLoadingOverlay(picker);
        }

        // Handle the result
        if (result.action === 'block') {
            navigationLogger.debug(`handleBeforeMonthChange() - navigation blocked: ${result.message || 'no reason provided'}`);
            if (result.message) {
                console.warn(`[DateRangePicker] Month navigation blocked: ${result.message}`);
            }
            return false; // Block navigation
        }

        // Action is 'accept'
        navigationLogger.debug(`handleBeforeMonthChange() - navigation accepted, metadata items: ${result.metadata?.size || 0}, monthHeaders: ${result.monthHeaders?.size || 0}`);

        // Update bulk metadata cache if provided
        if (result.metadata) {
            if (!picker.bulkMetadataCache) {
                // No existing cache, create new one
                picker.bulkMetadataCache = result.metadata;
                navigationLogger.debug(`handleBeforeMonthChange() - bulk metadata cache created with ${result.metadata.size} entries`);
            } else {
                // Merge new metadata into existing cache
                result.metadata.forEach((value, key) => {
                    picker.bulkMetadataCache.set(key, value);
                });
                navigationLogger.debug(`handleBeforeMonthChange() - merged ${result.metadata.size} entries into cache (total: ${picker.bulkMetadataCache.size})`);
            }
        } else {
            // Clear cache if no metadata provided
            picker.bulkMetadataCache = null;
        }

        // Update month headers cache if provided
        if (result.monthHeaders) {
            if (!picker.monthHeadersCache) {
                // No existing cache, create new one
                picker.monthHeadersCache = result.monthHeaders;
                navigationLogger.debug(`handleBeforeMonthChange() - month headers cache created with ${result.monthHeaders.size} entries`);
            } else {
                // Merge new headers into existing cache
                result.monthHeaders.forEach((value, key) => {
                    picker.monthHeadersCache.set(key, value);
                });
                navigationLogger.debug(`handleBeforeMonthChange() - merged ${result.monthHeaders.size} entries into headers cache (total: ${picker.monthHeadersCache.size})`);
            }
        }

        return true; // Allow navigation

    } catch (error) {
        // Hide loading overlay on error
        hideLoadingOverlay(picker);

        navigationLogger.debug(`handleBeforeMonthChange() - error in callback:`, error);
        console.error('[DateRangePicker] Error in beforeMonthChangedCallback:', error);

        // On error, block navigation for safety
        return false;
    } finally {
        picker.isMonthChanging = false;
    }
}

export function toggleRollingSelector(picker: any, monthIndex: number) {
    picker.showingRollingSelector[monthIndex] = !picker.showingRollingSelector[monthIndex];
    picker.renderCalendar();
}

export async function selectYear(picker: any, year: number, monthIndex: number) {
    // Get current month to preserve it
    const currentMonth = picker.monthDates[monthIndex].getMonth();

    // Call beforeMonthChangedCallback
    const shouldProceed = await handleBeforeMonthChange(picker, year, currentMonth, monthIndex);
    if (!shouldProceed) {
        navigationLogger.debug(`selectYear() Col${monthIndex} - navigation blocked by callback`);
        return; // Navigation blocked
    }

    // Update only this specific month's year
    const oldYear = picker.monthDates[monthIndex].getFullYear();
    picker.monthDates[monthIndex].setFullYear(year);
    navigationLogger.debug(`selectYear() Col${monthIndex} - changed from ${oldYear} to ${year}`);

    // Check for collisions with adjacent columns
    checkAndResolveCollisions(picker, monthIndex);

    picker.showingRollingSelector[monthIndex] = false;
    picker.renderCalendar();
}

export async function selectMonth(picker: any, month: number, monthIndex: number) {
    // Get current year to preserve it
    const currentYear = picker.monthDates[monthIndex].getFullYear();

    // Call beforeMonthChangedCallback
    const shouldProceed = await handleBeforeMonthChange(picker, currentYear, month, monthIndex);
    if (!shouldProceed) {
        navigationLogger.debug(`selectMonth() Col${monthIndex} - navigation blocked by callback`);
        return; // Navigation blocked
    }

    // Update only this specific month's month
    const oldMonth = picker.monthDates[monthIndex].getMonth();
    picker.monthDates[monthIndex].setMonth(month);
    navigationLogger.debug(`selectMonth() Col${monthIndex} - changed from ${oldMonth+1} to ${month+1}`);

    // Check for collisions with adjacent columns
    checkAndResolveCollisions(picker, monthIndex);

    picker.showingRollingSelector[monthIndex] = false;
    picker.renderCalendar();
}

// Check and resolve collisions after changing a column's date
export function checkAndResolveCollisions(picker: any, changedIdx: number) {
    const changedDate = picker.monthDates[changedIdx];

    // Check collision with next column (if exists)
    if (changedIdx < picker.monthDates.length - 1) {
        const nextDate = picker.monthDates[changedIdx + 1];
        if (isSameOrAfterMonth(changedDate, nextDate)) {
            navigationLogger.debug(`checkAndResolveCollisions() Col${changedIdx} - collision with Col${changedIdx+1}, shifting forward`);
            // Move next column to be 1 month after changed column
            const newNextDate = new Date(changedDate.getFullYear(), changedDate.getMonth() + 1, 1);
            picker.monthDates[changedIdx + 1] = newNextDate;
            // Recursively check next column
            checkAndResolveCollisions(picker, changedIdx + 1);
        }
    }

    // Check collision with previous column (if exists)
    if (changedIdx > 0) {
        const prevDate = picker.monthDates[changedIdx - 1];
        if (isSameOrAfterMonth(prevDate, changedDate)) {
            navigationLogger.debug(`checkAndResolveCollisions() Col${changedIdx} - collision with Col${changedIdx-1}, shifting backward`);
            // Move previous column to be 1 month before changed column
            const newPrevDate = new Date(changedDate.getFullYear(), changedDate.getMonth() - 1, 1);
            picker.monthDates[changedIdx - 1] = newPrevDate;
            // Recursively check previous column
            checkAndResolveCollisions(picker, changedIdx - 1);
        }
    }
}

// Helper: Compare if date1 >= date2 (by year-month only)
// This is a pure function - no picker needed
export function isSameOrAfterMonth(date1: Date, date2: Date): boolean {
    const year1 = date1.getFullYear();
    const month1 = date1.getMonth();
    const year2 = date2.getFullYear();
    const month2 = date2.getMonth();

    if (year1 > year2) return true;
    if (year1 === year2 && month1 >= month2) return true;
    return false;
}

export async function prevMonth(picker: any, monthIndex: number) {
    // Update only the specific month
    const idx = !isNaN(monthIndex) ? monthIndex : picker.activeMonthIndex;
    // Hide rolling selector if it's open for this month
    if (picker.showingRollingSelector[idx]) {
        picker.showingRollingSelector[idx] = false;
    }

    const oldDate = picker.monthDates[idx];
    const newDate = new Date(oldDate.getFullYear(), oldDate.getMonth() - 1, 1);

    // Check if target month is within boundaries (has any enabled days)
    if (!hasEnabledDaysInMonth(picker, newDate.getFullYear(), newDate.getMonth())) {
        navigationLogger.debug(`prevMonth() Col${idx} - navigation blocked: target month has no enabled days`);
        return; // Navigation blocked
    }

    // Call beforeMonthChangedCallback
    const shouldProceed = await handleBeforeMonthChange(picker, newDate.getFullYear(), newDate.getMonth(), idx);
    if (!shouldProceed) {
        navigationLogger.debug(`prevMonth() Col${idx} - navigation blocked by callback`);
        return; // Navigation blocked
    }

    picker.monthDates[idx] = newDate;
    navigationLogger.debug(`prevMonth() Col${idx} - changed from ${oldDate.getFullYear()}-${oldDate.getMonth()+1} to ${newDate.getFullYear()}-${newDate.getMonth()+1}`);

    // If moving backward causes overlap with previous column, shift previous columns back
    if (idx > 0) {
        const prevDate = picker.monthDates[idx - 1];
        if (isSameOrAfterMonth(prevDate, newDate)) {
            navigationLogger.debug(`prevMonth() Col${idx} - collision detected with Col${idx-1}, shifting previous columns back`);
            // Recursively move previous column back
            await prevMonth(picker, idx - 1);
        }
    }

    picker.renderCalendar();
}

export async function nextMonth(picker: any, monthIndex: number) {
    // Update only the specific month
    const idx = !isNaN(monthIndex) ? monthIndex : picker.activeMonthIndex;
    // Hide rolling selector if it's open for this month
    if (picker.showingRollingSelector[idx]) {
        picker.showingRollingSelector[idx] = false;
    }

    const oldDate = picker.monthDates[idx];
    const newDate = new Date(oldDate.getFullYear(), oldDate.getMonth() + 1, 1);

    // Check if target month is within boundaries (has any enabled days)
    if (!hasEnabledDaysInMonth(picker, newDate.getFullYear(), newDate.getMonth())) {
        navigationLogger.debug(`nextMonth() Col${idx} - navigation blocked: target month has no enabled days`);
        return; // Navigation blocked
    }

    // Call beforeMonthChangedCallback
    const shouldProceed = await handleBeforeMonthChange(picker, newDate.getFullYear(), newDate.getMonth(), idx);
    if (!shouldProceed) {
        navigationLogger.debug(`nextMonth() Col${idx} - navigation blocked by callback`);
        return; // Navigation blocked
    }

    picker.monthDates[idx] = newDate;
    navigationLogger.debug(`nextMonth() Col${idx} - changed from ${oldDate.getFullYear()}-${oldDate.getMonth()+1} to ${newDate.getFullYear()}-${newDate.getMonth()+1}`);

    // If moving forward causes overlap with next column, shift next columns forward
    if (idx < picker.monthDates.length - 1) {
        const nextDate = picker.monthDates[idx + 1];
        if (isSameOrAfterMonth(newDate, nextDate)) {
            navigationLogger.debug(`nextMonth() Col${idx} - collision detected with Col${idx+1}, shifting next columns forward`);
            // Recursively move next column forward
            await nextMonth(picker, idx + 1);
        }
    }

    picker.renderCalendar();
}

/**
 * Find next enabled day index starting from given index, moving in direction
 * Returns null if no enabled day found within reasonable range (60 days)
 */
export function findNextEnabledDayIndex(picker: any, startIndex: number, offset: number, days: NodeListOf<Element>, monthIndex: number) {
    let currentIndex = startIndex;
    let attempts = 0;
    const maxAttempts = 60; // Safety limit

    while (attempts < maxAttempts) {
        // Check if current index is within bounds of current month
        if (currentIndex >= 0 && currentIndex < days.length) {
            const dayElement = days[currentIndex] as HTMLElement;
            const dateAttr = dayElement.dataset.date;
            if (dateAttr) {
                const [year, month, day] = dateAttr.split('-').map(Number);
                const date = new Date(year, month - 1, day); // month is 1-based in data-date, but Date constructor expects 0-based

                // Check if this date is enabled
                if (!picker.isDateDisabledInternal(date)) {
                    return { index: currentIndex, monthChanged: false };
                }
            }
        }

        // Move to next position
        currentIndex += offset;
        attempts++;

        // If we've gone out of bounds, we need to check next/prev month
        if (currentIndex < 0 || currentIndex >= days.length) {
            // Need to search in adjacent month
            return { index: null, monthChanged: true, direction: offset > 0 ? 'next' : 'prev' };
        }
    }

    // No enabled day found
    return { index: null, monthChanged: false };
}

export function moveFocus(picker: any, offset: number) {
    // Only get days from the active month column
    navigationLogger.debug(`moveFocus(${offset}) Col${picker.activeMonthIndex} - focusedDayIndex:`, picker.focusedDayIndex);
    const daysContainer = picker.calendar.querySelector(`.drp-date-picker__days[data-month-index="${picker.activeMonthIndex}"]`);
    if (!daysContainer) {
        navigationLogger.debug(`moveFocus() Col${picker.activeMonthIndex} - ERROR: daysContainer not found!`);
        return;
    }

    const days = daysContainer.querySelectorAll('.drp-date-picker__day:not(.drp-date-picker__day--other-month)');
    navigationLogger.debug(`moveFocus() Col${picker.activeMonthIndex} - found ${days.length} days in column`);
    if (days.length === 0) return;

    // Initialize focus if not set
    if (picker.focusedDayIndex === null) {
        // Find today's day in the calendar as the starting point
        const todayIndex = Array.from(days).findIndex(day => (day as Element).classList.contains('drp-date-picker__day--today'));
        picker.focusedDayIndex = todayIndex !== -1 ? todayIndex : 0;
        navigationLogger.debug(`moveFocus() Col${picker.activeMonthIndex} - initialized focusedDayIndex to ${picker.focusedDayIndex} (today or first day), will move by offset ${offset}`);
    }

    // Remove old focus (if any)
    days[picker.focusedDayIndex]?.classList.remove('drp-date-picker__day--focused');

    // Calculate new index
    const newIndex = picker.focusedDayIndex + offset;

    // Check if we need to change months
    if (newIndex < 0) {
        const savedMonthIndex = picker.activeMonthIndex;

        // For left arrow (offset -1), just go to last enabled day of previous month
        // For up arrow (offset -7), maintain weekday column
        if (offset === -1) {
            navigationLogger.debug(`moveFocus() Col${savedMonthIndex} - edge navigation LEFT: going to last enabled day of prev month`);
            prevMonth(picker, picker.activeMonthIndex);
            setTimeout(() => {
                const newContainer = picker.calendar.querySelector(`.drp-date-picker__month[data-month-index="${savedMonthIndex}"] .drp-date-picker__days`);
                if (!newContainer) return;
                const newDays = newContainer.querySelectorAll('.drp-date-picker__day:not(.drp-date-picker__day--other-month)');

                // Find last enabled day
                const result = findNextEnabledDayIndex(picker, newDays.length - 1, -1, newDays, savedMonthIndex);
                if (result.index !== null) {
                    picker.focusedDayIndex = result.index;
                    newDays[picker.focusedDayIndex]?.classList.add('drp-date-picker__day--focused');
                    newDays[picker.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
                }
            }, 0);
        } else {
            // Up arrow - maintain same weekday column
            const currentDay = days[picker.focusedDayIndex] as HTMLElement;
            const dateAttr = currentDay.dataset.date;
            if (dateAttr) {
                const [year, month, day] = dateAttr.split('-').map(Number);
                const currentDate = new Date(year, month - 1, day); // month is 1-based in data-date, but Date constructor expects 0-based
                const targetWeekday = currentDate.getDay();

                navigationLogger.debug(`moveFocus() Col${savedMonthIndex} - edge navigation UP: current day ${day} is weekday ${targetWeekday}, going to prev month`);
                prevMonth(picker, picker.activeMonthIndex);
                setTimeout(() => {
                    const newContainer = picker.calendar.querySelector(`.drp-date-picker__month[data-month-index="${savedMonthIndex}"] .drp-date-picker__days`);
                    if (!newContainer) return;
                    const newDays = newContainer.querySelectorAll('.drp-date-picker__day:not(.drp-date-picker__day--other-month)');

                    const lastDayElement = newDays[newDays.length - 1] as HTMLElement;
                    const lastDateAttr = lastDayElement.dataset.date;
                    if (lastDateAttr) {
                        const [lastYear, lastMonth, lastDayNum] = lastDateAttr.split('-').map(Number);
                        const lastDay = new Date(lastYear, lastMonth - 1, lastDayNum); // month is 1-based in data-date, but Date constructor expects 0-based
                        const lastWeekday = lastDay.getDay();
                        const offsetDays = (lastWeekday - targetWeekday + 7) % 7;
                        picker.focusedDayIndex = newDays.length - 1 - offsetDays;

                        navigationLogger.debug(`moveFocus() Col${savedMonthIndex} - last day weekday ${lastWeekday}, target ${targetWeekday}, focusing on day ${picker.focusedDayIndex+1}`);
                        newDays[picker.focusedDayIndex]?.classList.add('drp-date-picker__day--focused');
                        newDays[picker.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
                    }
                }, 0);
            }
        }
        return;
    } else if (newIndex >= days.length) {
        const savedMonthIndex = picker.activeMonthIndex;

        // For right arrow (offset +1), just go to first enabled day of next month
        // For down arrow (offset +7), maintain weekday column
        if (offset === 1) {
            navigationLogger.debug(`moveFocus() Col${savedMonthIndex} - edge navigation RIGHT: going to first enabled day of next month`);
            nextMonth(picker, picker.activeMonthIndex);
            setTimeout(() => {
                const newContainer = picker.calendar.querySelector(`.drp-date-picker__month[data-month-index="${savedMonthIndex}"] .drp-date-picker__days`);
                if (!newContainer) return;
                const newDays = newContainer.querySelectorAll('.drp-date-picker__day:not(.drp-date-picker__day--other-month)');

                // Find first enabled day
                const result = findNextEnabledDayIndex(picker, 0, 1, newDays, savedMonthIndex);
                if (result.index !== null) {
                    picker.focusedDayIndex = result.index;
                    newDays[picker.focusedDayIndex]?.classList.add('drp-date-picker__day--focused');
                    newDays[picker.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
                }
            }, 0);
        } else {
            // Down arrow - maintain same weekday column
            const currentDay = days[picker.focusedDayIndex] as HTMLElement;
            const dateAttr = currentDay.dataset.date;
            if (dateAttr) {
                const [year, month, day] = dateAttr.split('-').map(Number);
                const currentDate = new Date(year, month - 1, day); // month is 1-based in data-date, but Date constructor expects 0-based
                const targetWeekday = currentDate.getDay();

                navigationLogger.debug(`moveFocus() Col${savedMonthIndex} - edge navigation DOWN: current day ${day} is weekday ${targetWeekday}, going to next month`);
                nextMonth(picker, picker.activeMonthIndex);
                setTimeout(() => {
                    const newContainer = picker.calendar.querySelector(`.drp-date-picker__month[data-month-index="${savedMonthIndex}"] .drp-date-picker__days`);
                    if (!newContainer) return;
                    const newDays = newContainer.querySelectorAll('.drp-date-picker__day:not(.drp-date-picker__day--other-month)');

                    const firstDayElement = newDays[0] as HTMLElement;
                    const firstDateAttr = firstDayElement.dataset.date;
                    if (firstDateAttr) {
                        const [firstYear, firstMonth, firstDayNum] = firstDateAttr.split('-').map(Number);
                        const firstDay = new Date(firstYear, firstMonth - 1, firstDayNum); // month is 1-based in data-date, but Date constructor expects 0-based
                        const firstWeekday = firstDay.getDay();
                        const offsetDays = (targetWeekday - firstWeekday + 7) % 7;
                        picker.focusedDayIndex = offsetDays;

                        navigationLogger.debug(`moveFocus() Col${savedMonthIndex} - first day weekday ${firstWeekday}, target ${targetWeekday}, focusing on day ${picker.focusedDayIndex+1}`);
                        newDays[picker.focusedDayIndex]?.classList.add('drp-date-picker__day--focused');
                        newDays[picker.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
                    }
                }, 0);
            }
        }
        return;
    }

    // Normal movement within current month
    // Check if the target day is enabled, if not find next enabled day
    const result = findNextEnabledDayIndex(picker, newIndex, offset, days, picker.activeMonthIndex);

    if (result.monthChanged) {
        // Need to navigate to next/prev month to find enabled day
        const savedMonthIndex = picker.activeMonthIndex;
        if (result.direction === 'next') {
            nextMonth(picker, picker.activeMonthIndex);
        } else {
            prevMonth(picker, picker.activeMonthIndex);
        }

        setTimeout(() => {
            const newContainer = picker.calendar.querySelector(`.drp-date-picker__month[data-month-index="${savedMonthIndex}"] .drp-date-picker__days`);
            if (!newContainer) return;
            const newDays = newContainer.querySelectorAll('.drp-date-picker__day:not(.drp-date-picker__day--other-month)');

            // Find first/last enabled day in new month
            const searchResult = findNextEnabledDayIndex(
                picker,
                result.direction === 'next' ? 0 : newDays.length - 1,
                offset,
                newDays,
                savedMonthIndex
            );

            if (searchResult.index !== null) {
                picker.focusedDayIndex = searchResult.index;
                newDays[picker.focusedDayIndex]?.classList.add('drp-date-picker__day--focused');
                newDays[picker.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
            }
        }, 0);
        return;
    }

    if (result.index !== null) {
        picker.focusedDayIndex = result.index;
        days[picker.focusedDayIndex]?.classList.add('drp-date-picker__day--focused');
        days[picker.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
    } else {
        // No enabled day found, don't move
        navigationLogger.debug('moveFocus() - no enabled day found in search range');
        days[picker.focusedDayIndex]?.classList.add('drp-date-picker__day--focused');
    }
}

/**
 * Unified Navigation Functions
 * For multi-month calendars with unified navigation enabled
 */

/**
 * Navigate forward one month in unified mode (affects all visible months)
 */
export async function unifiedNextMonth(picker: any) {
    if (!picker.options.unifiedNavigation) return;

    const anchorIndex = picker.options.unifiedNavigationAnchorIndex ?? 0;
    const anchorMonth = picker.monthDates[anchorIndex];
    const newAnchorMonth = new Date(anchorMonth.getFullYear(), anchorMonth.getMonth() + 1, 1);

    navigationLogger.debug(`unifiedNextMonth() - anchor index: ${anchorIndex}, current: ${anchorMonth.getFullYear()}-${anchorMonth.getMonth()+1}, new: ${newAnchorMonth.getFullYear()}-${newAnchorMonth.getMonth()+1}`);

    // Check if target month is within boundaries (has any enabled days)
    if (!hasEnabledDaysInMonth(picker, newAnchorMonth.getFullYear(), newAnchorMonth.getMonth())) {
        navigationLogger.debug(`unifiedNextMonth() - navigation blocked: target month has no enabled days`);
        return; // Navigation blocked
    }

    const shouldProceed = await handleBeforeMonthChange(picker, newAnchorMonth.getFullYear(), newAnchorMonth.getMonth(), anchorIndex);
    if (!shouldProceed) return;

    // Update ALL months relative to the anchor
    for (let i = 0; i < picker.monthDates.length; i++) {
        const offset = i - anchorIndex;
        picker.monthDates[i] = new Date(newAnchorMonth.getFullYear(), newAnchorMonth.getMonth() + offset, 1);
    }
    picker.renderCalendar();
}

/**
 * Navigate backward one month in unified mode (affects all visible months)
 */
export async function unifiedPrevMonth(picker: any) {
    if (!picker.options.unifiedNavigation) return;

    const anchorIndex = picker.options.unifiedNavigationAnchorIndex ?? 0;
    const anchorMonth = picker.monthDates[anchorIndex];
    const newAnchorMonth = new Date(anchorMonth.getFullYear(), anchorMonth.getMonth() - 1, 1);

    navigationLogger.debug(`unifiedPrevMonth() - anchor index: ${anchorIndex}, current: ${anchorMonth.getFullYear()}-${anchorMonth.getMonth()+1}, new: ${newAnchorMonth.getFullYear()}-${newAnchorMonth.getMonth()+1}`);

    // Check if target month is within boundaries (has any enabled days)
    if (!hasEnabledDaysInMonth(picker, newAnchorMonth.getFullYear(), newAnchorMonth.getMonth())) {
        navigationLogger.debug(`unifiedPrevMonth() - navigation blocked: target month has no enabled days`);
        return; // Navigation blocked
    }

    const shouldProceed = await handleBeforeMonthChange(picker, newAnchorMonth.getFullYear(), newAnchorMonth.getMonth(), anchorIndex);
    if (!shouldProceed) return;

    // Update ALL months relative to the anchor
    for (let i = 0; i < picker.monthDates.length; i++) {
        const offset = i - anchorIndex;
        picker.monthDates[i] = new Date(newAnchorMonth.getFullYear(), newAnchorMonth.getMonth() + offset, 1);
    }
    picker.renderCalendar();
}

/**
 * Sets the month for unified navigation via rolling selector
 * Updates the anchor month to the selected month, all others follow
 */
export async function setUnifiedMonth(picker: any, month: number) {
    if (!picker.options.unifiedNavigation) return;

    const anchorIndex = picker.options.unifiedNavigationAnchorIndex ?? 0;
    const currentYear = picker.monthDates[anchorIndex].getFullYear();

    navigationLogger.debug(`setUnifiedMonth(${month}) - anchor index: ${anchorIndex}, year: ${currentYear}`);

    const shouldProceed = await handleBeforeMonthChange(picker, currentYear, month, anchorIndex);
    if (!shouldProceed) return;

    // Update ALL months relative to the new anchor month
    for (let i = 0; i < picker.monthDates.length; i++) {
        const offset = i - anchorIndex;
        picker.monthDates[i] = new Date(currentYear, month + offset, 1);
    }

    // Close the unified rolling selector (like normal selectMonth does)
    picker.showingUnifiedRollingSelector = false;
    picker.renderCalendar();
}

/**
 * Toggle unified rolling selector visibility
 */
export function toggleUnifiedRollingSelector(picker: any) {
    if (!picker.options.unifiedNavigation) {
        return;
    }

    picker.showingUnifiedRollingSelector = !picker.showingUnifiedRollingSelector;
    navigationLogger.debug(`toggleUnifiedRollingSelector() - now ${picker.showingUnifiedRollingSelector ? 'visible' : 'hidden'}`);
    picker.renderCalendar();
}

/**
 * Sets the year for unified navigation
 * Updates the anchor month to the selected year, keeping the same month
 */
export async function setUnifiedYear(picker: any, year: number) {
    if (!picker.options.unifiedNavigation) return;

    const anchorIndex = picker.options.unifiedNavigationAnchorIndex ?? 0;
    const currentMonth = picker.monthDates[anchorIndex].getMonth();

    navigationLogger.debug(`setUnifiedYear(${year}) - anchor index: ${anchorIndex}, month: ${currentMonth}`);

    const shouldProceed = await handleBeforeMonthChange(picker, year, currentMonth, anchorIndex);
    if (!shouldProceed) return;

    // Update ALL months relative to the new anchor
    for (let i = 0; i < picker.monthDates.length; i++) {
        const offset = i - anchorIndex;
        picker.monthDates[i] = new Date(year, currentMonth + offset, 1);
    }

    // Close the unified rolling selector (like normal selectYear does)
    picker.showingUnifiedRollingSelector = false;
    picker.renderCalendar();
}
