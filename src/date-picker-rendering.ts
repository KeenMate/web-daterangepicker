/**
 * Date Picker Rendering Methods
 *
 * Functions that handle calendar rendering.
 * Each function accepts the picker instance as the first parameter.
 */

import { hasEnabledDaysInMonth } from './date-picker-navigation';
import { hasEnabledDaysInYear } from './date-picker-validation';
import * as Validation from './date-picker-validation';
import { renderingLogger } from './logger';

/**
 * Parse year range string to min/max values
 * @param range - Examples: "2024" (single year), "2022-2026" (range)
 * @param currentYear - Current year for default range
 * @param picker - Picker instance to check for minDate/maxDate constraints
 * @returns { min: number, max: number }
 */
export function parseYearRange(range: string | undefined, currentYear: number, picker?: any): { min: number, max: number } {
    if (!range) {
        // If no explicit range but minDate/maxDate are set, use those to constrain years
        if (picker?.normalizedMinDate || picker?.normalizedMaxDate) {
            const minYear = picker.normalizedMinDate ? picker.normalizedMinDate.getFullYear() : currentYear - 1;
            const maxYear = picker.normalizedMaxDate ? picker.normalizedMaxDate.getFullYear() : currentYear + 1;
            return { min: minYear, max: maxYear };
        }
        // Default: current year ± 1 year (total 3 years)
        return { min: currentYear - 1, max: currentYear + 1 };
    }

    if (range.includes('-')) {
        // Range format: "2022-2026"
        const [minStr, maxStr] = range.split('-');
        return { min: parseInt(minStr, 10), max: parseInt(maxStr, 10) };
    } else {
        // Single year: "2024"
        const year = parseInt(range, 10);
        return { min: year, max: year };
    }
}

/**
 * Parse month range string to min/max values
 * @param range - Examples: "01-12" (all months), "06-08" (summer), "11-12" (year-end)
 * @returns { min: number, max: number } - Month numbers (1-12)
 */
export function parseMonthRange(range: string | undefined): { min: number, max: number } {
    if (!range) {
        // Default: all months
        return { min: 1, max: 12 };
    }

    const [minStr, maxStr] = range.split('-');
    return { min: parseInt(minStr, 10), max: parseInt(maxStr, 10) };
}

export function renderCalendar(picker: any) {
    renderingLogger.debug(`[DatePicker 18] renderCalendar called, showingRollingSelector:`, picker.showingRollingSelector, `activeCol: ${picker.activeMonthIndex}`);
    renderingLogger.debug('[DatePicker 18] monthDates array:', picker.monthDates.map((d: Date, i: number) => `Col${i}: ${d.getFullYear()}-${d.getMonth()+1}`).join(', '));

    // Handle unified rolling selector (if enabled)
    if (picker.options.unifiedNavigation && picker.showingUnifiedRollingSelector) {
        renderUnifiedRollingSelector(picker);
    }

    // Render each month
    for (let i = 0; i < picker.options.visibleMonthsCount; i++) {
        if (picker.showingRollingSelector[i]) {
            renderRollingSelector(picker, i);
        } else {
            renderNormalView(picker, i);
        }
    }

    // Re-apply focused day class after rendering (keyboard navigation state)
    // This is necessary because renderDays() rebuilds the DOM with innerHTML
    if (picker.focusedDayIndex !== null) {
        const daysContainer = picker.calendar.querySelector(`.drp-date-picker__days[data-month-index="${picker.activeMonthIndex}"]`);
        if (daysContainer) {
            const days = daysContainer.querySelectorAll('.drp-date-picker__day:not(.drp-date-picker__day--other-month)');
            if (days[picker.focusedDayIndex]) {
                days[picker.focusedDayIndex].classList.add('drp-date-picker__day--focused');
            }
        }
    }

    // Initialize drag listeners for range mode
    if (picker.options.selectionMode === 'range' && !picker.isDragging) {
        picker.initDragListeners();
    }

    // Re-render action buttons to update dynamic properties (callbacks)
    if (picker.actionsContainer) {
        picker.renderButtons(picker.actionsContainer);
    }
}

