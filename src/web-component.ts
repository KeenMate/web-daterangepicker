/**
 * `<web-daterangepicker>` — the custom element, now built on
 * `@keenmate/web-components-core` (`BlissElement`).
 *
 * All the custom-element plumbing that used to live here by hand — the
 * `ATTRIBUTE_TABLE`, `observedAttributes`, `attributeChangedCallback`, the
 * `AttrParser` helpers, `DUAL_PATH_KEYS`, the microtask reinit batcher, and the
 * ~35 property/callback getters/setters — is now declared ONCE as a core input
 * table (`static inputs`) plus an event table (`static events`). Core owns
 * parsing, validation, reactivity coalescing, reflection, pre-upgrade lifting,
 * and the managed `on<Name>` handler properties. This file keeps only what is
 * genuinely daterangepicker-specific: the bridge from the merged `config` to the
 * real calendar engine (`DateRangePicker` in `date-picker.ts`), the input-element
 * shell, the mobile-modal matchMedia auto-engage, and the imperative API.
 *
 * Reactivity is declared per input via `on:`, derived from the engine's own
 * `updateOptions()` STRUCTURAL_KEYS:
 *   - `reinit`  — structural (selectionMode, positioningMode, layout, pickerMode…)
 *                 → rebuild the picker.
 *   - `update`  — everything the engine can patch in place → `updateOptions()`.
 * A mixed batch runs `reinit()` only (the rebuild absorbs the update keys).
 */
import {
  BlissElement,
  toBool,
  toEnum,
  toInt,
  toText,
  toFunction,
  toObject,
  toObjectArray,
  toValue,
  adoptStyles,
  createStyleSlot,
  type InputDef,
  type StyleSlot,
} from '@keenmate/web-components-core';
import { DateRangePicker } from './date-picker';
import { toWeekStartDay, toDisabledWeekdays, toDisabledDates, toPipeList } from './converters';
import type {
  DatePickerOptions, DateRange, DecoratedDate, DayContext, DayMetadata, BeforeSelectResult,
  ActionButton, LocaleStrings, SelectionContext, MonthChangeContext, BeforeMonthChangeResult,
  SummaryContext, UnifiedHeaderContext, MonthHeaderContext, LoaderTarget, LockAspect,
  SelectEventDetail, CustomActionEventDetail, SelectedTime, MonthDisplay,
} from './types';
import styles from './css/main.css?inline';

// Build-time constant (Vite define).
declare const __VERSION__: string;

// ── enum value sets (shared with the CEM manifest via toEnum introspection) ──
const SELECTION_MODES = ['single', 'range', 'multiple'] as const;
const TRIGGERS = ['focus', 'typing', 'manual'] as const;
const MONTH_LAYOUTS = ['horizontal', 'grid'] as const;
const POSITIONING_MODES = ['inline', 'floating', 'modal'] as const;
const DISABLED_HANDLING = ['allow', 'prevent', 'block', 'split', 'individual'] as const;
const AUTO_CLOSE = ['never', 'selection', 'apply'] as const;
const PICKER_MODES = ['date', 'time', 'datetime'] as const;
const HOUR_CYCLES = ['h12', 'h24'] as const;
const TIME_DISPLAYS = ['rolls', 'clock', 'wheel', 'compact'] as const;

/** Any callback input. */
const cb = (): ReturnType<typeof toFunction> => toFunction();

