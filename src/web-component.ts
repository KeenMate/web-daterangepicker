import { DateRangePicker } from './date-picker';
import type { DatePickerOptions, DateRange, DecoratedDate, DateInfo, DayRenderData, BeforeSelectResult, ActionButton } from './types';
import styles from './css/main.css?inline';

// =============================================================================
// Attribute parsers — small reusable functions that turn a raw attribute value
// (from getAttribute / hasAttribute) into a typed option value.
// =============================================================================

type AttrReader = {
    getAttribute(name: string): string | null;
    hasAttribute(name: string): boolean;
};

type AttrParser = (el: AttrReader, attr: string) => unknown;

const parseStringOrUndefined: AttrParser = (el, attr) => el.getAttribute(attr) || undefined;
const parseStringOrEmpty: AttrParser = (el, attr) => el.getAttribute(attr) || '';
const parsePositiveIntOrUndefined: AttrParser = (el, attr) => {
    const n = parseInt(el.getAttribute(attr) || '0');
    return Number.isFinite(n) && n > 0 ? n : undefined;
};
const parseIntOrUndefined: AttrParser = (el, attr) => {
    const raw = el.getAttribute(attr);
    if (raw == null) return undefined;
    const n = parseInt(raw);
    return Number.isFinite(n) ? n : undefined;
};
const parseBoolPresence: AttrParser = (el, attr) => el.hasAttribute(attr);
/** Tri-state boolean: missing → undefined, present with "true"/"false" → typed boolean. */
const parseTriStateBool: AttrParser = (el, attr) =>
    el.hasAttribute(attr) ? el.getAttribute(attr) === 'true' : undefined;
/** "close-on-scroll" semantics: presence flips on, but explicit "false" wins. */
const parseTriStateBoolDefaultTrue: AttrParser = (el, attr) =>
    el.hasAttribute(attr) ? el.getAttribute(attr) !== 'false' : undefined;
const parseEnum = <T extends string>(values: readonly T[]): AttrParser =>
    (el, attr) => {
        const raw = el.getAttribute(attr) as T | null;
        return raw && values.includes(raw) ? raw : undefined;
    };
const parseStringWithDefault = (defaultValue: string): AttrParser =>
    (el, attr) => el.getAttribute(attr) || defaultValue;
const parseDisabledWeekdays: AttrParser = (el, attr) => {
    const raw = el.getAttribute(attr);
    if (!raw) return undefined;
    const parsed = raw.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d) && d >= 0 && d <= 6);
    return parsed.length ? parsed : undefined;
};
const parseWeekStartDay: AttrParser = (el, attr) => {
    const raw = el.getAttribute(attr);
    if (!raw) return undefined;
    if (raw === 'auto') return 'auto';
    const day = parseInt(raw);
    return !isNaN(day) && day >= 0 && day <= 6 ? day : undefined;
};

// =============================================================================
// ATTRIBUTE_TABLE — single source of truth driving observedAttributes,
// initial parse, and live updates via attributeChangedCallback.
// =============================================================================

interface AttributeEntry {
    attr: string;
    key: keyof DatePickerOptions;
    parser: AttrParser;
}

const SELECTION_MODES = ['single', 'range', 'multiple'] as const;
const TRIGGERS = ['focus', 'typing', 'manual'] as const;
const MONTH_LAYOUTS = ['horizontal', 'grid'] as const;
const POSITIONING_MODES = ['inline', 'floating'] as const;
const DISABLED_HANDLING = ['allow', 'prevent', 'block', 'split', 'individual'] as const;
const AUTO_CLOSE = ['never', 'selection', 'apply'] as const;