export function renderNormalView(picker: any, monthIndex: number) {
    renderingLogger.debug(`[DatePicker Col${monthIndex} 19] renderNormalView called for month`, monthIndex);
    const monthContainer = picker.calendar.querySelector(`.drp-date-picker__month[data-month-index="${monthIndex}"]`);
    if (!monthContainer) return;

    // Hide rolling selector for picker month
    const rollingSelector = monthContainer.querySelector('.drp-date-picker__rolling-selector');
    rollingSelector?.classList.remove('drp-date-picker__rolling-selector--visible');

    // Get picker month's date
    const date = picker.monthDates[monthIndex];
    const year = date.getFullYear();
    const month = date.getMonth();
    const monthName = picker.monthNames[month];

    // Update month/year display with custom header support
    const monthYear = monthContainer.querySelector('.drp-date-picker__month-year');
    if (monthYear) {
        // Priority order:
        // 1. monthHeaders from beforeMonthChangedCallback result
        // 2. getMonthHeaderCallback
        // 3. Default format
        const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
        let headerText: string;

        if (picker.monthHeadersCache?.has(monthKey)) {
            // Use cached header from beforeMonthChangedCallback
            headerText = picker.monthHeadersCache.get(monthKey)!;
        } else if (picker.options.getMonthHeaderCallback) {
            // Use callback to generate header
            headerText = picker.options.getMonthHeaderCallback({
                month: date,
                monthIndex: monthIndex,
                monthName: monthName,
                year: year
            });
        } else {
            // Default format
            headerText = `${monthName} ${year}`;
        }

        monthYear.textContent = headerText;
    }

    // Update unified navigation (if enabled and this is the first month change)
    if (picker.options.unifiedNavigation && monthIndex === 0 && picker.unifiedRangeDisplay) {
        // Hide unified rolling selector (only if it's not supposed to be showing)
        if (picker.unifiedRollingSelector && !picker.showingUnifiedRollingSelector) {
            picker.unifiedRollingSelector.classList.remove('drp-date-picker__unified-rolling-selector--visible');
        }

        // Update unified range display
        const firstMonth = picker.monthDates[0];
        const lastMonth = picker.monthDates[picker.monthDates.length - 1];
        const anchorIndex = picker.options.unifiedNavigationAnchorIndex ?? 0;
        const anchorMonth = picker.monthDates[anchorIndex];

        // Use callback if provided, otherwise use default format
        if (picker.options.getUnifiedHeaderCallback) {
            const headerText = picker.options.getUnifiedHeaderCallback({
                firstMonth,
                lastMonth,
                anchorMonth,
                monthNames: picker.monthNames
            });
            picker.unifiedRangeDisplay.textContent = headerText;
        } else {
            // Default format: "Jan 2025 - Jun 2025" or "Dec 2024 - Jan 2025"
            const firstMonthName = picker.monthNames[firstMonth.getMonth()];
            const lastMonthName = picker.monthNames[lastMonth.getMonth()];
            const firstYear = firstMonth.getFullYear();
            const lastYear = lastMonth.getFullYear();

            if (firstYear === lastYear) {
                picker.unifiedRangeDisplay.textContent = `${firstMonthName} ${firstYear} - ${lastMonthName} ${lastYear}`;
            } else {
                picker.unifiedRangeDisplay.textContent = `${firstMonthName} ${firstYear} - ${lastMonthName} ${lastYear}`;
            }
        }

        // Update unified nav buttons state
        const unifiedHeader = picker.unifiedHeader;
        if (unifiedHeader) {
            // Check if previous month has enabled days
            const prevYear = firstMonth.getMonth() === 0 ? firstMonth.getFullYear() - 1 : firstMonth.getFullYear();
            const prevMonth = firstMonth.getMonth() === 0 ? 11 : firstMonth.getMonth() - 1;
            const prevButton = unifiedHeader.querySelector('.drp-date-picker__nav--prev');
            if (prevButton) {
                const hasPrevEnabled = hasEnabledDaysInMonth(picker, prevYear, prevMonth);
                if (hasPrevEnabled) {
                    prevButton.removeAttribute('disabled');
                    prevButton.classList.remove('drp-date-picker__nav--disabled');
                } else {
                    prevButton.setAttribute('disabled', 'true');
                    prevButton.classList.add('drp-date-picker__nav--disabled');
                }
            }

            // Check if next month has enabled days (check the month after the last visible month)
            const nextYear = lastMonth.getMonth() === 11 ? lastMonth.getFullYear() + 1 : lastMonth.getFullYear();
            const nextMonth = lastMonth.getMonth() === 11 ? 0 : lastMonth.getMonth() + 1;
            const nextButton = unifiedHeader.querySelector('.drp-date-picker__nav--next');
            if (nextButton) {
                const hasNextEnabled = hasEnabledDaysInMonth(picker, nextYear, nextMonth);
                if (hasNextEnabled) {
                    nextButton.removeAttribute('disabled');
                    nextButton.classList.remove('drp-date-picker__nav--disabled');
                } else {
                    nextButton.setAttribute('disabled', 'true');
                    nextButton.classList.add('drp-date-picker__nav--disabled');
                }
            }
        }
    }

    // Update navigation buttons disabled state based on enabled days
    const currentYear = date.getFullYear();
    const currentMonth = date.getMonth();

    // Check previous month
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const prevButton = monthContainer.querySelector('.drp-date-picker__nav--prev');
    if (prevButton) {
        const hasPrevEnabled = hasEnabledDaysInMonth(picker, prevYear, prevMonth);
        if (hasPrevEnabled) {
            prevButton.removeAttribute('disabled');
            prevButton.classList.remove('drp-date-picker__nav--disabled');
        } else {
            prevButton.setAttribute('disabled', 'true');
            prevButton.classList.add('drp-date-picker__nav--disabled');
        }
    }

    // Check next month
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const nextButton = monthContainer.querySelector('.drp-date-picker__nav--next');
    if (nextButton) {
        const hasNextEnabled = hasEnabledDaysInMonth(picker, nextYear, nextMonth);
        if (hasNextEnabled) {
            nextButton.removeAttribute('disabled');
            nextButton.classList.remove('drp-date-picker__nav--disabled');
        } else {
            nextButton.setAttribute('disabled', 'true');
            nextButton.classList.add('drp-date-picker__nav--disabled');
        }
    }

    // Render weekdays (respecting week start day)
    const weekdays = monthContainer.querySelector('.drp-date-picker__weekdays');
    const reorderedWeekdays = [
        ...picker.weekdayNames.slice(picker.weekStartDay),
        ...picker.weekdayNames.slice(0, picker.weekStartDay)
    ];
    if (weekdays) {
        weekdays.innerHTML = reorderedWeekdays
            .map(day => `<div class="drp-date-picker__weekday">${day}</div>`).join('');
    }

    // Render days
    renderDays(picker, monthIndex, date);
}

