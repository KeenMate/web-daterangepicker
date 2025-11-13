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

import type { DatePickerOptions, DateRange, FormatInfo, MonthDisplay, DecoratedDate, DateInfo, LocaleStrings } from './types';
import * as Validation from './date-picker-validation';
import * as Rendering from './date-picker-rendering';
import * as Navigation from './date-picker-navigation';
import * as Selection from './date-picker-selection';
import * as Interaction from './date-picker-interaction';
import * as UI from './date-picker-ui';
import { resolveLocale, getLocaleStrings, getWeekdayNames, getMonthNames } from './date-picker-locales';
import { initLogger, navigationLogger, setLoggingEnabled } from './logger';

class PureDatePicker {
    input: HTMLInputElement | null;
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
    navInterval?: number | null;
    calendar!: HTMLElement;
    containerElement: HTMLElement;
    onDragMoveBound?: (event: MouseEvent) => void;
    onDragEndBound?: (event: MouseEvent) => void;
    clickOutsideHandler?: (event: MouseEvent) => void;
    private isFirstRender: boolean = true;
    private lockedPlacement?: string; // Store the initial placement to prevent jumping
    private calendarContentHeight?: number; // Store calendar height for rolling selector
    private calendarContentWidth?: number; // Store calendar width for rolling selector
    private isCalendarActive: boolean = false; // Track if this calendar is actively focused (for inline mode)

    // Async validation state
    private isValidating: boolean = false;
    private loadingOverlay?: HTMLElement;

    // Floating UI tooltips
    private tooltip?: HTMLElement;
    private tooltipArrow?: HTMLElement;
    private currentTooltipTarget?: HTMLElement;

    // Week start and date restrictions
    private weekStartDay: number = 0; // 0 = Sunday, 1 = Monday, etc.
    private normalizedMinDate: Date | null = null;
    private normalizedMaxDate: Date | null = null;
    private normalizedDisabledDates: Set<string> = new Set(); // Store as 'YYYY-MM-DD' strings
    private normalizedSpecialDates: Map<string, DecoratedDate> = new Map(); // Store as 'YYYY-MM-DD' -> DecoratedDate

    // Internationalization
    locale: string = 'en';
    localeStrings: LocaleStrings;
    weekdayNames: string[] = [];
    monthNames: string[] = [];

