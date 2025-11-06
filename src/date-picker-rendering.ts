/**
 * Date Picker Rendering Methods
 *
 * Pure functions that handle calendar rendering.
 * Each function accepts the picker instance as the first parameter.
 */

import { hasEnabledDaysInMonth } from './date-picker-navigation';

export function renderCalendar(picker: any) {
    console.log(`[DatePicker 18] renderCalendar called, showingRollingSelector:`, picker.showingRollingSelector, `activeCol: ${picker.activeMonthIndex}`);
    console.log('[DatePicker 18] monthDates array:', picker.monthDates.map((d: Date, i: number) => `Col${i}: ${d.getFullYear()}-${d.getMonth()+1}`).join(', '));

    // Render each month
    for (let i = 0; i < picker.options.monthsToShow; i++) {
        if (picker.showingRollingSelector[i]) {
            renderRollingSelector(picker, i);
        } else {
            renderNormalView(picker, i);
        }
    }

    // Set rolling selector height to match calendar content height
    // This prevents layout jumps when toggling between views
    requestAnimationFrame(() => {
        // Capture calendar content height on first render (when rolling selector is NOT showing)
        if (!picker.calendarContentHeight && !picker.showingRollingSelector[0]) {
            const monthContainer = picker.calendar.querySelector('.pa-date-picker__month[data-month-index="0"]');
            if (monthContainer) {
                const weekdays = monthContainer.querySelector('.pa-date-picker__weekdays');
                const days = monthContainer.querySelector('.pa-date-picker__days');
                if (weekdays && days) {
                    const weekdaysHeight = (weekdays as HTMLElement).offsetHeight;
                    const daysHeight = (days as HTMLElement).offsetHeight;
                    // Get the margin-bottom of weekdays to account for spacing
                    const weekdaysStyle = getComputedStyle(weekdays);
                    const weekdaysMargin = parseInt(weekdaysStyle.marginBottom) || 0;

                    picker.calendarContentHeight = weekdaysHeight + weekdaysMargin + daysHeight;
                    console.log('[DatePicker] Captured calendar content height:', {
                        weekdaysHeight: weekdaysHeight,
                        weekdaysMargin: weekdaysMargin,
                        daysHeight: daysHeight,
                        totalHeight: picker.calendarContentHeight
                    });
                }
            }
        }

        // Apply stored height to all rolling selectors
        if (picker.calendarContentHeight) {
            for (let i = 0; i < picker.options.monthsToShow; i++) {
                const monthContainer = picker.calendar.querySelector(`.pa-date-picker__month[data-month-index="${i}"]`);
                if (!monthContainer) continue;

                const rollingSelector = monthContainer.querySelector('.pa-date-picker__rolling-selector');
                if (rollingSelector) {
                    const isVisible = rollingSelector.classList.contains('pa-date-picker__rolling-selector--visible');
                    (rollingSelector as HTMLElement).style.height = `${picker.calendarContentHeight}px`;

                    // Log when applying to visible rolling selector
                    if (isVisible) {
                        const actualHeight = (rollingSelector as HTMLElement).offsetHeight;
                        console.log(`[DatePicker] Applied height to rolling selector ${i}:`, {
                            targetHeight: picker.calendarContentHeight,
                            actualHeight: actualHeight,
                            difference: actualHeight - picker.calendarContentHeight
                        });
                    }
                }
            }
        }
    });

    // Re-apply focused day class after rendering (keyboard navigation state)
    // This is necessary because renderDays() rebuilds the DOM with innerHTML
    if (picker.focusedDayIndex !== null) {
        const daysContainer = picker.calendar.querySelector(`.pa-date-picker__days[data-month-index="${picker.activeMonthIndex}"]`);
        if (daysContainer) {
            const days = daysContainer.querySelectorAll('.pa-date-picker__day:not(.pa-date-picker__day--other-month)');
            if (days[picker.focusedDayIndex]) {
                days[picker.focusedDayIndex].classList.add('pa-date-picker__day--focused');
            }
        }
    }

    // Initialize drag listeners for range mode
    if (picker.options.mode === 'range' && !picker.isDragging) {
        picker.initDragListeners();
    }
}

