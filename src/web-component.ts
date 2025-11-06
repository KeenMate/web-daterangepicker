import { PureDatePicker } from './date-picker';
import type { DatePickerOptions, DateRange, SpecialDate, DateInfo } from './types';
import styles from './scss/_date-picker.scss?inline';

export class DateRangePickerElement extends HTMLElement {
    private picker?: PureDatePicker;
    private inputElement?: HTMLInputElement;
    private shadow: ShadowRoot;

    // Properties for complex data (not attributes)
    private _specialDates?: SpecialDate[];
    private _disabledDates?: (Date | string)[];
    private _isDateDisabled?: (date: Date) => boolean;
    private _getDateInfo?: (date: Date) => DateInfo | null;

    static get observedAttributes() {
        return [
            'mode', 'format', 'months-to-show', 'trigger', 'value', 'disabled', 'placeholder',
            'week-start-day', 'min-date', 'max-date', 'disabled-days', 'range-disabled-mode',
            'highlight-disabled-in-range', 'display', 'layout', 'grid-rows', 'grid-columns', 'position'
        ];
    }

    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
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

        const display = this.getAttribute('display') || 'floating';

        // Only create input for floating mode
        if (display === 'floating') {
            this.inputElement = document.createElement('input');
            this.inputElement.type = 'text';
            this.inputElement.classList.add('pa-input', 'pa-date-picker-input');

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
        const display = this.getAttribute('display') || 'floating';

        // For floating mode, require input element
        if (display === 'floating' && !this.inputElement) return;

        // Parse disabled-days attribute (comma-separated numbers)
        let disabledDays: number[] | undefined;
        const disabledDaysAttr = this.getAttribute('disabled-days');
        if (disabledDaysAttr) {
            disabledDays = disabledDaysAttr.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d) && d >= 0 && d <= 6);
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
            mode: (this.getAttribute('mode') as 'single' | 'range') || 'single',
            format: this.getAttribute('format') || 'YYYY-MM-DD',
            monthsToShow: parseInt(this.getAttribute('months-to-show') || '0') || undefined,
            calendarTrigger: (this.getAttribute('trigger') as 'auto' | 'button') || 'auto',
            onSelect: (date) => this.handleDateSelect(date),
            container: this.shadow as unknown as HTMLElement, // Append calendar to shadow root
            display: display as 'inline' | 'floating',

            // Layout options
            layout: (this.getAttribute('layout') as 'horizontal' | 'grid') || undefined,
            gridRows: parseInt(this.getAttribute('grid-rows') || '0') || undefined,
            gridColumns: parseInt(this.getAttribute('grid-columns') || '0') || undefined,

            // Positioning
            position: this.getAttribute('position') || undefined,

            // New options
            weekStartDay: weekStartDay,
            minDate: this.getAttribute('min-date') || undefined,
            maxDate: this.getAttribute('max-date') || undefined,
            disabledDays: disabledDays,
            disabledDates: this._disabledDates,
            specialDates: this._specialDates,
            isDateDisabled: this._isDateDisabled,
            getDateInfo: this._getDateInfo,
            rangeDisabledMode: (this.getAttribute('range-disabled-mode') as 'allow' | 'block' | 'split' | 'individual') || undefined,
            highlightDisabledInRange: this.hasAttribute('highlight-disabled-in-range') ? this.getAttribute('highlight-disabled-in-range') === 'true' : undefined
        };

        // For inline mode, pass null as input element
        const inputElement = display === 'inline' ? null : this.inputElement;
        this.picker = new PureDatePicker(inputElement, options);
        // Calendar is automatically appended to shadow root via container option
    }

    private handleDateSelect(date: Date | DateRange) {
        // Build base event detail
        const detail: any = {
            date: date instanceof Date ? date : undefined,
            dateRange: date instanceof Date ? undefined : date,
            formattedValue: this.inputElement?.value || ''
        };

        // Add enhanced data for range mode based on rangeDisabledMode
        if (!this.picker) {
            // Fallback if picker not initialized
            this.dispatchEvent(new CustomEvent('date-select', { detail, bubbles: true, composed: true }));
            this.dispatchEvent(new CustomEvent('change', { detail, bubbles: true, composed: true }));
            return;
        }

        const mode = this.picker.options.rangeDisabledMode;

        if (!(date instanceof Date) && date.start && date.end) {
            // Range selection
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
        this.picker?.show();
    }

    public hide() {
        this.picker?.hide();
    }

    public toggle() {
        this.picker?.toggle();
    }

    public clear() {
        this.picker?.clear();
    }

    public getValue(): string {
        return this.inputElement?.value || '';
    }

    public setValue(value: string) {
        if (this.inputElement) {
            this.inputElement.value = value;
        }
        this.setAttribute('value', value);
    }

    // Property accessors
    get mode(): 'single' | 'range' {
        return (this.getAttribute('mode') as 'single' | 'range') || 'single';
    }

    set mode(value: 'single' | 'range') {
        this.setAttribute('mode', value);
    }

    get format(): string {
        return this.getAttribute('format') || 'YYYY-MM-DD';
    }

    set format(value: string) {
        this.setAttribute('format', value);
    }

    get value(): string {
        return this.getValue();
    }

    set value(val: string) {
        this.setValue(val);
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

    // Disabled days property
    get disabledDays(): number[] | undefined {
        const attr = this.getAttribute('disabled-days');
        if (!attr) return undefined;
        return attr.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d) && d >= 0 && d <= 6);
    }

    set disabledDays(value: number[] | undefined) {
        if (value && value.length > 0) {
            this.setAttribute('disabled-days', value.join(','));
        } else {
            this.removeAttribute('disabled-days');
        }
    }

    // Complex data properties (not attributes)
    get specialDates(): SpecialDate[] | undefined {
        return this._specialDates;
    }

    set specialDates(value: SpecialDate[] | undefined) {
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

    get isDateDisabled(): ((date: Date) => boolean) | undefined {
        return this._isDateDisabled;
    }

    set isDateDisabled(value: ((date: Date) => boolean) | undefined) {
        this._isDateDisabled = value;
        if (this.picker) {
            this.picker.destroy();
            this.initializePicker();
        }
    }

    get getDateInfo(): ((date: Date) => DateInfo | null) | undefined {
        return this._getDateInfo;
    }

    set getDateInfo(value: ((date: Date) => DateInfo | null) | undefined) {
        this._getDateInfo = value;
        if (this.picker) {
            this.picker.destroy();
            this.initializePicker();
        }
    }
}

// Register the custom element
if (!customElements.get('date-range-picker')) {
    customElements.define('date-range-picker', DateRangePickerElement);
}