    constructor(inputElement: HTMLInputElement | null, options: DatePickerOptions = {}) {
        this.input = inputElement;
        this.containerElement = options.container || document.body;
        this.options = {
            selectionMode: options.selectionMode || 'single',
            calendarPlacement: options.calendarPlacement || (options.monthLayout === 'grid' ? 'bottom' : 'bottom-start'),
            visibleMonthsCount: options.visibleMonthsCount || (options.selectionMode === 'range' ? 2 : 1),
            dateFormatMask: options.dateFormatMask || 'YYYY-MM-DD',
            calendarOpenTrigger: options.calendarOpenTrigger || 'auto',
            onSelect: options.onSelect || undefined,
            container: this.containerElement,
            positioningMode: options.positioningMode || 'floating',
            monthLayout: options.monthLayout || 'horizontal',
            gridRows: options.gridRows,
            gridColumns: options.gridColumns,
            weekStartDay: options.weekStartDay !== undefined ? options.weekStartDay : 'auto',
            minDate: options.minDate,
            maxDate: options.maxDate,
            initialDate: options.initialDate,
            disabledDates: options.disabledDates,
            disabledWeekdays: options.disabledWeekdays,
            specialDates: options.specialDates,
            isDateDisabled: options.isDateDisabled,
            getDateMetadata: options.getDateMetadata,
            disabledDatesHandling: options.disabledDatesHandling || 'allow',
            highlightDisabledInRange: options.highlightDisabledInRange !== undefined ? options.highlightDisabledInRange : true,
            locale: options.locale || 'auto',
            displayFormatMask: options.displayFormatMask,
            customStrings: options.customStrings,
            formatSummaryCallback: options.formatSummaryCallback,
            validateRangeCallback: options.validateRangeCallback,
            showDebugInfo: options.showDebugInfo || false,
            rollingYearRange: options.rollingYearRange,
            rollingMonthRange: options.rollingMonthRange
        };

        // Enable/disable logging based on showDebugInfo option
        setLoggingEnabled(this.options.showDebugInfo);

        // Detect/set week start day
        this.weekStartDay = Validation.detectWeekStartDay(this.options.weekStartDay);
        initLogger.debug('Week starts on day:', this.weekStartDay);
        initLogger.debug('disabledDatesHandling:', this.options.disabledDatesHandling);

        // Initialize internationalization
        this.locale = resolveLocale(this.options.locale);
        this.localeStrings = getLocaleStrings(this.locale, this.options.customStrings);
        this.weekdayNames = getWeekdayNames(this.locale);
        this.monthNames = getMonthNames(this.locale);
        initLogger.debug('Locale:', this.locale, 'Weekdays:', this.weekdayNames, 'Months:', this.monthNames);

        // Normalize date restrictions
        this.initializeDateRestrictions();

        // Parse format to understand structure
        this.formatInfo = this.parseFormat(this.options.dateFormatMask);
        initLogger.debug('Format info:', this.formatInfo);

        // Track previous input value for deletion detection
        this._previousInputValue = '';

        this.currentDate = new Date();

        // Determine initial display date
        let initialDisplayDate: Date;
        if (this.options.initialDate) {
            // Use explicit initialDate if provided
            const parsedDate = normalizeDate(this.options.initialDate);
            initialDisplayDate = parsedDate || new Date();
            initLogger.debug(`Using initialDate: ${initialDisplayDate.toISOString()}`);
        } else if (this.options.rollingYearRange || this.options.rollingMonthRange) {
            // If rolling ranges are set, use first allowed year/month
            const yearRange = this.options.rollingYearRange ? this.parseYearRange(this.options.rollingYearRange) : null;
            const monthRange = this.options.rollingMonthRange ? this.parseMonthRange(this.options.rollingMonthRange) : null;

            const year = yearRange ? yearRange.min : new Date().getFullYear();
            const month = monthRange ? monthRange.min - 1 : 0; // Convert to 0-based

            initialDisplayDate = new Date(year, month, 1);
            initLogger.debug(`Using first allowed year/month as initial: ${initialDisplayDate.toISOString()}`);
        } else if (this.normalizedMinDate && this.normalizedMinDate > new Date()) {
            // If today is before minDate, start at minDate
            initialDisplayDate = new Date(this.normalizedMinDate);
            initLogger.debug(`Using minDate as initial: ${initialDisplayDate.toISOString()}`);
        } else if (this.normalizedMaxDate && this.normalizedMaxDate < new Date()) {
            // If today is after maxDate, start at maxDate
            initialDisplayDate = new Date(this.normalizedMaxDate);
            initLogger.debug(`Using maxDate as initial: ${initialDisplayDate.toISOString()}`);
        } else {
            // Default to current date
            initialDisplayDate = new Date();
            initLogger.debug(`Using current date as initial: ${initialDisplayDate.toISOString()}`);
        }

        // Initialize separate dates for each month
        this.monthDates = [];
        for (let i = 0; i < this.options.visibleMonthsCount; i++) {
            const date = new Date(initialDisplayDate.getFullYear(), initialDisplayDate.getMonth() + i, 1);
            this.monthDates.push(date);
            initLogger.debug(`monthDates[${i}] = ${date.getFullYear()}-${date.getMonth()+1}`);
        }

        // Initialize displayMonths for range mode
        if (this.options.selectionMode === 'range') {
            this.displayMonths = [];
            for (let i = 0; i < this.options.visibleMonthsCount; i++) {
                const date = new Date(initialDisplayDate.getFullYear(), initialDisplayDate.getMonth() + i, 1);
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
        for (let i = 0; i < this.options.visibleMonthsCount; i++) {
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
        initLogger.debug('Init called');
        this.createCalendar();

        // Only attach input listeners if we have an input element
        if (this.input) {
            this.attachInputListeners();

            // Parse any pre-filled value in the input
            if (this.input.value) {
                initLogger.debug('Parsing pre-filled value:', this.input.value);
                this.updateCalendarFromInput();
            }
        }

        // For inline mode, render and show the calendar immediately
        if (this.options.positioningMode === 'inline') {
            this.renderCalendar();
            this.calendar.classList.add('drp-date-picker--visible', 'drp-date-picker--inline');
            this.isCalendarActive = true; // Make inline calendar keyboard-accessible immediately
            this.isFirstRender = false;
        }
        // Note: for floating mode, renderCalendar() is called on first show() instead of here
        // to avoid rendering days before the calendar is displayed

        initLogger.debug('Init complete');
    }

    /**
     * Initialize and normalize date restrictions
     */
    initializeDateRestrictions() {
        // Parse min/max dates
        if (this.options.minDate) {
            this.normalizedMinDate = Validation.normalizeDate(this.options.minDate);
        }
        if (this.options.maxDate) {
            this.normalizedMaxDate = Validation.normalizeDate(this.options.maxDate);
        }

        // Parse disabled dates array
        if (this.options.disabledDates && this.options.disabledDates.length > 0) {
            this.options.disabledDates.forEach(dateInput => {
                const date = Validation.normalizeDate(dateInput);
                if (date) {
                    const key = Validation.formatDateKey(date);
                    this.normalizedDisabledDates.add(key);
                }
            });
        }

        // Parse special dates array
        if (this.options.specialDates && this.options.specialDates.length > 0) {
            this.options.specialDates.forEach(specialDate => {
                const date = Validation.normalizeDate(specialDate.date);
                if (date) {
                    const key = Validation.formatDateKey(date);
                    this.normalizedSpecialDates.set(key, specialDate);
                }
            });
        }
    }

    /**
     * Parse year range string to min/max values
     */
    private parseYearRange(range: string): { min: number, max: number } {
        if (range.includes('-')) {
            const [minStr, maxStr] = range.split('-');
            return { min: parseInt(minStr, 10), max: parseInt(maxStr, 10) };
        } else {
            const year = parseInt(range, 10);
            return { min: year, max: year };
        }
    }

    /**
     * Parse month range string to min/max values
     */
    private parseMonthRange(range: string): { min: number, max: number } {
        const [minStr, maxStr] = range.split('-');
        return { min: parseInt(minStr, 10), max: parseInt(maxStr, 10) };
    }

    /**
     * Check if a date should be disabled
     */
    isDateDisabledInternal(date: Date): boolean {
        // FIRST: Check rolling selector ranges (primary constraints)
        if (this.options.rollingYearRange) {
            const yearRange = this.parseYearRange(this.options.rollingYearRange);
            const year = date.getFullYear();
            if (year < yearRange.min || year > yearRange.max) {
                return true; // Outside allowed year range
            }
        }

        if (this.options.rollingMonthRange) {
            const monthRange = this.parseMonthRange(this.options.rollingMonthRange);
            const month = date.getMonth() + 1; // Convert to 1-12
            if (month < monthRange.min || month > monthRange.max) {
                return true; // Outside allowed month range
            }
        }

        // SECOND: Check secondary constraints (min/max dates, disabled dates, etc.)
        return Validation.isDateDisabled(
            date,
            this.normalizedMinDate,
            this.normalizedMaxDate,
            this.normalizedDisabledDates,
            this.options.disabledWeekdays,
            this.options.isDateDisabled
        );
    }

    /**
     * Get additional info for a date (special styling, labels, etc.)
     */
    getDateInfoInternal(date: Date): DateInfo | null {
        const dateKey = Validation.formatDateKey(date);

        // Check special dates first
        if (this.normalizedSpecialDates.has(dateKey)) {
            const specialDate = this.normalizedSpecialDates.get(dateKey)!;
            return {
                disabled: this.isDateDisabledInternal(date),
                class: specialDate.class,
                label: specialDate.label,
                tooltip: specialDate.tooltip
            };
        }

        // Check custom callback
        if (this.options.getDateMetadata) {
            const customInfo = this.options.getDateMetadata(date);
            if (customInfo) {
                return {
                    ...customInfo,
                    disabled: customInfo.disabled !== undefined ? customInfo.disabled : this.isDateDisabledInternal(date)
                };
            }
        }

        return null;
    }

    /**
     * Check if there are any disabled dates in a range
     */
    hasDisabledDatesInRange(start: Date, end: Date): boolean {
        return Validation.hasDisabledDatesInRange(start, end, (date) => this.isDateDisabledInternal(date));
    }

    /**
     * Get all enabled dates in a range
     */
    getEnabledDatesInRange(start: Date, end: Date): Date[] {
        return Validation.getEnabledDatesInRange(start, end, (date) => this.isDateDisabledInternal(date));
    }

    /**
     * Get all disabled dates in a range
     */
    getDisabledDatesInRange(start: Date, end: Date): Date[] {
        return Validation.getDisabledDatesInRange(start, end, (date) => this.isDateDisabledInternal(date));
    }

    /**
     * For 'block' mode: Find the last enabled date before hitting a disabled date
     */
    findLastEnabledBeforeGap(start: Date, end: Date): Date {
        return Validation.findLastEnabledBeforeGap(start, end, (date) => this.isDateDisabledInternal(date));
    }

    /**
     * For 'split' mode: Split a range into multiple ranges separated by disabled dates
     */
    splitRangeByDisabled(start: Date, end: Date): DateRange[] {
        return Validation.splitRangeByDisabled(start, end, (date) => this.isDateDisabledInternal(date));
    }

    isToday(date: Date): boolean {
        return Validation.isToday(date);
    }

    isSameDay(date1: Date | null, date2: Date | null): boolean {
        return Validation.isSameDay(date1, date2);
    }

    isInRange(date: Date): boolean {
        return Validation.isInRange(date, this.selectedStartDate, this.selectedEndDate);
    }

    createCalendar() {
        initLogger.debug('Creating calendar');
        this.calendar = document.createElement('div');
        this.calendar.className = 'drp-date-picker';

        // Create container for months
        const monthsContainer = document.createElement('div');
        // Add layout class based on layout option
        if (this.options.monthLayout === 'grid') {
            monthsContainer.className = 'drp-date-picker__months drp-date-picker__months--grid';
            // Set CSS custom properties for grid dimensions
            if (this.options.gridRows) {
                monthsContainer.style.setProperty('--drp-grid-rows', String(this.options.gridRows));
            }
            if (this.options.gridColumns) {
                monthsContainer.style.setProperty('--drp-grid-columns', String(this.options.gridColumns));
            }
        } else {
            monthsContainer.className = 'drp-date-picker__months drp-date-picker__months--horizontal';
        }

        // Create individual month calendars
        for (let i = 0; i < this.options.visibleMonthsCount; i++) {
            const monthCalendar = document.createElement('div');
            monthCalendar.className = 'drp-date-picker__month';
            monthCalendar.dataset.monthIndex = String(i);
            monthCalendar.innerHTML = `
                <div class="drp-date-picker__header">
                    <button class="drp-date-picker__nav drp-date-picker__nav--prev" data-action="prev" data-month-index="${i}"></button>
                    <div class="drp-date-picker__month-year" data-action="toggle-rolling" data-month-index="${i}"></div>
                    <button class="drp-date-picker__nav drp-date-picker__nav--next" data-action="next" data-month-index="${i}"></button>
                </div>
                <div class="drp-date-picker__rolling-selector" data-month-index="${i}">
                    <div class="drp-date-picker__rolling-list" data-list="years" data-month-index="${i}"></div>
                    <div class="drp-date-picker__rolling-list" data-list="months" data-month-index="${i}"></div>
                </div>
                <div class="drp-date-picker__weekdays"></div>
                <div class="drp-date-picker__days" data-month-index="${i}"></div>
            `;
            monthsContainer.appendChild(monthCalendar);
        }

        this.calendar.appendChild(monthsContainer);

        // Add selection summary (for range mode)
        if (this.options.selectionMode === 'range') {
            const summary = document.createElement('div');
            summary.className = 'drp-date-picker__summary drp-date-picker__summary--hidden';
            this.calendar.appendChild(summary);
        }

        // Add actions at the bottom
        const actions = document.createElement('div');
        actions.className = 'drp-date-picker__actions';
        actions.innerHTML = `
            <button class="drp-date-picker__button drp-date-picker__button--today" data-action="today">${this.localeStrings.today}</button>
            <button class="drp-date-picker__button drp-date-picker__button--clear" data-action="clear">${this.localeStrings.clear}</button>
            ${this.options.selectionMode === 'range' ? `<button class="drp-date-picker__button drp-date-picker__button--apply" data-action="apply">${this.localeStrings.apply}</button>` : ''}
        `;
        this.calendar.appendChild(actions);

        this.containerElement.appendChild(this.calendar);
        initLogger.debug('Calendar appended to container:', this.calendar);

        // Create tooltip for Floating UI
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'drp-date-picker__tooltip';
        this.tooltipArrow = document.createElement('div');
        this.tooltipArrow.className = 'drp-date-picker__tooltip-arrow';
        this.tooltip.appendChild(this.tooltipArrow);
        this.containerElement.appendChild(this.tooltip);

        this.attachCalendarListeners();

        // Initialize rolling selector states for each month
        this.showingRollingSelector = new Array(this.options.visibleMonthsCount).fill(false);
    }

    attachInputListeners() {
        if (!this.input) return;

        initLogger.debug('Attaching input listeners');

        // Calendar trigger: only attach if mode is 'auto'
        if (this.options.calendarOpenTrigger === 'auto') {
            this.input.addEventListener('click', () => {
                initLogger.debug('Input clicked');
                this.show();
            });
            this.input.addEventListener('focus', () => {
                initLogger.debug('Input focused');
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
        this.calendar.addEventListener('click', async (e) => {
            const target = e.target as HTMLElement;
            // Stop propagation to prevent "close on outside click" from firing
            e.stopPropagation();

            const action = target.dataset.action;
            const monthIndexAttr = target.dataset.monthIndex;
            const monthIndex = monthIndexAttr ? parseInt(monthIndexAttr) : 0;

            if (action === 'prev') this.prevMonth(monthIndex);
            else if (action === 'next') this.nextMonth(monthIndex);
            else if (action === 'toggle-rolling') this.toggleRollingSelector(monthIndex);
            else if (action === 'today') this.selectToday();
            else if (action === 'clear') this.clearSelection();
            else if (action === 'apply') this.apply();
            else if (target.closest('.drp-date-picker__day:not(.drp-date-picker__day--disabled)')) {
                await this.selectDay(target.closest('.drp-date-picker__day') as HTMLElement);
            }
            else if (target.closest('[data-year]')) {
                const yearElement = target.closest('[data-year]') as HTMLElement;
                // Ignore clicks on disabled years
                if (yearElement.classList.contains('drp-date-picker__rolling-item--disabled')) {
                    return;
                }
                const year = yearElement.dataset.year;
                const monthIdx = yearElement.dataset.monthIndex;
                if (year && monthIdx) {
                    this.selectYear(parseInt(year), parseInt(monthIdx));
                }
            }
            else if (target.closest('[data-month]')) {
                const monthElement = target.closest('[data-month]') as HTMLElement;
                // Ignore clicks on disabled months
                if (monthElement.classList.contains('drp-date-picker__rolling-item--disabled')) {
                    return;
                }
                const month = monthElement.dataset.month;
                const monthIdx = monthElement.dataset.monthIndex;
                if (month && monthIdx) {
                    this.selectMonth(parseInt(month), parseInt(monthIdx));
                }
            }
        });

        // Tooltip event delegation (for both days and badge cells)
        this.calendar.addEventListener('mouseenter', (e) => {
            const target = e.target as HTMLElement;
            const day = target.closest('.drp-date-picker__day');
            const badgeCell = target.closest('.drp-date-picker__badge-cell');

            const element = day || badgeCell;
            if (element && element instanceof HTMLElement) {
                const tooltip = element.dataset.tooltip;
                if (tooltip) {
                    this.showTooltip(element, tooltip);
                }
            }
        }, true); // Use capture phase to catch events on child elements

        this.calendar.addEventListener('mouseleave', (e) => {
            const target = e.target as HTMLElement;
            const day = target.closest('.drp-date-picker__day');
            const badgeCell = target.closest('.drp-date-picker__badge-cell');

            const element = day || badgeCell;
            if (element && this.currentTooltipTarget === element) {
                this.hideTooltip();
            }
        }, true);

        // Track calendar focus for keyboard navigation (especially important for inline mode)
        this.calendar.addEventListener('mousedown', (e) => {
            this.isCalendarActive = true;
            e.stopPropagation(); // Prevent document listener from immediately resetting active state
        });

        this.calendar.addEventListener('focusin', () => {
            this.isCalendarActive = true;
        });

        // Deactivate when clicking outside calendar
        // Use capture phase to ensure proper event ordering
        document.addEventListener('mousedown', (e) => {
            if (!this.calendar.contains(e.target as Node)) {
                this.isCalendarActive = false;
            }
        }, true);

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            // Only respond if calendar is visible AND active (has focus)
            if (!this.calendar.classList.contains('drp-date-picker--visible')) return;
            if (!this.isCalendarActive) return;

            initLogger.debug('Keydown', e.key, 'Ctrl:', e.ctrlKey, 'Meta:', e.metaKey, 'Shift:', e.shiftKey, 'Alt:', e.altKey);

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
                    navigationLogger.debug('Ctrl+Left: Navigate to previous month');
                    const currentDayIndex = this.focusedDayIndex;
                    this.prevMonth(this.activeMonthIndex);
                    setTimeout(() => {
                        const daysContainer = this.calendar.querySelector(`.drp-date-picker__days[data-month-index="${this.activeMonthIndex}"]`);
                        const newDays = daysContainer?.querySelectorAll('.drp-date-picker__day:not(.drp-date-picker__day--other-month)');
                        if (newDays) {
                            // Try to maintain same day index, or use last day if month is shorter
                            this.focusedDayIndex = Math.min(currentDayIndex !== null ? currentDayIndex : 0, newDays.length - 1);
                            newDays[this.focusedDayIndex]?.classList.add('drp-date-picker__day--focused');
                            newDays[this.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
                        }
                    }, 0);
                } else {
                    this.moveFocus(-1);
                }
                e.preventDefault();
            }
            else if (e.key === 'ArrowRight') {
                if (e.ctrlKey || e.metaKey) {
                    // Ctrl+Right: Next month (same as PageDown - maintain day position)
                    navigationLogger.debug('Ctrl+Right: Navigate to next month');
                    const currentDayIndex = this.focusedDayIndex;
                    this.nextMonth(this.activeMonthIndex);
                    setTimeout(() => {
                        const daysContainer = this.calendar.querySelector(`.drp-date-picker__days[data-month-index="${this.activeMonthIndex}"]`);
                        const newDays = daysContainer?.querySelectorAll('.drp-date-picker__day:not(.drp-date-picker__day--other-month)');
                        if (newDays) {
                            // Try to maintain same day index, or use last day if month is shorter
                            this.focusedDayIndex = Math.min(currentDayIndex !== null ? currentDayIndex : 0, newDays.length - 1);
                            newDays[this.focusedDayIndex]?.classList.add('drp-date-picker__day--focused');
                            newDays[this.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
                        }
                    }, 0);
                } else {
                    this.moveFocus(1);
                }
                e.preventDefault();
            }
            else if (e.key === 'Enter') {
                if (this.focusedDayIndex !== null) {
                    // Select the focused day
                    const daysContainer = this.calendar.querySelector(`.drp-date-picker__days[data-month-index="${this.activeMonthIndex}"]`);
                    const days = daysContainer?.querySelectorAll('.drp-date-picker__day:not(.drp-date-picker__day--other-month)');
                    const day = days?.[this.focusedDayIndex];
                    if (day) {
                        (day as HTMLElement).click();
                    }
                } else {
                    // No focused day - close calendar as confirmation
                    this.hide();
                }
                e.preventDefault();
            }
            else if (e.key === 'Tab') {
                // Switch between columns in multi-month mode
                if (this.options.visibleMonthsCount > 1) {
                    const direction = e.shiftKey ? -1 : 1;
                    const newMonthIndex = this.activeMonthIndex + direction;

                    // Clamp to valid range
                    if (newMonthIndex >= 0 && newMonthIndex < this.monthDates.length) {
                        navigationLogger.debug(`Tab: switching from Col${this.activeMonthIndex} to Col${newMonthIndex}`);

                        // Get current focused day index before switching
                        const currentFocusedIndex = this.focusedDayIndex ?? 0;

                        // Switch to new column
                        this.activeMonthIndex = newMonthIndex;

                        // Try to maintain same day index, or clamp to valid range
                        const newDaysContainer = this.calendar.querySelector(`.drp-date-picker__days[data-month-index="${this.activeMonthIndex}"]`);
                        if (newDaysContainer) {
                            const newDays = newDaysContainer.querySelectorAll('.drp-date-picker__day:not(.drp-date-picker__day--other-month)');
                            this.focusedDayIndex = Math.min(currentFocusedIndex, newDays.length - 1);
                            navigationLogger.debug(`Col${this.activeMonthIndex} Tab: set focusedDayIndex to ${this.focusedDayIndex}`);
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
                    const daysContainer = this.calendar.querySelector(`.drp-date-picker__days[data-month-index="${this.activeMonthIndex}"]`);
                    const days = daysContainer?.querySelectorAll('.drp-date-picker__day:not(.drp-date-picker__day--other-month)');
                    if (days) {
                        const todayIndex = Array.from(days).findIndex(day => day.classList.contains('drp-date-picker__day--today'));
                        if (todayIndex !== -1) {
                            this.focusedDayIndex = todayIndex;
                            days[todayIndex].classList.add('drp-date-picker__day--focused');
                            days[todayIndex].scrollIntoView({ block: 'nearest' });
                        }
                    }
                }, 0);
                e.preventDefault();
            }
            else if (e.key === 'PageUp') {
                // Go to previous month in active column, same day position
                const currentDayIndex = this.focusedDayIndex;
                this.prevMonth(this.activeMonthIndex);
                setTimeout(() => {
                    const daysContainer = this.calendar.querySelector(`.drp-date-picker__days[data-month-index="${this.activeMonthIndex}"]`);
                    const newDays = daysContainer?.querySelectorAll('.drp-date-picker__day:not(.drp-date-picker__day--other-month)');
                    if (newDays) {
                        // Try to maintain same day index, or use last day if month is shorter
                        this.focusedDayIndex = Math.min(currentDayIndex !== null ? currentDayIndex : 0, newDays.length - 1);
                        newDays[this.focusedDayIndex]?.classList.add('drp-date-picker__day--focused');
                        newDays[this.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
                    }
                }, 0);
                e.preventDefault();
            }
            else if (e.key === 'PageDown') {
                // Go to next month in active column, same day position
                const currentDayIndex = this.focusedDayIndex;
                this.nextMonth(this.activeMonthIndex);
                setTimeout(() => {
                    const daysContainer = this.calendar.querySelector(`.drp-date-picker__days[data-month-index="${this.activeMonthIndex}"]`);
                    const newDays = daysContainer?.querySelectorAll('.drp-date-picker__day:not(.drp-date-picker__day--other-month)');
                    if (newDays) {
                        // Try to maintain same day index, or use last day if month is shorter
                        this.focusedDayIndex = Math.min(currentDayIndex !== null ? currentDayIndex : 0, newDays.length - 1);
                        newDays[this.focusedDayIndex]?.classList.add('drp-date-picker__day--focused');
                        newDays[this.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
                    }
                }, 0);
                e.preventDefault();
            }
            else if (e.key === 'Home') {
                navigationLogger.debug('Home key pressed, Ctrl:', e.ctrlKey, 'Meta:', e.metaKey);
                const currentYear = this.monthDates[this.activeMonthIndex].getFullYear();
                const currentMonth = this.monthDates[this.activeMonthIndex].getMonth();

                if (e.ctrlKey || e.metaKey) {
                    navigationLogger.debug('Ctrl+Home: Navigate to year start');
                    // Ctrl+Home: Go to January 1st of current year
                    // If already there, go to January 1st of previous year
                    const isJanuary = currentMonth === 0;
                    const isFirstDay = this.focusedDayIndex === 0;

                    if (isJanuary && isFirstDay) {
                        // Already at Jan 1 - go to previous year
                        navigationLogger.debug('Already at Jan 1, going to previous year');
                        this.monthDates[this.activeMonthIndex] = new Date(currentYear - 1, 0, 1);
                    } else {
                        // Go to Jan 1 of current year
                        navigationLogger.debug('Going to Jan 1 of current year');
                        this.monthDates[this.activeMonthIndex] = new Date(currentYear, 0, 1);
                    }
                    this.renderCalendar();
                    setTimeout(() => {
                        const daysContainer = this.calendar.querySelector(`.drp-date-picker__days[data-month-index="${this.activeMonthIndex}"]`);
                        const days = daysContainer?.querySelectorAll('.drp-date-picker__day:not(.drp-date-picker__day--other-month)');
                        if (days) {
                            this.focusedDayIndex = 0;
                            days[0]?.classList.add('drp-date-picker__day--focused');
                            days[0]?.scrollIntoView({ block: 'nearest' });
                        }
                    }, 0);
                } else {
                    navigationLogger.debug('Home: Navigate to first day (cycles to previous month if already there)');
                    // Home: Go to first day of current month
                    // If already on first day, go to first day of previous month
                    const isFirstDay = this.focusedDayIndex === 0;

                    if (isFirstDay) {
                        // Already on first day - go to previous month, first day
                        navigationLogger.debug('Already on first day, going to previous month');
                        this.prevMonth(this.activeMonthIndex);
                        setTimeout(() => {
                            const daysContainer = this.calendar.querySelector(`.drp-date-picker__days[data-month-index="${this.activeMonthIndex}"]`);
                            const days = daysContainer?.querySelectorAll('.drp-date-picker__day:not(.drp-date-picker__day--other-month)');
                            if (days) {
                                this.focusedDayIndex = 0;
                                this.calendar.querySelectorAll('.drp-date-picker__day--focused').forEach(d => d.classList.remove('drp-date-picker__day--focused'));
                                days[0]?.classList.add('drp-date-picker__day--focused');
                                days[0]?.scrollIntoView({ block: 'nearest' });
                            }
                        }, 0);
                    } else {
                        // Go to first day of current month
                        this.focusedDayIndex = 0;
                        const daysContainer = this.calendar.querySelector(`.drp-date-picker__days[data-month-index="${this.activeMonthIndex}"]`);
                        const days = daysContainer?.querySelectorAll('.drp-date-picker__day:not(.drp-date-picker__day--other-month)');
                        if (days) {
                            this.calendar.querySelectorAll('.drp-date-picker__day--focused').forEach(d => d.classList.remove('drp-date-picker__day--focused'));
                            days[0]?.classList.add('drp-date-picker__day--focused');
                            days[0]?.scrollIntoView({ block: 'nearest' });
                        }
                    }
                }
                e.preventDefault();
            }
            else if (e.key === 'End') {
                navigationLogger.debug('End key pressed, Ctrl:', e.ctrlKey, 'Meta:', e.metaKey);
                const currentYear = this.monthDates[this.activeMonthIndex].getFullYear();
                const currentMonth = this.monthDates[this.activeMonthIndex].getMonth();

                if (e.ctrlKey || e.metaKey) {
                    navigationLogger.debug('Ctrl+End: Navigate to year end');
                    // Ctrl+End: Go to December 31st of current year
                    // If already there, go to December 31st of next year
                    const isDecember = currentMonth === 11;

                    // Check if we're at the last day
                    const daysContainer = this.calendar.querySelector(`.drp-date-picker__days[data-month-index="${this.activeMonthIndex}"]`);
                    const days = daysContainer?.querySelectorAll('.drp-date-picker__day:not(.drp-date-picker__day--other-month)');
                    const isLastDay = days && this.focusedDayIndex === days.length - 1;

                    if (isDecember && isLastDay) {
                        // Already at Dec 31 - go to next year
                        this.monthDates[this.activeMonthIndex] = new Date(currentYear + 1, 11, 31);
                    } else {
                        // Go to Dec 31 of current year
                        this.monthDates[this.activeMonthIndex] = new Date(currentYear, 11, 31);
                    }
                    this.renderCalendar();
                    setTimeout(() => {
                        const newContainer = this.calendar.querySelector(`.drp-date-picker__days[data-month-index="${this.activeMonthIndex}"]`);
                        const newDays = newContainer?.querySelectorAll('.drp-date-picker__day:not(.drp-date-picker__day--other-month)');
                        if (newDays) {
                            this.focusedDayIndex = newDays.length - 1;
                            newDays[this.focusedDayIndex]?.classList.add('drp-date-picker__day--focused');
                            newDays[this.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
                        }
                    }, 0);
                } else {
                    navigationLogger.debug('End: Navigate to last day (cycles to next month if already there)');
                    // End: Go to last day of current month
                    // If already on last day, go to last day of next month
                    const daysContainer = this.calendar.querySelector(`.drp-date-picker__days[data-month-index="${this.activeMonthIndex}"]`);
                    const days = daysContainer?.querySelectorAll('.drp-date-picker__day:not(.drp-date-picker__day--other-month)');
                    if (!days) return;

                    const isLastDay = this.focusedDayIndex === days.length - 1;

                    if (isLastDay) {
                        // Already on last day - go to next month, last day
                        navigationLogger.debug('Already on last day, going to next month');
                        this.nextMonth(this.activeMonthIndex);
                        setTimeout(() => {
                            const daysContainer = this.calendar.querySelector(`.drp-date-picker__days[data-month-index="${this.activeMonthIndex}"]`);
                            const days = daysContainer?.querySelectorAll('.drp-date-picker__day:not(.drp-date-picker__day--other-month)');
                            if (days) {
                                this.focusedDayIndex = days.length - 1;
                                this.calendar.querySelectorAll('.drp-date-picker__day--focused').forEach(d => d.classList.remove('drp-date-picker__day--focused'));
                                days[this.focusedDayIndex]?.classList.add('drp-date-picker__day--focused');
                                days[this.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
                            }
                        }, 0);
                    } else {
                        // Go to last day of current month
                        this.focusedDayIndex = days.length - 1;
                        this.calendar.querySelectorAll('.drp-date-picker__day--focused').forEach(d => d.classList.remove('drp-date-picker__day--focused'));
                        days[this.focusedDayIndex]?.classList.add('drp-date-picker__day--focused');
                        days[this.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
                    }
                }
                e.preventDefault();
            }
        });

        // Close on outside click (only for floating mode)
        if (this.options.positioningMode === 'floating') {
            this.clickOutsideHandler = (e: MouseEvent) => {
                // Get the actual target (works with Shadow DOM)
                const path = e.composedPath();
                const actualTarget = path[0] as HTMLElement;

                // Don't hide if clicking the calendar, input, or calendar button
                const clickedCalendar = path.includes(this.calendar);
                const clickedInput = this.input && path.includes(this.input);
                const isCalendarButton = actualTarget.closest?.('[data-calendar-button]');

                if (!clickedCalendar && !clickedInput && !isCalendarButton) {
                    this.hide();
                }
            };
            document.addEventListener('click', this.clickOutsideHandler);
        }
    }

    // Helper methods
    parseFormat(formatString: string): FormatInfo {
        // Parse format string like "YYYY-MM-DD" or "DD.MM.YYYY"
        // Returns structure with positions and separator
        const parts: FormatInfo['parts'] = {};
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

    formatDate(date: Date | null): string {
        if (!date) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        // Use configured format
        const { format, separator, parts } = this.formatInfo;
        const values: (string | number)[] = [];

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

    destroy() {
        if (this.clickOutsideHandler) {
            document.removeEventListener('click', this.clickOutsideHandler);
        }
        this.calendar.remove();
        if (this.tooltip) {
            this.tooltip.remove();
        }
    }

    // UI methods - wrappers for pure functions
    show() { return UI.show(this); }
    hide() { return UI.hide(this); }
    toggle() { return UI.toggle(this); }
    position() { return UI.position(this); }
    showTooltip(element: HTMLElement, content: string) { return UI.showTooltip(this, element, content); }
    hideTooltip() { return UI.hideTooltip(this); }

    // Rendering methods - wrappers for pure functions
    renderCalendar() { return Rendering.renderCalendar(this); }
    renderNormalView(monthIndex: number) { return Rendering.renderNormalView(this, monthIndex); }
    renderDays(monthIndex: number, date: Date) { return Rendering.renderDays(this, monthIndex, date); }
    renderRollingSelector(monthIndex: number) { return Rendering.renderRollingSelector(this, monthIndex); }
    updateSummary() { return Rendering.updateSummary(this); }
    updateSummaryWithPreview() { return Rendering.updateSummaryWithPreview(this); }
    updateDragPreview() { return Rendering.updateDragPreview(this); }

    // Navigation methods - wrappers for pure functions
    toggleRollingSelector(monthIndex: number) { return Navigation.toggleRollingSelector(this, monthIndex); }
    selectYear(year: number, monthIndex: number) { return Navigation.selectYear(this, year, monthIndex); }
    selectMonth(month: number, monthIndex: number) { return Navigation.selectMonth(this, month, monthIndex); }
    checkAndResolveCollisions(changedIdx: number) { return Navigation.checkAndResolveCollisions(this, changedIdx); }
    prevMonth(monthIndex: number) { return Navigation.prevMonth(this, monthIndex); }
    nextMonth(monthIndex: number) { return Navigation.nextMonth(this, monthIndex); }
    findNextEnabledDayIndex(startIndex: number, offset: number, days: NodeListOf<Element>, monthIndex: number) { return Navigation.findNextEnabledDayIndex(this, startIndex, offset, days, monthIndex); }
    moveFocus(offset: number) { return Navigation.moveFocus(this, offset); }

    // Selection methods - wrappers for pure functions
    async selectDay(dayElement: HTMLElement) { return await Selection.selectDay(this, dayElement); }
    selectToday() { return Selection.selectToday(this); }
    clearSelection() { return Selection.clearSelection(this); }
    apply() { return Selection.apply(this); }

    // Interaction methods - wrappers for pure functions
    initDragListeners() { return Interaction.initDragListeners(this); }
    startDrag(event: MouseEvent, type: 'start' | 'end') { return Interaction.startDrag(this, event, type); }
    onDragMove(event: MouseEvent) { return Interaction.onDragMove(this, event); }
    async onDragEnd(event: MouseEvent) { return await Interaction.onDragEnd(this, event); }
    findNearestEnabledDate(targetDate: Date, preferredDirection: string = 'forward') { return Interaction.findNearestEnabledDate(this, targetDate, preferredDirection); }
    handleInputMask(event: Event) { return Interaction.handleInputMask(this, event); }
    applyMask(value: string) { return Interaction.applyMask(this, value); }
    applyRangeMask(value: string) { return Interaction.applyRangeMask(this, value); }
    handleKeydown(event: KeyboardEvent) { return Interaction.handleKeydown(this, event); }
    handlePaste(event: ClipboardEvent) { return Interaction.handlePaste(this, event); }
    updateCalendarFromInput() { return Interaction.updateCalendarFromInput(this); }
    parseAndUpdateSingleDate(value: string, dateType: string = 'single') { return Interaction.parseAndUpdateSingleDate(this, value, dateType); }
}

// Export the class
export { PureDatePicker };