export function renderNormalView(picker: any, monthIndex: number) {
    console.log(`[DatePicker Col${monthIndex} 19] renderNormalView called for month`, monthIndex);
    const monthContainer = picker.calendar.querySelector(`.pa-date-picker__month[data-month-index="${monthIndex}"]`);
    if (!monthContainer) return;

    // Hide rolling selector for picker month
    const rollingSelector = monthContainer.querySelector('.pa-date-picker__rolling-selector');
    rollingSelector?.classList.remove('pa-date-picker__rolling-selector--visible');

    // Get picker month's date
    const date = picker.monthDates[monthIndex];

    // Update month/year display
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const monthYear = monthContainer.querySelector('.pa-date-picker__month-year');
    if (monthYear) {
        monthYear.textContent = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    }

    // Update navigation buttons disabled state based on enabled days
    const currentYear = date.getFullYear();
    const currentMonth = date.getMonth();

    // Check previous month
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const prevButton = monthContainer.querySelector('.pa-date-picker__nav--prev');
    if (prevButton) {
        const hasPrevEnabled = hasEnabledDaysInMonth(picker, prevYear, prevMonth);
        if (hasPrevEnabled) {
            prevButton.removeAttribute('disabled');
            prevButton.classList.remove('pa-date-picker__nav--disabled');
        } else {
            prevButton.setAttribute('disabled', 'true');
            prevButton.classList.add('pa-date-picker__nav--disabled');
        }
    }

    // Check next month
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const nextButton = monthContainer.querySelector('.pa-date-picker__nav--next');
    if (nextButton) {
        const hasNextEnabled = hasEnabledDaysInMonth(picker, nextYear, nextMonth);
        if (hasNextEnabled) {
            nextButton.removeAttribute('disabled');
            nextButton.classList.remove('pa-date-picker__nav--disabled');
        } else {
            nextButton.setAttribute('disabled', 'true');
            nextButton.classList.add('pa-date-picker__nav--disabled');
        }
    }

    // Render weekdays (respecting week start day)
    const weekdays = monthContainer.querySelector('.pa-date-picker__weekdays');
    const weekdayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const reorderedWeekdays = [
        ...weekdayLabels.slice(picker.weekStartDay),
        ...weekdayLabels.slice(0, picker.weekStartDay)
    ];
    if (weekdays) {
        weekdays.innerHTML = reorderedWeekdays
            .map(day => `<div class="pa-date-picker__weekday">${day}</div>`).join('');
    }

    // Render days
    renderDays(picker, monthIndex, date);
}