const ATTRIBUTE_TABLE: AttributeEntry[] = [
    { attr: 'selection-mode',                  key: 'selectionMode',                  parser: parseEnum(SELECTION_MODES) },
    { attr: 'date-format-mask',                key: 'dateFormatMask',                 parser: parseStringWithDefault('YYYY-MM-DD') },
    { attr: 'visible-months-count',            key: 'visibleMonthsCount',             parser: parsePositiveIntOrUndefined },
    { attr: 'calendar-open-trigger',           key: 'calendarOpenTrigger',            parser: parseEnum(TRIGGERS) },
    { attr: 'month-layout',                    key: 'monthLayout',                    parser: parseEnum(MONTH_LAYOUTS) },
    { attr: 'grid-rows',                       key: 'gridRows',                       parser: parsePositiveIntOrUndefined },
    { attr: 'grid-columns',                    key: 'gridColumns',                    parser: parsePositiveIntOrUndefined },
    { attr: 'unified-navigation',              key: 'unifiedNavigation',              parser: parseBoolPresence },
    { attr: 'unified-navigation-anchor-index', key: 'unifiedNavigationAnchorIndex',   parser: parseIntOrUndefined },
    { attr: 'unified-header-interactive',      key: 'unifiedHeaderInteractive',       parser: parseBoolPresence },
    { attr: 'calendar-placement',              key: 'calendarPlacement',              parser: parseStringOrUndefined },
    { attr: 'positioning-mode',                key: 'positioningMode',                parser: parseEnum(POSITIONING_MODES) },
    { attr: 'week-start-day',                  key: 'weekStartDay',                   parser: parseWeekStartDay },
    { attr: 'min-date',                        key: 'minDate',                        parser: parseStringOrUndefined },
    { attr: 'max-date',                        key: 'maxDate',                        parser: parseStringOrUndefined },
    { attr: 'initial-date',                    key: 'initialDate',                    parser: parseStringOrUndefined },
    { attr: 'disabled-weekdays',               key: 'disabledWeekdays',               parser: parseDisabledWeekdays },
    { attr: 'disabled-dates-handling',         key: 'disabledDatesHandling',          parser: parseEnum(DISABLED_HANDLING) },
    { attr: 'highlight-disabled-in-range',     key: 'highlightDisabledInRange',       parser: parseTriStateBool },
    { attr: 'locale',                          key: 'locale',                         parser: parseStringWithDefault('auto') },
    { attr: 'display-format-mask',             key: 'displayFormatMask',              parser: parseStringOrUndefined },
    { attr: 'show-debug-info',                 key: 'showDebugInfo',                  parser: parseBoolPresence },
    { attr: 'rolling-year-range',              key: 'rollingYearRange',               parser: parseStringOrUndefined },
    { attr: 'rolling-month-range',             key: 'rollingMonthRange',              parser: parseStringOrUndefined },
    { attr: 'auto-close',                      key: 'autoClose',                      parser: parseEnum(AUTO_CLOSE) },
    { attr: 'close-on-scroll',                 key: 'closeOnScroll',                  parser: parseTriStateBoolDefaultTrue },
    { attr: 'show-today-button',               key: 'showTodayButton',                parser: parseTriStateBool },
    { attr: 'show-clear-button',               key: 'showClearButton',                parser: parseTriStateBool },
    { attr: 'show-apply-button',               key: 'showApplyButton',                parser: parseTriStateBool },
];

/** Attributes that don't affect the picker itself — handled by surgical `attributeChangedCallback` paths. */
const NON_PICKER_ATTRIBUTES = ['value', 'placeholder', 'disabled', 'enable-transitions', 'input-size'] as const;