// ============================================================================
// INPUT TABLE — the whole @keenmate/web-daterangepicker public surface.
// ============================================================================
const INPUTS: readonly InputDef[] = [
  // ── Structural (→ reinit): a change here rebuilds the picker ──────────────
  { configKey: 'selectionMode',                attribute: 'selection-mode',                converter: toEnum(SELECTION_MODES, { default: 'single' }), on: 'reinit', description: 'Selection behavior: `single` day, `range`, or `multiple` days/ranges.' },
  { configKey: 'positioningMode',              attribute: 'positioning-mode',              converter: toEnum(POSITIONING_MODES, { default: 'floating' }), on: 'reinit', description: 'How the calendar is presented: `inline` (always visible, no input), `floating` (popover anchored to an input), or `modal`.' },
  { configKey: 'calendarOpenTrigger',          attribute: 'calendar-open-trigger',         converter: toEnum(TRIGGERS, { default: 'focus' }), on: 'reinit', description: 'What opens the floating calendar: `focus`, `typing`, or `manual` (only `show()`).' },
  { configKey: 'visibleMonthsCount',           attribute: 'visible-months-count',          converter: toInt({ min: 1 }), on: 'reinit', description: 'Number of month columns shown side-by-side.' },
  { configKey: 'monthLayout',                  attribute: 'month-layout',                  converter: toEnum(MONTH_LAYOUTS), on: 'reinit', description: 'Multi-month arrangement: a horizontal row or a `grid` (see grid-rows/grid-columns).' },
  { configKey: 'gridRows',                     attribute: 'grid-rows',                     converter: toInt({ min: 1 }), on: 'reinit', description: 'Rows in the month grid when month-layout is `grid`.' },
  { configKey: 'gridColumns',                  attribute: 'grid-columns',                  converter: toInt({ min: 1 }), on: 'reinit', description: 'Columns in the month grid when month-layout is `grid`.' },
  { configKey: 'isUnifiedNavigationEnabled',   attribute: 'is-unified-navigation-enabled', converter: toBool('presence'), on: 'reinit', description: 'In grid layouts, drive the whole grid from one anchor month instead of per-column navigation.' },
  { configKey: 'unifiedNavigationAnchorIndex', attribute: 'unified-navigation-anchor-index', converter: toInt(), on: 'reinit', description: 'Which month index anchors unified navigation.' },
  { configKey: 'pickerMode',                   attribute: 'picker-mode',                   converter: toEnum(PICKER_MODES, { default: 'date' }), on: 'reinit', description: 'Whether the control picks a `date`, a `time`, or a `datetime`.' },
  { configKey: 'isSecondsShown',               attribute: 'is-seconds-shown',              converter: toBool('tristate'), on: 'reinit', description: 'Show a seconds field in time/datetime mode.' },
  { configKey: 'hourCycle',                    attribute: 'hour-cycle',                    converter: toEnum(HOUR_CYCLES), on: 'reinit', description: '12- or 24-hour clock for time/datetime mode.' },
  { configKey: 'isSummaryShown',               attribute: 'is-summary-shown',              converter: toBool('tristate'), on: 'reinit', description: 'Show the range summary (day/night counts) block.' },

  // ── In-place (→ update): the engine patches these without a rebuild ───────
  { configKey: 'dateFormatMask',               attribute: 'date-format-mask',              converter: toText({ default: 'YYYY-MM-DD' }), on: 'update', description: 'Parse/format mask for dates (YYYY/YY, MM/M, DD/D with any separators).' },
  { configKey: 'displayFormatMask',            attribute: 'display-format-mask',           converter: toText({ isNullable: true }), on: 'update', description: 'Localized format hint shown as the input placeholder (when no explicit `placeholder`).' },
  { configKey: 'isUnifiedHeaderInteractive',   attribute: 'is-unified-header-interactive', converter: toBool('presence'), on: 'update', description: 'Make the unified grid header clickable (opens the rolling selector).' },
  { configKey: 'calendarPlacement',            attribute: 'calendar-placement',            converter: toText({ isNullable: true }), on: 'update', description: 'Floating-UI placement for the popover (default `bottom-start`).' },
  { configKey: 'weekStartDay',                 attribute: 'week-start-day',                converter: toWeekStartDay(), on: 'update', type: "'auto' | 0 | 1 | 2 | 3 | 4 | 5 | 6", description: 'First column of the week: `auto` (locale) or a weekday index 0 (Sunday)–6 (Saturday).' },
  { configKey: 'minDate',                      attribute: 'min-date',                      converter: toText({ isNullable: true }), on: 'update', description: 'Earliest selectable date (ISO string).' },
  { configKey: 'maxDate',                      attribute: 'max-date',                      converter: toText({ isNullable: true }), on: 'update', description: 'Latest selectable date (ISO string).' },
  { configKey: 'initialDate',                  attribute: 'initial-date',                  converter: toText({ isNullable: true }), on: 'update', description: 'Month/date the calendar opens on when nothing is selected (ISO string).' },
  { configKey: 'disabledWeekdays',             attribute: 'disabled-weekdays',             converter: toDisabledWeekdays(), on: 'update', type: 'number[]', description: 'CSV of weekday indices (0=Sunday…6=Saturday) that cannot be selected.' },
  { configKey: 'disabledDates',                attribute: 'disabled-dates',                converter: toDisabledDates(), on: 'update', type: 'Array<Date | string>', description: 'Specific dates that cannot be selected. Attribute: CSV of ISO strings; property: array of Date or string.' },
  { configKey: 'disabledDatesHandling',        attribute: 'disabled-dates-handling',       converter: toEnum(DISABLED_HANDLING), on: 'update', description: 'Strategy for ranges that span disabled dates: `allow`, `prevent`, `block`, `split`, or `individual`.' },
  { configKey: 'shouldHighlightDisabledInRange', attribute: 'should-highlight-disabled-in-range', converter: toBool('tristate'), on: 'update', description: 'Visually mark disabled dates that fall inside a selected range.' },
  { configKey: 'locale',                       attribute: 'locale',                        converter: toText({ default: 'auto' }), on: 'update', description: 'BCP-47 locale, or `auto` to detect from the browser.' },
  { configKey: 'monthNames',                   attribute: 'month-names',                   converter: toPipeList(12), on: 'update', type: 'string[]', description: 'Override month names. Attribute: 12 pipe-delimited names, index 0=January; property: `string[]`.' },
  { configKey: 'weekdayNames',                 attribute: 'weekday-names',                 converter: toPipeList(7), on: 'update', type: 'string[]', description: 'Override weekday names. Attribute: 7 pipe-delimited names, index 0=Sunday; property: `string[]`.' },
  { configKey: 'rollingYearRange',             attribute: 'rolling-year-range',            converter: toText({ isNullable: true }), on: 'update', description: 'Constrains the rolling year selector (e.g. `-5:+5` or absolute years).' },
  { configKey: 'rollingMonthRange',            attribute: 'rolling-month-range',           converter: toText({ isNullable: true }), on: 'update', description: 'Constrains the rolling month selector.' },
  { configKey: 'autoClose',                    attribute: 'auto-close',                    converter: toEnum(AUTO_CLOSE), on: 'update', description: 'When the floating calendar closes automatically: `never`, on `selection`, or on `apply`.' },
  { configKey: 'shouldCloseOnScroll',          attribute: 'should-close-on-scroll',        converter: toBool('tristate'), on: 'update', description: 'Close the floating calendar when the page scrolls.' },
  { configKey: 'isTodayButtonShown',           attribute: 'is-today-button-shown',         converter: toBool('tristate'), on: 'update', description: 'Show the “Today” action button.' },
  { configKey: 'isClearButtonShown',           attribute: 'is-clear-button-shown',         converter: toBool('tristate'), on: 'update', description: 'Show the “Clear” action button.' },
  { configKey: 'isApplyButtonShown',           attribute: 'is-apply-button-shown',         converter: toBool('tristate'), on: 'update', description: 'Show the “Apply” action button (defers events until clicked).' },
  { configKey: 'timeFormatMask',               attribute: 'time-format-mask',              converter: toText({ default: 'HH:mm' }), on: 'update', description: 'Parse/format mask for times (HH/mm/ss).' },
  { configKey: 'displayTimeFormatMask',        attribute: 'display-time-format-mask',      converter: toText({ isNullable: true }), on: 'update', description: 'Localized display mask for the time portion.' },
  { configKey: 'timeStep',                     attribute: 'time-step',                     converter: toInt({ min: 1 }), on: 'update', description: 'Minute step for the time picker.' },
  { configKey: 'isNowButtonShown',             attribute: 'is-now-button-shown',           converter: toBool('tristate'), on: 'update', description: 'Show the “Now” button in time/datetime mode.' },
  { configKey: 'timeDisplay',                  attribute: 'time-display',                  converter: toEnum(TIME_DISPLAYS, { default: 'rolls' }), on: 'update', description: 'Time-picker UI: `rolls`, `clock`, `wheel`, or `compact`.' },

  // ── Member mappings for the specialDates array (→ update) ─────────────────
  { configKey: 'dateMember',                   attribute: 'date-member',                   converter: toText({ isNullable: true }), on: 'update', description: 'Property name on a decorated-date object holding its date.' },
  { configKey: 'badgeTextMember',              attribute: 'badge-text-member',             converter: toText({ isNullable: true }), on: 'update', description: 'Property name holding a day badge’s text.' },
  { configKey: 'badgeClassMember',             attribute: 'badge-class-member',            converter: toText({ isNullable: true }), on: 'update', description: 'Property name holding a day badge’s CSS class.' },
  { configKey: 'dayClassMember',               attribute: 'day-class-member',              converter: toText({ isNullable: true }), on: 'update', description: 'Property name holding a day cell’s CSS class.' },
  { configKey: 'badgeTooltipMember',           attribute: 'badge-tooltip-member',          converter: toText({ isNullable: true }), on: 'update', description: 'Property name holding a badge tooltip string.' },
  { configKey: 'dayTooltipMember',             attribute: 'day-tooltip-member',            converter: toText({ isNullable: true }), on: 'update', description: 'Property name holding a day tooltip string.' },
  { configKey: 'isDisabledMember',             attribute: 'is-disabled-member',            converter: toText({ isNullable: true }), on: 'update', description: 'Property name flagging a decorated date as disabled.' },

  // ── Element-level attributes (NON-picker; handled by this element) ────────
  { configKey: 'inputValue',                   attribute: 'value',                         converter: toText({ isNullable: true, isEmptyAllowed: true }), on: 'update', description: 'Text value of the input (floating/modal modes). Reflected to the live input; read/write via the `value` property.' },
  { configKey: 'placeholder',                  attribute: 'placeholder',                   converter: toText({ isNullable: true }), on: 'update', description: 'Input placeholder (falls back to display-format-mask).' },
  { configKey: 'disabled',                     attribute: 'disabled',                      converter: toBool('presence'), reflect: true, on: 'update', description: 'Disable the input.' },
  { configKey: 'isReadonly',                   attribute: 'readonly',                      converter: toBool('presence'), on: 'update', description: 'Full read-only lock (freezes every interaction aspect). Read/write via the `readonly` property, or use `lock()` for partial locks.' },
  { configKey: 'inputSize',                    attribute: 'input-size',                    converter: toText({ default: 'md' }), on: 'update', description: 'Input size scale: `xs` | `sm` | `md` | `lg` | `xl` (floating/modal only).' },
  { configKey: 'enableTransitions',            attribute: 'enable-transitions',            converter: toBool('presence'), reflect: true, on: 'update', description: 'Opt into calendar open/close CSS transitions.' },
  { configKey: 'mobileModalBreakpoint',        attribute: 'mobile-modal-breakpoint',       converter: toText({ isNullable: true }), on: 'update', description: 'Viewport width below which a floating picker auto-switches to modal (e.g. `640px`).' },
  { configKey: 'mobileModalMinHeight',         attribute: 'mobile-modal-min-height',       converter: toText({ isNullable: true }), on: 'update', description: 'Viewport height below which a floating picker auto-switches to modal (e.g. `500px`).' },
  { configKey: 'showDebugInfo',                attribute: 'show-debug-info',               converter: toBool('presence'), on: 'update', description: 'Enable the picker’s debug logging.' },

  // ── Complex property data (property-only) ─────────────────────────────────
  { configKey: 'specialDates',                 converter: toObjectArray(), on: 'update', type: 'DecoratedDate[]', description: 'Array of decorated-date objects (badges, tooltips, per-day classes). Property-only.' },
  { configKey: 'actionButtons',               converter: toValue({ validate: (v): v is unknown[] => Array.isArray(v) }), on: 'update', type: 'ActionButton[]', description: 'Custom footer action buttons. Property-only; when unset the built-in buttons apply.' },
  { configKey: 'customStrings',                converter: toObject(), on: 'update', type: 'Partial<LocaleStrings>', description: 'Per-instance locale string overrides. Property-only.' },

  // ── Callbacks (property-only; cosmetic/data → update) ─────────────────────
  { configKey: 'getDateMetadataCallback',      converter: cb(), on: 'update', type: '(ctx: DayContext) => DayMetadata | null', description: 'Compute per-day metadata (badges, classes, disabled) dynamically.' },
  { configKey: 'badgeTooltipCallback',         converter: cb(), on: 'update', type: '(ctx: DayContext) => string | null', description: 'Tooltip text for a day badge.' },
  { configKey: 'dayTooltipCallback',           converter: cb(), on: 'update', type: '(ctx: DayContext) => string | null', description: 'Tooltip text for a day cell.' },
  { configKey: 'renderDayCallback',            converter: cb(), on: 'update', type: '(ctx: DayContext) => HTMLElement | string | null', description: 'Fully custom-render a day cell.' },
  { configKey: 'renderDayContentCallback',     converter: cb(), on: 'update', type: '(ctx: DayContext) => HTMLElement | string | null', description: 'Custom-render the content inside a day cell.' },
  { configKey: 'formatSummaryCallback',        converter: cb(), on: 'update', type: '(ctx: SummaryContext) => string', description: 'Render the range summary text.' },
  { configKey: 'getUnifiedHeaderCallback',     converter: cb(), on: 'update', type: '(ctx: UnifiedHeaderContext) => string', description: 'Render the unified grid header label.' },
  { configKey: 'getMonthHeaderCallback',       converter: cb(), on: 'update', type: '(ctx: MonthHeaderContext) => string', description: 'Render a per-column month header label.' },
  { configKey: 'customStylesCallback',         converter: cb(), on: 'update', type: '() => string', description: 'Return a CSS string injected into the component via a replaceable style slot (§12.8).' },

  // ── Callbacks: before-hooks (behavior-shaping → update) ───────────────────
  { configKey: 'beforeDateSelectCallback',     converter: cb(), on: 'update', type: '(ctx: SelectionContext) => BeforeSelectResult | Promise<BeforeSelectResult>', description: 'Runs before a day is selected; can veto or adjust the selection.' },
  { configKey: 'beforeMonthChangedCallback',   converter: cb(), on: 'update', type: '(ctx: MonthChangeContext) => BeforeMonthChangeResult | Promise<BeforeMonthChangeResult>', description: 'Runs before month navigation; can veto the change.' },
];

