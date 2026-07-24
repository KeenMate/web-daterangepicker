import { DateRangePicker } from './date-picker';
import type { DatePickerOptions, DateRange, DecoratedDate, DayMetadata, DayContext, BeforeSelectResult, ActionButton, LocaleStrings, SelectionContext, MonthChangeContext, BeforeMonthChangeResult, SummaryContext, UnifiedHeaderContext, MonthHeaderContext, LoaderTarget, LockAspect, SelectEventDetail, SelectedTime, MonthDisplay } from './types';
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
/** "should-close-on-scroll" semantics: presence flips on, but explicit "false" wins. */
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
const parseDisabledDates: AttrParser = (el, attr) => {
    const raw = el.getAttribute(attr);
    if (!raw) return undefined;
    // Accept comma-separated ISO date strings; whitespace tolerated. Empty
    // segments and unparseable entries are dropped silently. The core's
    // normalizeDate() validates each string at picker-init time.
    const parsed = raw.split(',').map(s => s.trim()).filter(Boolean);
    return parsed.length ? parsed : undefined;
};
/**
 * Pipe-delimited list of exactly `count` non-empty strings, position-indexed:
 *   month-names="Leden|Únor|Březen|…"  → [0]=January … [11]=December (12 items)
 *   weekday-names="Ne|Po|Út|…"          → [0]=Sunday   … [6]=Saturday  (7 items)
 * The index is a fixed month/day number — week-start-day only rotates the
 * on-screen order, never this mapping. Segments are trimmed; a wrong count or
 * any empty segment yields undefined (attribute ignored, locale names used).
 */
