/**
 * Web DateRangePicker
 *
 * Lightweight date picker with excellent keyboard navigation
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

import type { DatePickerOptions, DateRange, FormatInfo, MonthDisplay, DecoratedDate, DateInfo, LocaleStrings, ActionButton } from './types';
import * as Validation from './date-picker-validation';
import * as Rendering from './date-picker-rendering';
import * as Navigation from './date-picker-navigation';
import * as Selection from './date-picker-selection';
import * as Interaction from './date-picker-interaction';
import * as UI from './date-picker-ui';
import { resolveLocale, getLocaleStrings, getWeekdayNames, getMonthNames } from './date-picker-locales';
import { drpLogger, navigationLogger, enableLogging, disableLogging } from './logger';
import { createScrollEventManager, createClickEventManager, type ScrollEventManager, type ClickEventManager, type ScrollSubscription, type ClickSubscription } from './modules';
// Import styles for static injection (only used when injectGlobalStyles is called)
import styles from './css/main.css?inline';

class DateRangePicker {
    // Static flag to track if styles have been injected
    private static stylesInjected: boolean = false;
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
    selectedRanges: DateRange[];
    selectedDates: Date[];
    pendingSelection: any; // Stores uncommitted selection when Apply button is required

    // State for deferred commit when Apply button is required
    originalInputValue: string | null = null; // Stores input value when calendar opens (for restore on close without Apply)
    committedDate: Date | null = null; // Last committed single date
    committedStartDate: Date | null = null; // Last committed range start
    committedEndDate: Date | null = null; // Last committed range end
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
    invalidRangeStart: Date | null;
    invalidRangeEnd: Date | null;
    autoScrollInterval: number | null;
    navInterval?: number | null;
    calendar!: HTMLElement;
    containerElement: HTMLElement;
    onDragMoveBound?: (event: MouseEvent) => void;
    onDragEndBound?: (event: MouseEvent) => void;
    private isFirstRender: boolean = true;
    private lockedPlacement?: string; // Store the initial placement to prevent jumping
    private calendarContentHeight?: number; // Store calendar height for rolling selector
    private calendarContentWidth?: number; // Store calendar width for rolling selector
    private isCalendarActive: boolean = false; // Track if this calendar is actively focused (for inline mode)

    // Async validation state
    private isValidating: boolean = false;
    private loadingOverlay?: HTMLElement;

    // Month change callback state
    private isMonthChanging: boolean = false;
    bulkMetadataCache: Map<string, DateInfo> | null = null;
    monthHeadersCache: Map<string, string> | null = null;

    // Unified navigation state
    private unifiedHeader?: HTMLElement;
    private unifiedRangeDisplay?: HTMLElement;
    private unifiedRollingSelector?: HTMLElement;
    private showingUnifiedRollingSelector: boolean = false;

    // Floating UI tooltips
    private tooltip?: HTMLElement;
    private tooltipArrow?: HTMLElement;
    private currentTooltipTarget?: HTMLElement;

    // Message area
    private messageElement?: HTMLElement;
    private messageAutoHideTimeout?: number;

    // Action button tooltips
    actionButtonTooltips = new Map<string, HTMLDivElement>();
    actionButtonTooltipCleanups = new Map<string, () => void>();
    actionsContainer: HTMLElement | null = null;

    // Event managers (Pub/Sub pattern)
    scrollEvents: ScrollEventManager;
    clickEvents: ClickEventManager;
    private scrollSubscriptions: ScrollSubscription[] = [];
    private clickSubscriptions: ClickSubscription[] = [];

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
            calendarOpenTrigger: options.calendarOpenTrigger || 'focus',
            onSelect: options.onSelect || undefined,
            container: this.containerElement,
            positioningMode: options.positioningMode || 'floating',
            monthLayout: options.monthLayout || 'horizontal',
            gridRows: options.gridRows,
            gridColumns: options.gridColumns,
            unifiedNavigation: options.unifiedNavigation || false,
            unifiedNavigationAnchorIndex: options.unifiedNavigationAnchorIndex ?? 0,
            unifiedHeaderInteractive: options.unifiedHeaderInteractive || false,
            getUnifiedHeaderCallback: options.getUnifiedHeaderCallback,
            getMonthHeaderCallback: options.getMonthHeaderCallback,
            weekStartDay: options.weekStartDay !== undefined ? options.weekStartDay : 'auto',
            minDate: options.minDate,
            maxDate: options.maxDate,
            initialDate: options.initialDate,
            disabledDates: options.disabledDates,
            disabledWeekdays: options.disabledWeekdays,
            specialDates: options.specialDates,
            getDateMetadataCallback: options.getDateMetadataCallback,
            disabledDatesHandling: options.disabledDatesHandling || 'allow',
            highlightDisabledInRange: options.highlightDisabledInRange !== undefined ? options.highlightDisabledInRange : true,
            locale: options.locale || 'auto',
            displayFormatMask: options.displayFormatMask,
            customStrings: options.customStrings,
            monthNames: options.monthNames,
            formatSummaryCallback: options.formatSummaryCallback,
            beforeDateSelectCallback: options.beforeDateSelectCallback,
            beforeMonthChangedCallback: options.beforeMonthChangedCallback,
            showDebugInfo: options.showDebugInfo || false,
            rollingYearRange: options.rollingYearRange,
            rollingMonthRange: options.rollingMonthRange,
            customStylesCallback: options.customStylesCallback,
            renderDayCallback: options.renderDayCallback,
            renderDayContentCallback: options.renderDayContentCallback,
            badgeTooltipCallback: options.badgeTooltipCallback,
            dayTooltipCallback: options.dayTooltipCallback,
            dateMember: options.dateMember,
            badgeTextMember: options.badgeTextMember,
            badgeClassMember: options.badgeClassMember,
            dayClassMember: options.dayClassMember,
            badgeTooltipMember: options.badgeTooltipMember,
            dayTooltipMember: options.dayTooltipMember,
            isDisabledMember: options.isDisabledMember,
            autoClose: options.autoClose || 'selection',
            closeOnScroll: options.closeOnScroll !== undefined ? options.closeOnScroll : true,
            actionButtons: options.actionButtons,
            showTodayButton: options.showTodayButton !== undefined ? options.showTodayButton : true,
            showClearButton: options.showClearButton !== undefined ? options.showClearButton : true,
            showApplyButton: options.showApplyButton !== undefined ? options.showApplyButton : (options.selectionMode === 'range' || options.selectionMode === 'multiple')
        };

        // Enable/disable logging based on showDebugInfo option
        if (this.options.showDebugInfo) {
            enableLogging();
        } else {
            disableLogging();
        }

        // Validate anchor index is within bounds
        if (this.options.unifiedNavigation && this.options.unifiedNavigationAnchorIndex !== undefined) {
            const maxIndex = this.options.visibleMonthsCount - 1;
            if (this.options.unifiedNavigationAnchorIndex < 0 || this.options.unifiedNavigationAnchorIndex > maxIndex) {
                console.warn(`unifiedNavigationAnchorIndex (${this.options.unifiedNavigationAnchorIndex}) out of bounds. Using 0.`);
                this.options.unifiedNavigationAnchorIndex = 0;
            }
        }

        // Detect/set week start day
        this.weekStartDay = Validation.detectWeekStartDay(this.options.weekStartDay);
        drpLogger.debug('Week starts on day:', this.weekStartDay);
        drpLogger.debug('disabledDatesHandling:', this.options.disabledDatesHandling);

        // Initialize internationalization
        this.locale = resolveLocale(this.options.locale);
        this.localeStrings = getLocaleStrings(this.locale, this.options.customStrings);
        this.weekdayNames = getWeekdayNames(this.locale);
        this.monthNames = this.options.monthNames || getMonthNames(this.locale);
        drpLogger.debug('Locale:', this.locale, 'Weekdays:', this.weekdayNames, 'Months:', this.monthNames);

        // Normalize date restrictions
        this.initializeDateRestrictions();

        // Parse format to understand structure
        this.formatInfo = this.parseFormat(this.options.dateFormatMask);
        drpLogger.debug('Format info:', this.formatInfo);

        // Track previous input value for deletion detection
        this._previousInputValue = '';

        this.currentDate = new Date();

        // Determine initial display date
        let initialDisplayDate: Date;
        if (this.options.initialDate) {
            // Use explicit initialDate if provided
            const parsedDate = Validation.normalizeDate(this.options.initialDate);
            initialDisplayDate = parsedDate || new Date();
            drpLogger.debug(`Using initialDate: ${initialDisplayDate.toISOString()}`);
        } else if (this.options.rollingYearRange || this.options.rollingMonthRange) {
            // If rolling ranges are set, use first allowed year/month
            const yearRange = this.getEffectiveYearRange();
            const monthRange = this.getEffectiveMonthRange();

            const year = yearRange.min;
            const month = monthRange.min - 1; // Convert to 0-based

            initialDisplayDate = new Date(year, month, 1);
            drpLogger.debug(`Using first allowed year/month as initial: ${initialDisplayDate.toISOString()}`);
        } else if (this.normalizedMinDate && this.normalizedMinDate > new Date()) {
            // If today is before minDate, start at minDate
            initialDisplayDate = new Date(this.normalizedMinDate);
            drpLogger.debug(`Using minDate as initial: ${initialDisplayDate.toISOString()}`);
        } else if (this.normalizedMaxDate && this.normalizedMaxDate < new Date()) {
            // If today is after maxDate, start at maxDate
            initialDisplayDate = new Date(this.normalizedMaxDate);
            drpLogger.debug(`Using maxDate as initial: ${initialDisplayDate.toISOString()}`);
        } else {
            // Default to current date
            initialDisplayDate = new Date();
            drpLogger.debug(`Using current date as initial: ${initialDisplayDate.toISOString()}`);
        }

        // Initialize separate dates for each month
        this.monthDates = [];
        for (let i = 0; i < this.options.visibleMonthsCount; i++) {
            const date = new Date(initialDisplayDate.getFullYear(), initialDisplayDate.getMonth() + i, 1);
            this.monthDates.push(date);
            drpLogger.debug(`monthDates[${i}] = ${date.getFullYear()}-${date.getMonth()+1}`);
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
        this.selectedRanges = [];
        this.selectedDates = [];
        this.pendingSelection = null;
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
        this.invalidRangeStart = null;
        this.invalidRangeEnd = null;
        this.autoScrollInterval = null;

        // Initialize event managers
        this.scrollEvents = createScrollEventManager();
        this.clickEvents = createClickEventManager();

        this.init();
    }

    init() {
        drpLogger.debug('Init called');
        this.createCalendar();

        // Initialize event managers
        this.scrollEvents.init();
        this.clickEvents.init(this.calendar, this.input);

        // Subscribe to events
        this.setupEventSubscriptions();

        // Only attach input listeners if we have an input element
        if (this.input) {
            this.attachInputListeners();

            // Parse any pre-filled value in the input
            if (this.input.value) {
                drpLogger.debug('Parsing pre-filled value:', this.input.value);
                this.updateCalendarFromInput();
            }
        }

        // For inline mode, render and show the calendar immediately
        if (this.options.positioningMode === 'inline') {
            this.renderCalendar();
            this.calendar.classList.add('drp-date-picker--visible', 'drp-date-picker--inline');
            this.isCalendarActive = true; // Make inline calendar keyboard-accessible immediately
            this.isFirstRender = false;

            // Call beforeMonthChangedCallback for initial month load
            Navigation.handleInitialMonthLoad(this);
        }
        // Note: for floating mode, renderCalendar() is called on first show() instead of here
        // to avoid rendering days before the calendar is displayed

        drpLogger.debug('Init complete');
    }

    /**
     * Set up event subscriptions using the pub/sub event managers
     */
    private setupEventSubscriptions() {
        // Subscribe to window scroll - close calendar when scrolling the page (floating mode only)
        const windowScrollSub = this.scrollEvents.subscribe('window', () => {
            if (this.options.positioningMode === 'floating' && this.isOpen) {
                // Check if scroll close is disabled globally
                if (this.options.closeOnScroll === false) {
                    return;
                }

                // Don't close if Apply button is required (user needs to explicitly apply/cancel)
                if (this.requiresApplyButton()) {
                    drpLogger.debug('Window scroll detected - NOT closing (Apply button required)');
                    return;
                }

                // Don't close if a message is visible (user needs to see it)
                if (this.messageElement?.classList.contains('drp-date-picker__message--visible')) {
                    drpLogger.debug('Window scroll detected - NOT closing (message visible)');
                    return;
                }

                drpLogger.debug('Window scroll detected - closing calendar');
                this.hide();
            }
        });
        this.scrollSubscriptions.push(windowScrollSub);

        // Subscribe to outside clicks - close calendar or rolling selectors
        const outsideClickSub = this.clickEvents.subscribe('outsideClick', (ctx) => {
            drpLogger.debug('Outside click detected', ctx.target);

            if (this.options.positioningMode === 'floating') {
                // Floating mode: close entire calendar
                this.hide();
            } else {
                // Inline/fixed/absolute mode: close only rolling selectors
                let needsRender = false;

                // Close any open individual selectors
                for (let i = 0; i < this.showingRollingSelector.length; i++) {
                    if (this.showingRollingSelector[i]) {
                        this.showingRollingSelector[i] = false;
                        needsRender = true;
                    }
                }

                // Close unified selector if open
                if (this.showingUnifiedRollingSelector) {
                    this.showingUnifiedRollingSelector = false;
                    needsRender = true;
                }

                // Re-render to apply closed state
                if (needsRender) {
                    this.renderCalendar();
                }
            }
        });
        this.clickSubscriptions.push(outsideClickSub);

        // Subscribe to calendar clicks - track active state
        const calendarClickSub = this.clickEvents.subscribe('calendarClick', () => {
            this.isCalendarActive = true;
        });
        this.clickSubscriptions.push(calendarClickSub);
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
            const dateMember = this.options.dateMember || 'date';
            this.options.specialDates.forEach(specialDate => {
                const date = Validation.normalizeDate(specialDate[dateMember]);
                if (date) {
                    const key = Validation.formatDateKey(date);
                    this.normalizedSpecialDates.set(key, specialDate);
                } else {
                    console.warn('[Special Dates] Failed to normalize date:', specialDate[dateMember]);
                }
            });
        }
    }

    /**
     * Get effective year range considering all constraints
     * Returns the year range that should be enforced for date validation and navigation
     * Considers: rollingYearRange option, minDate/maxDate, or defaults to today ± 1
     */
    getEffectiveYearRange(): { min: number, max: number } {
        const todayYear = new Date().getFullYear();
        return Rendering.parseYearRange(this.options.rollingYearRange, todayYear, this);
    }

    /**
     * Get effective month range considering all constraints
     * Returns the month range that should be enforced for date validation and navigation
     * Considers: rollingMonthRange option, or defaults to all months (1-12)
     */
    getEffectiveMonthRange(): { min: number, max: number } {
        return Rendering.parseMonthRange(this.options.rollingMonthRange);
    }
    /**
     * Render action buttons based on configuration
     * Implements priority system matching web-multiselect:
     * - Visibility: isVisibleCallback → isVisible → true (default visible)
     * - Disabled: isDisabledCallback → isDisabled → false (default enabled)
     * - Text: getTextCallback → text (required)
     * - CSS: getClassCallback → cssClass → ''
     * - Tooltip: getTooltipCallback → tooltip → undefined
     */
    private renderButtons(container: HTMLElement): void {
        // Destroy all existing button tooltips before re-rendering
        this.destroyAllActionButtonTooltips();

        container.innerHTML = ''; // Clear existing buttons

        // Store container reference for re-rendering
        this.actionsContainer = container;

        // Use custom action buttons if provided, otherwise use default buttons
        const buttons: ActionButton[] = this.options.actionButtons || this.getDefaultButtons();

        buttons.forEach(button => {
            // Priority 1: Check dynamic visibility callback
            if (button.isVisibleCallback !== undefined) {
                if (!button.isVisibleCallback(this)) {
                    return; // Skip this button
                }
            }
            // Priority 2: Check static visibility flag
            else if (button.isVisible !== undefined) {
                if (!button.isVisible) {
                    return; // Skip this button
                }
            }
            // Priority 3: Default to visible (no check needed)

            const buttonEl = document.createElement('button');
            buttonEl.className = `drp-date-picker__button drp-date-picker__button--${button.action}`;

            // Apply CSS classes (priority: callback → static → none)
            const cssClasses = button.getClassCallback
                ? button.getClassCallback(this)
                : button.cssClass;
            if (cssClasses) {
                if (Array.isArray(cssClasses)) {
                    buttonEl.classList.add(...cssClasses);
                } else {
                    buttonEl.classList.add(cssClasses);
                }
            }

            // Apply text (priority: callback → static)
            const buttonText = button.getTextCallback
                ? button.getTextCallback(this)
                : button.text;
            buttonEl.innerHTML = buttonText;

            // Tooltip will be handled by attachActionButtonTooltips() after rendering

            // Apply disabled state (priority: callback → static → false)
            const isDisabled = button.isDisabledCallback
                ? button.isDisabledCallback(this)
                : (button.isDisabled ?? false);
            if (isDisabled) {
                buttonEl.disabled = true;
            }

            buttonEl.dataset.action = button.action;

            // Store custom onClick handler if provided
            if (button.onClick) {
                (buttonEl as any)._customOnClick = button.onClick;
            }

            container.appendChild(buttonEl);
        });

        // Attach Floating UI tooltips after rendering
        this.attachActionButtonTooltips();
    }

    /**
     * Get default buttons based on options
     */
    private getDefaultButtons(): ActionButton[] {
        const buttons: ActionButton[] = [];

        // Today button
        if (this.options.showTodayButton) {
            buttons.push({
                action: 'today',
                text: this.localeStrings.today
            });
        }

        // Clear button
        if (this.options.showClearButton) {
            buttons.push({
                action: 'clear',
                text: this.localeStrings.clear
            });
        }

        // Apply button (for range and multiple modes)
        if (this.options.showApplyButton) {
            buttons.push({
                action: 'apply',
                text: this.localeStrings.apply
            });
        }

        return buttons;
    }

    /**
     * Attach Floating UI tooltips to action buttons
     */
    private attachActionButtonTooltips(): void {
        if (!this.actionsContainer) return;

        const actionButtons = this.actionsContainer.querySelectorAll('.drp-date-picker__action');

        actionButtons.forEach((button: Element) => {
            const buttonElement = button as HTMLElement;
            const action = buttonElement.dataset.action;
            if (!action) return;

            // Find the action button config to get tooltip
            const buttons: ActionButton[] = this.options.actionButtons || this.getDefaultButtons();
            const actionConfig = buttons.find(btn => btn.action === action);

            if (!actionConfig) return;

            // Get tooltip from callback or static property (PRIORITY SYSTEM)
            let tooltipText: string | undefined;
            if (actionConfig.getTooltipCallback) {
                tooltipText = actionConfig.getTooltipCallback(this);
            } else {
                tooltipText = actionConfig.tooltip;
            }

            if (!tooltipText) return;

            // Create unique ID for this button
            const uniqueId = `action-${action}-${Date.now()}-${Math.random()}`;
            this.createActionButtonTooltip(buttonElement, tooltipText, uniqueId);
        });
    }

    /**
     * Create a Floating UI tooltip for an action button
     */
    private createActionButtonTooltip(button: HTMLElement, tooltipText: string, uniqueId: string): void {
        const tooltip = document.createElement('div');
        tooltip.className = 'drp-date-picker__tooltip'; // Reuse existing tooltip styling
        tooltip.textContent = tooltipText;

        const container = this.options.container || document.body;
        container.appendChild(tooltip);

        this.actionButtonTooltips.set(uniqueId, tooltip);

        // Setup hover handlers with delay
        let showTimeout: number;
        let hideTimeout: number;

        const showTooltip = () => {
            clearTimeout(hideTimeout);
            showTimeout = window.setTimeout(() => {
                tooltip.classList.add('drp-date-picker__tooltip--visible');
                this.positionActionButtonTooltip(button, tooltip, uniqueId);
            }, 300);
        };

        const hideTooltip = () => {
            clearTimeout(showTimeout);
            hideTimeout = window.setTimeout(() => {
                tooltip.classList.remove('drp-date-picker__tooltip--visible');
                const cleanup = this.actionButtonTooltipCleanups.get(uniqueId);
                if (cleanup) {
                    cleanup();
                    this.actionButtonTooltipCleanups.delete(uniqueId);
                }
            }, 100);
        };

        button.addEventListener('mouseenter', showTooltip);
        button.addEventListener('mouseleave', hideTooltip);
    }

    /**
     * Position action button tooltip using Floating UI
     */
    private async positionActionButtonTooltip(button: HTMLElement, tooltip: HTMLElement, uniqueId: string): Promise<void> {
        const { computePosition, flip, shift, offset, autoUpdate } = await import('@floating-ui/dom');

        const cleanup = autoUpdate(button, tooltip, () => {
            computePosition(button, tooltip, {
                placement: 'top',
                strategy: 'fixed',
                middleware: [
                    offset(8),
                    flip(),
                    shift({ padding: 8 })
                ]
            }).then(({ x, y }: { x: number, y: number }) => {
                Object.assign(tooltip.style, {
                    left: `${x}px`,
                    top: `${y}px`
                });
            });
        });

        this.actionButtonTooltipCleanups.set(uniqueId, cleanup);
    }

    /**
     * Destroy all action button tooltips
     */
    private destroyAllActionButtonTooltips(): void {
        // Clean up all tooltip positioning
        this.actionButtonTooltipCleanups.forEach(cleanup => cleanup());
        this.actionButtonTooltipCleanups.clear();

        // Remove all tooltip elements
        this.actionButtonTooltips.forEach(tooltip => tooltip.remove());
        this.actionButtonTooltips.clear();
    }

    private parseMonthRange(range: string): { min: number, max: number } {
        const [minStr, maxStr] = range.split('-');
        return { min: parseInt(minStr, 10), max: parseInt(maxStr, 10) };
    }

    /**
     * Check if a date should be disabled
     */
    isDateDisabledInternal(date: Date): boolean {
        // FIRST: Check rolling selector ranges (primary constraints)
        // Always check year range (considers rollingYearRange, minDate/maxDate, or defaults to today ± 1)
        const yearRange = this.getEffectiveYearRange();
        const year = date.getFullYear();
        if (year < yearRange.min || year > yearRange.max) {
            return true; // Outside allowed year range
        }

        // Always check month range (considers rollingMonthRange or defaults to all months 1-12)
        const monthRange = this.getEffectiveMonthRange();
        const month = date.getMonth() + 1; // Convert to 1-12
        if (month < monthRange.min || month > monthRange.max) {
            return true; // Outside allowed month range
        }

        // SECOND: Check secondary constraints (min/max dates, disabled dates, etc.)
        return Validation.isDateDisabled(
            date,
            this.normalizedMinDate,
            this.normalizedMaxDate,
            this.normalizedDisabledDates,
            this.options.disabledWeekdays
        );
    }

    /**
     * Get additional info for a date (special styling, labels, etc.)
     * Priority: bulkMetadataCache > callback > specialDates
     */
    getDateInfoInternal(date: Date): DateInfo | null {
        const dateKey = Validation.formatDateKey(date);

        // 1. Check bulk metadata cache FIRST (highest priority - from beforeMonthChangedCallback)
        if (this.bulkMetadataCache && this.bulkMetadataCache.has(dateKey)) {
            const cachedInfo = this.bulkMetadataCache.get(dateKey)!;
            return {
                ...cachedInfo,
                isDisabled: cachedInfo.isDisabled !== undefined ? cachedInfo.isDisabled : this.isDateDisabledInternal(date)
            };
        }

        // 2. Check callback SECOND (per-day callback)
        if (this.options.getDateMetadataCallback) {
            const customInfo = this.options.getDateMetadataCallback(date);
            if (customInfo) {
                return {
                    ...customInfo,
                    isDisabled: customInfo.isDisabled !== undefined ? customInfo.isDisabled : this.isDateDisabledInternal(date)
                };
            }
        }

        // 3. Check specialDates THIRD (static array with member mapping)
        if (this.normalizedSpecialDates.has(dateKey)) {
            const specialDate = this.normalizedSpecialDates.get(dateKey)!;

            // Use member mapping with defaults
            const badgeTextMember = this.options.badgeTextMember || 'badgeText';
            const badgeClassMember = this.options.badgeClassMember || 'badgeClass';
            const dayClassMember = this.options.dayClassMember || 'dayClass';
            const badgeTooltipMember = this.options.badgeTooltipMember || 'badgeTooltip';
            const dayTooltipMember = this.options.dayTooltipMember || 'dayTooltip';
            const isDisabledMember = this.options.isDisabledMember || 'isDisabled';

            return {
                isDisabled: specialDate[isDisabledMember] !== undefined ? specialDate[isDisabledMember] : this.isDateDisabledInternal(date),
                badgeClass: specialDate[badgeClassMember],
                dayClass: specialDate[dayClassMember],
                badgeText: specialDate[badgeTextMember],
                badgeTooltip: specialDate[badgeTooltipMember],
                dayTooltip: specialDate[dayTooltipMember]
            };
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

    /**
     * Determine if events/callbacks should be deferred until Apply button click
     * @returns true if Apply button is required and events should be deferred
     */
    requiresApplyButton(): boolean {
        // Only defer selection commitment when autoClose is explicitly 'apply'
        return this.options.autoClose === 'apply';
    }

    /**
     * Determine if calendar should auto-close after selection
     * @returns true if calendar should auto-close
     */
    shouldAutoClose(): boolean {
        // Multiple mode never auto-closes on selection (inherently requires Apply or manual close)
        if (this.options.selectionMode === 'multiple') return false;

        return this.options.autoClose === 'selection';
    }

    createCalendar() {
        drpLogger.debug('Creating calendar');
        this.calendar = document.createElement('div');
        this.calendar.className = 'drp-date-picker';

        // Add unified navigation class if enabled
        if (this.options.unifiedNavigation) {
            this.calendar.classList.add('drp-date-picker--unified-nav');
        }

        // Create unified navigation header (if enabled)
        if (this.options.unifiedNavigation) {
            this.unifiedHeader = document.createElement('div');
            this.unifiedHeader.className = 'drp-date-picker__unified-header';

            // Conditionally make range display interactive
            const rangeClass = this.options.unifiedHeaderInteractive ? '' : ' drp-date-picker__unified-range--static';
            const rangeAction = this.options.unifiedHeaderInteractive ? ' data-action="toggle-unified-rolling"' : '';

            this.unifiedHeader.innerHTML = `
                <button class="drp-date-picker__nav drp-date-picker__nav--prev" data-action="unified-prev"></button>
                <div class="drp-date-picker__unified-range${rangeClass}"${rangeAction}></div>
                <button class="drp-date-picker__nav drp-date-picker__nav--next" data-action="unified-next"></button>
            `;

            // Create unified rolling selector
            this.unifiedRollingSelector = document.createElement('div');
            this.unifiedRollingSelector.className = 'drp-date-picker__unified-rolling-selector';
            this.unifiedRollingSelector.innerHTML = `
                <div class="drp-date-picker__rolling-list" data-list="years" data-unified="true"></div>
                <div class="drp-date-picker__rolling-list" data-list="months" data-unified="true"></div>
            `;

            this.calendar.appendChild(this.unifiedHeader);
            this.calendar.appendChild(this.unifiedRollingSelector);

            // Store reference to range display element
            this.unifiedRangeDisplay = this.unifiedHeader.querySelector('.drp-date-picker__unified-range') as HTMLElement;
        }

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

            // In unified mode, headers are static (non-interactive)
            // In non-unified mode, headers have navigation and rolling selector
            const headerHtml = this.options.unifiedNavigation
                ? `<div class="drp-date-picker__header drp-date-picker__header--static">
                    <div class="drp-date-picker__month-year"></div>
                </div>`
                : `<div class="drp-date-picker__header">
                    <button class="drp-date-picker__nav drp-date-picker__nav--prev" data-action="prev" data-month-index="${i}"></button>
                    <div class="drp-date-picker__month-year" data-action="toggle-rolling" data-month-index="${i}"></div>
                    <button class="drp-date-picker__nav drp-date-picker__nav--next" data-action="next" data-month-index="${i}"></button>
                </div>`;

            monthCalendar.innerHTML = `
                ${headerHtml}
                <div class="drp-date-picker__calendar-container">
                    <div class="drp-date-picker__rolling-selector" data-month-index="${i}">
                        <div class="drp-date-picker__rolling-list" data-list="years" data-month-index="${i}"></div>
                        <div class="drp-date-picker__rolling-list" data-list="months" data-month-index="${i}"></div>
                    </div>
                    <div class="drp-date-picker__weekdays"></div>
                    <div class="drp-date-picker__days" data-month-index="${i}"></div>
                </div>
            `;
            monthsContainer.appendChild(monthCalendar);
        }

        this.calendar.appendChild(monthsContainer);

        // Add message area (for validation feedback, errors, etc.)
        this.messageElement = document.createElement('div');
        this.messageElement.className = 'drp-date-picker__message';
        this.messageElement.innerHTML = `
            <span class="drp-date-picker__message-text"></span>
            <button class="drp-date-picker__message-close" data-action="close-message">&times;</button>
        `;
        this.calendar.appendChild(this.messageElement);

        // Add selection summary (for range mode)
        if (this.options.selectionMode === 'range') {
            const summary = document.createElement('div');
            summary.className = 'drp-date-picker__summary drp-date-picker__summary--hidden';
            this.calendar.appendChild(summary);
        }

        // Add actions at the bottom (only if there are buttons to show)
        const actions = document.createElement('div');
        actions.className = 'drp-date-picker__actions';
        this.renderButtons(actions);
        // Only append if there are actual buttons rendered
        if (actions.children.length > 0) {
            this.calendar.appendChild(actions);
        }

        this.containerElement.appendChild(this.calendar);
        drpLogger.debug('Calendar appended to container:', this.calendar);

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

        drpLogger.debug('Attaching input listeners');

        // Calendar trigger modes
        const triggerMode = this.options.calendarOpenTrigger || 'focus'; // default to 'focus' for backward compatibility

        if (triggerMode === 'focus') {
            // Open on focus only (not on click)
            this.input.addEventListener('focus', () => {
                drpLogger.debug('Input focused - opening calendar');
                this.show();
            });
        } else if (triggerMode === 'typing') {
            // Open when user starts typing
            this.input.addEventListener('input', (e) => {
                if (!this.calendar.classList.contains('drp-date-picker--visible') && this.input && this.input.value.length > 0) {
                    drpLogger.debug('User started typing - opening calendar');
                    this.show();
                }
            });
        }
        // 'manual' mode: no automatic trigger, calendar only opens via .show()/.toggle() methods

        // Input masking handlers (always attached regardless of trigger mode)
        this.input.addEventListener('input', (e) => this.handleInputMask(e));
        this.input.addEventListener('keydown', (e) => this.handleKeydown(e));
        this.input.addEventListener('paste', (e) => this.handlePaste(e));
    }

    attachCalendarListeners() {
        // Delegate all click events
        this.calendar.addEventListener('click', async (e) => {
            const target = e.target as HTMLElement;
            console.log('[click handler] clicked:', target.tagName, target.className, 'data-action:', target.dataset.action);
            // Stop propagation to prevent "close on outside click" from firing
            e.stopPropagation();

            const action = target.dataset.action;
            const monthIndexAttr = target.dataset.monthIndex;
            const monthIndex = monthIndexAttr ? parseInt(monthIndexAttr) : 0;

            // Check for custom action first (using closest to handle clicks on child elements)
            const customActionBtn = target.closest('[data-action="custom"]') as HTMLElement | null;
            if (customActionBtn) {
                // Collect all data-* attributes (except data-action)
                const dataAttributes: Record<string, string> = {};
                for (const [key, value] of Object.entries(customActionBtn.dataset)) {
                    if (key !== 'action') {
                        dataAttributes[key] = value;
                    }
                }

                // Fire custom-action event
                this.fireCustomActionEvent(dataAttributes);

                // Still call onClick callback if provided (for backward compatibility)
                const customOnClick = (customActionBtn as any)._customOnClick;
                if (customOnClick) {
                    await Promise.resolve(customOnClick(this));
                }
                return;
            }

            // Check if navigation button is disabled (respects rollingYearRange/rollingMonthRange boundaries)
            if (action === 'prev' || action === 'next' || action === 'unified-prev' || action === 'unified-next') {
                const button = target as HTMLButtonElement;
                if (button.disabled || button.classList.contains('drp-date-picker__nav--disabled')) {
                    return;
                }
            }

            if (action === 'prev') this.prevMonth(monthIndex);
            else if (action === 'next') this.nextMonth(monthIndex);
            else if (action === 'unified-prev') this.unifiedPrevMonth();
            else if (action === 'unified-next') this.unifiedNextMonth();
            else if (action === 'toggle-rolling') this.toggleRollingSelector(monthIndex);
            else if (action === 'toggle-unified-rolling') this.toggleUnifiedRollingSelector();
            else if (action === 'today') this.selectToday();
            else if (action === 'clear') this.clearSelection();
            else if (action === 'apply') this.apply();
            else if (action === 'close-message') this.hideMessage();
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

                // Check if this is unified navigation
                if (yearElement.dataset.unified === 'true') {
                    if (year) {
                        this.setUnifiedYear(parseInt(year));
                    }
                } else {
                    const monthIdx = yearElement.dataset.monthIndex;
                    if (year && monthIdx) {
                        this.selectYear(parseInt(year), parseInt(monthIdx));
                    }
                }
            }
            else if (target.closest('[data-month]')) {
                const monthElement = target.closest('[data-month]') as HTMLElement;
                // Ignore clicks on disabled months
                if (monthElement.classList.contains('drp-date-picker__rolling-item--disabled')) {
                    return;
                }
                const month = monthElement.dataset.month;

                // Check if this is unified navigation
                if (monthElement.dataset.unified === 'true') {
                    if (month) {
                        this.setUnifiedMonth(parseInt(month));
                    }
                } else {
                    const monthIdx = monthElement.dataset.monthIndex;
                    if (month && monthIdx) {
                        this.selectMonth(parseInt(month), parseInt(monthIdx));
                    }
                }
            }
            else {
                // Clicked somewhere else in calendar (not a handled element)
                // Check if click was outside rolling selector elements
                if (!target.closest('.drp-date-picker__rolling-selector') &&
                    !target.closest('.drp-date-picker__unified-rolling-selector')) {

                    let needsRender = false;

                    // Close any open individual selectors
                    for (let i = 0; i < this.showingRollingSelector.length; i++) {
                        if (this.showingRollingSelector[i]) {
                            this.showingRollingSelector[i] = false;
                            needsRender = true;
                        }
                    }

                    // Close unified selector if open
                    if (this.showingUnifiedRollingSelector) {
                        this.showingUnifiedRollingSelector = false;
                        needsRender = true;
                    }

                    // Re-render to apply closed state
                    if (needsRender) {
                        this.renderCalendar();
                    }
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
        // Note: Calendar click tracking is also handled by clickEvents manager
        this.calendar.addEventListener('focusin', () => {
            this.isCalendarActive = true;
        });

        // Note: Outside click deactivation is now handled by the clickEvents manager

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            // Only respond if calendar is visible AND active (has focus)
            if (!this.calendar.classList.contains('drp-date-picker--visible')) return;
            if (!this.isCalendarActive) return;

            drpLogger.debug('Keydown', e.key, 'Ctrl:', e.ctrlKey, 'Meta:', e.metaKey, 'Shift:', e.shiftKey, 'Alt:', e.altKey);

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
                Navigation.checkAndResolveCollisions(this, this.activeMonthIndex);
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
                    const yearRange = this.getEffectiveYearRange();
                    const monthRange = this.getEffectiveMonthRange();
                    const isJanuary = currentMonth === 0;
                    const isFirstDay = this.focusedDayIndex === 0;

                    let targetYear = currentYear;
                    let targetMonth = Math.max(0, monthRange.min - 1); // Use first allowed month (monthRange is 1-based)

                    if (isJanuary && isFirstDay) {
                        // Already at Jan 1 - try to go to previous year
                        targetYear = currentYear - 1;
                    }

                    // Clamp to allowed year range
                    if (targetYear < yearRange.min) {
                        navigationLogger.debug('Ctrl+Home: Target year below min, clamping to', yearRange.min);
                        targetYear = yearRange.min;
                    }

                    // Only navigate if not already at the boundary
                    const newDate = new Date(targetYear, targetMonth, 1);
                    const currentDate = this.monthDates[this.activeMonthIndex];
                    if (newDate.getFullYear() !== currentDate.getFullYear() || newDate.getMonth() !== currentDate.getMonth() || this.focusedDayIndex !== 0) {
                        navigationLogger.debug('Going to', targetMonth + 1, '/', targetYear);
                        this.monthDates[this.activeMonthIndex] = newDate;
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
                    }
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
                    const yearRange = this.getEffectiveYearRange();
                    const monthRange = this.getEffectiveMonthRange();
                    const isDecember = currentMonth === 11;

                    // Check if we're at the last day
                    const daysContainer = this.calendar.querySelector(`.drp-date-picker__days[data-month-index="${this.activeMonthIndex}"]`);
                    const days = daysContainer?.querySelectorAll('.drp-date-picker__day:not(.drp-date-picker__day--other-month)');
                    const isLastDay = days && this.focusedDayIndex === days.length - 1;

                    let targetYear = currentYear;
                    let targetMonth = Math.min(11, monthRange.max - 1); // Use last allowed month (monthRange is 1-based)

                    if (isDecember && isLastDay) {
                        // Already at Dec 31 - try to go to next year
                        targetYear = currentYear + 1;
                    }

                    // Clamp to allowed year range
                    if (targetYear > yearRange.max) {
                        navigationLogger.debug('Ctrl+End: Target year above max, clamping to', yearRange.max);
                        targetYear = yearRange.max;
                    }

                    // Only navigate if not already at the boundary
                    const lastDayOfMonth = new Date(targetYear, targetMonth + 1, 0).getDate(); // Get last day of target month
                    const newDate = new Date(targetYear, targetMonth, lastDayOfMonth);
                    const currentDate = this.monthDates[this.activeMonthIndex];
                    if (newDate.getFullYear() !== currentDate.getFullYear() || newDate.getMonth() !== currentDate.getMonth() || !isLastDay) {
                        navigationLogger.debug('Going to', targetMonth + 1, '/', targetYear);
                        this.monthDates[this.activeMonthIndex] = newDate;
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
                    }
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

        // Note: Outside click handling is now managed by the clickEvents manager (see setupEventSubscriptions)
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

    // Reactive getters/setters for programmatic control

    /**
     * Get calendar open state (floating mode only)
     */
    get isOpen(): boolean {
        return this.calendar.classList.contains('drp-date-picker--visible');
    }

    /**
     * Set calendar open state (floating mode only)
     */
    set isOpen(value: boolean) {
        if (this.options.positioningMode !== 'floating') {
            console.warn('isOpen property only works in floating mode');
            return;
        }
        if (value) {
            this.show();
        } else {
            this.hide();
        }
    }

    /**
     * Get/set selected ranges (for multiple mode or programmatic multi-range selection)
     */
    get selectedRangesReactive(): DateRange[] {
        return [...this.selectedRanges];
    }

    set selectedRangesReactive(ranges: DateRange[]) {
        // For multiple mode: store in selectedRanges array
        this.selectedRanges = ranges.map(r => ({
            start: new Date(r.start),
            end: new Date(r.end)
        }));

        // Clear invalid range state (programmatic selection clears any previous invalid state)
        this.invalidRangeStart = null;
        this.invalidRangeEnd = null;

        // Clear focus state (programmatic selection should clear keyboard focus)
        this.focusedDayIndex = null;

        // For range mode: also set selectedStartDate/selectedEndDate
        if (this.options.selectionMode === 'range' && ranges.length > 0) {
            this.selectedStartDate = new Date(ranges[0].start);
            this.selectedEndDate = new Date(ranges[0].end);

            // Update input value for range mode
            if (this.input && !this.requiresApplyButton()) {
                this.input.value = `${this.formatDate(this.selectedStartDate)} - ${this.formatDate(this.selectedEndDate)}`;
            }
        } else if (this.input && !this.requiresApplyButton()) {
            // Clear input if no ranges or not in range mode
            this.input.value = '';
        }

        this.renderCalendar();
        this.updateSummary();
    }

    /**
     * Get/set selected individual dates (for multiple mode)
     */
    get selectedDatesReactive(): Date[] {
        return this.selectedDates.map(d => new Date(d));
    }

    set selectedDatesReactive(dates: Date[]) {
        this.selectedDates = dates.map(d => new Date(d));
        this.renderCalendar();
        this.updateSummary();
    }

    /**
     * Get/set single selected date (single mode)
     */
    get selectedDateReactive(): Date | null {
        return this.selectedDate ? new Date(this.selectedDate) : null;
    }

    set selectedDateReactive(date: Date | null) {
        this.selectedDate = date ? new Date(date) : null;
        if (this.input && date) {
            this.input.value = this.formatDate(date);
        } else if (this.input) {
            this.input.value = '';
        }
        this.renderCalendar();
        this.updateSummary();
    }

    /**
     * Fire a custom-action event with the provided data attributes
     */
    private fireCustomActionEvent(detail: Record<string, string>): void {
        // Fire on calendar element (internal)
        this.calendar.dispatchEvent(new CustomEvent('custom-action', {
            detail,
            bubbles: true,
            composed: true  // Cross shadow DOM boundary
        }));
    }

    destroy() {
        // Unsubscribe from all event subscriptions
        this.scrollSubscriptions.forEach(sub => sub.unsubscribe());
        this.scrollSubscriptions = [];
        this.clickSubscriptions.forEach(sub => sub.unsubscribe());
        this.clickSubscriptions = [];

        // Destroy event managers
        this.scrollEvents.destroy();
        this.clickEvents.destroy();

        // Destroy action button tooltips
        this.destroyAllActionButtonTooltips();

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
    showMessage(content: string, type?: 'error' | 'warning' | 'info' | 'success', autoHide?: number) { return UI.showMessage(this, content, type, autoHide); }
    hideMessage() { return UI.hideMessage(this); }

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

    // Unified navigation methods
    unifiedPrevMonth() { return Navigation.unifiedPrevMonth(this); }
    unifiedNextMonth() { return Navigation.unifiedNextMonth(this); }
    toggleUnifiedRollingSelector() { return Navigation.toggleUnifiedRollingSelector(this); }
    setUnifiedMonth(month: number) { return Navigation.setUnifiedMonth(this, month); }
    setUnifiedYear(year: number) { return Navigation.setUnifiedYear(this, year); }

    findNextEnabledDayIndex(startIndex: number, offset: number, days: NodeListOf<Element>, monthIndex: number) { return Navigation.findNextEnabledDayIndex(this, startIndex, offset, days, monthIndex); }
    moveFocus(offset: number) { return Navigation.moveFocus(this, offset); }

    // Selection methods - wrappers for pure functions
    async selectDay(dayElement: HTMLElement) { return await Selection.selectDay(this, dayElement); }
    selectToday() { return Selection.selectToday(this); }
    clearSelection() { return Selection.clearSelection(this); }
    apply() { return Selection.apply(this); }

    // Interaction methods - wrappers for pure functions
    initDragListeners() { return Interaction.initDragListeners(this); }
    startDrag(event: MouseEvent, type: 'start' | 'end', dayElement: HTMLElement) { return Interaction.startDrag(this, event, type, dayElement); }
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

    /**
     * Inject global styles for the date picker
     *
     * This is a helper method for when you're using the DateRangePicker class directly
     * (not the web component). The web component automatically injects styles into its
     * Shadow DOM, but the base class expects global CSS to be loaded.
     *
     * Call this once before creating any DateRangePicker instances if you want to
     * inject styles programmatically instead of importing the CSS file.
     *
     * @param force - Force re-injection even if styles were already injected
     *
     * @example
     * ```typescript
     * import { DateRangePicker } from '@keenmate/web-daterangepicker';
     *
     * // Inject styles once
     * DateRangePicker.injectGlobalStyles();
     *
     * // Then create pickers
     * const picker = new DateRangePicker(inputElement, options);
     * ```
     */
    static injectGlobalStyles(force: boolean = false): void {
        // Only inject once unless forced
        if (DateRangePicker.stylesInjected && !force) {
            drpLogger.debug('Styles already injected, skipping');
            return;
        }

        // Create a style element
        const styleElement = document.createElement('style');
        styleElement.setAttribute('data-source', 'web-daterangepicker');
        styleElement.textContent = styles;

        // Inject into document head
        document.head.appendChild(styleElement);

        DateRangePicker.stylesInjected = true;
        drpLogger.info('Global styles injected successfully');
    }

    /**
     * Check if styles appear to be loaded
     *
     * This is a helper method that attempts to detect if date picker styles are loaded
     * by checking if the CSS custom property --drp-accent-color is defined.
     *
     * Note: This is a best-effort check and may not be 100% accurate.
     *
     * @returns true if styles appear to be loaded, false otherwise
     */
    static areStylesLoaded(): boolean {
        // Check if our custom property exists
        const testElement = document.createElement('div');
        testElement.className = 'drp-date-picker';
        testElement.style.display = 'none';
        document.body.appendChild(testElement);

        const styles = window.getComputedStyle(testElement);
        const accentColor = styles.getPropertyValue('--drp-accent-color');

        document.body.removeChild(testElement);

        return accentColor !== '';
    }
}

// Export the class
export { DateRangePicker };