// Outward events (core §12.5). `date-select`/`change` are emitted by this element
// (bridged from the picker's onSelect); `custom-action` is emitted by the picker
// itself and bubbles (composed) up to the host — declaring it here installs the
// managed `onCustomAction` handler property and lists it in the CEM manifest.
type DrpEvents = {
  'date-select': SelectEventDetail;
  change: SelectEventDetail;
  'custom-action': CustomActionEventDetail;
};
const EVENTS = [
  { name: 'date-select', description: 'A date/range/time was selected (or applied). `detail` carries the date(s)/range(s), the formatted value, and — depending on disabled-dates-handling — enabled/disabled/split breakdowns.' },
  { name: 'change', description: 'Fires alongside `date-select` for form-style change wiring; same detail.' },
  { name: 'custom-action', description: 'A custom action button was clicked. `detail.data` is the button’s data-* map; `detail.picker` is the picker instance.' },
] as const;

/**
 * configKeys that are NOT part of the picker's `DatePickerOptions` — handled by
 * this element directly (input shell, mobile-modal, custom styles). Stripped
 * before the merged config is handed to the picker.
 */
const NON_PICKER_KEYS = new Set([
  'inputValue', 'placeholder', 'disabled', 'isReadonly', 'inputSize', 'enableTransitions',
  'mobileModalBreakpoint', 'mobileModalMinHeight', 'customStylesCallback',
]);