export function renderDays(picker: any, monthIndex: number, date: Date) {
    console.log(`[DatePicker Col${monthIndex} 20] renderDays called for month`, monthIndex);
    const monthContainer = picker.calendar.querySelector(`.pa-date-picker__month[data-month-index="${monthIndex}"]`);
    if (!monthContainer) return;

    const daysContainer = monthContainer.querySelector('.pa-date-picker__days');
    const year = date.getFullYear();
    const month = date.getMonth();
    console.log(`[DatePicker Col${monthIndex} 21] Rendering days for:`, year, month + 1);

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
            html += '<div class="pa-date-picker__badge-row">';
            for (const badge of weekBadges) {
                if (badge.label) {
                    const tooltipAttr = badge.tooltip ? ` data-tooltip="${badge.tooltip.replace(/"/g, '&quot;')}"` : '';
                    const classes = badge.class ? ` ${badge.class}` : '';
                    html += `<div class="pa-date-picker__badge-cell${classes}"${tooltipAttr}>${badge.label}</div>`;
                } else {
                    html += '<div class="pa-date-picker__badge-cell"></div>';
                }
            }
            html += '</div>';
        }

        // Generate date row
        html += '<div class="pa-date-picker__date-row">';
        for (const dayData of week) {
            const classes = ['pa-date-picker__day'];
            if (dayData.isOtherMonth) classes.push('pa-date-picker__day--other-month');

            // Check if date is disabled
            const isDisabled = picker.isDateDisabledInternal(dayData.date);
            if (isDisabled) {
                classes.push('pa-date-picker__day--disabled');
            }

            // Check for special date info (for styling classes only, not badges)
            const dateInfo = picker.getDateInfoInternal(dayData.date);
            if (dateInfo && dateInfo.class) {
                classes.push(dateInfo.class);
            }

            // Today
            if (picker.isToday(dayData.date)) classes.push('pa-date-picker__day--today');

            // Selected
            if (picker.options.mode === 'single' && picker.isSameDay(dayData.date, picker.selectedDate)) {
                classes.push('pa-date-picker__day--selected');
            }

            // Range
            if (picker.options.mode === 'range') {
                if (picker.isSameDay(dayData.date, picker.selectedStartDate)) classes.push('pa-date-picker__day--range-start');
                if (picker.isSameDay(dayData.date, picker.selectedEndDate)) classes.push('pa-date-picker__day--range-end');
                if (picker.isInRange(dayData.date)) {
                    // Only highlight if not disabled, or if highlightDisabledInRange is true
                    if (!isDisabled || picker.options.highlightDisabledInRange) {
                        classes.push('pa-date-picker__day--in-range');
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
    const monthContainer = picker.calendar.querySelector(`.pa-date-picker__month[data-month-index="${monthIndex}"]`);
    if (!monthContainer) return;

    const selector = monthContainer.querySelector('.pa-date-picker__rolling-selector');
    selector?.classList.add('pa-date-picker__rolling-selector--visible');

    // Get picker month's date
    const date = picker.monthDates[monthIndex];

    // Render years
    const yearsContainer = selector?.querySelector('[data-list="years"]');
    const currentYear = date.getFullYear();
    let yearsHtml = '';
    for (let year = currentYear - 50; year <= currentYear + 50; year++) {
        const selected = year === currentYear ? 'pa-date-picker__rolling-item--selected' : '';
        yearsHtml += `<div class="pa-date-picker__rolling-item ${selected}" data-year="${year}" data-month-index="${monthIndex}">${year}</div>`;
    }
    if (yearsContainer) {
        yearsContainer.innerHTML = yearsHtml;
        yearsContainer.querySelector('.pa-date-picker__rolling-item--selected')?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
    }

    // Render months
    const monthsContainer = selector?.querySelector('[data-list="months"]');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const currentMonth = date.getMonth();
    if (monthsContainer) {
        monthsContainer.innerHTML = monthNames.map((name, index) => {
            const selected = index === currentMonth ? 'pa-date-picker__rolling-item--selected' : '';
            return `<div class="pa-date-picker__rolling-item ${selected}" data-month="${index}" data-month-index="${monthIndex}">${name}</div>`;
        }).join('');
        monthsContainer.querySelector('.pa-date-picker__rolling-item--selected')?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
    }
}

export function updateSummary(picker: any) {
    if (picker.options.mode !== 'range') return;

    const summary = picker.calendar.querySelector('.pa-date-picker__summary');
    if (!summary) return;

    if (picker.selectedStartDate && picker.selectedEndDate) {
        // Calculate days and nights
        let days: number;

        // For individual and split modes, count only enabled dates
        if (picker.options.rangeDisabledMode === 'individual' ||
            picker.options.rangeDisabledMode === 'split') {
            const enabledDates = picker.getEnabledDatesInRange(
                picker.selectedStartDate,
                picker.selectedEndDate
            );
            days = enabledDates.length;
        } else {
            // For allow and block modes, count total days
            const msPerDay = 1000 * 60 * 60 * 24;
            const timeDiff = picker.selectedEndDate.getTime() - picker.selectedStartDate.getTime();
            days = Math.floor(timeDiff / msPerDay) + 1; // +1 to include both start and end days
        }

        const nights = days > 0 ? days - 1 : 0; // Nights = days - 1

        summary.className = 'pa-date-picker__summary pa-date-picker__summary--visible';
        summary.innerHTML = `
            <span class="pa-date-picker__summary-count">${days} ${days === 1 ? 'day' : 'days'}</span>
            <span>, </span>
            <span class="pa-date-picker__summary-count">${nights} ${nights === 1 ? 'night' : 'nights'}</span>
        `;
    } else {
        summary.className = 'pa-date-picker__summary pa-date-picker__summary--hidden';
        summary.innerHTML = '';
    }
}

export function updateSummaryWithPreview(picker: any) {
    if (picker.options.mode !== 'range') return;

    const summary = picker.calendar.querySelector('.pa-date-picker__summary');
    if (!summary) return;

    if (picker.dragPreviewStart && picker.dragPreviewEnd) {
        let days: number;

        // For individual and split modes, count only enabled dates
        if (picker.options.rangeDisabledMode === 'individual' ||
            picker.options.rangeDisabledMode === 'split') {
            const enabledDates = picker.getEnabledDatesInRange(
                picker.dragPreviewStart,
                picker.dragPreviewEnd
            );
            days = enabledDates.length;
        } else {
            // For allow and block modes, count total days
            const msPerDay = 1000 * 60 * 60 * 24;
            const timeDiff = picker.dragPreviewEnd.getTime() - picker.dragPreviewStart.getTime();
            days = Math.floor(timeDiff / msPerDay) + 1;
        }

        const nights = days > 0 ? days - 1 : 0;

        summary.className = 'pa-date-picker__summary pa-date-picker__summary--visible';
        summary.innerHTML = `
            <span style="opacity: 0.7;">Preview: </span>
            <span class="pa-date-picker__summary-count">${days} ${days === 1 ? 'day' : 'days'}</span>
            <span>, </span>
            <span class="pa-date-picker__summary-count">${nights} ${nights === 1 ? 'night' : 'nights'}</span>
        `;
    }
}

export function updateDragPreview(picker: any) {
    // Remove existing preview classes
    picker.calendar.querySelectorAll('.pa-date-picker__day--drag-preview, .pa-date-picker__day--drag-invalid').forEach((day: Element) => {
        day.classList.remove('pa-date-picker__day--drag-preview', 'pa-date-picker__day--drag-invalid');
    });

    if (!picker.dragPreviewStart || !picker.dragPreviewEnd) return;

    // Check if picker is an invalid range in 'block' mode
    const isBlockMode = picker.options.rangeDisabledMode === 'block';
    const hasDisabledInRange = isBlockMode && picker.hasDisabledDatesInRange(picker.dragPreviewStart, picker.dragPreviewEnd);

    // Add preview classes to days in the preview range (including other-month days)
    const allDays = picker.calendar.querySelectorAll('.pa-date-picker__day');
    allDays.forEach((day: Element) => {
        const dateAttr = (day as HTMLElement).dataset.date;
        if (!dateAttr) return;

        const [year, month, dayNum] = dateAttr.split('-').map(Number);
        const date = new Date(year, month, dayNum);

        if (date >= picker.dragPreviewStart! && date <= picker.dragPreviewEnd!) {
            day.classList.add('pa-date-picker__day--drag-preview');
            if (hasDisabledInRange) {
                day.classList.add('pa-date-picker__day--drag-invalid');
            }
        }
    });

    // Update summary with preview counts
    updateSummaryWithPreview(picker);
}