export function renderDays(picker: any, monthIndex: number, date: Date) {
    renderingLogger.debug(`[DatePicker Col${monthIndex} 20] renderDays called for month`, monthIndex);
    const monthContainer = picker.calendar.querySelector(`.drp-date-picker__month[data-month-index="${monthIndex}"]`);
    if (!monthContainer) return;

    const daysContainer = monthContainer.querySelector('.drp-date-picker__days');
    const year = date.getFullYear();
    const month = date.getMonth();
    renderingLogger.debug(`[DatePicker Col${monthIndex} 21] Rendering days for:`, year, month + 1);

    // Get first day of month and number of days
    const firstDayRaw = new Date(year, month, 1).getDay();
    // Adjust first day to respect week start day
    const firstDay = (firstDayRaw - picker.weekStartDay + 7) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // Calculate previous and next month for data-date attributes
    const prevMonthDate = new Date(year, month - 1, 1);
    const prevYear = prevMonthDate.getFullYear();
    const prevMonth = prevMonthDate.getMonth();

    const nextMonthDate = new Date(year, month + 1, 1);
    const nextYear = nextMonthDate.getFullYear();
    const nextMonth = nextMonthDate.getMonth();

    // Collect all days with their metadata
    const allDays: Array<{
        date: Date;
        year: number;
        month: number;
        day: number;
        isOtherMonth: boolean;
    }> = [];

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const dayDate = new Date(prevYear, prevMonth, day);
        allDays.push({
            date: dayDate,
            year: prevYear,
            month: prevMonth,
            day: day,
            isOtherMonth: true
        });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const dayDate = new Date(year, month, day);
        allDays.push({
            date: dayDate,
            year: year,
            month: month,
            day: day,
            isOtherMonth: false
        });
    }

    // Next month days — always render 6 weeks (42 cells) so every month has
    // identical height. Without this, 5-week months (like October 2026) leave
    // empty space at the bottom when laid out next to 6-week months in a grid
    // (rows equalize to the tallest item), creating a visible "gap" between
    // the day grid and the next element.
    const totalCells = 42;
    const remainingCells = totalCells - (firstDay + daysInMonth);
    for (let day = 1; day <= remainingCells; day++) {
        const dayDate = new Date(nextYear, nextMonth, day);
        allDays.push({
            date: dayDate,
            year: nextYear,
            month: nextMonth,
            day: day,
            isOtherMonth: true
        });
    }

    // Group days into weeks (7 days per week)
    const weeks: typeof allDays[] = [];
    for (let i = 0; i < allDays.length; i += 7) {
        weeks.push(allDays.slice(i, i + 7));
    }

    // Generate HTML for each week (badge row + date row)
    let html = '';
    for (const week of weeks) {
        // Check if any day in picker week has a badge
        const weekBadges = week.map(dayData => {
            const dateInfo = picker.getDateInfoInternal(dayData.date);

            // Get base tooltip from dateInfo
            let badgeTooltip = dateInfo?.badgeTooltip || '';

            // Override with badgeTooltipCallback if provided
            if (picker.options.badgeTooltipCallback && dateInfo?.badgeText) {
                // Build DayRenderData for callback (minimal version for badge context)
                const dayRenderData = {
                    date: dayData.date,
                    dateString: Validation.formatDateKey(dayData.date),
                    dayNumber: dayData.day,
                    isDisabled: picker.isDateDisabledInternal(dayData.date),
                    isSelected: false, // Will be set below
                    isStartDate: false,
                    isEndDate: false,
                    isInRange: false,
                    isToday: Validation.isToday(dayData.date),
                    isWeekend: dayData.date.getDay() === 0 || dayData.date.getDay() === 6,
                    monthIndex: monthIndex,
                    element: null as any, // Not available during string rendering
                    picker: picker
                };

                const callbackTooltip = picker.options.badgeTooltipCallback(dayRenderData);
                if (callbackTooltip !== null) {
                    badgeTooltip = callbackTooltip;
                }
            }

            const badge = {
                text: dateInfo?.badgeText || '',
                tooltip: badgeTooltip,
                class: dateInfo?.badgeClass || ''
            };
            return badge;
        });

        const hasAnyBadge = weekBadges.some(badge => badge.text);

        // Generate badge row if any day has a badge
        if (hasAnyBadge) {
            html += '<div class="drp-date-picker__badge-row">';
            for (const badge of weekBadges) {
                if (badge.text) {
                    const tooltipAttr = badge.tooltip ? ` data-tooltip="${badge.tooltip.replace(/"/g, '&quot;')}"` : '';
                    const classes = badge.class ? ` ${badge.class}` : '';
                    html += `<div class="drp-date-picker__badge-cell${classes}"${tooltipAttr}>${badge.text}</div>`;
                } else {
                    html += '<div class="drp-date-picker__badge-cell"></div>';
                }
            }
            html += '</div>';
        }

        // Generate date row
        html += '<div class="drp-date-picker__date-row">';
        for (const dayData of week) {
            const classes = ['drp-date-picker__day'];
            if (dayData.isOtherMonth) classes.push('drp-date-picker__day--other-month');

            const weekday = dayData.date.getDay();
            if (weekday === 0 || weekday === 6) classes.push('drp-date-picker__day--weekend');

            // Check for special date info (for styling classes and disabled state)
            const dateInfo = picker.getDateInfoInternal(dayData.date);

            // Check if date is disabled - use dateInfo.isDisabled if available, otherwise standard validation
            const isDisabled = (dateInfo && dateInfo.isDisabled !== undefined)
                ? dateInfo.isDisabled
                : picker.isDateDisabledInternal(dayData.date);

            if (isDisabled) {
                classes.push('drp-date-picker__day--disabled');
            }

            // Apply custom day class if available
            if (dateInfo && dateInfo.dayClass) {
                classes.push(dateInfo.dayClass);
            }

            // Today
            if (picker.isToday(dayData.date)) classes.push('drp-date-picker__day--today');

            // Selected (single mode or multiple mode individual dates)
            let isSelected = false;
            if (picker.options.selectionMode === 'single') {
                isSelected = picker.isSameDay(dayData.date, picker.selectedDate);
            } else if (picker.options.selectionMode === 'multiple') {
                // Check if this date is in selectedDates array
                isSelected = picker.selectedDates.some((d: Date) => picker.isSameDay(dayData.date, d));
            }

            if (isSelected) {
                classes.push('drp-date-picker__day--selected');
            }

            // Range
            let isStartDate = false;
            let isEndDate = false;
            let isInRange = false;

            if (picker.options.selectionMode === 'range') {
                isStartDate = picker.isSameDay(dayData.date, picker.selectedStartDate);
                isEndDate = picker.isSameDay(dayData.date, picker.selectedEndDate);
                isInRange = picker.isInRange(dayData.date);

                if (isStartDate) classes.push('drp-date-picker__day--range-start');
                if (isEndDate) classes.push('drp-date-picker__day--range-end');
                if (isInRange) {
                    // Only highlight if not disabled, or if highlightDisabledInRange is true
                    if (!isDisabled || picker.options.highlightDisabledInRange) {
                        classes.push('drp-date-picker__day--in-range');
                    }
                }

                // Invalid range highlighting (showInvalidRange feature)
                if (picker.invalidRangeStart && picker.invalidRangeEnd) {
                    const isInvalidStart = picker.isSameDay(dayData.date, picker.invalidRangeStart);
                    const isInvalidEnd = picker.isSameDay(dayData.date, picker.invalidRangeEnd);
                    const isInInvalidRange = dayData.date > picker.invalidRangeStart && dayData.date < picker.invalidRangeEnd;

                    if (isInvalidStart) classes.push('drp-date-picker__day--invalid-range-start');
                    if (isInvalidEnd) classes.push('drp-date-picker__day--invalid-range-end');
                    if (isInInvalidRange) classes.push('drp-date-picker__day--invalid-range');
                }
            } else if (picker.options.selectionMode === 'multiple') {
                // Check if this date is in any of the selectedRanges
                for (const range of picker.selectedRanges) {
                    if (picker.isSameDay(dayData.date, range.start)) {
                        isStartDate = true;
                        classes.push('drp-date-picker__day--range-start');
                    }
                    if (picker.isSameDay(dayData.date, range.end)) {
                        isEndDate = true;
                        classes.push('drp-date-picker__day--range-end');
                    }
                    // Check if date is within this range
                    if (dayData.date >= range.start && dayData.date <= range.end) {
                        isInRange = true;
                        if (!isDisabled || picker.options.highlightDisabledInRange) {
                            classes.push('drp-date-picker__day--in-range');
                        }
                    }
                }
            }

            // Format date as YYYY-MM-DD for slot names and data attributes
            const dateStr = `${dayData.year}-${String(dayData.month + 1).padStart(2, '0')}-${String(dayData.day).padStart(2, '0')}`;

            // Get day tooltip - start with dateInfo, then override with callback if provided
            let dayTooltip = dateInfo?.dayTooltip || '';

            // Override with dayTooltipCallback if provided
            if (picker.options.dayTooltipCallback) {
                // Build DayRenderData for callback
                const dayRenderData = {
                    date: dayData.date,
                    dateString: dateStr,
                    dayNumber: dayData.day,
                    isDisabled: isDisabled,
                    isSelected: isSelected,
                    isStartDate: isStartDate,
                    isEndDate: isEndDate,
                    isInRange: isInRange,
                    isToday: picker.isToday(dayData.date),
                    isWeekend: dayData.date.getDay() === 0 || dayData.date.getDay() === 6,
                    monthIndex: monthIndex,
                    element: null as any, // Not available during string rendering
                    picker: picker
                };

                const callbackTooltip = picker.options.dayTooltipCallback(dayRenderData);
                if (callbackTooltip !== null) {
                    dayTooltip = callbackTooltip;
                }
            }

            // Render day cell with slot support
            // Priority: per-day slot > renderDayCallback > renderDayContentCallback > default
            const tooltipAttr = dayTooltip ? ` data-tooltip="${dayTooltip.replace(/"/g, '&quot;')}"` : '';
            html += `<div class="${classes.join(' ')}" data-date="${dateStr}" data-day-number="${dayData.day}" data-weekday="${weekday}"${tooltipAttr}>`;
            html += `<slot name="day-${dateStr}">${dayData.day}</slot>`;
            html += `</div>`;
        }
        html += '</div>';
    }

    if (daysContainer) {
        daysContainer.innerHTML = html;

        // Process render callbacks after DOM is updated
        processRenderCallbacks(picker, monthIndex, daysContainer as HTMLElement);
    }
}

