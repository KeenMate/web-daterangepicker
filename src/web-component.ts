import { DateRangePicker } from './date-picker';
import type { DatePickerOptions, DateRange, DecoratedDate, DateInfo, DayRenderData, BeforeSelectResult, ActionButton } from './types';
import styles from './scss/main.scss?inline';

export class WebDaterangepickerElement extends HTMLElement {
    private picker?: DateRangePicker;
    private inputElement?: HTMLInputElement;
    private shadow: ShadowRoot;

    // Properties for complex data (not attributes)
    private _specialDates?: DecoratedDate[];
    private _disabledDates?: (Date | string)[];
    private _getDateMetadataCallback?: (date: Date) => DateInfo | null;
    private _badgeTooltipCallback?: (data: DayRenderData) => string | null;
    private _dayTooltipCallback?: (data: DayRenderData) => string | null;
    private _customStylesCallback?: () => string;
    private _renderDayCallback?: (data: DayRenderData) => HTMLElement | string | null;
    private _renderDayContentCallback?: (data: DayRenderData) => HTMLElement | string | null;
    private _beforeDateSelectCallback?: (selection: Date | DateRange) => Promise<BeforeSelectResult> | BeforeSelectResult;
    private _beforeMonthChangedCallback?: (context: any) => Promise<any> | any;
    private _formatSummaryCallback?: (data: any) => string;
    private _getUnifiedHeaderCallback?: (data: { firstMonth: Date; lastMonth: Date; anchorMonth: Date; monthNames: string[] }) => string;

    // Member mapping properties for specialDates array
    private _dateMember?: string;
    private _badgeTextMember?: string;
    private _badgeClassMember?: string;
    private _dayClassMember?: string;
    private _badgeTooltipMember?: string;
    private _dayTooltipMember?: string;
    private _isDisabledMember?: string;

    // Action button configuration
    private _actionButtons?: ActionButton[];

    // Deferred re-initialization flag
    private _pendingReinit = false;

