/**
 * Pure Admin Date Picker
 *
 * Lightweight date picker with excellent keyboard navigation
 * Note: This is a UI/UX demo. Full functionality in Svelte version.
 *
 * Features:
 * - Keyboard navigation (arrows, enter, esc)
 * - Rolling month/year selector
 * - Today and Clear buttons
 * - Single date and date range selection
 * - Floating UI positioning
 *
 * Dependencies: @floating-ui/dom
 */

import { computePosition, flip, shift, offset } from '@floating-ui/dom';
import type { DatePickerOptions, DateRange, FormatInfo, MonthDisplay } from './types';

export class PureDatePicker {
    input: HTMLInputElement;
    options: Required<DatePickerOptions>;
    formatInfo: FormatInfo;
    _previousInputValue: string;
    currentDate: Date;
    monthDates: Date[];
    displayMonths?: MonthDisplay[];
    selectedDate: Date | null;
    selectedStartDate: Date | null;
    selectedEndDate: Date | null;
    focusedDayIndex: number | null;
    activeMonthIndex: number;
    showingRollingSelector: boolean[];
    draggingType: 'start' | 'end' | null;
    isDragging: boolean;
    dragStartDate: Date | null;
    originalStartDate: Date | null;
    originalEndDate: Date | null;
    dragPreviewStart: Date | null;
    dragPreviewEnd: Date | null;
    autoScrollInterval: number | null;
    navInterval?: number;
    calendar!: HTMLElement;
    containerElement: HTMLElement;
    onDragMoveBound?: (event: MouseEvent) => void;
    onDragEndBound?: (event: MouseEvent) => void;
    clickOutsideHandler?: (event: MouseEvent) => void;
    private isFirstRender: boolean = true;

    constructor(inputElement: HTMLInputElement, options: DatePickerOptions = {}) {
            console.log('[DatePicker 4] Constructor called for input:', inputElement);
            this.input = inputElement;
            this.containerElement = options.container || document.body;
            this.options = {
                mode: options.mode || 'single',
                position: options.position || 'bottom-start',
                monthsToShow: options.monthsToShow || (options.mode === 'range' ? 2 : 1),
                format: options.format || 'YYYY-MM-DD',
                calendarTrigger: options.calendarTrigger || 'auto',
                onSelect: options.onSelect || undefined,
                container: this.containerElement
            };

            // Parse format to understand structure
            this.formatInfo = this.parseFormat(this.options.format);
            console.log('[DatePicker] Format info:', this.formatInfo);

            // Track previous input value for deletion detection
            this._previousInputValue = '';

            this.currentDate = new Date();

            // Initialize separate dates for each month
            this.monthDates = [];
            const now = new Date();
            for (let i = 0; i < this.options.monthsToShow; i++) {
                const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
                this.monthDates.push(date);
                console.log(`[DatePicker Init] monthDates[${i}] = ${date.getFullYear()}-${date.getMonth()+1}`);
            }

            // Initialize displayMonths for range mode
            if (this.options.mode === 'range') {
                this.displayMonths = [];
                for (let i = 0; i < this.options.monthsToShow; i++) {
                    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
                    this.displayMonths.push({
                        month: date.getMonth(),
                        year: date.getFullYear()
                    });
                }
            }

            this.selectedDate = null;
            this.selectedStartDate = null;
            this.selectedEndDate = null;
            this.focusedDayIndex = null;
            this.activeMonthIndex = 0; // Track which month column is active for keyboard navigation

            // Initialize rolling selector state for each month
            this.showingRollingSelector = [];
            for (let i = 0; i < this.options.monthsToShow; i++) {
                this.showingRollingSelector.push(false);
            }

            // Drag state for range adjustment
            this.draggingType = null; // 'start' | 'end'
            this.isDragging = false;
            this.dragStartDate = null;
            this.originalStartDate = null;
            this.originalEndDate = null;
            this.dragPreviewStart = null;
            this.dragPreviewEnd = null;
            this.autoScrollInterval = null;

            this.init();
        }

        init() {
            console.log('[DatePicker 5] Init called');
            this.createCalendar();
            this.attachInputListeners();
            // Note: renderCalendar() is called on first show() instead of here
            // to avoid rendering days before the calendar is displayed
            console.log('[DatePicker 6] Init complete');
        }

        createCalendar() {
            console.log('[DatePicker 7] Creating calendar');
            this.calendar = document.createElement('div');
            this.calendar.className = 'pa-date-picker';

            // Create container for months
            const monthsContainer = document.createElement('div');
            monthsContainer.className = 'pa-date-picker__months';

            // Create individual month calendars
            for (let i = 0; i < this.options.monthsToShow; i++) {
                const monthCalendar = document.createElement('div');
                monthCalendar.className = 'pa-date-picker__month';
                monthCalendar.dataset.monthIndex = i;
                monthCalendar.innerHTML = `
                    <div class="pa-date-picker__header">
                        <button class="pa-date-picker__nav pa-date-picker__nav--prev" data-action="prev" data-month-index="${i}"></button>
                        <div class="pa-date-picker__month-year" data-action="toggle-rolling" data-month-index="${i}"></div>
                        <button class="pa-date-picker__nav pa-date-picker__nav--next" data-action="next" data-month-index="${i}"></button>
                    </div>
                    <div class="pa-date-picker__rolling-selector" data-month-index="${i}">
                        <div class="pa-date-picker__rolling-list" data-list="years" data-month-index="${i}"></div>
                        <div class="pa-date-picker__rolling-list" data-list="months" data-month-index="${i}"></div>
                    </div>
                    <div class="pa-date-picker__weekdays"></div>
                    <div class="pa-date-picker__days" data-month-index="${i}"></div>
                `;
                monthsContainer.appendChild(monthCalendar);
            }

            this.calendar.appendChild(monthsContainer);

            // Add selection summary (for range mode)
            if (this.options.mode === 'range') {
                const summary = document.createElement('div');
                summary.className = 'pa-date-picker__summary pa-date-picker__summary--hidden';
                this.calendar.appendChild(summary);
            }

            // Add actions at the bottom
            const actions = document.createElement('div');
            actions.className = 'pa-date-picker__actions';
            actions.innerHTML = `
                <button class="pa-date-picker__button pa-date-picker__button--today" data-action="today">Today</button>
                <button class="pa-date-picker__button pa-date-picker__button--clear" data-action="clear">Clear</button>
                ${this.options.mode === 'range' ? '<button class="pa-date-picker__button pa-date-picker__button--apply" data-action="apply">Apply</button>' : ''}
            `;
            this.calendar.appendChild(actions);

            this.containerElement.appendChild(this.calendar);
            console.log('[DatePicker 7b] Calendar appended to container:', this.calendar);
            this.attachCalendarListeners();

            // Initialize rolling selector states for each month
            this.showingRollingSelector = new Array(this.options.monthsToShow).fill(false);
        }

        attachInputListeners() {
            console.log('[DatePicker 8] Attaching input listeners');

            // Calendar trigger: only attach if mode is 'auto'
            if (this.options.calendarTrigger === 'auto') {
                this.input.addEventListener('click', () => {
                    console.log('[DatePicker 9] Input clicked');
                    this.show();
                });
                this.input.addEventListener('focus', () => {
                    console.log('[DatePicker 10] Input focused');
                    this.show();
                });
            }

            // Input masking handlers
            this.input.addEventListener('input', (e) => this.handleInputMask(e));
            this.input.addEventListener('keydown', (e) => this.handleKeydown(e));
            this.input.addEventListener('paste', (e) => this.handlePaste(e));
        }