/**
 * Process renderDayCallback and renderDayContentCallback for all day cells
 * Called after HTML is rendered to apply custom rendering
 */
function processRenderCallbacks(picker: any, monthIndex: number, daysContainer: HTMLElement) {
    // Skip if no callbacks are defined
    if (!picker.options.renderDayCallback && !picker.options.renderDayContentCallback) {
        return;
    }

    // Get all day cells (not badge cells)
    const dayCells = daysContainer.querySelectorAll('.drp-date-picker__day');

    dayCells.forEach((dayCell: Element) => {
        const element = dayCell as HTMLElement;
        const dateStr = element.getAttribute('data-date');
        const dayNumber = parseInt(element.getAttribute('data-day-number') || '0', 10);

        if (!dateStr) return;

        // Parse date from data-date attribute (YYYY-MM-DD format)
        const [yearStr, monthStr, dayStr] = dateStr.split('-');
        const date = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr));

        // Check if per-day slot has content (user provided custom HTML)
        const slot = element.querySelector(`slot[name="day-${dateStr}"]`);
        const hasSlotContent = slot && (slot as HTMLSlotElement).assignedNodes().length > 0;

        // If slot has content, skip callback processing (slot takes priority)
        if (hasSlotContent) {
            return;
        }

        // Build DayRenderData object
        const isDisabled = picker.isDateDisabledInternal(date);
        const isToday = picker.isToday(date);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;

        const isSelected = picker.options.selectionMode === 'single' && picker.isSameDay(date, picker.selectedDate);
        const isStartDate = picker.options.selectionMode === 'range' && picker.isSameDay(date, picker.selectedStartDate);
        const isEndDate = picker.options.selectionMode === 'range' && picker.isSameDay(date, picker.selectedEndDate);
        const isInRange = picker.options.selectionMode === 'range' && picker.isInRange(date);

        const renderData = {
            date: date,
            dateString: dateStr,
            dayNumber: dayNumber,
            isDisabled: isDisabled,
            isSelected: isSelected || isStartDate || isEndDate,
            isStartDate: isStartDate,
            isEndDate: isEndDate,
            isInRange: isInRange,
            isToday: isToday,
            isWeekend: isWeekend,
            monthIndex: monthIndex,
            element: element,
            picker: picker
        };

        // Priority: renderDayCallback (full replacement) > renderDayContentCallback (augmentation)
        if (picker.options.renderDayCallback) {
            try {
                const result = picker.options.renderDayCallback(renderData);
                if (result !== null && result !== undefined) {
                    // Replace slot content with callback result
                    if (typeof result === 'string') {
                        if (slot) {
                            slot.innerHTML = result;
                        }
                    } else if (result instanceof HTMLElement) {
                        if (slot) {
                            slot.innerHTML = '';
                            slot.appendChild(result);
                        }
                    }
                }
            } catch (error) {
                console.error('[DatePicker] Error in renderDayCallback:', error);
            }
        } else if (picker.options.renderDayContentCallback) {
            try {
                const result = picker.options.renderDayContentCallback(renderData);
                if (result !== null && result !== undefined) {
                    // Append to default content (augmentation)
                    if (typeof result === 'string') {
                        if (slot) {
                            slot.innerHTML += result;
                        }
                    } else if (result instanceof HTMLElement) {
                        if (slot) {
                            slot.appendChild(result);
                        }
                    }
                }
            } catch (error) {
                console.error('[DatePicker] Error in renderDayContentCallback:', error);
            }
        }
    });
}