/** Read all picker-affecting attributes from `el` into a partial DatePickerOptions. */
function parseAttributesFromTable(el: AttrReader): Partial<DatePickerOptions> {
    const result: Partial<DatePickerOptions> = {};
    for (const entry of ATTRIBUTE_TABLE) {
        const value = entry.parser(el, entry.attr);
        if (value !== undefined) {
            (result as any)[entry.key] = value;
        }
    }
    return result;
}


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
    private _getMonthHeaderCallback?: (data: { month: Date; monthIndex: number; monthName: string; year: number }) => string;

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
            ...ATTRIBUTE_TABLE.map(e => e.attr),
            ...NON_PICKER_ATTRIBUTES,
        ];
    }

    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
    }

    private applyTransitionStyles() {
        // Target the calendar element inside shadow DOM
        const calendar = this.shadow.querySelector('.drp-date-picker') as HTMLElement;
        if (!calendar) return; // Calendar not created yet

        const enableTransitions = this.hasAttribute('enable-transitions');

        // Handle transitions (opt-in for performance)
        if (enableTransitions) {
            calendar.classList.add('drp-transitions-enabled');
        } else {
            calendar.classList.remove('drp-transitions-enabled');
        }
    }

    private applyInputSizeStyles() {
        if (!this.inputElement) return;

        const inputSize = this.getAttribute('input-size');

        // Remove existing size classes
        this.inputElement.classList.remove('drp-input--xs', 'drp-input--sm', 'drp-input--lg', 'drp-input--xl');
        this.inputElement.classList.remove('drp-date-picker-input--xs', 'drp-date-picker-input--sm', 'drp-date-picker-input--lg', 'drp-date-picker-input--xl');

        // Add new size classes (md is default, no class needed)
        if (inputSize && inputSize !== 'md') {
            this.inputElement.classList.add(`drp-input--${inputSize}`);
            this.inputElement.classList.add(`drp-date-picker-input--${inputSize}`);
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

        // Surgical UI updates that don't go through the picker.
        if (name === 'enable-transitions') return this.applyTransitionStyles();
        if (name === 'input-size') return this.applyInputSizeStyles();
        if (name === 'value' && this.inputElement && newValue !== null) {
            this.inputElement.value = newValue;
            return;
        }
        if (name === 'placeholder' && this.inputElement && newValue !== null) {
            this.inputElement.placeholder = newValue;
            return;
        }
        if (name === 'disabled' && this.inputElement) {
            this.inputElement.disabled = newValue !== null;
            return;
        }

        if (!this.picker) return;

        // Picker-affecting attribute: parse via the table and try a surgical update.
        // Falls back to full reinit only for genuinely structural changes.
        const entry = ATTRIBUTE_TABLE.find(e => e.attr === name);
        if (entry) {
            const value = entry.parser(this, entry.attr);
            const applied = this.picker.updateOptions({ [entry.key]: value } as Partial<DatePickerOptions>);
            if (applied) return;
        }

        this.picker.destroy();
        this.initializePicker();
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

            // Apply input size styles
            this.applyInputSizeStyles();
        }
        // For inline mode, no input element needed
    }

    private initializePicker() {
        const display = this.getAttribute('positioning-mode') || 'floating';

        // For floating mode, require input element
        if (display === 'floating' && !this.inputElement) return;

        // Build options from attributes (table-driven) + complex/data properties (held on element).
        const options: DatePickerOptions = {
            ...parseAttributesFromTable(this),

            // Defaults that aren't attribute-derived or that always need a value
            selectionMode: (this.getAttribute('selection-mode') as 'single' | 'range' | 'multiple') || 'single',
            calendarOpenTrigger: (this.getAttribute('calendar-open-trigger') as 'focus' | 'typing' | 'manual') || 'focus',
            positioningMode: display as 'inline' | 'floating',

            onSelect: (date) => this.handleDateSelect(date),
            container: this.shadow as unknown as HTMLElement, // Append calendar to shadow root

            // Complex data — held on the element, not attributes
            disabledDates: this._disabledDates,
            specialDates: this._specialDates,
            getDateMetadataCallback: this._getDateMetadataCallback,
            badgeTooltipCallback: this._badgeTooltipCallback,
            dayTooltipCallback: this._dayTooltipCallback,
            dateMember: this._dateMember,
            badgeTextMember: this._badgeTextMember,
            badgeClassMember: this._badgeClassMember,
            dayClassMember: this._dayClassMember,
            badgeTooltipMember: this._badgeTooltipMember,
            dayTooltipMember: this._dayTooltipMember,
            isDisabledMember: this._isDisabledMember,
            customStylesCallback: this._customStylesCallback,
            renderDayCallback: this._renderDayCallback,
            renderDayContentCallback: this._renderDayContentCallback,
            beforeDateSelectCallback: this._beforeDateSelectCallback,
            beforeMonthChangedCallback: this._beforeMonthChangedCallback,
            formatSummaryCallback: this._formatSummaryCallback,
            getUnifiedHeaderCallback: this._getUnifiedHeaderCallback,
            getMonthHeaderCallback: this._getMonthHeaderCallback,
            actionButtons: this._actionButtons,
        };

        // For inline mode, pass null as input element
        const inputElement = display === 'inline' ? null : this.inputElement;
        this.picker = new DateRangePicker(inputElement, options);
        // Calendar is automatically appended to shadow root via container option

        // Forward custom-action events from picker to web component
        this.picker.calendar.addEventListener('custom-action', (e: Event) => {
            const customEvent = e as CustomEvent;
            this.dispatchEvent(new CustomEvent('custom-action', {
                detail: customEvent.detail,
                bubbles: true,
                composed: true
            }));
        });

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

        // Apply transition styles to the calendar inside shadow DOM
        // Use setTimeout to ensure DOM is fully rendered
        setTimeout(() => this.applyTransitionStyles(), 0);
    }

    /**
     * Apply a single-key option change in place. Falls back to a deferred full
     * reinit only for genuinely structural changes (visibleMonthsCount,
     * positioningMode, etc. — caught by `updateOptions` returning false).
     *
     * The microtask defer batches consecutive sets of multiple unrelated keys
     * into one rebuild when a structural change does occur.
     */
    private applyOptionUpdate<K extends keyof DatePickerOptions>(key: K, value: DatePickerOptions[K]): void {
        if (!this.picker) return;
        const applied = this.picker.updateOptions({ [key]: value } as Partial<DatePickerOptions>);
        if (!applied) this.scheduleReinit();
    }

    /**
     * Schedule a deferred re-initialization of the picker.
     * Used as the fallback when a structural change makes a surgical update
     * impossible. Microtask-batched so back-to-back assignments rebuild once.
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

    public showMessage(content: string, type?: 'error' | 'warning' | 'info' | 'success', autoHide?: number) {
        if (!this.picker) {
            console.warn('[web-daterangepicker] showMessage() called but picker not initialized yet');
            return;
        }
        this.picker.showMessage(content, type, autoHide);
    }

    public hideMessage() {
        if (!this.picker) {
            console.warn('[web-daterangepicker] hideMessage() called but picker not initialized yet');
            return;
        }
        this.picker.hideMessage();
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

    // Transition property
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

    get inputSize(): string {
        return this.getAttribute('input-size') || 'md';
    }

    set inputSize(value: string) {
        this.setAttribute('input-size', value);
    }

    // Complex data properties (not attributes)
    get specialDates(): DecoratedDate[] | undefined {
        return this._specialDates;
    }

    set specialDates(value: DecoratedDate[] | undefined) {
        this._specialDates = value;
        this.applyOptionUpdate('specialDates', value);
    }

    get disabledDates(): (Date | string)[] | undefined {
        return this._disabledDates;
    }

    set disabledDates(value: (Date | string)[] | undefined) {
        this._disabledDates = value;
        this.applyOptionUpdate('disabledDates', value);
    }



    get getDateMetadataCallback(): ((date: Date) => DateInfo | null) | undefined {
        return this._getDateMetadataCallback;
    }

    set getDateMetadataCallback(value: ((date: Date) => DateInfo | null) | undefined) {
        this._getDateMetadataCallback = value;
        this.applyOptionUpdate('getDateMetadataCallback', value);
    }

    get badgeTooltipCallback(): ((data: DayRenderData) => string | null) | undefined {
        return this._badgeTooltipCallback;
    }

    set badgeTooltipCallback(value: ((data: DayRenderData) => string | null) | undefined) {
        this._badgeTooltipCallback = value;
        this.applyOptionUpdate('badgeTooltipCallback', value);
    }

    get dayTooltipCallback(): ((data: DayRenderData) => string | null) | undefined {
        return this._dayTooltipCallback;
    }

    set dayTooltipCallback(value: ((data: DayRenderData) => string | null) | undefined) {
        this._dayTooltipCallback = value;
        this.applyOptionUpdate('dayTooltipCallback', value);
    }

    // Custom rendering properties
    get customStylesCallback(): (() => string) | undefined {
        return this._customStylesCallback;
    }

    set customStylesCallback(value: (() => string) | undefined) {
        this._customStylesCallback = value;
        // Custom styles inject a <style> tag into shadow DOM during initializePicker —
        // partial update can't replicate that, so always reinit.
        this.scheduleReinit();
    }

    get renderDayCallback(): ((data: DayRenderData) => HTMLElement | string | null) | undefined {
        return this._renderDayCallback;
    }

    set renderDayCallback(value: ((data: DayRenderData) => HTMLElement | string | null) | undefined) {
        this._renderDayCallback = value;
        this.applyOptionUpdate('renderDayCallback', value);
    }

    get renderDayContentCallback(): ((data: DayRenderData) => HTMLElement | string | null) | undefined {
        return this._renderDayContentCallback;
    }

    set renderDayContentCallback(value: ((data: DayRenderData) => HTMLElement | string | null) | undefined) {
        this._renderDayContentCallback = value;
        this.applyOptionUpdate('renderDayContentCallback', value);
    }

    get beforeDateSelectCallback() {
        return this._beforeDateSelectCallback;
    }

    set beforeDateSelectCallback(value: ((selection: Date | DateRange) => Promise<BeforeSelectResult> | BeforeSelectResult) | undefined) {
        this._beforeDateSelectCallback = value;
        this.applyOptionUpdate('beforeDateSelectCallback', value);
    }

    get beforeMonthChangedCallback() {
        return this._beforeMonthChangedCallback;
    }

    set beforeMonthChangedCallback(value: ((context: any) => Promise<any> | any) | undefined) {
        this._beforeMonthChangedCallback = value;
        this.applyOptionUpdate('beforeMonthChangedCallback', value);
    }

    get formatSummaryCallback(): ((data: any) => string) | undefined {
        return this._formatSummaryCallback;
    }

    set formatSummaryCallback(value: ((data: any) => string) | undefined) {
        this._formatSummaryCallback = value;
        this.applyOptionUpdate('formatSummaryCallback', value);
    }

    get getUnifiedHeaderCallback(): ((data: { firstMonth: Date; lastMonth: Date; anchorMonth: Date; monthNames: string[] }) => string) | undefined {
        return this._getUnifiedHeaderCallback;
    }

    set getUnifiedHeaderCallback(value: ((data: { firstMonth: Date; lastMonth: Date; anchorMonth: Date; monthNames: string[] }) => string) | undefined) {
        this._getUnifiedHeaderCallback = value;
        this.applyOptionUpdate('getUnifiedHeaderCallback', value);
    }

    get getMonthHeaderCallback(): ((data: { month: Date; monthIndex: number; monthName: string; year: number }) => string) | undefined {
        return this._getMonthHeaderCallback;
    }

    set getMonthHeaderCallback(value: ((data: { month: Date; monthIndex: number; monthName: string; year: number }) => string) | undefined) {
        this._getMonthHeaderCallback = value;
        this.applyOptionUpdate('getMonthHeaderCallback', value);
    }

    // Member mapping getters/setters
    get dateMember(): string | undefined {
        return this._dateMember;
    }

    set dateMember(value: string | undefined) {
        this._dateMember = value;
        this.applyOptionUpdate('dateMember', value);
    }

    get badgeTextMember(): string | undefined {
        return this._badgeTextMember;
    }

    set badgeTextMember(value: string | undefined) {
        this._badgeTextMember = value;
        this.applyOptionUpdate('badgeTextMember', value);
    }

    get badgeClassMember(): string | undefined {
        return this._badgeClassMember;
    }

    set badgeClassMember(value: string | undefined) {
        this._badgeClassMember = value;
        this.applyOptionUpdate('badgeClassMember', value);
    }

    get dayClassMember(): string | undefined {
        return this._dayClassMember;
    }

    set dayClassMember(value: string | undefined) {
        this._dayClassMember = value;
        this.applyOptionUpdate('dayClassMember', value);
    }

    get badgeTooltipMember(): string | undefined {
        return this._badgeTooltipMember;
    }

    set badgeTooltipMember(value: string | undefined) {
        this._badgeTooltipMember = value;
        this.applyOptionUpdate('badgeTooltipMember', value);
    }

    get dayTooltipMember(): string | undefined {
        return this._dayTooltipMember;
    }

    set dayTooltipMember(value: string | undefined) {
        this._dayTooltipMember = value;
        this.applyOptionUpdate('dayTooltipMember', value);
    }

    get isDisabledMember(): string | undefined {
        return this._isDisabledMember;
    }

    set isDisabledMember(value: string | undefined) {
        this._isDisabledMember = value;
        this.applyOptionUpdate('isDisabledMember', value);
    }

    // Action button configuration
    get actionButtons(): ActionButton[] | undefined {
        return this._actionButtons;
    }

    set actionButtons(value: ActionButton[] | undefined) {
        this._actionButtons = value;
        this.applyOptionUpdate('actionButtons', value);
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