        attachCalendarListeners() {
            // Delegate all click events
            this.calendar.addEventListener('click', (e) => {
                // Stop propagation to prevent "close on outside click" from firing
                e.stopPropagation();

                const action = e.target.dataset.action;
                const monthIndex = parseInt(e.target.dataset.monthIndex);

                if (action === 'prev') this.prevMonth(monthIndex);
                else if (action === 'next') this.nextMonth(monthIndex);
                else if (action === 'toggle-rolling') this.toggleRollingSelector(monthIndex);
                else if (action === 'today') this.selectToday();
                else if (action === 'clear') this.clear();
                else if (action === 'apply') this.apply();
                else if (e.target.closest('.pa-date-picker__day:not(.pa-date-picker__day--disabled)')) {
                    this.selectDay(e.target.closest('.pa-date-picker__day'));
                }
                else if (e.target.closest('[data-year]')) {
                    const yearElement = e.target.closest('[data-year]');
                    this.selectYear(parseInt(yearElement.dataset.year), parseInt(yearElement.dataset.monthIndex));
                }
                else if (e.target.closest('[data-month]')) {
                    const monthElement = e.target.closest('[data-month]');
                    this.selectMonth(parseInt(monthElement.dataset.month), parseInt(monthElement.dataset.monthIndex));
                }
            });

            // Keyboard navigation
            document.addEventListener('keydown', (e) => {
                if (!this.calendar.classList.contains('pa-date-picker--visible')) return;

                console.log('[DatePicker Keydown]', e.key, 'Ctrl:', e.ctrlKey, 'Meta:', e.metaKey, 'Shift:', e.shiftKey, 'Alt:', e.altKey);

                if (e.key === 'Escape') {
                    this.hide();
                    e.preventDefault();
                }
                else if (e.key === 'ArrowUp') {
                    this.moveFocus(-7);
                    e.preventDefault();
                }
                else if (e.key === 'ArrowDown') {
                    this.moveFocus(7);
                    e.preventDefault();
                }
                else if (e.key === 'ArrowLeft') {
                    if (e.ctrlKey || e.metaKey) {
                        // Ctrl+Left: Previous month (same as PageUp - maintain day position)
                        console.log('[DatePicker] Ctrl+Left: Navigate to previous month');
                        const currentDayIndex = this.focusedDayIndex;
                        this.prevMonth(this.activeMonthIndex);
                        setTimeout(() => {
                            const daysContainer = this.calendar.querySelector(`.pa-date-picker__days[data-month-index="${this.activeMonthIndex}"]`);
                            const newDays = daysContainer.querySelectorAll('.pa-date-picker__day:not(.pa-date-picker__day--other-month)');
                            // Try to maintain same day index, or use last day if month is shorter
                            this.focusedDayIndex = Math.min(currentDayIndex !== null ? currentDayIndex : 0, newDays.length - 1);
                            newDays[this.focusedDayIndex]?.classList.add('pa-date-picker__day--focused');
                            newDays[this.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
                        }, 0);
                    } else {
                        this.moveFocus(-1);
                    }
                    e.preventDefault();
                }
                else if (e.key === 'ArrowRight') {
                    if (e.ctrlKey || e.metaKey) {
                        // Ctrl+Right: Next month (same as PageDown - maintain day position)
                        console.log('[DatePicker] Ctrl+Right: Navigate to next month');
                        const currentDayIndex = this.focusedDayIndex;
                        this.nextMonth(this.activeMonthIndex);
                        setTimeout(() => {
                            const daysContainer = this.calendar.querySelector(`.pa-date-picker__days[data-month-index="${this.activeMonthIndex}"]`);
                            const newDays = daysContainer.querySelectorAll('.pa-date-picker__day:not(.pa-date-picker__day--other-month)');
                            // Try to maintain same day index, or use last day if month is shorter
                            this.focusedDayIndex = Math.min(currentDayIndex !== null ? currentDayIndex : 0, newDays.length - 1);
                            newDays[this.focusedDayIndex]?.classList.add('pa-date-picker__day--focused');
                            newDays[this.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
                        }, 0);
                    } else {
                        this.moveFocus(1);
                    }
                    e.preventDefault();
                }
                else if (e.key === 'Enter') {
                    if (this.focusedDayIndex !== null) {
                        // Select the focused day
                        const daysContainer = this.calendar.querySelector(`.pa-date-picker__days[data-month-index="${this.activeMonthIndex}"]`);
                        const days = daysContainer.querySelectorAll('.pa-date-picker__day:not(.pa-date-picker__day--other-month)');
                        days[this.focusedDayIndex]?.click();
                    } else {
                        // No focused day - close calendar as confirmation
                        this.hide();
                    }
                    e.preventDefault();
                }
                else if (e.key === 'Tab') {
                    // Switch between columns in multi-month mode
                    if (this.options.monthsToShow > 1) {
                        const direction = e.shiftKey ? -1 : 1;
                        const newMonthIndex = this.activeMonthIndex + direction;

                        // Clamp to valid range
                        if (newMonthIndex >= 0 && newMonthIndex < this.monthDates.length) {
                            console.log(`[DatePicker] Tab: switching from Col${this.activeMonthIndex} to Col${newMonthIndex}`);

                            // Get current focused day index before switching
                            const currentFocusedIndex = this.focusedDayIndex ?? 0;

                            // Switch to new column
                            this.activeMonthIndex = newMonthIndex;

                            // Try to maintain same day index, or clamp to valid range
                            const newDaysContainer = this.calendar.querySelector(`.pa-date-picker__days[data-month-index="${this.activeMonthIndex}"]`);
                            if (newDaysContainer) {
                                const newDays = newDaysContainer.querySelectorAll('.pa-date-picker__day:not(.pa-date-picker__day--other-month)');
                                this.focusedDayIndex = Math.min(currentFocusedIndex, newDays.length - 1);
                                console.log(`[DatePicker Col${this.activeMonthIndex}] Tab: set focusedDayIndex to ${this.focusedDayIndex}`);
                            }

                            // Re-render to show new focus
                            this.renderCalendar();
                        }
                        e.preventDefault();
                    }
                }
                else if (e.key === 't' || e.key === 'T') {
                    // Jump to today in the active month column
                    this.monthDates[this.activeMonthIndex] = new Date();
                    this.renderCalendar();
                    // Focus on today's day in the active month
                    setTimeout(() => {
                        const daysContainer = this.calendar.querySelector(`.pa-date-picker__days[data-month-index="${this.activeMonthIndex}"]`);
                        const days = daysContainer.querySelectorAll('.pa-date-picker__day:not(.pa-date-picker__day--other-month)');
                        const todayIndex = Array.from(days).findIndex(day => day.classList.contains('pa-date-picker__day--today'));
                        if (todayIndex !== -1) {
                            this.focusedDayIndex = todayIndex;
                            days[todayIndex].classList.add('pa-date-picker__day--focused');
                            days[todayIndex].scrollIntoView({ block: 'nearest' });
                        }
                    }, 0);
                    e.preventDefault();
                }
                else if (e.key === 'PageUp') {
                    // Go to previous month in active column, same day position
                    const currentDayIndex = this.focusedDayIndex;
                    this.prevMonth(this.activeMonthIndex);
                    setTimeout(() => {
                        const daysContainer = this.calendar.querySelector(`.pa-date-picker__days[data-month-index="${this.activeMonthIndex}"]`);
                        const newDays = daysContainer.querySelectorAll('.pa-date-picker__day:not(.pa-date-picker__day--other-month)');
                        // Try to maintain same day index, or use last day if month is shorter
                        this.focusedDayIndex = Math.min(currentDayIndex !== null ? currentDayIndex : 0, newDays.length - 1);
                        newDays[this.focusedDayIndex]?.classList.add('pa-date-picker__day--focused');
                        newDays[this.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
                    }, 0);
                    e.preventDefault();
                }
                else if (e.key === 'PageDown') {
                    // Go to next month in active column, same day position
                    const currentDayIndex = this.focusedDayIndex;
                    this.nextMonth(this.activeMonthIndex);
                    setTimeout(() => {
                        const daysContainer = this.calendar.querySelector(`.pa-date-picker__days[data-month-index="${this.activeMonthIndex}"]`);
                        const newDays = daysContainer.querySelectorAll('.pa-date-picker__day:not(.pa-date-picker__day--other-month)');
                        // Try to maintain same day index, or use last day if month is shorter
                        this.focusedDayIndex = Math.min(currentDayIndex !== null ? currentDayIndex : 0, newDays.length - 1);
                        newDays[this.focusedDayIndex]?.classList.add('pa-date-picker__day--focused');
                        newDays[this.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
                    }, 0);
                    e.preventDefault();
                }
                else if (e.key === 'Home') {
                    console.log('[DatePicker] Home key pressed, Ctrl:', e.ctrlKey, 'Meta:', e.metaKey);
                    const currentYear = this.monthDates[this.activeMonthIndex].getFullYear();
                    const currentMonth = this.monthDates[this.activeMonthIndex].getMonth();

                    if (e.ctrlKey || e.metaKey) {
                        console.log('[DatePicker] Ctrl+Home: Navigate to year start');
                        // Ctrl+Home: Go to January 1st of current year
                        // If already there, go to January 1st of previous year
                        const isJanuary = currentMonth === 0;
                        const isFirstDay = this.focusedDayIndex === 0;

                        if (isJanuary && isFirstDay) {
                            // Already at Jan 1 - go to previous year
                            console.log('[DatePicker] Already at Jan 1, going to previous year');
                            this.monthDates[this.activeMonthIndex] = new Date(currentYear - 1, 0, 1);
                        } else {
                            // Go to Jan 1 of current year
                            console.log('[DatePicker] Going to Jan 1 of current year');
                            this.monthDates[this.activeMonthIndex] = new Date(currentYear, 0, 1);
                        }
                        this.renderCalendar();
                        setTimeout(() => {
                            const daysContainer = this.calendar.querySelector(`.pa-date-picker__days[data-month-index="${this.activeMonthIndex}"]`);
                            const days = daysContainer.querySelectorAll('.pa-date-picker__day:not(.pa-date-picker__day--other-month)');
                            this.focusedDayIndex = 0;
                            days[0]?.classList.add('pa-date-picker__day--focused');
                            days[0]?.scrollIntoView({ block: 'nearest' });
                        }, 0);
                    } else {
                        console.log('[DatePicker] Home: Navigate to first day (cycles to previous month if already there)');
                        // Home: Go to first day of current month
                        // If already on first day, go to first day of previous month
                        const isFirstDay = this.focusedDayIndex === 0;

                        if (isFirstDay) {
                            // Already on first day - go to previous month, first day
                            console.log('[DatePicker] Already on first day, going to previous month');
                            this.prevMonth(this.activeMonthIndex);
                            setTimeout(() => {
                                const daysContainer = this.calendar.querySelector(`.pa-date-picker__days[data-month-index="${this.activeMonthIndex}"]`);
                                const days = daysContainer.querySelectorAll('.pa-date-picker__day:not(.pa-date-picker__day--other-month)');
                                this.focusedDayIndex = 0;
                                this.calendar.querySelectorAll('.pa-date-picker__day--focused').forEach(d => d.classList.remove('pa-date-picker__day--focused'));
                                days[0]?.classList.add('pa-date-picker__day--focused');
                                days[0]?.scrollIntoView({ block: 'nearest' });
                            }, 0);
                        } else {
                            // Go to first day of current month
                            this.focusedDayIndex = 0;
                            const daysContainer = this.calendar.querySelector(`.pa-date-picker__days[data-month-index="${this.activeMonthIndex}"]`);
                            const days = daysContainer.querySelectorAll('.pa-date-picker__day:not(.pa-date-picker__day--other-month)');
                            this.calendar.querySelectorAll('.pa-date-picker__day--focused').forEach(d => d.classList.remove('pa-date-picker__day--focused'));
                            days[0]?.classList.add('pa-date-picker__day--focused');
                            days[0]?.scrollIntoView({ block: 'nearest' });
                        }
                    }
                    e.preventDefault();
                }
                else if (e.key === 'End') {
                    console.log('[DatePicker] End key pressed, Ctrl:', e.ctrlKey, 'Meta:', e.metaKey);
                    const currentYear = this.monthDates[this.activeMonthIndex].getFullYear();
                    const currentMonth = this.monthDates[this.activeMonthIndex].getMonth();

                    if (e.ctrlKey || e.metaKey) {
                        console.log('[DatePicker] Ctrl+End: Navigate to year end');
                        // Ctrl+End: Go to December 31st of current year
                        // If already there, go to December 31st of next year
                        const isDecember = currentMonth === 11;

                        // Check if we're at the last day
                        const daysContainer = this.calendar.querySelector(`.pa-date-picker__days[data-month-index="${this.activeMonthIndex}"]`);
                        const days = daysContainer.querySelectorAll('.pa-date-picker__day:not(.pa-date-picker__day--other-month)');
                        const isLastDay = this.focusedDayIndex === days.length - 1;

                        if (isDecember && isLastDay) {
                            // Already at Dec 31 - go to next year
                            this.monthDates[this.activeMonthIndex] = new Date(currentYear + 1, 11, 31);
                        } else {
                            // Go to Dec 31 of current year
                            this.monthDates[this.activeMonthIndex] = new Date(currentYear, 11, 31);
                        }
                        this.renderCalendar();
                        setTimeout(() => {
                            const newContainer = this.calendar.querySelector(`.pa-date-picker__days[data-month-index="${this.activeMonthIndex}"]`);
                            const newDays = newContainer.querySelectorAll('.pa-date-picker__day:not(.pa-date-picker__day--other-month)');
                            this.focusedDayIndex = newDays.length - 1;
                            newDays[this.focusedDayIndex]?.classList.add('pa-date-picker__day--focused');
                            newDays[this.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
                        }, 0);
                    } else {
                        console.log('[DatePicker] End: Navigate to last day (cycles to next month if already there)');
                        // End: Go to last day of current month
                        // If already on last day, go to last day of next month
                        const daysContainer = this.calendar.querySelector(`.pa-date-picker__days[data-month-index="${this.activeMonthIndex}"]`);
                        const days = daysContainer.querySelectorAll('.pa-date-picker__day:not(.pa-date-picker__day--other-month)');
                        const isLastDay = this.focusedDayIndex === days.length - 1;

                        if (isLastDay) {
                            // Already on last day - go to next month, last day
                            console.log('[DatePicker] Already on last day, going to next month');
                            this.nextMonth(this.activeMonthIndex);
                            setTimeout(() => {
                                const daysContainer = this.calendar.querySelector(`.pa-date-picker__days[data-month-index="${this.activeMonthIndex}"]`);
                                const days = daysContainer.querySelectorAll('.pa-date-picker__day:not(.pa-date-picker__day--other-month)');
                                this.focusedDayIndex = days.length - 1;
                                this.calendar.querySelectorAll('.pa-date-picker__day--focused').forEach(d => d.classList.remove('pa-date-picker__day--focused'));
                                days[this.focusedDayIndex]?.classList.add('pa-date-picker__day--focused');
                                days[this.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
                            }, 0);
                        } else {
                            // Go to last day of current month
                            this.focusedDayIndex = days.length - 1;
                            this.calendar.querySelectorAll('.pa-date-picker__day--focused').forEach(d => d.classList.remove('pa-date-picker__day--focused'));
                            days[this.focusedDayIndex]?.classList.add('pa-date-picker__day--focused');
                            days[this.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
                        }
                    }
                    e.preventDefault();
                }
            });

            // Close on outside click
            this.clickOutsideHandler = (e: MouseEvent) => {
                // Get the actual target (works with Shadow DOM)
                const path = e.composedPath();
                const actualTarget = path[0] as HTMLElement;

                // Don't hide if clicking the calendar, input, or calendar button
                const clickedCalendar = path.includes(this.calendar);
                const clickedInput = path.includes(this.input);
                const isCalendarButton = actualTarget.closest?.('[data-calendar-button]');

                if (!clickedCalendar && !clickedInput && !isCalendarButton) {
                    this.hide();
                }
            };
            document.addEventListener('click', this.clickOutsideHandler);
        }

        show() {
            console.log('[DatePicker 11] Show called - adding visible class');

            // Render calendar on first show to avoid rendering hidden days
            if (this.isFirstRender) {
                this.renderCalendar();
                this.isFirstRender = false;
            }

            this.calendar.classList.add('pa-date-picker--visible');
            console.log('[DatePicker 11a] Calendar classes:', this.calendar.className);
            this.position();
            setTimeout(() => {
                const computedStyle = window.getComputedStyle(this.calendar);
                console.log('[DatePicker 11e] Calendar display:', computedStyle.display, 'position:', computedStyle.position, 'left:', computedStyle.left, 'top:', computedStyle.top, 'z-index:', computedStyle.zIndex);
            }, 100);
        }

        hide() {
            // Only process hide if calendar is actually visible
            if (!this.calendar.classList.contains('pa-date-picker--visible')) {
                return;
            }

            this.calendar.classList.remove('pa-date-picker--visible');
            // Reset all rolling selectors to closed state
            for (let i = 0; i < this.showingRollingSelector.length; i++) {
                this.showingRollingSelector[i] = false;
            }
            // Only render if calendar was actually shown (not first render)
            if (!this.isFirstRender) {
                this.renderCalendar();
            }
        }

        toggle() {
            if (this.calendar.classList.contains('pa-date-picker--visible')) {
                this.hide();
            } else {
                this.show();
            }
        }

        async position() {
            console.log('[DatePicker 11b] Position method called');
            const { x, y } = await computePosition(this.input, this.calendar, {
                placement: this.options.position,
                middleware: [offset(8), flip(), shift({ padding: 8 })]
            });
            console.log('[DatePicker 11c] FloatingUI computed position - x:', x, 'y:', y);

            this.calendar.style.left = `${x}px`;
            this.calendar.style.top = `${y}px`;
            console.log('[DatePicker 11d] Position applied to calendar');
        }

        renderCalendar() {
            console.log(`[DatePicker 18] renderCalendar called, showingRollingSelector:`, this.showingRollingSelector, `activeCol: ${this.activeMonthIndex}`);
            console.log('[DatePicker 18] monthDates array:', this.monthDates.map((d, i) => `Col${i}: ${d.getFullYear()}-${d.getMonth()+1}`).join(', '));

            // Render each month
            for (let i = 0; i < this.options.monthsToShow; i++) {
                if (this.showingRollingSelector[i]) {
                    this.renderRollingSelector(i);
                } else {
                    this.renderNormalView(i);
                }
            }

            // Set rolling selector height to match calendar content height
            // This prevents layout jumps when toggling between views
            requestAnimationFrame(() => {
                for (let i = 0; i < this.options.monthsToShow; i++) {
                    const monthContainer = this.calendar.querySelector(`.pa-date-picker__month[data-month-index="${i}"]`);
                    if (!monthContainer) continue;

                    const weekdays = monthContainer.querySelector('.pa-date-picker__weekdays');
                    const days = monthContainer.querySelector('.pa-date-picker__days');
                    const rollingSelector = monthContainer.querySelector('.pa-date-picker__rolling-selector');

                    if (weekdays && days && rollingSelector) {
                        const totalHeight = weekdays.offsetHeight + days.offsetHeight;
                        (rollingSelector as HTMLElement).style.height = `${totalHeight}px`;
                    }
                }
            });

            // Initialize drag listeners for range mode
            if (this.options.mode === 'range' && !this.isDragging) {
                this.initDragListeners();
            }
        }

        renderNormalView(monthIndex) {
            console.log(`[DatePicker Col${monthIndex} 19] renderNormalView called for month`, monthIndex);
            const monthContainer = this.calendar.querySelector(`.pa-date-picker__month[data-month-index="${monthIndex}"]`);
            if (!monthContainer) return;

            // Hide rolling selector for this month
            const rollingSelector = monthContainer.querySelector('.pa-date-picker__rolling-selector');
            rollingSelector.classList.remove('pa-date-picker__rolling-selector--visible');

            // Get this month's date
            const date = this.monthDates[monthIndex];

            // Update month/year display
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                                'July', 'August', 'September', 'October', 'November', 'December'];
            const monthYear = monthContainer.querySelector('.pa-date-picker__month-year');
            monthYear.textContent = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;

            // Render weekdays
            const weekdays = monthContainer.querySelector('.pa-date-picker__weekdays');
            weekdays.innerHTML = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
                .map(day => `<div class="pa-date-picker__weekday">${day}</div>`).join('');

            // Render days
            this.renderDays(monthIndex, date);
        }

        renderDays(monthIndex, date) {
            console.log(`[DatePicker Col${monthIndex} 20] renderDays called for month`, monthIndex);
            const monthContainer = this.calendar.querySelector(`.pa-date-picker__month[data-month-index="${monthIndex}"]`);
            if (!monthContainer) return;

            const daysContainer = monthContainer.querySelector('.pa-date-picker__days');
            const year = date.getFullYear();
            const month = date.getMonth();
            console.log(`[DatePicker Col${monthIndex} 21] Rendering days for:`, year, month + 1);

            // Get first day of month and number of days
            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const daysInPrevMonth = new Date(year, month, 0).getDate();

            // Calculate previous and next month for data-date attributes
            const prevMonthDate = new Date(year, month - 1, 1);
            const prevYear = prevMonthDate.getFullYear();
            const prevMonth = prevMonthDate.getMonth();

            const nextMonthDate = new Date(year, month + 1, 1);
            const nextYear = nextMonthDate.getFullYear();
            const nextMonth = nextMonthDate.getMonth();

            let html = '';

            // Previous month days
            for (let i = firstDay - 1; i >= 0; i--) {
                const day = daysInPrevMonth - i;
                const date = new Date(prevYear, prevMonth, day);
                const classes = ['pa-date-picker__day', 'pa-date-picker__day--other-month'];

                // Apply range classes to other-month days
                if (this.options.mode === 'range') {
                    if (this.isSameDay(date, this.selectedStartDate)) classes.push('pa-date-picker__day--range-start');
                    if (this.isSameDay(date, this.selectedEndDate)) classes.push('pa-date-picker__day--range-end');
                    if (this.isInRange(date)) classes.push('pa-date-picker__day--in-range');
                }

                html += `<div class="${classes.join(' ')}" data-date="${prevYear}-${prevMonth}-${day}">${day}</div>`;
            }

            // Current month days
            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month, day);
                const classes = ['pa-date-picker__day'];

                // Today
                if (this.isToday(date)) classes.push('pa-date-picker__day--today');

                // Selected
                if (this.options.mode === 'single' && this.isSameDay(date, this.selectedDate)) {
                    classes.push('pa-date-picker__day--selected');
                }

                // Range
                if (this.options.mode === 'range') {
                    if (this.isSameDay(date, this.selectedStartDate)) classes.push('pa-date-picker__day--range-start');
                    if (this.isSameDay(date, this.selectedEndDate)) classes.push('pa-date-picker__day--range-end');
                    if (this.isInRange(date)) classes.push('pa-date-picker__day--in-range');
                }

                html += `<div class="${classes.join(' ')}" data-date="${year}-${month}-${day}">${day}</div>`;
            }

            // Next month days
            const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
            const remainingCells = totalCells - (firstDay + daysInMonth);
            for (let day = 1; day <= remainingCells; day++) {
                const date = new Date(nextYear, nextMonth, day);
                const classes = ['pa-date-picker__day', 'pa-date-picker__day--other-month'];

                // Apply range classes to other-month days
                if (this.options.mode === 'range') {
                    if (this.isSameDay(date, this.selectedStartDate)) classes.push('pa-date-picker__day--range-start');
                    if (this.isSameDay(date, this.selectedEndDate)) classes.push('pa-date-picker__day--range-end');
                    if (this.isInRange(date)) classes.push('pa-date-picker__day--in-range');
                }

                html += `<div class="${classes.join(' ')}" data-date="${nextYear}-${nextMonth}-${day}">${day}</div>`;
            }

            daysContainer.innerHTML = html;
        }

        renderRollingSelector(monthIndex) {
            const monthContainer = this.calendar.querySelector(`.pa-date-picker__month[data-month-index="${monthIndex}"]`);
            if (!monthContainer) return;

            const selector = monthContainer.querySelector('.pa-date-picker__rolling-selector');
            selector.classList.add('pa-date-picker__rolling-selector--visible');

            // Get this month's date
            const date = this.monthDates[monthIndex];

            // Render years
            const yearsContainer = selector.querySelector('[data-list="years"]');
            const currentYear = date.getFullYear();
            let yearsHtml = '';
            for (let year = currentYear - 50; year <= currentYear + 50; year++) {
                const selected = year === currentYear ? 'pa-date-picker__rolling-item--selected' : '';
                yearsHtml += `<div class="pa-date-picker__rolling-item ${selected}" data-year="${year}" data-month-index="${monthIndex}">${year}</div>`;
            }
            yearsContainer.innerHTML = yearsHtml;
            yearsContainer.querySelector('.pa-date-picker__rolling-item--selected')?.scrollIntoView({ block: 'center' });

            // Render months
            const monthsContainer = selector.querySelector('[data-list="months"]');
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                                'July', 'August', 'September', 'October', 'November', 'December'];
            const currentMonth = date.getMonth();
            monthsContainer.innerHTML = monthNames.map((name, index) => {
                const selected = index === currentMonth ? 'pa-date-picker__rolling-item--selected' : '';
                return `<div class="pa-date-picker__rolling-item ${selected}" data-month="${index}" data-month-index="${monthIndex}">${name}</div>`;
            }).join('');
            monthsContainer.querySelector('.pa-date-picker__rolling-item--selected')?.scrollIntoView({ block: 'center' });
        }

        toggleRollingSelector(monthIndex) {
            this.showingRollingSelector[monthIndex] = !this.showingRollingSelector[monthIndex];
            this.renderCalendar();
        }

        selectYear(year, monthIndex) {
            // Update only this specific month's year
            const oldYear = this.monthDates[monthIndex].getFullYear();
            this.monthDates[monthIndex].setFullYear(year);
            console.log(`[DatePicker Col${monthIndex}] selectYear - changed from ${oldYear} to ${year}`);

            // Check for collisions with adjacent columns
            this.checkAndResolveCollisions(monthIndex);

            this.showingRollingSelector[monthIndex] = false;
            this.renderCalendar();
        }

        selectMonth(month, monthIndex) {
            // Update only this specific month's month
            const oldMonth = this.monthDates[monthIndex].getMonth();
            this.monthDates[monthIndex].setMonth(month);
            console.log(`[DatePicker Col${monthIndex}] selectMonth - changed from ${oldMonth+1} to ${month+1}`);

            // Check for collisions with adjacent columns
            this.checkAndResolveCollisions(monthIndex);

            this.showingRollingSelector[monthIndex] = false;
            this.renderCalendar();
        }

        // Check and resolve collisions after changing a column's date
        checkAndResolveCollisions(changedIdx) {
            const changedDate = this.monthDates[changedIdx];

            // Check collision with next column (if exists)
            if (changedIdx < this.monthDates.length - 1) {
                const nextDate = this.monthDates[changedIdx + 1];
                if (this.isSameOrAfterMonth(changedDate, nextDate)) {
                    console.log(`[DatePicker Col${changedIdx}] Collision with Col${changedIdx+1}, shifting forward`);
                    // Move next column to be 1 month after changed column
                    const newNextDate = new Date(changedDate.getFullYear(), changedDate.getMonth() + 1, 1);
                    this.monthDates[changedIdx + 1] = newNextDate;
                    // Recursively check next column
                    this.checkAndResolveCollisions(changedIdx + 1);
                }
            }

            // Check collision with previous column (if exists)
            if (changedIdx > 0) {
                const prevDate = this.monthDates[changedIdx - 1];
                if (this.isSameOrAfterMonth(prevDate, changedDate)) {
                    console.log(`[DatePicker Col${changedIdx}] Collision with Col${changedIdx-1}, shifting backward`);
                    // Move previous column to be 1 month before changed column
                    const newPrevDate = new Date(changedDate.getFullYear(), changedDate.getMonth() - 1, 1);
                    this.monthDates[changedIdx - 1] = newPrevDate;
                    // Recursively check previous column
                    this.checkAndResolveCollisions(changedIdx - 1);
                }
            }
        }

        // Helper: Compare if date1 >= date2 (by year-month only)
        isSameOrAfterMonth(date1, date2) {
            const year1 = date1.getFullYear();
            const month1 = date1.getMonth();
            const year2 = date2.getFullYear();
            const month2 = date2.getMonth();

            if (year1 > year2) return true;
            if (year1 === year2 && month1 >= month2) return true;
            return false;
        }

        prevMonth(monthIndex) {
            // Update only the specific month
            const idx = !isNaN(monthIndex) ? monthIndex : this.activeMonthIndex;

            const oldDate = this.monthDates[idx];
            const newDate = new Date(oldDate.getFullYear(), oldDate.getMonth() - 1, 1);
            this.monthDates[idx] = newDate;
            console.log(`[DatePicker Col${idx}] prevMonth - changed from ${oldDate.getFullYear()}-${oldDate.getMonth()+1} to ${newDate.getFullYear()}-${newDate.getMonth()+1}`);

            // If moving backward causes overlap with previous column, shift previous columns back
            if (idx > 0) {
                const prevDate = this.monthDates[idx - 1];
                if (this.isSameOrAfterMonth(prevDate, newDate)) {
                    console.log(`[DatePicker Col${idx}] Collision detected with Col${idx-1}, shifting previous columns back`);
                    // Recursively move previous column back
                    this.prevMonth(idx - 1);
                }
            }

            this.renderCalendar();
        }

        nextMonth(monthIndex) {
            // Update only the specific month
            const idx = !isNaN(monthIndex) ? monthIndex : this.activeMonthIndex;

            const oldDate = this.monthDates[idx];
            const newDate = new Date(oldDate.getFullYear(), oldDate.getMonth() + 1, 1);
            this.monthDates[idx] = newDate;
            console.log(`[DatePicker Col${idx}] nextMonth - changed from ${oldDate.getFullYear()}-${oldDate.getMonth()+1} to ${newDate.getFullYear()}-${newDate.getMonth()+1}`);

            // If moving forward causes overlap with next column, shift next columns forward
            if (idx < this.monthDates.length - 1) {
                const nextDate = this.monthDates[idx + 1];
                if (this.isSameOrAfterMonth(newDate, nextDate)) {
                    console.log(`[DatePicker Col${idx}] Collision detected with Col${idx+1}, shifting next columns forward`);
                    // Recursively move next column forward
                    this.nextMonth(idx + 1);
                }
            }

            this.renderCalendar();
        }

        selectDay(dayElement) {
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
            if (daysContainer) {
                this.activeMonthIndex = parseInt(daysContainer.dataset.monthIndex) || 0;
                console.log(`[DatePicker Col${this.activeMonthIndex}] selectDay - activeMonthIndex:`, this.activeMonthIndex);
                // For all days (including other-month), set focused index for keyboard navigation
                const days = daysContainer.querySelectorAll('.pa-date-picker__day:not(.pa-date-picker__day--other-month)');
                this.focusedDayIndex = Array.from(days).indexOf(dayElement);
                console.log(`[DatePicker Col${this.activeMonthIndex}] selectDay - set focusedDayIndex to:`, this.focusedDayIndex);
            }

            if (this.options.mode === 'single') {
                this.selectedDate = date;
                this.input.value = this.formatDate(date);
                if (this.options.onSelect) this.options.onSelect(date);
                this.hide();
            } else { // range
                if (!this.selectedStartDate || this.selectedEndDate) {
                    // Start new range
                    this.selectedStartDate = date;
                    this.selectedEndDate = null;
                    // Show first date in input immediately
                    this.input.value = `${this.formatDate(this.selectedStartDate)} - ...`;
                } else {
                    // Complete range
                    if (date >= this.selectedStartDate) {
                        this.selectedEndDate = date;
                    } else {
                        this.selectedEndDate = this.selectedStartDate;
                        this.selectedStartDate = date;
                    }
                    this.input.value = `${this.formatDate(this.selectedStartDate)} - ${this.formatDate(this.selectedEndDate)}`;
                    if (this.options.onSelect) this.options.onSelect({ start: this.selectedStartDate, end: this.selectedEndDate });
                    // Don't close - let user click Apply button or click outside
                }
            }

            this.renderCalendar();
            this.updateSummary();
        }

        updateSummary() {
            if (this.options.mode !== 'range') return;

            const summary = this.calendar.querySelector('.pa-date-picker__summary');
            if (!summary) return;

            if (this.selectedStartDate && this.selectedEndDate) {
                // Calculate days and nights
                const msPerDay = 1000 * 60 * 60 * 24;
                const timeDiff = this.selectedEndDate - this.selectedStartDate;
                const days = Math.floor(timeDiff / msPerDay) + 1; // +1 to include both start and end days
                const nights = days - 1; // Nights = days - 1

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

        selectToday() {
            this.monthDates[this.activeMonthIndex] = new Date();
            this.selectedDate = new Date();
            this.input.value = this.formatDate(this.selectedDate);
            if (this.options.onSelect) this.options.onSelect(this.selectedDate);
            this.renderCalendar();
            if (this.options.mode === 'single') this.hide();
        }

        clear() {
            this.selectedDate = null;
            this.selectedStartDate = null;
            this.selectedEndDate = null;
            this.input.value = '';
            this.renderCalendar();
            this.updateSummary();
        }

        apply() {
            if (this.selectedStartDate && this.selectedEndDate) {
                this.hide();
            }
        }

        // === DRAG FUNCTIONALITY ===

        initDragListeners() {
            // Add mousedown listeners to range-start and range-end days
            const rangeStartDays = this.calendar.querySelectorAll('.pa-date-picker__day--range-start');
            const rangeEndDays = this.calendar.querySelectorAll('.pa-date-picker__day--range-end');

            rangeStartDays.forEach(day => {
                day.addEventListener('mousedown', (e) => this.startDrag(e, 'start'));
            });

            rangeEndDays.forEach(day => {
                day.addEventListener('mousedown', (e) => this.startDrag(e, 'end'));
            });
        }

        startDrag(event, type) {
            event.preventDefault();
            event.stopPropagation();

            this.isDragging = true;
            this.draggingType = type;
            this.originalStartDate = new Date(this.selectedStartDate);
            this.originalEndDate = new Date(this.selectedEndDate);

            // Add dragging class to the day being dragged
            event.currentTarget.classList.add('pa-date-picker__day--dragging');

            console.log(`[DatePicker Drag] Started dragging ${type} date`);

            // Add document-level listeners
            this.onDragMoveBound = this.onDragMove.bind(this);
            this.onDragEndBound = this.onDragEnd.bind(this);
            document.addEventListener('mousemove', this.onDragMoveBound);
            document.addEventListener('mouseup', this.onDragEndBound);

            // Change body cursor
            document.body.style.cursor = 'grabbing';
        }

        onDragMove(event) {
            if (!this.isDragging) return;

            // Check if hovering over navigation buttons during drag
            // Use shadow root's elementsFromPoint if available, otherwise use document
            let element: Element | null = null;
            if (this.containerElement instanceof ShadowRoot && this.containerElement.elementsFromPoint) {
                const elements = this.containerElement.elementsFromPoint(event.clientX, event.clientY);
                element = elements[0] || null;
            } else {
                element = document.elementFromPoint(event.clientX, event.clientY);
            }

            // Unified navigation button handling
            const prevButton = element?.closest('.pa-date-picker__nav--prev');
            const nextButton = element?.closest('.pa-date-picker__nav--next');

            if (prevButton || nextButton) {
                // Hovering over a navigation button
                if (!this.navInterval) {
                    // Start navigation interval
                    const button = prevButton || nextButton;
                    const monthContainer = button.closest('.pa-date-picker__month');
                    if (monthContainer) {
                        const monthIndex = parseInt(monthContainer.dataset.monthIndex);
                        const isPrev = !!prevButton;

                        // Navigate immediately
                        if (isPrev) {
                            this.prevMonth(monthIndex);
                        } else {
                            this.nextMonth(monthIndex);
                        }

                        // Then continue navigating every 1 second
                        this.navInterval = setInterval(() => {
                            if (isPrev) {
                                this.prevMonth(monthIndex);
                            } else {
                                this.nextMonth(monthIndex);
                            }
                        }, 1000);
                    }
                }
                return; // Don't process day hover while over button
            } else {
                // Not over any navigation button - clear interval
                if (this.navInterval) {
                    clearInterval(this.navInterval);
                    this.navInterval = null;
                }
            }

            // Find the day element under the cursor
            const dayElement = element;
            if (!dayElement || !dayElement.classList.contains('pa-date-picker__day')) return;

            // Skip if it's a disabled day
            if (dayElement.classList.contains('pa-date-picker__day--disabled')) return;

            // Parse the date from the day element
            const [year, month, day] = dayElement.dataset.date.split('-').map(Number);
            const hoveredDate = new Date(year, month, day);

            // Update preview based on what's being dragged
            if (this.draggingType === 'start') {
                this.dragPreviewStart = hoveredDate;
                this.dragPreviewEnd = this.originalEndDate;

                // Swap if start is after end
                if (this.dragPreviewStart > this.dragPreviewEnd) {
                    [this.dragPreviewStart, this.dragPreviewEnd] = [this.dragPreviewEnd, this.dragPreviewStart];
                    this.draggingType = 'end'; // Switch which end we're dragging
                }
            } else {
                this.dragPreviewStart = this.originalStartDate;
                this.dragPreviewEnd = hoveredDate;

                // Swap if end is before start
                if (this.dragPreviewEnd < this.dragPreviewStart) {
                    [this.dragPreviewStart, this.dragPreviewEnd] = [this.dragPreviewEnd, this.dragPreviewStart];
                    this.draggingType = 'start'; // Switch which end we're dragging
                }
            }

            // Update preview visuals
            this.updateDragPreview();
        }

        updateDragPreview() {
            // Remove existing preview classes
            this.calendar.querySelectorAll('.pa-date-picker__day--drag-preview').forEach(day => {
                day.classList.remove('pa-date-picker__day--drag-preview');
            });

            if (!this.dragPreviewStart || !this.dragPreviewEnd) return;

            // Add preview classes to days in the preview range (including other-month days)
            const allDays = this.calendar.querySelectorAll('.pa-date-picker__day');
            allDays.forEach(day => {
                const [year, month, dayNum] = day.dataset.date.split('-').map(Number);
                const date = new Date(year, month, dayNum);

                if (date >= this.dragPreviewStart && date <= this.dragPreviewEnd) {
                    day.classList.add('pa-date-picker__day--drag-preview');
                }
            });

            // Update summary with preview counts
            this.updateSummaryWithPreview();
        }

        updateSummaryWithPreview() {
            if (this.options.mode !== 'range') return;

            const summary = this.calendar.querySelector('.pa-date-picker__summary');
            if (!summary) return;

            if (this.dragPreviewStart && this.dragPreviewEnd) {
                const msPerDay = 1000 * 60 * 60 * 24;
                const timeDiff = this.dragPreviewEnd - this.dragPreviewStart;
                const days = Math.floor(timeDiff / msPerDay) + 1;
                const nights = days - 1;

                summary.className = 'pa-date-picker__summary pa-date-picker__summary--visible';
                summary.innerHTML = `
                    <span style="opacity: 0.7;">Preview: </span>
                    <span class="pa-date-picker__summary-count">${days} ${days === 1 ? 'day' : 'days'}</span>
                    <span>, </span>
                    <span class="pa-date-picker__summary-count">${nights} ${nights === 1 ? 'night' : 'nights'}</span>
                `;
            }
        }

        onDragEnd(event) {
            if (!this.isDragging) return;

            console.log(`[DatePicker Drag] Ended dragging, finalizing selection`);

            // Finalize the selection
            if (this.dragPreviewStart && this.dragPreviewEnd) {
                this.selectedStartDate = this.dragPreviewStart;
                this.selectedEndDate = this.dragPreviewEnd;
                this.input.value = `${this.formatDate(this.selectedStartDate)} - ${this.formatDate(this.selectedEndDate)}`;

                if (this.options.onSelect) {
                    this.options.onSelect({ start: this.selectedStartDate, end: this.selectedEndDate });
                }
            }

            // Clean up
            this.isDragging = false;
            this.draggingType = null;
            this.dragPreviewStart = null;
            this.dragPreviewEnd = null;

            // Remove dragging class
            this.calendar.querySelectorAll('.pa-date-picker__day--dragging').forEach(day => {
                day.classList.remove('pa-date-picker__day--dragging');
            });

            // Remove document-level listeners
            document.removeEventListener('mousemove', this.onDragMoveBound);
            document.removeEventListener('mouseup', this.onDragEndBound);

            // Clear navigation interval
            if (this.navInterval) {
                clearInterval(this.navInterval);
                this.navInterval = null;
            }

            // Reset body cursor
            document.body.style.cursor = '';

            // Re-render to show final selection
            this.renderCalendar();
            this.updateSummary();
        }

        // === END DRAG FUNCTIONALITY ===

        moveFocus(offset) {
            // Only get days from the active month column
            console.log(`[DatePicker Col${this.activeMonthIndex}] moveFocus(${offset}) - focusedDayIndex:`, this.focusedDayIndex);
            const daysContainer = this.calendar.querySelector(`.pa-date-picker__days[data-month-index="${this.activeMonthIndex}"]`);
            if (!daysContainer) {
                console.log(`[DatePicker Col${this.activeMonthIndex}] ERROR: daysContainer not found!`);
                return;
            }

            const days = daysContainer.querySelectorAll('.pa-date-picker__day:not(.pa-date-picker__day--other-month)');
            console.log(`[DatePicker Col${this.activeMonthIndex}] Found ${days.length} days in column`);
            if (days.length === 0) return;

            // Initialize focus if not set
            if (this.focusedDayIndex === null) {
                // Find today's day in the calendar as the starting point
                const todayIndex = Array.from(days).findIndex(day => day.classList.contains('pa-date-picker__day--today'));
                this.focusedDayIndex = todayIndex !== -1 ? todayIndex : 0;
                console.log(`[DatePicker Col${this.activeMonthIndex}] Initialized focusedDayIndex to ${this.focusedDayIndex} (today or first day), will move by offset ${offset}`);
            }

            // Remove old focus (if any)
            days[this.focusedDayIndex]?.classList.remove('pa-date-picker__day--focused');

            // Calculate new index
            const newIndex = this.focusedDayIndex + offset;

            // Check if we need to change months
            if (newIndex < 0) {
                const savedMonthIndex = this.activeMonthIndex;

                // For left arrow (offset -1), just go to last day of previous month
                // For up arrow (offset -7), maintain weekday column
                if (offset === -1) {
                    console.log(`[DatePicker Col${savedMonthIndex}] Edge navigation LEFT: going to last day of prev month`);
                    this.prevMonth(this.activeMonthIndex);
                    setTimeout(() => {
                        const newContainer = this.calendar.querySelector(`.pa-date-picker__month[data-month-index="${savedMonthIndex}"] .pa-date-picker__days`);
                        if (!newContainer) return;
                        const newDays = newContainer.querySelectorAll('.pa-date-picker__day:not(.pa-date-picker__day--other-month)');
                        this.focusedDayIndex = newDays.length - 1;
                        newDays[this.focusedDayIndex]?.classList.add('pa-date-picker__day--focused');
                        newDays[this.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
                    }, 0);
                } else {
                    // Up arrow - maintain same weekday column
                    const currentDay = days[this.focusedDayIndex];
                    const [year, month, day] = currentDay.dataset.date.split('-').map(Number);
                    const currentDate = new Date(year, month, day);
                    const targetWeekday = currentDate.getDay();

                    console.log(`[DatePicker Col${savedMonthIndex}] Edge navigation UP: current day ${day} is weekday ${targetWeekday}, going to prev month`);
                    this.prevMonth(this.activeMonthIndex);
                    setTimeout(() => {
                        const newContainer = this.calendar.querySelector(`.pa-date-picker__month[data-month-index="${savedMonthIndex}"] .pa-date-picker__days`);
                        if (!newContainer) return;
                        const newDays = newContainer.querySelectorAll('.pa-date-picker__day:not(.pa-date-picker__day--other-month)');

                        const [lastYear, lastMonth, lastDayNum] = newDays[newDays.length - 1].dataset.date.split('-').map(Number);
                        const lastDay = new Date(lastYear, lastMonth, lastDayNum);
                        const lastWeekday = lastDay.getDay();
                        const offsetDays = (lastWeekday - targetWeekday + 7) % 7;
                        this.focusedDayIndex = newDays.length - 1 - offsetDays;

                        console.log(`[DatePicker Col${savedMonthIndex}] Last day weekday ${lastWeekday}, target ${targetWeekday}, focusing on day ${this.focusedDayIndex+1}`);
                        newDays[this.focusedDayIndex]?.classList.add('pa-date-picker__day--focused');
                        newDays[this.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
                    }, 0);
                }
                return;
            } else if (newIndex >= days.length) {
                const savedMonthIndex = this.activeMonthIndex;

                // For right arrow (offset +1), just go to first day of next month
                // For down arrow (offset +7), maintain weekday column
                if (offset === 1) {
                        console.log(`[DatePicker Col${savedMonthIndex}] Edge navigation RIGHT: going to first day of next month`);
                        this.nextMonth(this.activeMonthIndex);
                        setTimeout(() => {
                            const newContainer = this.calendar.querySelector(`.pa-date-picker__month[data-month-index="${savedMonthIndex}"] .pa-date-picker__days`);
                            if (!newContainer) return;
                            const newDays = newContainer.querySelectorAll('.pa-date-picker__day:not(.pa-date-picker__day--other-month)');
                            this.focusedDayIndex = 0;
                            newDays[this.focusedDayIndex]?.classList.add('pa-date-picker__day--focused');
                            newDays[this.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
                        }, 0);
                    } else {
                        // Down arrow - maintain same weekday column
                        const currentDay = days[this.focusedDayIndex];
                        const [year, month, day] = currentDay.dataset.date.split('-').map(Number);
                        const currentDate = new Date(year, month, day);
                        const targetWeekday = currentDate.getDay();

                        console.log(`[DatePicker Col${savedMonthIndex}] Edge navigation DOWN: current day ${day} is weekday ${targetWeekday}, going to next month`);
                        this.nextMonth(this.activeMonthIndex);
                        setTimeout(() => {
                            const newContainer = this.calendar.querySelector(`.pa-date-picker__month[data-month-index="${savedMonthIndex}"] .pa-date-picker__days`);
                            if (!newContainer) return;
                            const newDays = newContainer.querySelectorAll('.pa-date-picker__day:not(.pa-date-picker__day--other-month)');

                            const [firstYear, firstMonth, firstDayNum] = newDays[0].dataset.date.split('-').map(Number);
                            const firstDay = new Date(firstYear, firstMonth, firstDayNum);
                            const firstWeekday = firstDay.getDay();
                            const offsetDays = (targetWeekday - firstWeekday + 7) % 7;
                            this.focusedDayIndex = offsetDays;

                            console.log(`[DatePicker Col${savedMonthIndex}] First day weekday ${firstWeekday}, target ${targetWeekday}, focusing on day ${this.focusedDayIndex+1}`);
                            newDays[this.focusedDayIndex]?.classList.add('pa-date-picker__day--focused');
                            newDays[this.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
                        }, 0);
                    }
                    return;
            }

            // Normal movement within current month
            this.focusedDayIndex = newIndex;

            // Add new focus
            days[this.focusedDayIndex]?.classList.add('pa-date-picker__day--focused');
            days[this.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
        }

        // === INPUT MASKING ===

        handleInputMask(event) {
            const input = event.target;
            const currentValue = input.value;
            const currentCursorPos = input.selectionStart;

            // Get previous value (stored before this input event)
            const previousValue = this._previousInputValue || '';
            const wasDeleting = currentValue.length < previousValue.length;

            const { separator } = this.formatInfo;

            // For range mode, handle " to " separator
            if (this.options.mode === 'range') {
                // Keep digits, date separators, and allow 'to' with spaces
                const cleanValue = currentValue.replace(new RegExp(`[^0-9${separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}to ]`, 'gi'), '');

                // Apply range mask
                const formatted = this.applyRangeMask(cleanValue);

                if (formatted !== currentValue) {
                    input.value = formatted;

                    // Calculate new cursor position
                    let newCursorPos = currentCursorPos;

                    if (wasDeleting) {
                        newCursorPos = currentCursorPos;
                    } else if (formatted.length > currentValue.length) {
                        // Check if " to " was just inserted
                        if (formatted.includes(' to ') && !currentValue.includes(' to ')) {
                            // " to " was auto-inserted, move cursor after it
                            const toIndex = formatted.indexOf(' to ');
                            if (currentCursorPos >= toIndex && currentCursorPos <= toIndex + 4) {
                                newCursorPos = toIndex + 4; // Move after " to "
                            } else {
                                newCursorPos = currentCursorPos + (formatted.length - currentValue.length);
                            }
                        } else {
                            // Regular separator insertion
                            newCursorPos = currentCursorPos + (formatted.length - currentValue.length);
                        }
                    }

                    input.setSelectionRange(newCursorPos, newCursorPos);
                }
            } else {
                // Single date mode - original logic
                const cleanValue = currentValue.replace(new RegExp(`[^0-9${separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`, 'g'), '');
                const formatted = this.applyMask(cleanValue);

                if (formatted !== currentValue) {
                    input.value = formatted;

                    let newCursorPos = currentCursorPos;

                    if (wasDeleting) {
                        newCursorPos = currentCursorPos;
                    } else if (formatted.length > currentValue.length && formatted[currentCursorPos] === separator) {
                        newCursorPos = currentCursorPos + 1;
                    } else if (formatted.length > currentValue.length) {
                        const oldSeparatorsBefore = (currentValue.substring(0, currentCursorPos).match(new RegExp(separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
                        const newSeparatorsBefore = (formatted.substring(0, currentCursorPos).match(new RegExp(separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
                        const separatorDiff = newSeparatorsBefore - oldSeparatorsBefore;
                        newCursorPos = currentCursorPos + separatorDiff;
                    }

                    input.setSelectionRange(newCursorPos, newCursorPos);
                }
            }

            // Store current value for next time
            this._previousInputValue = input.value;

            // Update calendar if a valid date was typed
            this.updateCalendarFromInput();
        }

        applyMask(value) {
            const { separator, parts, maxLength } = this.formatInfo;

            // Remove existing separators for clean processing
            const digitsOnly = value.replace(new RegExp(separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');

            // Calculate segment lengths
            const yearLen = parts.year ? parts.year.length : 4;
            const segments = [
                { type: 'year', pos: parts.year?.index, length: yearLen },
                { type: 'month', pos: parts.month?.index, length: 2 },
                { type: 'day', pos: parts.day?.index, length: 2 }
            ].sort((a, b) => a.pos - b.pos);

            let result = '';
            let digitIndex = 0;

            for (let i = 0; i < segments.length; i++) {
                const segment = segments[i];
                const segmentValue = digitsOnly.substring(digitIndex, digitIndex + segment.length);

                if (!segmentValue) break;

                result += segmentValue;
                digitIndex += segmentValue.length;

                // Add separator after this segment (except after last segment)
                if (i < segments.length - 1 && segmentValue.length === segment.length) {
                    result += separator;
                }
            }

            // Limit to max length
            return result.substring(0, maxLength);
        }

        applyRangeMask(value) {
            const { separator, maxLength } = this.formatInfo;

            // Split by " to " to get start and end dates
            const toSeparator = ' to ';
            let startPart = '';
            let endPart = '';

            if (value.includes(toSeparator)) {
                const parts = value.split(toSeparator);
                startPart = parts[0];
                endPart = parts.slice(1).join(toSeparator); // In case there are multiple "to"
            } else {
                startPart = value;
            }

            // Apply mask to start date
            const formattedStart = this.applyMask(startPart);

            // Check if start date is complete (maxLength characters)
            if (formattedStart.length === maxLength) {
                // Start date is complete, auto-append " to " if not already there
                if (!value.includes(toSeparator)) {
                    return formattedStart + toSeparator;
                } else {
                    // Apply mask to end date
                    const formattedEnd = this.applyMask(endPart);
                    return formattedStart + toSeparator + formattedEnd;
                }
            } else {
                // Start date not complete yet
                return formattedStart;
            }
        }

        handleKeydown(event) {
            const { key, ctrlKey, metaKey } = event;
            const { separator } = this.formatInfo;

            // If calendar is open, let document handler deal with navigation keys
            if (this.calendar.classList.contains('pa-date-picker--visible')) {
                const navigationKeys = ['ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'];
                if (navigationKeys.includes(key)) {
                    event.preventDefault(); // Prevent default input behavior
                    return; // Let document handler manage calendar navigation
                }
            }

            // Allow: Backspace, Delete, Tab, Escape, Enter, Arrows, Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
            const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
                                 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];

            if (allowedKeys.includes(key) || ctrlKey || metaKey) {
                return; // Allow these keys
            }

            // Auto-pad single digit with leading zero when separator is pressed
            if (key === separator) {
                const input = event.target;
                const cursorPos = input.selectionStart;
                const currentValue = input.value;

                // Find the start of the current segment (after last separator or start of string)
                let segmentStart = 0;
                for (let i = cursorPos - 1; i >= 0; i--) {
                    if (currentValue[i] === separator || currentValue[i] === ' ') {
                        segmentStart = i + 1;
                        break;
                    }
                }

                // Extract the current segment
                const segment = currentValue.substring(segmentStart, cursorPos);

                // If segment is a single digit, prepend a 0
                if (/^\d$/.test(segment)) {
                    event.preventDefault();

                    const newValue = currentValue.substring(0, segmentStart) +
                                   '0' + segment +
                                   separator +
                                   currentValue.substring(cursorPos);

                    input.value = newValue;

                    // Position cursor after the separator
                    const newCursorPos = segmentStart + 2 + separator.length; // 0 + digit + separator
                    input.setSelectionRange(newCursorPos, newCursorPos);

                    // Store updated value for deletion tracking
                    this._previousInputValue = newValue;

                    // Trigger input event to apply mask and update calendar
                    input.dispatchEvent(new Event('input', { bubbles: true }));

                    return;
                }
                // Otherwise allow normal separator insertion (will be handled by input mask)
            }

            // For range mode, also allow space and letters 't', 'o' (for " to ")
            if (this.options.mode === 'range') {
                if (!/^\d$/.test(key) && key !== separator && key !== ' ' && key.toLowerCase() !== 't' && key.toLowerCase() !== 'o') {
                    event.preventDefault();
                }
            } else {
                // For single mode, allow only digits and separator
                if (!/^\d$/.test(key) && key !== separator) {
                    event.preventDefault();
                }
            }
        }

        handlePaste(event) {
            event.preventDefault();

            const pastedText = (event.clipboardData || window.clipboardData).getData('text');
            const { separator } = this.formatInfo;

            // Clean pasted content: keep only digits and separators
            const cleaned = pastedText.replace(new RegExp(`[^0-9${separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`, 'g'), '');

            // Apply mask to cleaned content
            const formatted = this.applyMask(cleaned);

            // Insert formatted text at cursor position
            const input = event.target;
            const start = input.selectionStart;
            const end = input.selectionEnd;
            const currentValue = input.value;

            const newValue = currentValue.substring(0, start) + formatted + currentValue.substring(end);
            input.value = this.applyMask(newValue);

            // Set cursor after pasted content
            const newCursorPos = start + formatted.length;
            input.setSelectionRange(newCursorPos, newCursorPos);

            // Trigger input event to ensure any validation runs
            input.dispatchEvent(new Event('input', { bubbles: true }));

            // Update calendar if a valid date was pasted
            this.updateCalendarFromInput();
        }

        // === END INPUT MASKING ===

        // Helper methods
        parseFormat(formatString) {
            // Parse format string like "YYYY-MM-DD" or "DD.MM.YYYY"
            // Returns structure with positions and separator
            const parts = {};
            let separator = '';

            // Detect separator
            if (formatString.includes('-')) separator = '-';
            else if (formatString.includes('/')) separator = '/';
            else if (formatString.includes('.')) separator = '.';

            // Split by separator
            const segments = formatString.split(separator);

            segments.forEach((segment, index) => {
                if (segment === 'YYYY' || segment === 'YY') {
                    parts.year = { index, length: segment.length };
                } else if (segment === 'MM' || segment === 'M') {
                    parts.month = { index, length: 2 }; // Always 2 digits for consistency
                } else if (segment === 'DD' || segment === 'D') {
                    parts.day = { index, length: 2 }; // Always 2 digits for consistency
                }
            });

            return {
                format: formatString,
                separator,
                parts,
                maxLength: formatString.length
            };
        }

        formatDate(date) {
            if (!date) return '';
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');

            // Use configured format
            const { format, separator, parts } = this.formatInfo;
            const values = [];

            // Build array in correct order
            for (let i = 0; i < 3; i++) {
                if (parts.year && parts.year.index === i) {
                    values.push(parts.year.length === 2 ? String(year).slice(-2) : year);
                } else if (parts.month && parts.month.index === i) {
                    values.push(month);
                } else if (parts.day && parts.day.index === i) {
                    values.push(day);
                }
            }

            return values.join(separator);
        }

        parseInputValue(value) {
            // Parse input value according to format and return Date object
            if (!value) return null;

            const { separator, parts, maxLength } = this.formatInfo;

            // Check if value is complete (full length)
            if (value.length !== maxLength) return null;

            // Split by separator
            const segments = value.split(separator);
            if (segments.length !== 3) return null;

            // Extract year, month, day based on format
            let year, month, day;

            segments.forEach((segment, index) => {
                if (parts.year && parts.year.index === index) {
                    year = parseInt(segment, 10);
                    // Handle 2-digit years (assume 2000s)
                    if (parts.year.length === 2 && year < 100) {
                        year += 2000;
                    }
                } else if (parts.month && parts.month.index === index) {
                    month = parseInt(segment, 10);
                } else if (parts.day && parts.day.index === index) {
                    day = parseInt(segment, 10);
                }
            });

            // Validate
            if (!year || !month || !day) return null;
            if (month < 1 || month > 12) return null;
            if (day < 1 || day > 31) return null;

            // Create date (month is 0-indexed in JS)
            const date = new Date(year, month - 1, day);

            // Verify date is valid (handles invalid dates like Feb 30)
            if (date.getMonth() !== month - 1) return null;

            return date;
        }

        parseAndUpdateSingleDate(value, dateType = 'single') {
            // Helper to parse a single date string and update calendar
            // dateType: 'single', 'start', or 'end'
            const { separator, parts, maxLength } = this.formatInfo;

            const segments = value.split(separator);
            let year = null, month = null, day = null;

            segments.forEach((segment, index) => {
                if (!segment) return;

                if (parts.year && parts.year.index === index) {
                    const yearValue = parseInt(segment, 10);
                    if (parts.year.length === 4 && segment.length === 4) {
                        year = yearValue;
                    } else if (parts.year.length === 2 && segment.length === 2) {
                        year = yearValue < 100 ? yearValue + 2000 : yearValue;
                    }
                } else if (parts.month && parts.month.index === index) {
                    const monthValue = parseInt(segment, 10);
                    if (segment.length === 2 && monthValue >= 1 && monthValue <= 12) {
                        month = monthValue;
                    }
                } else if (parts.day && parts.day.index === index) {
                    const dayValue = parseInt(segment, 10);
                    if (segment.length === 2 && dayValue >= 1 && dayValue <= 31) {
                        day = dayValue;
                    }
                }
            });

            console.log(`[DatePicker] parseAndUpdateSingleDate(${dateType}) - year:`, year, 'month:', month, 'day:', day);

            // Update calendar display if we have year or month
            if (year !== null || month !== null) {
                const newYear = year || new Date().getFullYear();
                const newMonth = month !== null ? month - 1 : new Date().getMonth();

                if (this.options.mode === 'single') {
                    this.currentYear = newYear;
                    this.currentMonth = newMonth;

                    this.monthDates = [];
                    for (let i = 0; i < this.options.monthsToShow; i++) {
                        const date = new Date(newYear, newMonth + i, 1);
                        this.monthDates.push(date);
                    }
                } else if (this.options.mode === 'range') {
                    // For start date or first date typed, update first month
                    if (dateType === 'start' || !this.selectedStartDate) {
                        this.displayMonths = [
                            { month: newMonth, year: newYear }
                        ];
                        if (this.options.monthsToShow > 1) {
                            const nextMonth = new Date(newYear, newMonth + 1, 1);
                            this.displayMonths.push({
                                month: nextMonth.getMonth(),
                                year: nextMonth.getFullYear()
                            });
                        }

                        this.monthDates = [];
                        for (let i = 0; i < this.options.monthsToShow; i++) {
                            const monthData = this.displayMonths[i];
                            const date = new Date(monthData.year, monthData.month, 1);
                            this.monthDates.push(date);
                        }
                    }
                }

                this.renderCalendar();
            }

            // Update selected date if we have complete date
            if (year !== null && month !== null && day !== null) {
                const date = new Date(year, month - 1, day);
                if (date.getMonth() === month - 1) { // Validates date
                    if (dateType === 'single') {
                        this.selectedDate = date;
                    } else if (dateType === 'start') {
                        this.selectedStartDate = date;
                    } else if (dateType === 'end') {
                        this.selectedEndDate = date;
                    }
                    this.renderCalendar();

                    // Update summary for range mode when both dates are complete
                    if (this.options.mode === 'range') {
                        this.updateSummary();
                    }

                    console.log(`[DatePicker] Set ${dateType} date:`, date);
                }
            }
        }

        updateCalendarFromInput() {
            // Parse current input value and update calendar progressively
            const value = this.input.value;
            console.log('[DatePicker] updateCalendarFromInput - value:', value);

            if (!value) return;

            const { separator, parts, maxLength } = this.formatInfo;
            console.log('[DatePicker] Format info:', { separator, parts, maxLength });

            // For range mode, split by " to " first
            if (this.options.mode === 'range' && value.includes(' to ')) {
                const rangeParts = value.split(' to ');
                const startValue = rangeParts[0];
                const endValue = rangeParts[1];

                console.log('[DatePicker] Range parts - start:', startValue, 'end:', endValue);

                // Parse start date
                this.parseAndUpdateSingleDate(startValue, 'start');

                // Parse end date if present
                if (endValue) {
                    this.parseAndUpdateSingleDate(endValue, 'end');
                }

                return;
            }

            // Single mode or range without " to " yet
            // Use helper to parse and update
            const dateType = this.options.mode === 'range' ? 'start' : 'single';
            this.parseAndUpdateSingleDate(value, dateType);
        }

        isToday(date) {
            const today = new Date();
            return this.isSameDay(date, today);
        }

        isSameDay(date1, date2) {
            if (!date1 || !date2) return false;
            return date1.getFullYear() === date2.getFullYear() &&
                   date1.getMonth() === date2.getMonth() &&
                   date1.getDate() === date2.getDate();
        }

        isInRange(date) {
            if (!this.selectedStartDate || !this.selectedEndDate) return false;
            return date > this.selectedStartDate && date < this.selectedEndDate;
        }

        destroy() {
            if (this.clickOutsideHandler) {
                document.removeEventListener('click', this.clickOutsideHandler);
            }
            this.calendar.remove();
        }
    }