    static get observedAttributes() {
        return [
            'selection-mode', 'date-format-mask', 'visible-months-count', 'calendar-open-trigger', 'value', 'disabled', 'placeholder',
            'week-start-day', 'min-date', 'max-date', 'disabled-weekdays', 'disabled-dates-handling',
            'highlight-disabled-in-range', 'positioning-mode', 'month-layout', 'grid-rows', 'grid-columns', 'calendar-placement',
            'locale', 'display-format-mask', 'show-debug-info',
            'initial-date', 'rolling-year-range', 'rolling-month-range',
            'spacing', 'font-size', 'cell-size', 'enable-transitions',
            'auto-close', 'show-today-button', 'show-clear-button', 'show-apply-button',
            'unified-navigation', 'unified-navigation-anchor-index', 'unified-header-interactive'
        ];
    }

    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
    }

    private applySizeStyles() {
        // Target the calendar element inside shadow DOM
        const calendar = this.shadow.querySelector('.drp-date-picker') as HTMLElement;
        if (!calendar) return; // Calendar not created yet

        const spacing = this.getAttribute('spacing');
        const fontSize = this.getAttribute('font-size');
        const cellSize = this.getAttribute('cell-size');
        const enableTransitions = this.hasAttribute('enable-transitions');

        // Remove existing size classes
        calendar.classList.remove('drp-spacing-xs', 'drp-spacing-sm', 'drp-spacing-lg', 'drp-spacing-xl');
        calendar.classList.remove('drp-font-xs', 'drp-font-sm', 'drp-font-lg', 'drp-font-xl');
        calendar.classList.remove('drp-cell-xs', 'drp-cell-sm', 'drp-cell-lg', 'drp-cell-xl');

        // Add new size classes (md is default, no class needed)
        if (spacing && spacing !== 'md') {
            calendar.classList.add(`drp-spacing-${spacing}`);
        }
        if (fontSize && fontSize !== 'md') {
            calendar.classList.add(`drp-font-${fontSize}`);
        }
        if (cellSize && cellSize !== 'md') {
            calendar.classList.add(`drp-cell-${cellSize}`);
        }

        // Handle transitions (opt-in for performance)
        if (enableTransitions) {
            calendar.classList.add('drp-transitions-enabled');
        } else {
            calendar.classList.remove('drp-transitions-enabled');
        }
    }

    connectedCallback() {
        this.render();
        this.initializePicker();
    }

    disconnectedCallback() {
        if (this.picker) {
            this.picker.destroy();
        }
    }

    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
        if (oldValue === newValue) return;

        // Handle size and transition attributes without re-initializing picker
        if (name === 'spacing' || name === 'font-size' || name === 'cell-size' || name === 'enable-transitions') {
            this.applySizeStyles();
            // Re-render picker if it exists to update rolling selector dimensions
            if (this.picker && name === 'cell-size') {
                this.picker.renderCalendar();
            }
            return;
        }

        // Re-initialize picker if it exists and attributes changed
        if (this.picker && name !== 'value' && name !== 'placeholder') {
            this.picker.destroy();
            this.initializePicker();
        }

        // Handle value changes
        if (name === 'value' && this.inputElement && newValue !== null) {
            this.inputElement.value = newValue;
        }

        // Handle placeholder changes
        if (name === 'placeholder' && this.inputElement && newValue !== null) {
            this.inputElement.placeholder = newValue;
        }

        // Handle disabled state
        if (name === 'disabled' && this.inputElement) {
            if (newValue !== null) {
                this.inputElement.disabled = true;
            } else {
                this.inputElement.disabled = false;
            }
        }
    }

    private render() {
        // Inject styles
        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        this.shadow.appendChild(styleSheet);

        const display = this.getAttribute('positioning-mode') || 'floating';

        // Only create input for floating mode
        if (display === 'floating') {
            this.inputElement = document.createElement('input');
            this.inputElement.type = 'text';
            this.inputElement.classList.add('drp-input', 'drp-date-picker-input');

            // Set initial attributes
            const placeholder = this.getAttribute('placeholder');
            if (placeholder) {
                this.inputElement.placeholder = placeholder;
            }

            const value = this.getAttribute('value');
            if (value) {
                this.inputElement.value = value;
            }

            if (this.hasAttribute('disabled')) {
                this.inputElement.disabled = true;
            }

            this.shadow.appendChild(this.inputElement);
        }
        // For inline mode, no input element needed
    }

    private initializePicker() {
        const display = this.getAttribute('positioning-mode') || 'floating';

        // For floating mode, require input element
        if (display === 'floating' && !this.inputElement) return;

        // Parse disabled-weekdays attribute (comma-separated numbers)
        let disabledWeekdays: number[] | undefined;
        const disabledWeekdaysAttr = this.getAttribute('disabled-weekdays');
        if (disabledWeekdaysAttr) {
            disabledWeekdays = disabledWeekdaysAttr.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d) && d >= 0 && d <= 6);
        }

        // Parse week-start-day attribute
        let weekStartDay: 'auto' | 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined;
        const weekStartAttr = this.getAttribute('week-start-day');
        if (weekStartAttr) {
            if (weekStartAttr === 'auto') {
                weekStartDay = 'auto';
            } else {
                const day = parseInt(weekStartAttr);
                if (!isNaN(day) && day >= 0 && day <= 6) {
                    weekStartDay = day as 0 | 1 | 2 | 3 | 4 | 5 | 6;
                }
            }
        }

        const options: DatePickerOptions = {
            selectionMode: (this.getAttribute('selection-mode') as 'single' | 'range') || 'single',
            dateFormatMask: this.getAttribute('date-format-mask') || 'YYYY-MM-DD',
            visibleMonthsCount: parseInt(this.getAttribute('visible-months-count') || '0') || undefined,
            calendarOpenTrigger: (this.getAttribute('calendar-open-trigger') as 'focus' | 'typing' | 'manual') || 'focus',
            onSelect: (date) => this.handleDateSelect(date),
            container: this.shadow as unknown as HTMLElement, // Append calendar to shadow root
            positioningMode: display as 'inline' | 'floating',

            // Layout options
            monthLayout: (this.getAttribute('month-layout') as 'horizontal' | 'grid') || undefined,
            gridRows: parseInt(this.getAttribute('grid-rows') || '0') || undefined,
            gridColumns: parseInt(this.getAttribute('grid-columns') || '0') || undefined,
            unifiedNavigation: this.hasAttribute('unified-navigation'),
            unifiedNavigationAnchorIndex: parseInt(this.getAttribute('unified-navigation-anchor-index') || '0') || undefined,
            unifiedHeaderInteractive: this.hasAttribute('unified-header-interactive'),

            // Positioning
            calendarPlacement: this.getAttribute('calendar-placement') || undefined,

            // New options
            weekStartDay: weekStartDay,
            minDate: this.getAttribute('min-date') || undefined,
            maxDate: this.getAttribute('max-date') || undefined,
            initialDate: this.getAttribute('initial-date') || undefined,
            disabledWeekdays: disabledWeekdays,
            disabledDates: this._disabledDates,
            specialDates: this._specialDates,
            getDateMetadataCallback: this._getDateMetadataCallback,
            badgeTooltipCallback: this._badgeTooltipCallback,
            dayTooltipCallback: this._dayTooltipCallback,

            // Member mapping properties
            dateMember: this._dateMember,
            badgeTextMember: this._badgeTextMember,
            badgeClassMember: this._badgeClassMember,
            dayClassMember: this._dayClassMember,
            badgeTooltipMember: this._badgeTooltipMember,
            dayTooltipMember: this._dayTooltipMember,
            isDisabledMember: this._isDisabledMember,

            disabledDatesHandling: (this.getAttribute('disabled-dates-handling') as 'allow' | 'prevent' | 'block' | 'split' | 'individual') || undefined,
            highlightDisabledInRange: this.hasAttribute('highlight-disabled-in-range') ? this.getAttribute('highlight-disabled-in-range') === 'true' : undefined,
            locale: this.getAttribute('locale') || 'auto',
            displayFormatMask: this.getAttribute('display-format-mask') || undefined,
            showDebugInfo: this.hasAttribute('show-debug-info'),

            // Rolling selector configuration
            rollingYearRange: this.getAttribute('rolling-year-range') || undefined,
            rollingMonthRange: this.getAttribute('rolling-month-range') || undefined,

            // Custom rendering
            customStylesCallback: this._customStylesCallback,
            renderDayCallback: this._renderDayCallback,
            renderDayContentCallback: this._renderDayContentCallback,

            // Callbacks
            beforeDateSelectCallback: this._beforeDateSelectCallback,
            beforeMonthChangedCallback: this._beforeMonthChangedCallback,
            formatSummaryCallback: this._formatSummaryCallback,
            getUnifiedHeaderCallback: this._getUnifiedHeaderCallback,

            // Action button configuration
            autoClose: (this.getAttribute('auto-close') as 'never' | 'selection' | 'apply') || undefined,
            actionButtons: this._actionButtons,
            showTodayButton: this.hasAttribute('show-today-button') ? this.getAttribute('show-today-button') === 'true' : undefined,
            showClearButton: this.hasAttribute('show-clear-button') ? this.getAttribute('show-clear-button') === 'true' : undefined,
            showApplyButton: this.hasAttribute('show-apply-button') ? this.getAttribute('show-apply-button') === 'true' : undefined
        };

        // For inline mode, pass null as input element
        const inputElement = display === 'inline' ? null : this.inputElement;
        this.picker = new DateRangePicker(inputElement, options);
        // Calendar is automatically appended to shadow root via container option

        // Inject custom styles if callback provided
        if (this._customStylesCallback) {
            const customStyles = this._customStylesCallback();
            if (customStyles) {
                const customStyleSheet = document.createElement('style');
                customStyleSheet.className = 'drp-custom-styles';
                customStyleSheet.textContent = customStyles;
                this.shadow.appendChild(customStyleSheet);
            }
        }

        // Apply size styles to the calendar inside shadow DOM
        // Use setTimeout to ensure DOM is fully rendered
        setTimeout(() => this.applySizeStyles(), 0);
    }

    /**
     * Schedule a deferred re-initialization of the picker
     * This allows multiple property assignments to complete before re-init
     */
    private scheduleReinit() {
        if (this._pendingReinit) {
            return;
        }

        this._pendingReinit = true;

        queueMicrotask(() => {
            this._pendingReinit = false;
            if (this.picker) {
                this.picker.destroy();
                this.initializePicker();
            }
        });
    }

    private handleDateSelect(date: Date | DateRange | DateRange[] | Date[]) {
        // Build base event detail
        const detail: any = {
            date: date instanceof Date ? date : undefined,
            dateRange: date instanceof Date ? undefined : (Array.isArray(date) ? undefined : date),
            formattedValue: this.inputElement?.value || ''
        };

        // Add enhanced data for range mode based on rangeDisabledMode
        if (!this.picker) {
            // Fallback if picker not initialized
            this.dispatchEvent(new CustomEvent('date-select', { detail, bubbles: true, composed: true }));
            this.dispatchEvent(new CustomEvent('change', { detail, bubbles: true, composed: true }));
            return;
        }

        // Don't dispatch events if they're being deferred until Apply click
        // This callback should only be invoked when events should fire
        // (either immediately, or from the apply() function)
        // But add safety check just in case
        if (this.picker.requiresApplyButton() && this.picker.pendingSelection) {
            // Events are deferred - don't dispatch yet
            return;
        }

        const mode = this.picker.options.disabledDatesHandling;

        if (!(date instanceof Date) && !Array.isArray(date) && 'start' in date && 'end' in date) {
            // Range selection (single DateRange object)
            const start = date.start;
            const end = date.end;

            switch (mode) {
                case 'allow':
                    // Include enabled/disabled dates arrays and helper methods
                    detail.enabledDates = this.picker.getEnabledDatesInRange(start, end);
                    detail.disabledDates = this.picker.getDisabledDatesInRange(start, end);
                    detail.getEnabledDateCount = () => detail.enabledDates.length;
                    detail.getTotalDays = () => {
                        const msPerDay = 1000 * 60 * 60 * 24;
                        return Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1;
                    };
                    break;

                case 'split':
                    // Return multiple ranges split by disabled dates
                    detail.dateRanges = this.picker.splitRangeByDisabled(start, end);
                    detail.dates = this.picker.getEnabledDatesInRange(start, end);
                    // Update formatted value to show multiple ranges
                    if (detail.dateRanges.length > 0) {
                        detail.formattedValue = detail.dateRanges
                            .map(r => `${this.picker!.formatDate(r.start)} - ${this.picker!.formatDate(r.end)}`)
                            .join(', ');
                    }
                    break;

                case 'individual':
                    // Return flat array of enabled dates
                    detail.dates = this.picker.getEnabledDatesInRange(start, end);
                    detail.dateRange = null; // Clear the range
                    // Update formatted value to show individual dates
                    if (detail.dates.length > 0) {
                        detail.formattedValue = detail.dates
                            .map(d => this.picker!.formatDate(d))
                            .join(', ');
                    }
                    break;

                case 'block':
                    // Block mode: range should not contain disabled dates
                    // (already handled in drag logic)
                    detail.dates = this.picker.getEnabledDatesInRange(start, end);
                    break;
            }
        }

        this.dispatchEvent(new CustomEvent('date-select', {
            detail,
            bubbles: true,
            composed: true
        }));

        // Also emit a change event
        this.dispatchEvent(new CustomEvent('change', {
            detail,
            bubbles: true,
            composed: true
        }));
    }

    // Public API methods
    public show() {
        if (!this.picker) {
            console.warn('[web-daterangepicker] show() called but picker not initialized yet');
            return;
        }
        this.picker.show();
    }

    public hide() {
        if (!this.picker) {
            console.warn('[web-daterangepicker] hide() called but picker not initialized yet');
            return;
        }
        this.picker.hide();
    }

    public toggle() {
        if (!this.picker) {
            console.warn('[web-daterangepicker] toggle() called but picker not initialized yet');
            return;
        }
        this.picker.toggle();
    }

    public clearSelection() {
        if (!this.picker) {
            console.warn('[web-daterangepicker] clearSelection() called but picker not initialized yet');
            return;
        }
        this.picker.clearSelection();
    }

    public getInputValue(): string {
        return this.inputElement?.value || '';
    }

    public setInputValue(value: string) {
        if (this.inputElement) {
            this.inputElement.value = value;
        }
        this.setAttribute('value', value);
    }

    public setMonthNames(monthNames: string[]) {
        if (this.picker) {
            this.picker.monthNames = monthNames;
            this.picker.renderCalendar();
        }
    }

    public setRollingItemAlignment(alignment: 'flex-start' | 'center' | 'flex-end') {
        const calendar = this.shadow.querySelector('.drp-date-picker') as HTMLElement;
        if (calendar) {
            calendar.style.setProperty('--drp-rolling-item-justify-content', alignment);
        }
    }

    // Property accessors
    get selectionMode(): 'single' | 'range' {
        return (this.getAttribute('selection-mode') as 'single' | 'range') || 'single';
    }

    set selectionMode(value: 'single' | 'range') {
        this.setAttribute('selection-mode', value);
    }

    get dateFormatMask(): string {
        return this.getAttribute('date-format-mask') || 'YYYY-MM-DD';
    }

    set dateFormatMask(value: string) {
        this.setAttribute('date-format-mask', value);
    }

    get value(): string {
        return this.getInputValue();
    }

    set value(val: string) {
        this.setInputValue(val);
    }

    get disabled(): boolean {
        return this.hasAttribute('disabled');
    }

    set disabled(value: boolean) {
        if (value) {
            this.setAttribute('disabled', '');
        } else {
            this.removeAttribute('disabled');
        }
    }

    // Week start day property
    get weekStartDay(): 'auto' | 0 | 1 | 2 | 3 | 4 | 5 | 6 {
        const attr = this.getAttribute('week-start-day');
        if (attr === 'auto') return 'auto';
        const day = parseInt(attr || '');
        return !isNaN(day) && day >= 0 && day <= 6 ? (day as 0 | 1 | 2 | 3 | 4 | 5 | 6) : 'auto';
    }

    set weekStartDay(value: 'auto' | 0 | 1 | 2 | 3 | 4 | 5 | 6) {
        this.setAttribute('week-start-day', value.toString());
    }

    // Min/Max date properties
    get minDate(): string | undefined {
        return this.getAttribute('min-date') || undefined;
    }

    set minDate(value: string | undefined) {
        if (value) {
            this.setAttribute('min-date', value);
        } else {
            this.removeAttribute('min-date');
        }
    }

    get maxDate(): string | undefined {
        return this.getAttribute('max-date') || undefined;
    }

    set maxDate(value: string | undefined) {
        if (value) {
            this.setAttribute('max-date', value);
        } else {
            this.removeAttribute('max-date');
        }
    }

    // Disabled weekdays property
    get disabledWeekdays(): number[] | undefined {
        const attr = this.getAttribute('disabled-weekdays');
        if (!attr) return undefined;
        return attr.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d) && d >= 0 && d <= 6);
    }

    set disabledWeekdays(value: number[] | undefined) {
        if (value && value.length > 0) {
            this.setAttribute('disabled-weekdays', value.join(','));
        } else {
            this.removeAttribute('disabled-weekdays');
        }
    }

    // Size properties
    get spacing(): string {
        return this.getAttribute('spacing') || 'md';
    }

    set spacing(value: string) {
        this.setAttribute('spacing', value);
    }

    get fontSize(): string {
        return this.getAttribute('font-size') || 'md';
    }

    set fontSize(value: string) {
        this.setAttribute('font-size', value);
    }

    get cellSize(): string {
        return this.getAttribute('cell-size') || 'md';
    }

    set cellSize(value: string) {
        this.setAttribute('cell-size', value);
    }

    get enableTransitions(): boolean {
        return this.hasAttribute('enable-transitions');
    }

    set enableTransitions(value: boolean) {
        if (value) {
            this.setAttribute('enable-transitions', '');
        } else {
            this.removeAttribute('enable-transitions');
        }
    }

    // Complex data properties (not attributes)
    get specialDates(): DecoratedDate[] | undefined {
        return this._specialDates;
    }

    set specialDates(value: DecoratedDate[] | undefined) {
        this._specialDates = value;
        if (this.picker) {
            this.picker.destroy();
            this.initializePicker();
        }
    }

    get disabledDates(): (Date | string)[] | undefined {
        return this._disabledDates;
    }

    set disabledDates(value: (Date | string)[] | undefined) {
        this._disabledDates = value;
        if (this.picker) {
            this.picker.destroy();
            this.initializePicker();
        }
    }



    get getDateMetadataCallback(): ((date: Date) => DateInfo | null) | undefined {
        return this._getDateMetadataCallback;
    }

    set getDateMetadataCallback(value: ((date: Date) => DateInfo | null) | undefined) {
        this._getDateMetadataCallback = value;
        this.scheduleReinit();
    }

    get badgeTooltipCallback(): ((data: DayRenderData) => string | null) | undefined {
        return this._badgeTooltipCallback;
    }

    set badgeTooltipCallback(value: ((data: DayRenderData) => string | null) | undefined) {
        this._badgeTooltipCallback = value;
        this.scheduleReinit();
    }

    get dayTooltipCallback(): ((data: DayRenderData) => string | null) | undefined {
        return this._dayTooltipCallback;
    }

    set dayTooltipCallback(value: ((data: DayRenderData) => string | null) | undefined) {
        this._dayTooltipCallback = value;
        this.scheduleReinit();
    }

    // Custom rendering properties
    get customStylesCallback(): (() => string) | undefined {
        return this._customStylesCallback;
    }

    set customStylesCallback(value: (() => string) | undefined) {
        this._customStylesCallback = value;
        this.scheduleReinit();
    }

    get renderDayCallback(): ((data: DayRenderData) => HTMLElement | string | null) | undefined {
        return this._renderDayCallback;
    }

    set renderDayCallback(value: ((data: DayRenderData) => HTMLElement | string | null) | undefined) {
        this._renderDayCallback = value;
        this.scheduleReinit();
    }

    get renderDayContentCallback(): ((data: DayRenderData) => HTMLElement | string | null) | undefined {
        return this._renderDayContentCallback;
    }

    set renderDayContentCallback(value: ((data: DayRenderData) => HTMLElement | string | null) | undefined) {
        this._renderDayContentCallback = value;
        this.scheduleReinit();
    }

    get beforeDateSelectCallback() {
        return this._beforeDateSelectCallback;
    }

    set beforeDateSelectCallback(value: ((selection: Date | DateRange) => Promise<BeforeSelectResult> | BeforeSelectResult) | undefined) {
        this._beforeDateSelectCallback = value;
        this.scheduleReinit();
    }

    get beforeMonthChangedCallback() {
        return this._beforeMonthChangedCallback;
    }

    set beforeMonthChangedCallback(value: ((context: any) => Promise<any> | any) | undefined) {
        this._beforeMonthChangedCallback = value;
        this.scheduleReinit();
    }

    get formatSummaryCallback(): ((data: any) => string) | undefined {
        return this._formatSummaryCallback;
    }

    set formatSummaryCallback(value: ((data: any) => string) | undefined) {
        this._formatSummaryCallback = value;
        this.scheduleReinit();
    }

    get getUnifiedHeaderCallback(): ((data: { firstMonth: Date; lastMonth: Date; anchorMonth: Date; monthNames: string[] }) => string) | undefined {
        return this._getUnifiedHeaderCallback;
    }

    set getUnifiedHeaderCallback(value: ((data: { firstMonth: Date; lastMonth: Date; anchorMonth: Date; monthNames: string[] }) => string) | undefined) {
        this._getUnifiedHeaderCallback = value;
        this.scheduleReinit();
    }

    // Member mapping getters/setters
    get dateMember(): string | undefined {
        return this._dateMember;
    }

    set dateMember(value: string | undefined) {
        this._dateMember = value;
        if (this.picker) {
            this.picker.destroy();
            this.initializePicker();
        }
    }

    get badgeTextMember(): string | undefined {
        return this._badgeTextMember;
    }

    set badgeTextMember(value: string | undefined) {
        this._badgeTextMember = value;
        if (this.picker) {
            this.picker.destroy();
            this.initializePicker();
        }
    }

    get badgeClassMember(): string | undefined {
        return this._badgeClassMember;
    }

    set badgeClassMember(value: string | undefined) {
        this._badgeClassMember = value;
        if (this.picker) {
            this.picker.destroy();
            this.initializePicker();
        }
    }

    get dayClassMember(): string | undefined {
        return this._dayClassMember;
    }

    set dayClassMember(value: string | undefined) {
        this._dayClassMember = value;
        if (this.picker) {
            this.picker.destroy();
            this.initializePicker();
        }
    }

    get badgeTooltipMember(): string | undefined {
        return this._badgeTooltipMember;
    }

    set badgeTooltipMember(value: string | undefined) {
        this._badgeTooltipMember = value;
        if (this.picker) {
            this.picker.destroy();
            this.initializePicker();
        }
    }

    get dayTooltipMember(): string | undefined {
        return this._dayTooltipMember;
    }

    set dayTooltipMember(value: string | undefined) {
        this._dayTooltipMember = value;
        if (this.picker) {
            this.picker.destroy();
            this.initializePicker();
        }
    }

    get isDisabledMember(): string | undefined {
        return this._isDisabledMember;
    }

    set isDisabledMember(value: string | undefined) {
        this._isDisabledMember = value;
        if (this.picker) {
            this.picker.destroy();
            this.initializePicker();
        }
    }

    // Action button configuration
    get actionButtons(): ActionButton[] | undefined {
        return this._actionButtons;
    }

    set actionButtons(value: ActionButton[] | undefined) {
        this._actionButtons = value;
        if (this.picker) {
            this.picker.destroy();
            this.initializePicker();
        }
    }

    // Reactive selection properties (forward to picker)
    get selectedRanges(): DateRange[] {
        return this.picker?.selectedRangesReactive || [];
    }

    set selectedRanges(ranges: DateRange[]) {
        if (this.picker) {
            this.picker.selectedRangesReactive = ranges;
        }
    }

    get selectedDates(): Date[] {
        return this.picker?.selectedDatesReactive || [];
    }

    set selectedDates(dates: Date[]) {
        if (this.picker) {
            this.picker.selectedDatesReactive = dates;
        }
    }

    get selectedDate(): Date | null {
        return this.picker?.selectedDateReactive || null;
    }

    set selectedDate(date: Date | null) {
        if (this.picker) {
            this.picker.selectedDateReactive = date;
        }
    }

    get isOpen(): boolean {
        return this.picker?.isOpen || false;
    }

    set isOpen(value: boolean) {
        if (this.picker) {
            this.picker.isOpen = value;
        }
    }
}

// Register the custom element
if (!customElements.get('web-daterangepicker')) {
    customElements.define('web-daterangepicker', WebDaterangepickerElement);
}