/** Modes that render an input element (inline mode has none). */
function hasInput(mode: string): boolean {
  return mode === 'floating' || mode === 'modal';
}

// ============================================================================
export class WebDaterangepickerElement extends BlissElement<DrpEvents> {
  protected static override inputs = INPUTS;
  protected static override events = EVENTS;

  // Type-only: core installs the managed accessors at runtime (§12.5).
  declare onDateSelect: ((e: CustomEvent<SelectEventDetail>) => void) | null;
  declare onChange: ((e: CustomEvent<SelectEventDetail>) => void) | null;
  declare onCustomAction: ((e: CustomEvent<CustomActionEventDetail>) => void) | null;

  #shadow: ShadowRoot;
  #picker?: DateRangePicker;
  #inputElement?: HTMLInputElement;
  #customStyles: StyleSlot | null = null;

  // mobile-modal auto-engage: matchMedia listeners that flip positioning-mode
  // between the configured value and 'modal' as the viewport crosses a threshold.
  #mobileModalMqls: MediaQueryList[] = [];
  #mobileModalListener: (() => void) | null = null;
  #configuredPositioningMode: string | null = null;

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });
    // §12.8: static shell CSS via one shared, cached CSSStyleSheet (per string).
    adoptStyles(this.#shadow, styles);
    // Per-instance replaceable slot for customStylesCallback CSS.
    this.#customStyles = createStyleSlot(this.#shadow, { className: 'drp-custom-styles' });
  }

  // ── core lifecycle hooks ──────────────────────────────────────────────────

  /** Structural change (or first connect): rebuild the picker. */
  protected override reinit(): void {
    // reinit() runs on first connect (isConnected true) and on later on:'reinit'
    // changes. connect() covers the plain-reconnect (DOM move) case.
    if (this.isConnected) this.#rebuildPicker();
  }

  /** Cosmetic change: element-level side effects, then patch the picker in place. */
  protected override update(partial: Record<string, unknown>): void {
    // Element-level (non-picker) side effects.
    if ('inputValue' in partial && this.#inputElement) this.#inputElement.value = (partial.inputValue as string | null) ?? '';
    if ('placeholder' in partial) this.#applyPlaceholder();
    if ('disabled' in partial && this.#inputElement) this.#inputElement.disabled = !!partial.disabled;
    if ('isReadonly' in partial && this.#picker) partial.isReadonly ? this.#picker.lock() : this.#picker.unlock();
    if ('inputSize' in partial) this.#applyInputSizeStyles();
    if ('enableTransitions' in partial) this.#applyTransitionStyles();
    if ('displayFormatMask' in partial) this.#applyPlaceholder();
    if ('customStylesCallback' in partial) this.#applyCustomStyles();
    if (('mobileModalBreakpoint' in partial || 'mobileModalMinHeight' in partial) && this.#picker) {
      this.#setupMobileModalListener();
    }

    // Everything else goes to the live picker as an in-place patch; null clears
    // (matches the old `undefined` semantics), NON_PICKER_KEYS are handled above.
    const pickerPartial: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(partial)) {
      if (NON_PICKER_KEYS.has(key)) continue;
      pickerPartial[key] = value === null ? undefined : value;
    }
    if (this.#picker && Object.keys(pickerPartial).length > 0) {
      if (!this.#picker.updateOptions(pickerPartial as Partial<DatePickerOptions>)) this.#rebuildPicker();
    }
  }

  /** Activate: ensure the picker exists (a DOM move destroyed it in disconnect()). */
  protected override connect(): void {
    if (!this.#picker) this.#buildPicker();
    this.#setupMobileModalListener();
  }

  /** Deactivate: tear the picker down (rebuilt on the next connect). */
  protected override disconnect(): void {
    this.#teardownMobileModalListener();
    this.#picker?.destroy();
    this.#picker = undefined;
  }

  // ── picker lifecycle ──────────────────────────────────────────────────────

  #rebuildPicker(): void {
    this.#picker?.destroy();
    this.#picker = undefined;
    this.#buildPicker();
  }

  #buildPicker(): void {
    const mode = (this.config.positioningMode as string) ?? 'floating';

    // Reconcile the input shell with the current positioning mode.
    if (hasInput(mode)) {
      this.#ensureInput();
    } else if (this.#inputElement) {
      this.#inputElement.remove();
      this.#inputElement = undefined;
    }
    // floating/modal require the input to anchor to.
    if (hasInput(mode) && !this.#inputElement) return;

    const options = this.#assembleConfig();
    const inputElement = hasInput(mode) ? this.#inputElement! : null;
    this.#picker = new DateRangePicker(inputElement, options as DatePickerOptions);

    // Re-apply a declarative full lock (the attribute is the source of truth and
    // must survive a rebuild).
    if (this.config.isReadonly) this.#picker.lock();

    this.#applyCustomStyles();
    // Apply transition styles once the calendar DOM exists.
    setTimeout(() => this.#applyTransitionStyles(), 0);
  }

  #ensureInput(): void {
    if (this.#inputElement) return;
    const input = document.createElement('input');
    input.type = 'text';
    input.classList.add('drp__input');
    this.#applyPlaceholderTo(input);
    const value = this.config.inputValue as string | null;
    if (value) input.value = value;
    if (this.config.disabled) input.disabled = true;
    this.#shadow.appendChild(input);
    this.#inputElement = input;
    this.#applyInputSizeStyles();
  }

  /**
   * Build the picker config from the merged `this.config`, minus the keys the
   * picker doesn't own, plus the runtime wiring (onSelect bridge + container).
   */
  #assembleConfig(): Record<string, unknown> {
    const cfg: Record<string, unknown> = { ...this.config };
    // Drop element-only keys and normalize "unset" (null) → absent, so the picker
    // sees exactly what the old hand-coded parser handed it (undefined).
    for (const key of NON_PICKER_KEYS) delete cfg[key];
    for (const key of Object.keys(cfg)) {
      if (cfg[key] === null) delete cfg[key];
    }

    cfg.onSelect = (date: Date | DateRange | DateRange[] | Date[]) => this.#handleDateSelect(date);
    cfg.container = this.#shadow as unknown as HTMLElement;
    return cfg;
  }

  // ── event bridge ──────────────────────────────────────────────────────────

  #handleDateSelect(date: Date | DateRange | DateRange[] | Date[]): void {
    const detail: SelectEventDetail = {
      date: date instanceof Date ? date : undefined,
      dateRange: date instanceof Date ? undefined : (Array.isArray(date) ? undefined : date),
      formattedValue: this.#inputElement?.value || '',
    };

    const picker = this.#picker;
    if (!picker) {
      this.emit('date-select', detail);
      this.emit('change', detail);
      return;
    }

    // Deferred until Apply — don't fire yet (apply() re-invokes onSelect later).
    if (picker.requiresApplyButton() && picker.hasPendingSelection) return;

    const handling = picker.options.disabledDatesHandling;

    if (!(date instanceof Date) && !Array.isArray(date) && 'start' in date && 'end' in date) {
      const start = date.start;
      const end = date.end;
      switch (handling) {
        case 'allow':
          detail.enabledDates = picker.getEnabledDatesInRange(start, end);
          detail.disabledDates = picker.getDisabledDatesInRange(start, end);
          detail.getEnabledDateCount = () => detail.enabledDates!.length;
          detail.getTotalDays = () => {
            const msPerDay = 1000 * 60 * 60 * 24;
            return Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1;
          };
          break;
        case 'split':
          detail.dateRanges = picker.splitRangeByDisabled(start, end);
          detail.dates = picker.getEnabledDatesInRange(start, end);
          if (detail.dateRanges.length > 0) {
            detail.formattedValue = detail.dateRanges
              .map((r) => `${picker.formatDate(r.start)} - ${picker.formatDate(r.end)}`)
              .join(', ');
          }
          break;
        case 'individual':
          detail.dates = picker.getEnabledDatesInRange(start, end);
          detail.dateRange = null;
          if (detail.dates.length > 0) {
            detail.formattedValue = detail.dates.map((d) => picker.formatDate(d)).join(', ');
          }
          break;
        case 'block':
          detail.dates = picker.getEnabledDatesInRange(start, end);
          break;
      }
    } else if (Array.isArray(date) && date.length > 0 && typeof date[0] === 'object' && 'start' in (date[0] as object)) {
      const ranges = date as DateRange[];
      detail.dateRanges = ranges;
      detail.formattedValue = ranges
        .map((r) => `${picker.formatDate(r.start)} - ${picker.formatDate(r.end)}`)
        .join(', ');
    }

    this.emit('date-select', detail);
    this.emit('change', detail);
  }

  // ── element-level styling helpers ─────────────────────────────────────────

  #applyPlaceholder(): void {
    if (this.#inputElement) this.#applyPlaceholderTo(this.#inputElement);
  }

  #applyPlaceholderTo(input: HTMLInputElement): void {
    // Explicit placeholder wins; otherwise fall back to display-format-mask.
    const placeholder = (this.config.placeholder as string | null) ?? (this.config.displayFormatMask as string | null);
    input.placeholder = placeholder ?? '';
  }

  #applyInputSizeStyles(): void {
    const input = this.#inputElement;
    if (!input) return;
    input.classList.remove('drp__input--xs', 'drp__input--sm', 'drp__input--lg', 'drp__input--xl');
    const size = (this.config.inputSize as string) || 'md';
    if (size && size !== 'md') input.classList.add(`drp__input--${size}`);
  }

  #applyTransitionStyles(): void {
    const calendar = this.#shadow.querySelector('.drp__picker') as HTMLElement | null;
    if (!calendar) return;
    calendar.classList.toggle('drp__picker--transitions-enabled', !!this.config.enableTransitions);
  }

  #applyCustomStyles(): void {
    const slot = this.#customStyles;
    if (!slot) return;
    const callback = this.config.customStylesCallback as (() => string | null | undefined) | null | undefined;
    if (typeof callback !== 'function') {
      slot.clear();
      return;
    }
    try {
      slot.set(callback());
    } catch (e) {
      console.warn('[web-daterangepicker] customStylesCallback threw', e);
      slot.clear();
    }
  }

  // ── mobile-modal auto-engage ──────────────────────────────────────────────

  /**
   * Set up matchMedia listeners that auto-switch positioning-mode to 'modal'
   * when ANY configured viewport threshold matches, and back to the configured
   * mode when none do. Only engages when the configured mode is 'floating'.
   */
  #setupMobileModalListener(): void {
    this.#teardownMobileModalListener();

    const widthRaw = this.config.mobileModalBreakpoint as string | null;
    const heightRaw = this.config.mobileModalMinHeight as string | null;
    if (!widthRaw && !heightRaw) return;

    // Auto-engage only from 'floating'. `_configuredPositioningMode` remembers the
    // origin so later flips can restore it (config.positioningMode becomes 'modal').
    const configured = this.#configuredPositioningMode ?? ((this.config.positioningMode as string) || 'floating');
    if (configured !== 'floating') return;
    this.#configuredPositioningMode = configured;

    const normalize = (raw: string) => (/^\d+$/.test(raw) ? `${raw}px` : raw);
    const queries: string[] = [];
    if (widthRaw) queries.push(`(max-width: ${normalize(widthRaw)})`);
    if (heightRaw) queries.push(`(max-height: ${normalize(heightRaw)})`);
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    this.#mobileModalMqls = queries.map((q) => window.matchMedia(q));

    const apply = () => {
      const anyMatch = this.#mobileModalMqls.some((mql) => mql.matches);
      const target = anyMatch ? 'modal' : (this.#configuredPositioningMode || 'floating');
      if (this.getAttribute('positioning-mode') !== target) this.setAttribute('positioning-mode', target);
    };
    apply();
    this.#mobileModalListener = apply;
    this.#mobileModalMqls.forEach((mql) => mql.addEventListener('change', this.#mobileModalListener!));
  }

  #teardownMobileModalListener(): void {
    if (this.#mobileModalListener) {
      this.#mobileModalMqls.forEach((mql) => mql.removeEventListener('change', this.#mobileModalListener!));
    }
    this.#mobileModalMqls = [];
    this.#mobileModalListener = null;
    this.#configuredPositioningMode = null;
  }

  // ── imperative API (flush pending writes, then delegate to the picker) ─────

  /** Open the calendar (floating/modal modes). */
  show(): void { this.flush(); this.#picker?.show(); }
  /** Close the calendar (floating/modal modes). */
  hide(): void { this.flush(); this.#picker?.hide(); }
  /** Toggle the calendar open/closed. */
  toggle(): void { this.flush(); this.#picker?.toggle(); }
  /** Clear the current selection and reset the input. */
  clearSelection(): void { this.flush(); this.#picker?.clearSelection(); }

  /** Show an inline message; `autoHide` (ms) dismisses it automatically. */
  showMessage(content: string, type?: 'error' | 'warning' | 'info' | 'success', autoHide?: number): void {
    this.flush(); this.#picker?.showMessage(content, type, autoHide);
  }
  /** Hide the current inline message. */
  hideMessage(): void { this.flush(); this.#picker?.hideMessage(); }
  /** Toggle the inline message on/off. */
  toggleMessage(content?: string, type?: 'error' | 'warning' | 'info' | 'success', autoHide?: number): void {
    this.flush(); this.#picker?.toggleMessage(content, type, autoHide);
  }

  /** Write custom HTML into the summary block (pins until the next selection change). */
  showSummary(content: string): void { this.flush(); this.#picker?.showSummary(content); }
  /** Drop any summary override and re-derive from selection state. */
  hideSummary(): void { this.flush(); this.#picker?.hideSummary(); }
  /** Re-run summary derivation now (respects an active override). */
  refreshSummary(): void { this.flush(); this.#picker?.refreshSummary(); }

  /** Show a loader overlay. `target`: `calendar` (default) | `message` | `summary`. */
  showLoader(target?: LoaderTarget): void { this.flush(); this.#picker?.showLoader(target); }
  /** Hide the loader for the given target (default `calendar`). */
  hideLoader(target?: LoaderTarget): void { this.flush(); this.#picker?.hideLoader(target); }
  /** Toggle the loader for the given target (default `calendar`). */
  toggleLoader(target?: LoaderTarget): void { this.flush(); this.#picker?.toggleLoader(target); }

  /**
   * Freeze user interaction. No argument locks every aspect (full read-only lock);
   * pass an aspect or array to freeze only part (`'selection' | 'navigation' |
   * 'actions' | 'open'`). The programmatic API is unaffected.
   */
  lock(aspects?: LockAspect | LockAspect[]): void { this.flush(); this.#picker?.lock(aspects); }
  /** Release the given aspect(s), or the whole lock when called with no argument. */
  unlock(aspects?: LockAspect | LockAspect[]): void { this.flush(); this.#picker?.unlock(aspects); }
  /** Toggle the given aspect(s), or the whole lock when called with no argument. */
  toggleLock(aspects?: LockAspect | LockAspect[]): void { this.flush(); this.#picker?.toggleLock(aspects); }
  /** True when the given aspect is currently locked. */
  isAspectLocked(aspect: LockAspect): boolean { this.flush(); return this.#picker?.isAspectLocked(aspect) ?? false; }
  /** The currently locked aspects (read-only snapshot). */
  get lockedAspects(): LockAspect[] { this.flush(); return this.#picker?.lockedAspects ?? []; }

  /** The current text in the input (floating/modal modes); `''` when there is no input. */
  getInputValue(): string { return this.#inputElement?.value || ''; }
  /** Set the input text and reflect it to the `value` attribute. */
  setInputValue(value: string): void {
    if (this.#inputElement) this.#inputElement.value = value;
    this.setAttribute('value', value);
  }

  /**
   * Set custom month names.
   * @deprecated Assign the `monthNames` property instead.
   */
  setMonthNames(monthNames: string[]): void { (this as unknown as { monthNames: string[] }).monthNames = monthNames; }

  /** Align items within the rolling year/month selector (`flex-start` | `center` | `flex-end`). */
  setRollingItemAlignment(alignment: 'flex-start' | 'center' | 'flex-end'): void {
    const calendar = this.#shadow.querySelector('.drp__picker') as HTMLElement | null;
    calendar?.style.setProperty('--drp-rolling-item-justify-content', alignment);
  }

  // ── live-state accessors (read the picker/input, not the config) ──────────

  /** Text value of the input. */
  get value(): string { return this.getInputValue(); }
  set value(val: string) { this.setInputValue(val); }

  /**
   * Full read-only lock, reflected to the `readonly` attribute. Reads back `true`
   * only when every aspect is locked. For partial locks use `lock([...])`.
   */
  get readonly(): boolean { return this.#picker ? this.#picker.readonly : this.hasAttribute('readonly'); }
  set readonly(value: boolean) {
    if (value) this.setAttribute('readonly', '');
    else this.removeAttribute('readonly');
  }

  /** Committed ranges (range mode). Assigning replaces the selection. */
  get selectedRanges(): DateRange[] { this.flush(); return this.#picker?.selectedRanges || []; }
  set selectedRanges(ranges: DateRange[]) { this.flush(); if (this.#picker) this.#picker.selectedRanges = ranges; }

  /** Committed dates (multiple mode). Assigning replaces the selection. */
  get selectedDates(): Date[] { this.flush(); return this.#picker?.selectedDates || []; }
  set selectedDates(dates: Date[]) { this.flush(); if (this.#picker) this.#picker.selectedDates = dates; }

  /** Committed date (single mode). Assigning replaces the selection. */
  get selectedDate(): Date | null { this.flush(); return this.#picker?.selectedDate || null; }
  set selectedDate(date: Date | null) { this.flush(); if (this.#picker) this.#picker.selectedDate = date; }

  /** Committed range start (read-only; set a range via `selectedRanges`). */
  get selectedStartDate(): Date | null { this.flush(); return this.#picker?.selectedStartDate || null; }
  /** Committed range end (read-only; set a range via `selectedRanges`). */
  get selectedEndDate(): Date | null { this.flush(); return this.#picker?.selectedEndDate || null; }

  /** Selected time (time/datetime modes). */
  get selectedTime(): SelectedTime | null { this.flush(); return this.#picker?.selectedTime || null; }
  set selectedTime(time: SelectedTime | null) { this.flush(); if (this.#picker) this.#picker.selectedTime = time; }

  /** Composed date+time; the setter accepts a Date or ISO string and splits it. */
  get selectedDatetime(): Date | null { this.flush(); return this.#picker?.selectedDatetime || null; }
  set selectedDatetime(value: Date | string | null) { this.flush(); if (this.#picker) this.#picker.selectedDatetime = value; }

  // Displayed state (read-only; change what's shown via navigation, not assignment).
  /** Descriptor for each visible month column (read-only). */
  get visibleMonths(): MonthDisplay[] { this.flush(); return this.#picker?.visibleMonths || []; }
  /** Anchor date (first-of-month) for each visible column (read-only). */
  get visibleMonthDates(): Date[] { this.flush(); return this.#picker?.visibleMonthDates || []; }
  /** The overall date span currently rendered across all columns (read-only). */
  get visibleDateRange(): { start: Date; end: Date } | null { this.flush(); return this.#picker?.visibleDateRange || null; }

  /** The picker's notion of "today", normalized to 00:00 local. */
  get today(): Date { this.flush(); return this.#picker?.today || new Date(); }

  /** Whether the calendar is currently open. Assigning opens/closes it. */
  get isOpen(): boolean { this.flush(); return this.#picker?.isOpen || false; }
  set isOpen(value: boolean) { this.flush(); if (this.#picker) this.#picker.isOpen = value; }

  /**
   * The live `DateRangePicker` engine instance this element wraps (or `undefined`
   * before first connect / while detached). An escape hatch for advanced use —
   * the engine is also a public export — and the same white-box hook the old
   * `private picker` field exposed. Prefer the element's own methods/properties
   * where they exist.
   */
  get picker(): DateRangePicker | undefined { this.flush(); return this.#picker; }
}

// Importing this module registers the element (back-compat contract). The full
// global-API publish + logger-bundle wiring happens in index.ts via
// registerComponent(); both defines are idempotent, so importing either works.
if (typeof customElements !== 'undefined' && !customElements.get('web-daterangepicker')) {
  customElements.define('web-daterangepicker', WebDaterangepickerElement);
}