const parsePipeDelimitedList = (count: number): AttrParser =>
    (el, attr) => {
        const raw = el.getAttribute(attr);
        if (!raw) return undefined;
        const parts = raw.split('|').map(s => s.trim());
        if (parts.length !== count) {
            console.warn(`[web-daterangepicker] "${attr}" ignored: expected exactly ${count} pipe-delimited segments, got ${parts.length}. Falling back to locale names.`);
            return undefined;
        }
        if (!parts.every(Boolean)) {
            console.warn(`[web-daterangepicker] "${attr}" ignored: one or more segments are empty. Falling back to locale names.`);
            return undefined;
        }
        return parts;
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
const POSITIONING_MODES = ['inline', 'floating', 'modal'] as const;
const DISABLED_HANDLING = ['allow', 'prevent', 'block', 'split', 'individual'] as const;
const AUTO_CLOSE = ['never', 'selection', 'apply'] as const;
const PICKER_MODES = ['date', 'time', 'datetime'] as const;
const HOUR_CYCLES = ['h12', 'h24'] as const;
const TIME_DISPLAYS = ['rolls', 'clock', 'wheel', 'compact'] as const;

const ATTRIBUTE_TABLE: AttributeEntry[] = [
    { attr: 'selection-mode',                  key: 'selectionMode',                  parser: parseEnum(SELECTION_MODES) },
    { attr: 'date-format-mask',                key: 'dateFormatMask',                 parser: parseStringWithDefault('YYYY-MM-DD') },
    { attr: 'visible-months-count',            key: 'visibleMonthsCount',             parser: parsePositiveIntOrUndefined },
    { attr: 'calendar-open-trigger',           key: 'calendarOpenTrigger',            parser: parseEnum(TRIGGERS) },
    { attr: 'month-layout',                    key: 'monthLayout',                    parser: parseEnum(MONTH_LAYOUTS) },
    { attr: 'grid-rows',                       key: 'gridRows',                       parser: parsePositiveIntOrUndefined },
    { attr: 'grid-columns',                    key: 'gridColumns',                    parser: parsePositiveIntOrUndefined },
    { attr: 'is-unified-navigation-enabled',              key: 'isUnifiedNavigationEnabled',              parser: parseBoolPresence },
    { attr: 'unified-navigation-anchor-index', key: 'unifiedNavigationAnchorIndex',   parser: parseIntOrUndefined },
    { attr: 'is-unified-header-interactive',      key: 'isUnifiedHeaderInteractive',       parser: parseBoolPresence },
    { attr: 'calendar-placement',              key: 'calendarPlacement',              parser: parseStringOrUndefined },
    { attr: 'positioning-mode',                key: 'positioningMode',                parser: parseEnum(POSITIONING_MODES) },
    { attr: 'week-start-day',                  key: 'weekStartDay',                   parser: parseWeekStartDay },
    { attr: 'min-date',                        key: 'minDate',                        parser: parseStringOrUndefined },
    { attr: 'max-date',                        key: 'maxDate',                        parser: parseStringOrUndefined },
    { attr: 'initial-date',                    key: 'initialDate',                    parser: parseStringOrUndefined },
    { attr: 'disabled-weekdays',               key: 'disabledWeekdays',               parser: parseDisabledWeekdays },
    { attr: 'disabled-dates',                  key: 'disabledDates',                  parser: parseDisabledDates },
    { attr: 'date-member',                     key: 'dateMember',                     parser: parseStringOrUndefined },
    { attr: 'badge-text-member',               key: 'badgeTextMember',                parser: parseStringOrUndefined },
    { attr: 'badge-class-member',              key: 'badgeClassMember',               parser: parseStringOrUndefined },
    { attr: 'day-class-member',                key: 'dayClassMember',                 parser: parseStringOrUndefined },
    { attr: 'badge-tooltip-member',            key: 'badgeTooltipMember',             parser: parseStringOrUndefined },
    { attr: 'day-tooltip-member',              key: 'dayTooltipMember',               parser: parseStringOrUndefined },
    { attr: 'is-disabled-member',              key: 'isDisabledMember',               parser: parseStringOrUndefined },
    { attr: 'disabled-dates-handling',         key: 'disabledDatesHandling',          parser: parseEnum(DISABLED_HANDLING) },
    { attr: 'should-highlight-disabled-in-range',     key: 'shouldHighlightDisabledInRange',       parser: parseTriStateBool },
    { attr: 'locale',                          key: 'locale',                         parser: parseStringWithDefault('auto') },
    { attr: 'month-names',                     key: 'monthNames',                     parser: parsePipeDelimitedList(12) },
    { attr: 'weekday-names',                   key: 'weekdayNames',                   parser: parsePipeDelimitedList(7) },
    { attr: 'display-format-mask',             key: 'displayFormatMask',              parser: parseStringOrUndefined },
    { attr: 'show-debug-info',                 key: 'showDebugInfo',                  parser: parseBoolPresence },
    { attr: 'rolling-year-range',              key: 'rollingYearRange',               parser: parseStringOrUndefined },
    { attr: 'rolling-month-range',             key: 'rollingMonthRange',              parser: parseStringOrUndefined },
    { attr: 'auto-close',                      key: 'autoClose',                      parser: parseEnum(AUTO_CLOSE) },
    { attr: 'should-close-on-scroll',                 key: 'shouldCloseOnScroll',                  parser: parseTriStateBoolDefaultTrue },
    { attr: 'is-today-button-shown',               key: 'isTodayButtonShown',                parser: parseTriStateBool },
    { attr: 'is-clear-button-shown',               key: 'isClearButtonShown',                parser: parseTriStateBool },
    { attr: 'is-apply-button-shown',               key: 'isApplyButtonShown',                parser: parseTriStateBool },
    { attr: 'is-summary-shown',                    key: 'isSummaryShown',                    parser: parseTriStateBool },
    { attr: 'picker-mode',                     key: 'pickerMode',                     parser: parseEnum(PICKER_MODES) },
    { attr: 'time-format-mask',                key: 'timeFormatMask',                 parser: parseStringWithDefault('HH:mm') },
    { attr: 'display-time-format-mask',        key: 'displayTimeFormatMask',          parser: parseStringOrUndefined },
    { attr: 'time-step',                       key: 'timeStep',                       parser: parsePositiveIntOrUndefined },
    { attr: 'hour-cycle',                      key: 'hourCycle',                      parser: parseEnum(HOUR_CYCLES) },
    { attr: 'is-seconds-shown',                    key: 'isSecondsShown',                    parser: parseTriStateBool },
    { attr: 'is-now-button-shown',                 key: 'isNowButtonShown',                  parser: parseTriStateBool },
    { attr: 'time-display',                    key: 'timeDisplay',                    parser: parseEnum(TIME_DISPLAYS) },
];

/** Attributes that don't affect the picker itself — handled by surgical `attributeChangedCallback` paths. */
const NON_PICKER_ATTRIBUTES = ['value', 'placeholder', 'disabled', 'readonly', 'enable-transitions', 'input-size', 'mobile-modal-breakpoint', 'mobile-modal-min-height'] as const;

/**
 * Options that are reachable both via HTML attribute AND a property setter.
 * The explicitly-set property is the canonical source — when one of these
 * has a non-undefined backing field, the attribute is ignored. (Property
 * setters are the documented escape hatch for complex/Date-bearing data.)
 */
const DUAL_PATH_KEYS = new Set<keyof DatePickerOptions>([
    'disabledDates',
    'dateMember',
    'badgeTextMember',
    'badgeClassMember',
    'dayClassMember',
    'badgeTooltipMember',
    'dayTooltipMember',
    'isDisabledMember',
    'monthNames',
    'weekdayNames',
]);

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
    private _getDateMetadataCallback?: (ctx: DayContext) => DayMetadata | null;
    private _badgeTooltipCallback?: (data: DayContext) => string | null;
    private _dayTooltipCallback?: (data: DayContext) => string | null;
    private _customStylesCallback?: () => string;
    private _renderDayCallback?: (data: DayContext) => HTMLElement | string | null;
    private _renderDayContentCallback?: (data: DayContext) => HTMLElement | string | null;
    private _beforeDateSelectCallback?: (ctx: SelectionContext) => Promise<BeforeSelectResult> | BeforeSelectResult;
    private _beforeMonthChangedCallback?: (context: MonthChangeContext) => Promise<BeforeMonthChangeResult> | BeforeMonthChangeResult;
    private _formatSummaryCallback?: (data: SummaryContext) => string;
    private _getUnifiedHeaderCallback?: (data: UnifiedHeaderContext) => string;
    private _getMonthHeaderCallback?: (data: MonthHeaderContext) => string;

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

    // Localization overrides (no HTML attribute — content is too structured for
    // a string attribute; held on the element like the other complex options).
    private _customStrings?: Partial<LocaleStrings>;
    private _monthNames?: string[];
    private _weekdayNames?: string[];

    // Deferred re-initialization flag
    private _pendingReinit = false;

    // Auto-engage state: matchMedia listeners that flip positioning-mode between
    // the user-configured value and 'modal' as the viewport crosses any threshold.
    // Set up via the `mobile-modal-breakpoint` (width) and `mobile-modal-min-height`
    // (height) attributes — modal engages if ANY listener matches.
    private _mobileModalMqls: MediaQueryList[] = [];
    private _mobileModalListener: ((e: MediaQueryListEvent) => void) | null = null;
    private _configuredPositioningMode: string | null = null;

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
        const calendar = this.shadow.querySelector('.drp__picker') as HTMLElement;
        if (!calendar) return; // Calendar not created yet

        const enableTransitions = this.hasAttribute('enable-transitions');

        // Handle transitions (opt-in for performance)
        if (enableTransitions) {
            calendar.classList.add('drp__picker--transitions-enabled');
        } else {
            calendar.classList.remove('drp__picker--transitions-enabled');
        }
    }

    private applyInputSizeStyles() {
        if (!this.inputElement) return;

        const inputSize = this.getAttribute('input-size');

        // Remove existing size classes
        this.inputElement.classList.remove('drp__input--xs', 'drp__input--sm', 'drp__input--lg', 'drp__input--xl');
        this.inputElement.classList.remove('drp__input--xs', 'drp__input--sm', 'drp__input--lg', 'drp__input--xl');

        // Add new size classes (md is default, no class needed)
        if (inputSize && inputSize !== 'md') {
            this.inputElement.classList.add(`drp__input--${inputSize}`);
            this.inputElement.classList.add(`drp__input--${inputSize}`);
        }
    }

    connectedCallback() {
        this._liftPreUpgradeProperties();
        this.render();
        this.initializePicker();
        this.setupMobileModalListener();
    }

    /**
     * Standard Custom Elements upgrade fix: if a consumer assigned to a
     * property setter (e.g. `el.actionButtons = [...]`) before the element
     * class was registered, that assignment created an own-property that now
     * shadows the class accessor. Re-running the assignment through the
     * accessor — after deleting the own-property — routes it through the
     * setter, populating the private backing field that `initializePicker`
     * is about to read.
     */
    private _liftPreUpgradeProperties() {
        const seen = new Set<string>();
        for (let proto = Object.getPrototypeOf(this);
             proto && proto !== HTMLElement.prototype;
             proto = Object.getPrototypeOf(proto)) {
            for (const name of Object.getOwnPropertyNames(proto)) {
                if (seen.has(name)) continue;
                seen.add(name);
                const desc = Object.getOwnPropertyDescriptor(proto, name);
                if (desc?.set && Object.prototype.hasOwnProperty.call(this, name)) {
                    const value = (this as any)[name];
                    delete (this as any)[name];
                    (this as any)[name] = value;
                }
            }
        }
    }

    disconnectedCallback() {
        this.teardownMobileModalListener();
        if (this.picker) {
            this.picker.destroy();
        }
    }

    /**
     * Set up matchMedia listeners that auto-switch positioning-mode to 'modal'
     * when ANY configured viewport threshold matches, and back to the configured
     * mode when none do.
     *
     * Activated by:
     *   `mobile-modal-breakpoint`  — viewport width below this engages modal
     *                                (e.g., "640px" → `(max-width: 640px)`).
     *   `mobile-modal-min-height`  — viewport height below this engages modal
     *                                (e.g., "500px" → `(max-height: 500px)`).
     *
     * Either attribute alone works; both together OR their results.
     * Only auto-switches when the configured mode is 'floating' — pickers with
     * `inline` or already-`modal` configurations are left alone.
     */
    private setupMobileModalListener() {
        this.teardownMobileModalListener();

        const widthRaw = this.getAttribute('mobile-modal-breakpoint');
        const heightRaw = this.getAttribute('mobile-modal-min-height');
        if (!widthRaw && !heightRaw) return;

        const configured = this.getAttribute('positioning-mode') || 'floating';
        // Only auto-engage when starting from 'floating'. Inline never makes
        // sense to flip to modal; modal is already modal.
        if (configured !== 'floating') return;
        this._configuredPositioningMode = configured;

        // Accept "640", "640px", "40em", etc. Default to px when bare number.
        const normalize = (raw: string) => (/^\d+$/.test(raw) ? `${raw}px` : raw);

        const queries: string[] = [];
        if (widthRaw) queries.push(`(max-width: ${normalize(widthRaw)})`);
        if (heightRaw) queries.push(`(max-height: ${normalize(heightRaw)})`);

        this._mobileModalMqls = queries.map(q => window.matchMedia(q));

        const apply = () => {
            const anyMatch = this._mobileModalMqls.some(mql => mql.matches);
            const target = anyMatch ? 'modal' : (this._configuredPositioningMode || 'floating');
            if (this.getAttribute('positioning-mode') !== target) {
                this.setAttribute('positioning-mode', target);
            }
        };

        // Apply current state immediately, then listen for changes on all MQLs.
        apply();
        this._mobileModalListener = () => apply();
        this._mobileModalMqls.forEach(mql => {
            mql.addEventListener('change', this._mobileModalListener!);
        });
    }

    private teardownMobileModalListener() {
        if (this._mobileModalListener) {
            this._mobileModalMqls.forEach(mql => {
                mql.removeEventListener('change', this._mobileModalListener!);
            });
        }
        this._mobileModalMqls = [];
        this._mobileModalListener = null;
        this._configuredPositioningMode = null;
    }

    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
        if (oldValue === newValue) return;

        // Surgical UI updates that don't go through the picker.
        if (name === 'enable-transitions') return this.applyTransitionStyles();
        if (name === 'input-size') return this.applyInputSizeStyles();
        if (name === 'mobile-modal-breakpoint' || name === 'mobile-modal-min-height') {
            // Re-establish the matchMedia listeners with the new threshold(s).
            // Only meaningful after connectedCallback (no picker before then).
            if (this.picker) this.setupMobileModalListener();
            return;
        }
        if (name === 'value' && this.inputElement && newValue !== null) {
            this.inputElement.value = newValue;
            return;
        }
        if (name === 'placeholder' && this.inputElement && newValue !== null) {
            this.inputElement.placeholder = newValue;
            return;
        }
        // display-format-mask doubles as a placeholder hint when no explicit
        // placeholder is set. Mirror that behavior for runtime attribute
        // updates so a late-set displayFormatMask still surfaces.
        if (name === 'display-format-mask' && this.inputElement && !this.hasAttribute('placeholder')) {
            this.inputElement.placeholder = newValue ?? '';
        }
        if (name === 'disabled' && this.inputElement) {
            this.inputElement.disabled = newValue !== null;
            return;
        }

        // `readonly` is a full-lock toggle. Reflected onto the core lock set without a
        // picker rebuild (so any selection state survives, unlike most attribute changes).
        if (name === 'readonly') {
            if (this.picker) {
                if (newValue !== null) this.picker.lock();
                else this.picker.unlock();
            }
            return;
        }

        if (!this.picker) return;

        // Picker-affecting attribute: parse via the table and try a surgical update.
        // Falls back to full reinit only for genuinely structural changes.
        const entry = ATTRIBUTE_TABLE.find(e => e.attr === name);
        if (entry) {
            // For attribute/property dual-path keys, the explicitly-set
            // property is the canonical source — don't let an attribute
            // mutation overwrite it. Getter returns the backing field.
            if (DUAL_PATH_KEYS.has(entry.key) && (this as any)[entry.key] !== undefined) return;

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

        // Only create input for floating/modal modes (modal also anchors to an input click)
        if (display === 'floating' || display === 'modal') {
            this.inputElement = document.createElement('input');
            this.inputElement.type = 'text';
            this.inputElement.classList.add('drp__input', 'drp__input');

            // Set initial attributes. `placeholder` wins if set explicitly;
            // otherwise fall back to `display-format-mask`, which exists as
            // a localized format hint (tt.mm.jjjj, dd.mm.rrrr, dd/mm/aaaa,
            // etc.) that consumers want shown to users in their language.
            const placeholder = this.getAttribute('placeholder')
                ?? this.getAttribute('display-format-mask');
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

        // For floating/modal modes, require input element
        if ((display === 'floating' || display === 'modal') && !this.inputElement) return;

        // Build options from attributes (table-driven) + complex/data properties (held on element).
        const fromAttributes = parseAttributesFromTable(this);
        const options: DatePickerOptions = {
            ...fromAttributes,

            // Defaults that aren't attribute-derived or that always need a value
            selectionMode: (this.getAttribute('selection-mode') as 'single' | 'range' | 'multiple') || 'single',
            calendarOpenTrigger: (this.getAttribute('calendar-open-trigger') as 'focus' | 'typing' | 'manual') || 'focus',
            positioningMode: display as 'inline' | 'floating' | 'modal',

            onSelect: (date) => this.handleDateSelect(date),
            container: this.shadow as unknown as HTMLElement, // Append calendar to shadow root

            // Complex data — held on the element, not attributes.
            // Dual-path keys (disabledDates + the *Member family) are also
            // attribute-parseable; the property wins if set (consistent with
            // whenDefined-set complex data being the canonical escape hatch).
            disabledDates: this._disabledDates ?? fromAttributes.disabledDates,
            specialDates: this._specialDates,
            getDateMetadataCallback: this._getDateMetadataCallback,
            badgeTooltipCallback: this._badgeTooltipCallback,
            dayTooltipCallback: this._dayTooltipCallback,
            dateMember: this._dateMember ?? fromAttributes.dateMember,
            badgeTextMember: this._badgeTextMember ?? fromAttributes.badgeTextMember,
            badgeClassMember: this._badgeClassMember ?? fromAttributes.badgeClassMember,
            dayClassMember: this._dayClassMember ?? fromAttributes.dayClassMember,
            badgeTooltipMember: this._badgeTooltipMember ?? fromAttributes.badgeTooltipMember,
            dayTooltipMember: this._dayTooltipMember ?? fromAttributes.dayTooltipMember,
            isDisabledMember: this._isDisabledMember ?? fromAttributes.isDisabledMember,
            customStylesCallback: this._customStylesCallback,
            renderDayCallback: this._renderDayCallback,
            renderDayContentCallback: this._renderDayContentCallback,
            beforeDateSelectCallback: this._beforeDateSelectCallback,
            beforeMonthChangedCallback: this._beforeMonthChangedCallback,
            formatSummaryCallback: this._formatSummaryCallback,
            getUnifiedHeaderCallback: this._getUnifiedHeaderCallback,
            getMonthHeaderCallback: this._getMonthHeaderCallback,
            actionButtons: this._actionButtons,
            customStrings: this._customStrings,
            monthNames: this._monthNames ?? fromAttributes.monthNames,
            weekdayNames: this._weekdayNames ?? fromAttributes.weekdayNames,
        };

        // For inline mode, pass null as input element
        const inputElement = display === 'inline' ? null : this.inputElement;
        this.picker = new DateRangePicker(inputElement, options);
        // Calendar is automatically appended to shadow root via container option

        // Re-apply a declarative full lock (survives the destroy()+initializePicker rebuild
        // that most attribute changes trigger — the attribute is the source of truth).
        if (this.hasAttribute('readonly')) this.picker.lock();

        // No manual re-emit of `custom-action` needed: the picker already
        // dispatches it with { bubbles: true, composed: true }, which crosses
        // the shadow boundary and bubbles up to this host. Re-emitting here
        // doubled every event for outside listeners.

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
        const detail: SelectEventDetail = {
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
        if (this.picker.requiresApplyButton() && this.picker.hasPendingSelection) {
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
        } else if (Array.isArray(date) && date.length > 0 && typeof date[0] === 'object' && 'start' in date[0]) {
            // Multi-range result (a callback's adjustedRanges): surface the pieces
            // on the event and reflect them in the formatted value.
            const ranges = date as DateRange[];
            detail.dateRanges = ranges;
            detail.formattedValue = ranges
                .map(r => `${this.picker!.formatDate(r.start)} - ${this.picker!.formatDate(r.end)}`)
                .join(', ');
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

    public toggleMessage(content?: string, type?: 'error' | 'warning' | 'info' | 'success', autoHide?: number) {
        if (!this.picker) {
            console.warn('[web-daterangepicker] toggleMessage() called but picker not initialized yet');
            return;
        }
        this.picker.toggleMessage(content, type, autoHide);
    }

    /**
     * Write custom HTML into the summary block. Pins the content until the next selection
     * change (survives hover preview), mirroring showMessage(). Use for async-derived summaries.
     */
    public showSummary(content: string) {
        if (!this.picker) {
            console.warn('[web-daterangepicker] showSummary() called but picker not initialized yet');
            return;
        }
        this.picker.showSummary(content);
    }

    /** Drop any summary override and re-derive the summary from current selection state. */
    public hideSummary() {
        if (!this.picker) {
            console.warn('[web-daterangepicker] hideSummary() called but picker not initialized yet');
            return;
        }
        this.picker.hideSummary();
    }

    /** Re-run summary derivation now (e.g. after async data arrived). Respects an active override. */
    public refreshSummary() {
        if (!this.picker) {
            console.warn('[web-daterangepicker] refreshSummary() called but picker not initialized yet');
            return;
        }
        this.picker.refreshSummary();
    }

    /** Show a loader spinner. target: 'calendar' (default, full overlay) | 'message' | 'summary' (in-block). */
    public showLoader(target?: LoaderTarget) {
        if (!this.picker) {
            console.warn('[web-daterangepicker] showLoader() called but picker not initialized yet');
            return;
        }
        this.picker.showLoader(target);
    }

    /** Hide the loader for the given target (default 'calendar'). */
    public hideLoader(target?: LoaderTarget) {
        if (!this.picker) {
            console.warn('[web-daterangepicker] hideLoader() called but picker not initialized yet');
            return;
        }
        this.picker.hideLoader(target);
    }

    /** Toggle the loader for the given target (default 'calendar'). */
    public toggleLoader(target?: LoaderTarget) {
        if (!this.picker) {
            console.warn('[web-daterangepicker] toggleLoader() called but picker not initialized yet');
            return;
        }
        this.picker.toggleLoader(target);
    }

    /**
     * Freeze user interaction. With no argument, locks every aspect (a full read-only
     * lock — e.g. after a server confirmation). Pass an aspect or aspect array to freeze
     * only part of it, e.g. `lock(['selection', 'actions'])` to lock the range and buttons
     * while leaving month navigation (`<` / `>`) live. Aspects: 'selection' | 'navigation'
     * | 'actions' | 'open'. The programmatic API is not affected — only the end user is.
     */
    public lock(aspects?: LockAspect | LockAspect[]) {
        if (!this.picker) {
            console.warn('[web-daterangepicker] lock() called but picker not initialized yet');
            return;
        }
        this.picker.lock(aspects);
    }

    /** Release the given aspect(s), or the whole lock when called with no argument. */
    public unlock(aspects?: LockAspect | LockAspect[]) {
        if (!this.picker) {
            console.warn('[web-daterangepicker] unlock() called but picker not initialized yet');
            return;
        }
        this.picker.unlock(aspects);
    }

    /** Toggle the given aspect(s), or the whole lock when called with no argument. */
    public toggleLock(aspects?: LockAspect | LockAspect[]) {
        if (!this.picker) {
            console.warn('[web-daterangepicker] toggleLock() called but picker not initialized yet');
            return;
        }
        this.picker.toggleLock(aspects);
    }

    /** True when the given aspect is currently locked. */
    public isAspectLocked(aspect: LockAspect): boolean {
        return this.picker?.isAspectLocked(aspect) ?? false;
    }

    /** The currently locked aspects (read-only snapshot). */
    public get lockedAspects(): LockAspect[] {
        return this.picker?.lockedAspects ?? [];
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

    /** @deprecated Use the `monthNames` property setter instead. */
    public setMonthNames(monthNames: string[]) {
        this.monthNames = monthNames;
    }

    public setRollingItemAlignment(alignment: 'flex-start' | 'center' | 'flex-end') {
        const calendar = this.shadow.querySelector('.drp__picker') as HTMLElement;
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

    /**
     * Full read-only lock, reflected to the `readonly` attribute. `true` locks every
     * aspect; `false` releases the whole lock. For partial locks (e.g. keep `<` / `>`
     * live) use `lock(['selection', 'actions'])` instead. Reads back `true` only when
     * every aspect is locked.
     */
    get readonly(): boolean {
        return this.picker ? this.picker.readonly : this.hasAttribute('readonly');
    }

    set readonly(value: boolean) {
        if (value) {
            this.setAttribute('readonly', '');
        } else {
            this.removeAttribute('readonly');
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

    // Picker mode (date / time / datetime)
    get pickerMode(): 'date' | 'time' | 'datetime' {
        const raw = this.getAttribute('picker-mode');
        return raw === 'time' || raw === 'datetime' ? raw : 'date';
    }

    set pickerMode(value: 'date' | 'time' | 'datetime') {
        this.setAttribute('picker-mode', value);
    }

    get timeFormatMask(): string {
        return this.getAttribute('time-format-mask') || 'HH:mm';
    }

    set timeFormatMask(value: string) {
        this.setAttribute('time-format-mask', value);
    }

    get displayTimeFormatMask(): string | undefined {
        return this.getAttribute('display-time-format-mask') || undefined;
    }

    set displayTimeFormatMask(value: string | undefined) {
        if (value) {
            this.setAttribute('display-time-format-mask', value);
        } else {
            this.removeAttribute('display-time-format-mask');
        }
    }

    get timeStep(): number {
        const raw = parseInt(this.getAttribute('time-step') || '1', 10);
        return Number.isFinite(raw) && raw > 0 ? raw : 1;
    }

    set timeStep(value: number) {
        this.setAttribute('time-step', String(value));
    }

    get hourCycle(): 'h12' | 'h24' | undefined {
        const raw = this.getAttribute('hour-cycle');
        return raw === 'h12' || raw === 'h24' ? raw : undefined;
    }

    set hourCycle(value: 'h12' | 'h24' | undefined) {
        if (value) {
            this.setAttribute('hour-cycle', value);
        } else {
            this.removeAttribute('hour-cycle');
        }
    }

    get isSecondsShown(): boolean | undefined {
        if (!this.hasAttribute('is-seconds-shown')) return undefined;
        return this.getAttribute('is-seconds-shown') === 'true';
    }

    set isSecondsShown(value: boolean | undefined) {
        if (value === undefined) {
            this.removeAttribute('is-seconds-shown');
        } else {
            this.setAttribute('is-seconds-shown', value ? 'true' : 'false');
        }
    }

    get isNowButtonShown(): boolean | undefined {
        if (!this.hasAttribute('is-now-button-shown')) return undefined;
        return this.getAttribute('is-now-button-shown') === 'true';
    }

    set isNowButtonShown(value: boolean | undefined) {
        if (value === undefined) {
            this.removeAttribute('is-now-button-shown');
        } else {
            this.setAttribute('is-now-button-shown', value ? 'true' : 'false');
        }
    }

    get timeDisplay(): 'rolls' | 'clock' | 'wheel' | 'compact' {
        return (this.getAttribute('time-display') as 'rolls' | 'clock' | 'wheel' | 'compact') || 'rolls';
    }

    set timeDisplay(value: 'rolls' | 'clock' | 'wheel' | 'compact') {
        this.setAttribute('time-display', value);
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



    get getDateMetadataCallback(): ((ctx: DayContext) => DayMetadata | null) | undefined {
        return this._getDateMetadataCallback;
    }

    set getDateMetadataCallback(value: ((ctx: DayContext) => DayMetadata | null) | undefined) {
        this._getDateMetadataCallback = value;
        this.applyOptionUpdate('getDateMetadataCallback', value);
    }

    get badgeTooltipCallback(): ((data: DayContext) => string | null) | undefined {
        return this._badgeTooltipCallback;
    }

    set badgeTooltipCallback(value: ((data: DayContext) => string | null) | undefined) {
        this._badgeTooltipCallback = value;
        this.applyOptionUpdate('badgeTooltipCallback', value);
    }

    get dayTooltipCallback(): ((data: DayContext) => string | null) | undefined {
        return this._dayTooltipCallback;
    }

    set dayTooltipCallback(value: ((data: DayContext) => string | null) | undefined) {
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

    get renderDayCallback(): ((data: DayContext) => HTMLElement | string | null) | undefined {
        return this._renderDayCallback;
    }

    set renderDayCallback(value: ((data: DayContext) => HTMLElement | string | null) | undefined) {
        this._renderDayCallback = value;
        this.applyOptionUpdate('renderDayCallback', value);
    }

    get renderDayContentCallback(): ((data: DayContext) => HTMLElement | string | null) | undefined {
        return this._renderDayContentCallback;
    }

    set renderDayContentCallback(value: ((data: DayContext) => HTMLElement | string | null) | undefined) {
        this._renderDayContentCallback = value;
        this.applyOptionUpdate('renderDayContentCallback', value);
    }

    get beforeDateSelectCallback() {
        return this._beforeDateSelectCallback;
    }

    set beforeDateSelectCallback(value: ((ctx: SelectionContext) => Promise<BeforeSelectResult> | BeforeSelectResult) | undefined) {
        this._beforeDateSelectCallback = value;
        this.applyOptionUpdate('beforeDateSelectCallback', value);
    }

    get beforeMonthChangedCallback() {
        return this._beforeMonthChangedCallback;
    }

    set beforeMonthChangedCallback(value: ((context: MonthChangeContext) => Promise<BeforeMonthChangeResult> | BeforeMonthChangeResult) | undefined) {
        this._beforeMonthChangedCallback = value;
        this.applyOptionUpdate('beforeMonthChangedCallback', value);
    }

    get formatSummaryCallback(): ((data: SummaryContext) => string) | undefined {
        return this._formatSummaryCallback;
    }

    set formatSummaryCallback(value: ((data: SummaryContext) => string) | undefined) {
        this._formatSummaryCallback = value;
        this.applyOptionUpdate('formatSummaryCallback', value);
    }

    get getUnifiedHeaderCallback(): ((data: UnifiedHeaderContext) => string) | undefined {
        return this._getUnifiedHeaderCallback;
    }

    set getUnifiedHeaderCallback(value: ((data: UnifiedHeaderContext) => string) | undefined) {
        this._getUnifiedHeaderCallback = value;
        this.applyOptionUpdate('getUnifiedHeaderCallback', value);
    }

    get getMonthHeaderCallback(): ((data: MonthHeaderContext) => string) | undefined {
        return this._getMonthHeaderCallback;
    }

    set getMonthHeaderCallback(value: ((data: MonthHeaderContext) => string) | undefined) {
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

    // Localization overrides
    get customStrings(): Partial<LocaleStrings> | undefined {
        return this._customStrings;
    }

    set customStrings(value: Partial<LocaleStrings> | undefined) {
        this._customStrings = value;
        this.applyOptionUpdate('customStrings', value);
    }

    get monthNames(): string[] | undefined {
        return this._monthNames;
    }

    set monthNames(value: string[] | undefined) {
        this._monthNames = value;
        this.applyOptionUpdate('monthNames', value);
    }

    get weekdayNames(): string[] | undefined {
        return this._weekdayNames;
    }

    set weekdayNames(value: string[] | undefined) {
        this._weekdayNames = value;
        this.applyOptionUpdate('weekdayNames', value);
    }

    // Reactive selection properties (forward to picker)
    get selectedRanges(): DateRange[] {
        return this.picker?.selectedRanges || [];
    }

    set selectedRanges(ranges: DateRange[]) {
        if (this.picker) {
            this.picker.selectedRanges = ranges;
        }
    }

    get selectedDates(): Date[] {
        return this.picker?.selectedDates || [];
    }

    set selectedDates(dates: Date[]) {
        if (this.picker) {
            this.picker.selectedDates = dates;
        }
    }

    get selectedDate(): Date | null {
        return this.picker?.selectedDate || null;
    }

    set selectedDate(date: Date | null) {
        if (this.picker) {
            this.picker.selectedDate = date;
        }
    }

    /** Committed range start (read-only; set a range via `selectedRanges`). */
    get selectedStartDate(): Date | null {
        return this.picker?.selectedStartDate || null;
    }

    /** Committed range end (read-only; set a range via `selectedRanges`). */
    get selectedEndDate(): Date | null {
        return this.picker?.selectedEndDate || null;
    }

    get selectedTime(): SelectedTime | null {
        return this.picker?.selectedTime || null;
    }

    set selectedTime(time: SelectedTime | null) {
        if (this.picker) {
            this.picker.selectedTime = time;
        }
    }

    /** Composed date+time; the setter accepts a Date or ISO string and splits it. */
    get selectedDatetime(): Date | null {
        return this.picker?.selectedDatetime || null;
    }

    set selectedDatetime(value: Date | string | null) {
        if (this.picker) {
            this.picker.selectedDatetime = value;
        }
    }

    // Displayed state (read-only; change what's shown via navigation, not assignment)
    get visibleMonths(): MonthDisplay[] {
        return this.picker?.visibleMonths || [];
    }

    get visibleMonthDates(): Date[] {
        return this.picker?.visibleMonthDates || [];
    }

    get visibleDateRange(): { start: Date; end: Date } | null {
        return this.picker?.visibleDateRange || null;
    }

    /** The picker's notion of "today", normalized to 00:00 local. */
    get today(): Date {
        return this.picker?.today || new Date();
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
