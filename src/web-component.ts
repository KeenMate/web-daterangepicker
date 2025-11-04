import { PureDatePicker } from './date-picker';
import type { DatePickerOptions, DateRange } from './types';
import styles from './scss/_date-picker.scss?inline';

export class DateRangePickerElement extends HTMLElement {
    private picker?: PureDatePicker;
    private inputElement?: HTMLInputElement;
    private shadow: ShadowRoot;

    static get observedAttributes() {
        return ['mode', 'format', 'months-to-show', 'trigger', 'value', 'disabled', 'placeholder'];
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

        // Create input element
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

        // Append to shadow DOM
        this.shadow.appendChild(styleSheet);
        this.shadow.appendChild(this.inputElement);
    }

    private initializePicker() {
        if (!this.inputElement) return;

        const options: DatePickerOptions = {
            mode: (this.getAttribute('mode') as 'single' | 'range') || 'single',
            format: this.getAttribute('format') || 'YYYY-MM-DD',
            monthsToShow: parseInt(this.getAttribute('months-to-show') || '0') || undefined,
            calendarTrigger: (this.getAttribute('trigger') as 'auto' | 'button') || 'auto',
            onSelect: (date) => this.handleDateSelect(date),
            container: this.shadow as unknown as HTMLElement // Append calendar to shadow root
        };

        this.picker = new PureDatePicker(this.inputElement, options);
        // Calendar is automatically appended to shadow root via container option
    }

    private handleDateSelect(date: Date | DateRange) {
        // Emit custom event
        const detail = {
            date: date instanceof Date ? date : undefined,
            dateRange: date instanceof Date ? undefined : date,
            formattedValue: this.inputElement?.value || ''
        };

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
}

// Register the custom element
if (!customElements.get('date-range-picker')) {
    customElements.define('date-range-picker', DateRangePickerElement);
}
