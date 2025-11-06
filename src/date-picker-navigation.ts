/**
 * Date Picker Navigation Methods
 *
 * Pure functions for navigation logic including month/year navigation,
 * rolling selector, and keyboard focus movement.
 */

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

export function toggleRollingSelector(picker: any, monthIndex: number) {
    picker.showingRollingSelector[monthIndex] = !picker.showingRollingSelector[monthIndex];
    picker.renderCalendar();
}

export function selectYear(picker: any, year: number, monthIndex: number) {
    // Update only this specific month's year
    const oldYear = picker.monthDates[monthIndex].getFullYear();
    picker.monthDates[monthIndex].setFullYear(year);
    console.log(`[DatePicker Col${monthIndex}] selectYear - changed from ${oldYear} to ${year}`);

    // Check for collisions with adjacent columns
    checkAndResolveCollisions(picker, monthIndex);

    picker.showingRollingSelector[monthIndex] = false;
    picker.renderCalendar();
}

export function selectMonth(picker: any, month: number, monthIndex: number) {
    // Update only this specific month's month
    const oldMonth = picker.monthDates[monthIndex].getMonth();
    picker.monthDates[monthIndex].setMonth(month);
    console.log(`[DatePicker Col${monthIndex}] selectMonth - changed from ${oldMonth+1} to ${month+1}`);

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
            console.log(`[DatePicker Col${changedIdx}] Collision with Col${changedIdx+1}, shifting forward`);
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
            console.log(`[DatePicker Col${changedIdx}] Collision with Col${changedIdx-1}, shifting backward`);
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

export function prevMonth(picker: any, monthIndex: number) {
    // Update only the specific month
    const idx = !isNaN(monthIndex) ? monthIndex : picker.activeMonthIndex;

    const oldDate = picker.monthDates[idx];
    const newDate = new Date(oldDate.getFullYear(), oldDate.getMonth() - 1, 1);
    picker.monthDates[idx] = newDate;
    console.log(`[DatePicker Col${idx}] prevMonth - changed from ${oldDate.getFullYear()}-${oldDate.getMonth()+1} to ${newDate.getFullYear()}-${newDate.getMonth()+1}`);

    // If moving backward causes overlap with previous column, shift previous columns back
    if (idx > 0) {
        const prevDate = picker.monthDates[idx - 1];
        if (isSameOrAfterMonth(prevDate, newDate)) {
            console.log(`[DatePicker Col${idx}] Collision detected with Col${idx-1}, shifting previous columns back`);
            // Recursively move previous column back
            prevMonth(picker, idx - 1);
        }
    }

    picker.renderCalendar();
}

export function nextMonth(picker: any, monthIndex: number) {
    // Update only the specific month
    const idx = !isNaN(monthIndex) ? monthIndex : picker.activeMonthIndex;

    const oldDate = picker.monthDates[idx];
    const newDate = new Date(oldDate.getFullYear(), oldDate.getMonth() + 1, 1);
    picker.monthDates[idx] = newDate;
    console.log(`[DatePicker Col${idx}] nextMonth - changed from ${oldDate.getFullYear()}-${oldDate.getMonth()+1} to ${newDate.getFullYear()}-${newDate.getMonth()+1}`);

    // If moving forward causes overlap with next column, shift next columns forward
    if (idx < picker.monthDates.length - 1) {
        const nextDate = picker.monthDates[idx + 1];
        if (isSameOrAfterMonth(newDate, nextDate)) {
            console.log(`[DatePicker Col${idx}] Collision detected with Col${idx+1}, shifting next columns forward`);
            // Recursively move next column forward
            nextMonth(picker, idx + 1);
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
                const date = new Date(year, month, day);

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
    console.log(`[DatePicker Col${picker.activeMonthIndex}] moveFocus(${offset}) - focusedDayIndex:`, picker.focusedDayIndex);
    const daysContainer = picker.calendar.querySelector(`.pa-date-picker__days[data-month-index="${picker.activeMonthIndex}"]`);
    if (!daysContainer) {
        console.log(`[DatePicker Col${picker.activeMonthIndex}] ERROR: daysContainer not found!`);
        return;
    }

    const days = daysContainer.querySelectorAll('.pa-date-picker__day:not(.pa-date-picker__day--other-month)');
    console.log(`[DatePicker Col${picker.activeMonthIndex}] Found ${days.length} days in column`);
    if (days.length === 0) return;

    // Initialize focus if not set
    if (picker.focusedDayIndex === null) {
        // Find today's day in the calendar as the starting point
        const todayIndex = Array.from(days).findIndex(day => day.classList.contains('pa-date-picker__day--today'));
        picker.focusedDayIndex = todayIndex !== -1 ? todayIndex : 0;
        console.log(`[DatePicker Col${picker.activeMonthIndex}] Initialized focusedDayIndex to ${picker.focusedDayIndex} (today or first day), will move by offset ${offset}`);
    }

    // Remove old focus (if any)
    days[picker.focusedDayIndex]?.classList.remove('pa-date-picker__day--focused');

    // Calculate new index
    const newIndex = picker.focusedDayIndex + offset;

    // Check if we need to change months
    if (newIndex < 0) {
        const savedMonthIndex = picker.activeMonthIndex;

        // For left arrow (offset -1), just go to last enabled day of previous month
        // For up arrow (offset -7), maintain weekday column
        if (offset === -1) {
            console.log(`[DatePicker Col${savedMonthIndex}] Edge navigation LEFT: going to last enabled day of prev month`);
            prevMonth(picker, picker.activeMonthIndex);
            setTimeout(() => {
                const newContainer = picker.calendar.querySelector(`.pa-date-picker__month[data-month-index="${savedMonthIndex}"] .pa-date-picker__days`);
                if (!newContainer) return;
                const newDays = newContainer.querySelectorAll('.pa-date-picker__day:not(.pa-date-picker__day--other-month)');

                // Find last enabled day
                const result = findNextEnabledDayIndex(picker, newDays.length - 1, -1, newDays, savedMonthIndex);
                if (result.index !== null) {
                    picker.focusedDayIndex = result.index;
                    newDays[picker.focusedDayIndex]?.classList.add('pa-date-picker__day--focused');
                    newDays[picker.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
                }
            }, 0);
        } else {
            // Up arrow - maintain same weekday column
            const currentDay = days[picker.focusedDayIndex] as HTMLElement;
            const dateAttr = currentDay.dataset.date;
            if (dateAttr) {
                const [year, month, day] = dateAttr.split('-').map(Number);
                const currentDate = new Date(year, month, day);
                const targetWeekday = currentDate.getDay();

                console.log(`[DatePicker Col${savedMonthIndex}] Edge navigation UP: current day ${day} is weekday ${targetWeekday}, going to prev month`);
                prevMonth(picker, picker.activeMonthIndex);
                setTimeout(() => {
                    const newContainer = picker.calendar.querySelector(`.pa-date-picker__month[data-month-index="${savedMonthIndex}"] .pa-date-picker__days`);
                    if (!newContainer) return;
                    const newDays = newContainer.querySelectorAll('.pa-date-picker__day:not(.pa-date-picker__day--other-month)');

                    const lastDayElement = newDays[newDays.length - 1] as HTMLElement;
                    const lastDateAttr = lastDayElement.dataset.date;
                    if (lastDateAttr) {
                        const [lastYear, lastMonth, lastDayNum] = lastDateAttr.split('-').map(Number);
                        const lastDay = new Date(lastYear, lastMonth, lastDayNum);
                        const lastWeekday = lastDay.getDay();
                        const offsetDays = (lastWeekday - targetWeekday + 7) % 7;
                        picker.focusedDayIndex = newDays.length - 1 - offsetDays;

                        console.log(`[DatePicker Col${savedMonthIndex}] Last day weekday ${lastWeekday}, target ${targetWeekday}, focusing on day ${picker.focusedDayIndex+1}`);
                        newDays[picker.focusedDayIndex]?.classList.add('pa-date-picker__day--focused');
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
            console.log(`[DatePicker Col${savedMonthIndex}] Edge navigation RIGHT: going to first enabled day of next month`);
            nextMonth(picker, picker.activeMonthIndex);
            setTimeout(() => {
                const newContainer = picker.calendar.querySelector(`.pa-date-picker__month[data-month-index="${savedMonthIndex}"] .pa-date-picker__days`);
                if (!newContainer) return;
                const newDays = newContainer.querySelectorAll('.pa-date-picker__day:not(.pa-date-picker__day--other-month)');

                // Find first enabled day
                const result = findNextEnabledDayIndex(picker, 0, 1, newDays, savedMonthIndex);
                if (result.index !== null) {
                    picker.focusedDayIndex = result.index;
                    newDays[picker.focusedDayIndex]?.classList.add('pa-date-picker__day--focused');
                    newDays[picker.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
                }
            }, 0);
        } else {
            // Down arrow - maintain same weekday column
            const currentDay = days[picker.focusedDayIndex] as HTMLElement;
            const dateAttr = currentDay.dataset.date;
            if (dateAttr) {
                const [year, month, day] = dateAttr.split('-').map(Number);
                const currentDate = new Date(year, month, day);
                const targetWeekday = currentDate.getDay();

                console.log(`[DatePicker Col${savedMonthIndex}] Edge navigation DOWN: current day ${day} is weekday ${targetWeekday}, going to next month`);
                nextMonth(picker, picker.activeMonthIndex);
                setTimeout(() => {
                    const newContainer = picker.calendar.querySelector(`.pa-date-picker__month[data-month-index="${savedMonthIndex}"] .pa-date-picker__days`);
                    if (!newContainer) return;
                    const newDays = newContainer.querySelectorAll('.pa-date-picker__day:not(.pa-date-picker__day--other-month)');

                    const firstDayElement = newDays[0] as HTMLElement;
                    const firstDateAttr = firstDayElement.dataset.date;
                    if (firstDateAttr) {
                        const [firstYear, firstMonth, firstDayNum] = firstDateAttr.split('-').map(Number);
                        const firstDay = new Date(firstYear, firstMonth, firstDayNum);
                        const firstWeekday = firstDay.getDay();
                        const offsetDays = (targetWeekday - firstWeekday + 7) % 7;
                        picker.focusedDayIndex = offsetDays;

                        console.log(`[DatePicker Col${savedMonthIndex}] First day weekday ${firstWeekday}, target ${targetWeekday}, focusing on day ${picker.focusedDayIndex+1}`);
                        newDays[picker.focusedDayIndex]?.classList.add('pa-date-picker__day--focused');
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
            const newContainer = picker.calendar.querySelector(`.pa-date-picker__month[data-month-index="${savedMonthIndex}"] .pa-date-picker__days`);
            if (!newContainer) return;
            const newDays = newContainer.querySelectorAll('.pa-date-picker__day:not(.pa-date-picker__day--other-month)');

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
                newDays[picker.focusedDayIndex]?.classList.add('pa-date-picker__day--focused');
                newDays[picker.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
            }
        }, 0);
        return;
    }

    if (result.index !== null) {
        picker.focusedDayIndex = result.index;
        days[picker.focusedDayIndex]?.classList.add('pa-date-picker__day--focused');
        days[picker.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
    } else {
        // No enabled day found, don't move
        console.log('[DatePicker] No enabled day found in search range');
        days[picker.focusedDayIndex]?.classList.add('pa-date-picker__day--focused');
    }
}
