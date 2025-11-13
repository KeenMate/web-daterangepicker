/**
 * Date Picker Rendering Methods
 *
 * Pure functions that handle calendar rendering.
 * Each function accepts the picker instance as the first parameter.
 */

import { hasEnabledDaysInMonth } from './date-picker-navigation';
import { hasEnabledDaysInYear } from './date-picker-validation';
import { renderingLogger } from './logger';

/**
 * Parse year range string to min/max values
 * @param range - Examples: "2024" (single year), "2022-2026" (range)
 * @param currentYear - Current year for default range
 * @param picker - Picker instance to check for minDate/maxDate constraints
 * @returns { min: number, max: number }
 */
function parseYearRange(range: string | undefined, currentYear: number, picker?: any): { min: number, max: number } {
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
function parseMonthRange(range: string | undefined): { min: number, max: number } {
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

    // Render each month
    for (let i = 0; i < picker.options.visibleMonthsCount; i++) {
        if (picker.showingRollingSelector[i]) {
            renderRollingSelector(picker, i);
        } else {
            renderNormalView(picker, i);
        }
    }

    // Set rolling selector height and width to match calendar content
    // This prevents layout jumps when toggling between views
    requestAnimationFrame(() => {
        // Capture calendar content dimensions on first render (when rolling selector is NOT showing)
        if (!picker.calendarContentHeight && !picker.showingRollingSelector[0]) {
            const monthContainer = picker.calendar.querySelector('.drp-date-picker__month[data-month-index="0"]');
            if (monthContainer) {
                const weekdays = monthContainer.querySelector('.drp-date-picker__weekdays');
                const days = monthContainer.querySelector('.drp-date-picker__days');
                if (weekdays && days) {
                    const weekdaysHeight = (weekdays as HTMLElement).offsetHeight;
                    const daysHeight = (days as HTMLElement).offsetHeight;
                    const daysWidth = (days as HTMLElement).offsetWidth;
                    // Get the margin-bottom of weekdays to account for spacing
                    const weekdaysStyle = getComputedStyle(weekdays);
                    const weekdaysMargin = parseInt(weekdaysStyle.marginBottom) || 0;

                    picker.calendarContentHeight = weekdaysHeight + weekdaysMargin + daysHeight;
                    picker.calendarContentWidth = Math.ceil(daysWidth); // Round up for consistency
                    renderingLogger.debug('[DatePicker] Captured calendar content dimensions:', {
                        weekdaysHeight: weekdaysHeight,
                        weekdaysMargin: weekdaysMargin,
                        daysHeight: daysHeight,
                        daysWidth: daysWidth,
                        totalHeight: picker.calendarContentHeight,
                        totalWidth: picker.calendarContentWidth
                    });
                }
            }
        }

        // Apply stored dimensions to all rolling selectors
        if (picker.calendarContentHeight) {
            for (let i = 0; i < picker.options.visibleMonthsCount; i++) {
                const monthContainer = picker.calendar.querySelector(`.drp-date-picker__month[data-month-index="${i}"]`);
                if (!monthContainer) continue;

                const rollingSelector = monthContainer.querySelector('.drp-date-picker__rolling-selector');
                if (rollingSelector) {
                    const isVisible = rollingSelector.classList.contains('drp-date-picker__rolling-selector--visible');
                    (rollingSelector as HTMLElement).style.height = `${picker.calendarContentHeight}px`;
                    if (picker.calendarContentWidth) {
                        (rollingSelector as HTMLElement).style.width = `${picker.calendarContentWidth}px`;
                    }

                    // Log when applying to visible rolling selector
                    if (isVisible) {
                        const actualHeight = (rollingSelector as HTMLElement).offsetHeight;
                        const actualWidth = (rollingSelector as HTMLElement).offsetWidth;
                        renderingLogger.debug(`[DatePicker] Applied dimensions to rolling selector ${i}:`, {
                            targetHeight: picker.calendarContentHeight,
                            actualHeight: actualHeight,
                            heightDifference: actualHeight - picker.calendarContentHeight,
                            targetWidth: picker.calendarContentWidth,
                            actualWidth: actualWidth,
                            widthDifference: actualWidth - (picker.calendarContentWidth || 0)
                        });
                    }
                }
            }
        }
    });

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

    // Update month/year display
    const monthYear = monthContainer.querySelector('.drp-date-picker__month-year');
    if (monthYear) {
        monthYear.textContent = `${picker.monthNames[date.getMonth()]} ${date.getFullYear()}`;
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

    // Next month days
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
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
            return {
                label: dateInfo?.label || '',
                tooltip: dateInfo?.tooltip || '',
                class: dateInfo?.class || ''
            };
        });

        const hasAnyBadge = weekBadges.some(badge => badge.label);

        // Generate badge row if any day has a badge
        if (hasAnyBadge) {
            html += '<div class="drp-date-picker__badge-row">';
            for (const badge of weekBadges) {
                if (badge.label) {
                    const tooltipAttr = badge.tooltip ? ` data-tooltip="${badge.tooltip.replace(/"/g, '&quot;')}"` : '';
                    const classes = badge.class ? ` ${badge.class}` : '';
                    html += `<div class="drp-date-picker__badge-cell${classes}"${tooltipAttr}>${badge.label}</div>`;
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

            // Check if date is disabled
            const isDisabled = picker.isDateDisabledInternal(dayData.date);
            if (isDisabled) {
                classes.push('drp-date-picker__day--disabled');
            }

            // Check for special date info (for styling classes only, not badges)
            const dateInfo = picker.getDateInfoInternal(dayData.date);
            if (dateInfo && dateInfo.class) {
                classes.push(dateInfo.class);
            }

            // Today
            if (picker.isToday(dayData.date)) classes.push('drp-date-picker__day--today');

            // Selected
            if (picker.options.selectionMode === 'single' && picker.isSameDay(dayData.date, picker.selectedDate)) {
                classes.push('drp-date-picker__day--selected');
            }

            // Range
            if (picker.options.selectionMode === 'range') {
                if (picker.isSameDay(dayData.date, picker.selectedStartDate)) classes.push('drp-date-picker__day--range-start');
                if (picker.isSameDay(dayData.date, picker.selectedEndDate)) classes.push('drp-date-picker__day--range-end');
                if (picker.isInRange(dayData.date)) {
                    // Only highlight if not disabled, or if highlightDisabledInRange is true
                    if (!isDisabled || picker.options.highlightDisabledInRange) {
                        classes.push('drp-date-picker__day--in-range');
                    }
                }
            }

            html += `<div class="${classes.join(' ')}" data-date="${dayData.year}-${dayData.month}-${dayData.day}">${dayData.day}</div>`;
        }
        html += '</div>';
    }

    if (daysContainer) {
        daysContainer.innerHTML = html;
    }
}

export function renderRollingSelector(picker: any, monthIndex: number) {
    const monthContainer = picker.calendar.querySelector(`.drp-date-picker__month[data-month-index="${monthIndex}"]`);
    if (!monthContainer) return;

    const selector = monthContainer.querySelector('.drp-date-picker__rolling-selector');
    selector?.classList.add('drp-date-picker__rolling-selector--visible');

    // Get picker month's date
    const date = picker.monthDates[monthIndex];
    const currentYear = date.getFullYear();
    const currentMonth = date.getMonth();

    // Parse configuration ranges
    const yearRange = parseYearRange(picker.options.rollingYearRange, currentYear, picker);
    const monthRange = parseMonthRange(picker.options.rollingMonthRange);

    // Render years
    const yearsContainer = selector?.querySelector('[data-list="years"]');
    let yearsHtml = '';
    for (let year = yearRange.min; year <= yearRange.max; year++) {
        const selected = year === currentYear ? 'drp-date-picker__rolling-item--selected' : '';

        // Check if year has any enabled days and mark as disabled if not
        const hasEnabledDays = hasEnabledDaysInYear(picker, year);
        const disabled = !hasEnabledDays ? 'drp-date-picker__rolling-item--disabled' : '';

        yearsHtml += `<div class="drp-date-picker__rolling-item ${selected} ${disabled}" data-year="${year}" data-month-index="${monthIndex}">${year}</div>`;
    }
    if (yearsContainer) {
        yearsContainer.innerHTML = yearsHtml;
    }

    // Render months
    const monthsContainer = selector?.querySelector('[data-list="months"]');
    if (monthsContainer) {
        let monthsHtml = '';
        // Only render months within the configured range
        for (let monthIndex0Based = monthRange.min - 1; monthIndex0Based <= monthRange.max - 1; monthIndex0Based++) {
            const name = picker.monthNames[monthIndex0Based];
            const selected = monthIndex0Based === currentMonth ? 'drp-date-picker__rolling-item--selected' : '';

            // Check if month has any enabled days and mark as disabled if not
            const hasEnabledDays = hasEnabledDaysInMonth(picker, currentYear, monthIndex0Based);
            const disabled = !hasEnabledDays ? 'drp-date-picker__rolling-item--disabled' : '';

            monthsHtml += `<div class="drp-date-picker__rolling-item ${selected} ${disabled}" data-month="${monthIndex0Based}" data-month-index="${monthIndex}">${name}</div>`;
        }
        monthsContainer.innerHTML = monthsHtml;
    }
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
        const date = new Date(year, month, dayNum);

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