/**
 * Build the HTML for one rolling-selector list (years OR months).
 * `valueAttr` is the data-attribute name (`data-year` or `data-month`),
 * `extraAttrs` is the per-context suffix (`data-month-index="X"` or `data-unified="true"`).
 */
function renderRollingItems(opts: {
    items: { value: number; label: string | number; enabled: boolean }[];
    currentValue: number;
    valueAttr: string;
    extraAttrs: string;
}): string {
    let html = '';
    for (const item of opts.items) {
        const selected = item.value === opts.currentValue ? 'drp-date-picker__rolling-item--selected' : '';
        const disabled = !item.enabled ? 'drp-date-picker__rolling-item--disabled' : '';
        html += `<div class="drp-date-picker__rolling-item ${selected} ${disabled}" ${opts.valueAttr}="${item.value}" ${opts.extraAttrs}><span class="drp-date-picker__rolling-item-text">${item.label}</span></div>`;
    }
    return html;
}

function renderRollingLists(picker: any, container: Element | null | undefined, opts: {
    yearRange: { min: number; max: number };
    monthRange: { min: number; max: number };
    currentYear: number;
    currentMonth: number;
    extraAttrs: string;
}) {
    if (!container) return;
    const years = [];
    for (let year = opts.yearRange.min; year <= opts.yearRange.max; year++) {
        years.push({ value: year, label: year, enabled: hasEnabledDaysInYear(picker, year) });
    }
    const months = [];
    for (let m = opts.monthRange.min - 1; m <= opts.monthRange.max - 1; m++) {
        months.push({ value: m, label: picker.monthNames[m], enabled: hasEnabledDaysInMonth(picker, opts.currentYear, m) });
    }

    const yearsContainer = container.querySelector('[data-list="years"]');
    if (yearsContainer) {
        yearsContainer.innerHTML = renderRollingItems({
            items: years, currentValue: opts.currentYear, valueAttr: 'data-year', extraAttrs: opts.extraAttrs
        });
    }
    const monthsContainer = container.querySelector('[data-list="months"]');
    if (monthsContainer) {
        monthsContainer.innerHTML = renderRollingItems({
            items: months, currentValue: opts.currentMonth, valueAttr: 'data-month', extraAttrs: opts.extraAttrs
        });
    }
}

export function renderRollingSelector(picker: any, monthIndex: number) {
    const monthContainer = picker.calendar.querySelector(`.drp-date-picker__month[data-month-index="${monthIndex}"]`);
    if (!monthContainer) return;

    const selector = monthContainer.querySelector('.drp-date-picker__rolling-selector');
    selector?.classList.add('drp-date-picker__rolling-selector--visible');

    const date = picker.monthDates[monthIndex];
    renderRollingLists(picker, selector, {
        yearRange: parseYearRange(picker.options.rollingYearRange, date.getFullYear(), picker),
        monthRange: parseMonthRange(picker.options.rollingMonthRange),
        currentYear: date.getFullYear(),
        currentMonth: date.getMonth(),
        extraAttrs: `data-month-index="${monthIndex}"`,
    });
}

export function renderUnifiedRollingSelector(picker: any) {
    if (!picker.options.unifiedNavigation || !picker.unifiedRollingSelector) return;

    picker.unifiedRollingSelector.classList.add('drp-date-picker__unified-rolling-selector--visible');

    const anchorIndex = picker.options.unifiedNavigationAnchorIndex ?? 0;
    const date = picker.monthDates[anchorIndex];
    renderRollingLists(picker, picker.unifiedRollingSelector, {
        yearRange: picker.getEffectiveYearRange(),
        monthRange: picker.getEffectiveMonthRange(),
        currentYear: date.getFullYear(),
        currentMonth: date.getMonth(),
        extraAttrs: 'data-unified="true"',
    });
}

export function updateSummary(picker: any) {
    if (picker.options.selectionMode !== 'range') return;

    const summary = picker.calendar.querySelector('.drp-date-picker__summary');
    if (!summary) return;

    if (picker.selectedStartDate && picker.selectedEndDate) {
        // Calculate days and nights
        let days: number;
        let enabledDates: Date[] | undefined;
        let disabledDates: Date[] | undefined;
        let dates: Date[] | undefined;
        let dateRanges: any[] | undefined;

        // For individual and split modes, count only enabled dates
        if (picker.options.disabledDatesHandling === 'individual' ||
            picker.options.disabledDatesHandling === 'split') {
            enabledDates = picker.getEnabledDatesInRange(
                picker.selectedStartDate,
                picker.selectedEndDate
            );
            days = enabledDates.length;
            dates = enabledDates;

            // For split mode, also get the date ranges
            if (picker.options.disabledDatesHandling === 'split') {
                dateRanges = picker.splitRangeByDisabled(
                    picker.selectedStartDate,
                    picker.selectedEndDate
                );
            }
        } else if (picker.options.disabledDatesHandling === 'allow') {
            // For allow mode, get both enabled and disabled dates
            enabledDates = picker.getEnabledDatesInRange(
                picker.selectedStartDate,
                picker.selectedEndDate
            );
            disabledDates = picker.getDisabledDatesInRange(
                picker.selectedStartDate,
                picker.selectedEndDate
            );
            // Count total days for allow mode
            const msPerDay = 1000 * 60 * 60 * 24;
            const timeDiff = picker.selectedEndDate.getTime() - picker.selectedStartDate.getTime();
            days = Math.floor(timeDiff / msPerDay) + 1;
        } else {
            // For block mode, count total days
            const msPerDay = 1000 * 60 * 60 * 24;
            const timeDiff = picker.selectedEndDate.getTime() - picker.selectedStartDate.getTime();
            days = Math.floor(timeDiff / msPerDay) + 1; // +1 to include both start and end days
        }

        const nights = days > 0 ? days - 1 : 0; // Nights = days - 1

        summary.className = 'drp-date-picker__summary drp-date-picker__summary--visible';

        // Check if custom formatter exists
        if (picker.options.formatSummaryCallback) {
            const callbackData: any = {
                days,
                nights,
                startDate: picker.selectedStartDate,
                endDate: picker.selectedEndDate,
                selectionMode: picker.options.selectionMode,
                disabledDatesHandling: picker.options.disabledDatesHandling,
                localeStrings: picker.localeStrings,
                isPreview: false
            };

            // Add mode-specific data
            if (enabledDates) callbackData.enabledDates = enabledDates;
            if (disabledDates) callbackData.disabledDates = disabledDates;
            if (dates) callbackData.dates = dates;
            if (dateRanges) callbackData.dateRanges = dateRanges;

            summary.innerHTML = picker.options.formatSummaryCallback(callbackData);
        } else {
            // Default format
            summary.innerHTML = `
                <span class="drp-date-picker__summary-count">${days} ${days === 1 ? picker.localeStrings.day : picker.localeStrings.days}</span>
                <span>, </span>
                <span class="drp-date-picker__summary-count">${nights} ${nights === 1 ? picker.localeStrings.night : picker.localeStrings.nights}</span>
            `;
        }
    } else {
        summary.className = 'drp-date-picker__summary drp-date-picker__summary--hidden';
        summary.innerHTML = '';
    }
}

export function updateSummaryWithPreview(picker: any) {
    if (picker.options.selectionMode !== 'range') return;

    const summary = picker.calendar.querySelector('.drp-date-picker__summary');
    if (!summary) return;

    if (picker.dragPreviewStart && picker.dragPreviewEnd) {
        let days: number;
        let enabledDates: Date[] | undefined;
        let disabledDates: Date[] | undefined;
        let dates: Date[] | undefined;
        let dateRanges: any[] | undefined;

        // For individual and split modes, count only enabled dates
        if (picker.options.disabledDatesHandling === 'individual' ||
            picker.options.disabledDatesHandling === 'split') {
            enabledDates = picker.getEnabledDatesInRange(
                picker.dragPreviewStart,
                picker.dragPreviewEnd
            );
            days = enabledDates.length;
            dates = enabledDates;

            // For split mode, also get the date ranges
            if (picker.options.disabledDatesHandling === 'split') {
                dateRanges = picker.splitRangeByDisabled(
                    picker.dragPreviewStart,
                    picker.dragPreviewEnd
                );
            }
        } else if (picker.options.disabledDatesHandling === 'allow') {
            // For allow mode, get both enabled and disabled dates
            enabledDates = picker.getEnabledDatesInRange(
                picker.dragPreviewStart,
                picker.dragPreviewEnd
            );
            disabledDates = picker.getDisabledDatesInRange(
                picker.dragPreviewStart,
                picker.dragPreviewEnd
            );
            // Count total days for allow mode
            const msPerDay = 1000 * 60 * 60 * 24;
            const timeDiff = picker.dragPreviewEnd.getTime() - picker.dragPreviewStart.getTime();
            days = Math.floor(timeDiff / msPerDay) + 1;
        } else {
            // For block mode, count total days
            const msPerDay = 1000 * 60 * 60 * 24;
            const timeDiff = picker.dragPreviewEnd.getTime() - picker.dragPreviewStart.getTime();
            days = Math.floor(timeDiff / msPerDay) + 1;
        }

        const nights = days > 0 ? days - 1 : 0;

        summary.className = 'drp-date-picker__summary drp-date-picker__summary--visible';

        // Check if custom formatter exists
        if (picker.options.formatSummaryCallback) {
            const callbackData: any = {
                days,
                nights,
                startDate: picker.dragPreviewStart,
                endDate: picker.dragPreviewEnd,
                selectionMode: picker.options.selectionMode,
                disabledDatesHandling: picker.options.disabledDatesHandling,
                localeStrings: picker.localeStrings,
                isPreview: true
            };

            // Add mode-specific data
            if (enabledDates) callbackData.enabledDates = enabledDates;
            if (disabledDates) callbackData.disabledDates = disabledDates;
            if (dates) callbackData.dates = dates;
            if (dateRanges) callbackData.dateRanges = dateRanges;

            summary.innerHTML = picker.options.formatSummaryCallback(callbackData);
        } else {
            // Default format with preview label
            summary.innerHTML = `
                <span style="opacity: 0.7;">${picker.localeStrings.preview}: </span>
                <span class="drp-date-picker__summary-count">${days} ${days === 1 ? picker.localeStrings.day : picker.localeStrings.days}</span>
                <span>, </span>
                <span class="drp-date-picker__summary-count">${nights} ${nights === 1 ? picker.localeStrings.night : picker.localeStrings.nights}</span>
            `;
        }
    }
}

/**
 * Paint the would-be range while the user is in the half-selected state
 * (start clicked, end pending). Mode-aware per the disabled-handling semantics
 * — see FINDINGS.md #6 for the design rationale.
 *
 *   allow       full range → '--hover-preview' on every cell (disabled overlay wins)
 *   prevent     range crosses disabled → '--hover-preview-invalid'; else '--hover-preview'
 *   block       end snaps to last-enabled-before-gap; paint up to snap only
 *   split       paint enabled days only; disabled days remain bare → visual gaps
 *   individual  same as 'allow' (no way to express "discrete dates" in a grid view)
 */
export function updateHoverPreview(picker: any) {
    picker.calendar.querySelectorAll(
        '.drp-date-picker__day--hover-preview, .drp-date-picker__day--hover-preview-invalid'
    ).forEach((day: Element) => {
        day.classList.remove(
            'drp-date-picker__day--hover-preview',
            'drp-date-picker__day--hover-preview-invalid'
        );
    });

    if (!picker.selectedStartDate || picker.selectedEndDate || !picker.hoverPreviewEnd) return;
    if (picker.isDragging) return;

    let start: Date = picker.selectedStartDate;
    let end: Date = picker.hoverPreviewEnd;
    if (end < start) [start, end] = [end, start];

    const mode = picker.options.disabledDatesHandling;
    let cls = 'drp-date-picker__day--hover-preview';
    let skipDisabled = false;

    if (mode === 'prevent' && picker.hasDisabledDatesInRange(start, end)) {
        cls = 'drp-date-picker__day--hover-preview-invalid';
    } else if (mode === 'block' && picker.hasDisabledDatesInRange(start, end)) {
        end = picker.findLastEnabledBeforeGap(start, end);
        if (end < start) return; // snap landed before start — nothing to paint
    } else if (mode === 'split') {
        skipDisabled = true;
    }

    // The committed start day always carries --range-start (solid accent bg
    // + on-accent text). Painting --hover-preview on top would override the
    // solid background with a translucent one and leave the on-accent text
    // visually mismatched (white-on-pale). Skip it.
    const committedStartTime = picker.selectedStartDate.getTime();

    const allDays = picker.calendar.querySelectorAll('.drp-date-picker__day');
    allDays.forEach((day: Element) => {
        const dateAttr = (day as HTMLElement).dataset.date;
        if (!dateAttr) return;

        const [year, month, dayNum] = dateAttr.split('-').map(Number);
        const date = new Date(year, month - 1, dayNum);

        if (date >= start && date <= end) {
            if (date.getTime() === committedStartTime) return;
            if (skipDisabled && day.classList.contains('drp-date-picker__day--disabled')) return;
            day.classList.add(cls);
        }
    });
}

export function updateDragPreview(picker: any) {
    // Remove existing preview classes
    picker.calendar.querySelectorAll('.drp-date-picker__day--drag-preview, .drp-date-picker__day--drag-invalid').forEach((day: Element) => {
        day.classList.remove('drp-date-picker__day--drag-preview', 'drp-date-picker__day--drag-invalid');
    });

    if (!picker.dragPreviewStart || !picker.dragPreviewEnd) return;

    // Check if picker is an invalid range in 'block' mode
    const isBlockMode = picker.options.disabledDatesHandling === 'block';
    const hasDisabledInRange = isBlockMode && picker.hasDisabledDatesInRange(picker.dragPreviewStart, picker.dragPreviewEnd);

    // Add preview classes to days in the preview range (including other-month days)
    const allDays = picker.calendar.querySelectorAll('.drp-date-picker__day');
    allDays.forEach((day: Element) => {
        const dateAttr = (day as HTMLElement).dataset.date;
        if (!dateAttr) return;

        const [year, month, dayNum] = dateAttr.split('-').map(Number);
        const date = new Date(year, month - 1, dayNum); // month is 1-based in data-date, but Date constructor expects 0-based

        if (date >= picker.dragPreviewStart! && date <= picker.dragPreviewEnd!) {
            day.classList.add('drp-date-picker__day--drag-preview');
            if (hasDisabledInRange) {
                day.classList.add('drp-date-picker__day--drag-invalid');
            }
        }
    });

    // Update summary with preview counts
    updateSummaryWithPreview(picker);
}
