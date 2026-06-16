/**
 * Result from beforeDateSelectCallback
 * Tells the component what action to take with the proposed selection
 */
export interface BeforeSelectResult {
  /**
   * Action to take:
   * - 'accept': Use the proposed selection as-is
   * - 'adjust': Use adjusted date(s) instead
   * - 'restore': Revert to the previous selection before this operation
   * - 'clear': Clear the selection entirely
   */
  action: 'accept' | 'adjust' | 'restore' | 'clear';

  /** If action is 'adjust' (single mode), the new date to use */
  adjustedDate?: Date;

  /** If action is 'adjust' (range mode), the new start date to use */
  adjustedStartDate?: Date;

  /** If action is 'adjust' (range mode), the new end date to use */
  adjustedEndDate?: Date;

  /** Optional message to log or display to user */
  message?: string;

  /**
   * When true with action 'restore', keeps the invalid range visible with distinct
   * error styling (red-tinted background) instead of discarding it entirely.
   * This provides visual feedback showing what the user attempted to select.
   * The invalid range styling is cleared when the user makes a new selection attempt.
   *
   * Only applies to range mode with action 'restore'.
   *
   * @example
   * beforeDateSelectCallback: (range) => {
   *   const nights = Math.floor((range.end - range.start) / (1000 * 60 * 60 * 24));
   *   if (nights > 7) {
   *     return {
   *       action: 'restore',
   *       message: 'Maximum 7 nights allowed',
   *       showInvalidRange: true  // Keep range visible with error styling
   *     };
   *   }
   *   return { action: 'accept' };
   * }
   */
  showInvalidRange?: boolean;
}

/**
 * @deprecated Use BeforeSelectResult instead. Will be removed in v2.0.0
 */
export type AsyncValidationResult = BeforeSelectResult;

/**
 * Context passed to beforeMonthChangedCallback
 * Provides information about the target month being navigated to
 */
export interface BeforeMonthChangeContext {
  /** Target year (e.g., 2025) */
  year: number;

  /** Target month (0-11, where January = 0) */
  month: number;

  /** Which visible month column is changing (0-based) */
  monthIndex: number;

  /** First date visible in the calendar grid (may be from previous month) */
  firstVisibleDate: Date;

  /** Last date visible in the calendar grid (may be from next month) */
  lastVisibleDate: Date;
}

/**
 * Result from beforeMonthChangedCallback
 * Tells the component whether to proceed with month navigation and provides bulk metadata
 */
export interface BeforeMonthChangeResult {
  /**
   * Action to take:
   * - 'accept': Allow navigation to proceed, update metadata cache if provided
   * - 'block': Prevent navigation, stay on current month
   */
  action: 'accept' | 'block';

  /**
   * Bulk metadata for all dates in the visible range
   * Key: YYYY-MM-DD string
   * Value: DayMetadata with styling/disabled state
   *
   * When provided, these values are cached and used instead of calling
   * getDateMetadataCallback for individual dates during rendering
   */
  metadata?: Map<string, DayMetadata>;

  /**
   * Custom header text for each month
   * Key: "YYYY-MM" string (e.g., "2026-01" for January 2026)
   * Value: Custom header text to display (e.g., "Jan 2026 (10 rooms)")
   *
   * When provided, these values override the default month header format.
   * Takes precedence over getMonthHeaderCallback.
   */
  monthHeaders?: Map<string, string>;

  /** Optional message to log or display (typically used with 'block' action) */
  message?: string;
}

/**
 * Action button configuration for calendar actions (Today, Clear, Apply, custom actions)
 * Aligned with web-multiselect ActionButton interface
 */
export interface ActionButton {
  /** Action identifier ('today', 'now', 'clear', 'apply', or 'custom' for custom actions) */
  action: 'today' | 'now' | 'clear' | 'apply' | 'custom';

  /** Button text label */
  text: string;

  /** Optional CSS class(es) to add to the button */
  cssClass?: string;

  /** Optional tooltip text */
  tooltip?: string;

  /** Static visibility - set to false to hide button */
  isVisible?: boolean;

  /** Static disabled state - set to true to disable button */
  isDisabled?: boolean;

  /** Custom click handler (required for 'custom' action) */
  onClick?: (picker: any) => void | Promise<void>;

  /** Dynamic visibility callback - return false to hide button (takes priority over isVisible) */
  isVisibleCallback?: (picker: any) => boolean;

  /** Dynamic disabled state callback - return true to disable button (takes priority over isDisabled) */
  isDisabledCallback?: (picker: any) => boolean;

  /** Dynamic text callback - return button text (takes priority over text) */
  getTextCallback?: (picker: any) => string;

  /** Dynamic CSS class callback - return class name(s) (takes priority over cssClass) */
  getClassCallback?: (picker: any) => string | string[];

  /** Dynamic tooltip callback - return tooltip text (takes priority over tooltip) */
  getTooltipCallback?: (picker: any) => string;
}

export type PickerMode = 'date' | 'time' | 'datetime';
export type TimeDisplay = 'rolls' | 'clock' | 'wheel' | 'compact';

export interface DatePickerOptions {
  selectionMode?: 'single' | 'range' | 'multiple';
  /**
   * What the picker is selecting:
   * - 'date' (default): calendar grid only — unchanged historical behavior
   * - 'time': time rolls only (hours/minutes + optional seconds/AM-PM), no calendar
   * - 'datetime': calendar grid plus time rolls in a side-by-side popover
   *
   * In v1, 'time' and 'datetime' only support selectionMode 'single' and
   * 'datetime' is incompatible with monthLayout 'grid' — both fall back with a console warning.
   */
  pickerMode?: PickerMode;
  /** Time format for time / datetime modes. Tokens: HH/H, hh/h, mm/m, ss/s, a. Default: 'HH:mm'. */
  timeFormatMask?: string;
  /** Optional separate display format for the time portion (mirrors displayFormatMask). Falls back to timeFormatMask. */
  displayTimeFormatMask?: string;
  /** Minute (and second) increment for the rolls. Default: 1. */
  timeStep?: number;
  /** 'h24' for 0-23, 'h12' for 1-12 + AM/PM roll. Default: derived from timeFormatMask (h12 if `a` token present, else h24). */
  hourCycle?: 'h12' | 'h24';
  /** Show a third roll for seconds. Default: derived from timeFormatMask (true if `s` token present). */
  isSecondsShown?: boolean;
  /** Show a "Now" button in time/datetime modes (parallel to isTodayButtonShown). Default: true. Ignored in date mode. */
  isNowButtonShown?: boolean;
  /**
   * Which UI to use for picking the time portion (time/datetime modes):
   * - 'rolls' (default): scrollable rolling lists for hours/minutes/seconds/AM-PM (v1.14 default).
   * - 'clock': Material-style two-step clock face (hours then minutes). h24 uses a dual ring
   *   (outer 1-12, inner 13-24). Seconds are ignored and `time-step` must divide 60 evenly;
   *   non-divisor steps fall back to 1 with a console warning.
   * - 'wheel': iOS-style barrel/wheel picker. Snap-scroll columns for hours, minutes,
   *   (optional seconds), and AM/PM (h12 only) with a centered selection band and
   *   top/bottom fade gradients. Supports any `time-step`. Click any visible row to
   *   center it.
   * - 'compact': iOS 14+ pill picker. Tappable HH and MM (and optional SS) pills with a
   *   ':' separator; tap a pill to type a value directly. Optional AM/PM toggle (h12).
   *   Calmest of the four — basically inline numeric inputs styled as pills.
   *
   * Ignored when `pickerMode === 'date'`.
   */
  timeDisplay?: TimeDisplay;
  calendarPlacement?: string;
  visibleMonthsCount?: number;
  dateFormatMask?: string;
  calendarOpenTrigger?: 'focus' | 'typing' | 'manual';
  onSelect?: (date: Date | DateRange | DateRange[] | Date[]) => void;
  container?: HTMLElement; // Where to append the calendar (default: document.body)
  positioningMode?: 'inline' | 'floating' | 'modal'; // Display mode: 'inline' = static block, 'floating' = popup anchored to input, 'modal' = centered overlay with backdrop (default: 'floating')

  /**
   * Controls when the calendar auto-closes (floating mode only)
   * - 'never': Never auto-close, not even when Apply is clicked - user must close manually
   * - 'selection': Close when selection completes (single date click, range completion, drag-adjust) - DEFAULT
   *                Note: Multiple mode never auto-closes on selection, inherently requires Apply
   * - 'apply': Only close when Apply button is clicked
   */
  autoClose?: 'never' | 'selection' | 'apply';

  /**
   * Controls whether the calendar closes when user scrolls the page (floating mode only)
   * - true: Close on scroll (default)
   * - false: Keep open on scroll
   *
   * Note: Even when true, scroll won't close if:
   * - Apply button is required (isApplyButtonShown: true)
   * - A message is currently visible (validation error, etc.)
   */
  shouldCloseOnScroll?: boolean;

  // Calendar layout
  monthLayout?: 'horizontal' | 'grid'; // Layout mode: 'horizontal' = flex row (default), 'grid' = CSS grid
  gridRows?: number; // Number of rows for grid layout (e.g., 2 for 2x3 grid)
  gridColumns?: number; // Number of columns for grid layout (e.g., 3 for 2x3 grid)
  isUnifiedNavigationEnabled?: boolean; // When true, shows single navigation header above all months (for multi-month calendars). Individual month headers show only month/year text without nav buttons. Default: false
  /**
   * Which month column serves as the anchor for unified navigation (0-based index)
   * Default: 0 (first month)
   *
   * Example: For a 3×3 grid (9 months), set to 4 to use the center month as anchor
   * When navigating, the anchor month moves and all other months are calculated relative to it
   *
   * Only applies when isUnifiedNavigationEnabled is true
   */
  unifiedNavigationAnchorIndex?: number;
  /**
   * When true, clicking the unified header range display shows month/year selector
   * Default: false (header is static text only)
   *
   * Only applies when isUnifiedNavigationEnabled is true
   */
  isUnifiedHeaderInteractive?: boolean;

  // Week start configuration
  weekStartDay?: 'auto' | 0 | 1 | 2 | 3 | 4 | 5 | 6; // 'auto' = detect from locale, 0 = Sunday, 1 = Monday, etc.

  // Date restrictions
  minDate?: Date | string;
  maxDate?: Date | string;
  disabledDates?: (Date | string)[]; // Specific dates to disable
  disabledWeekdays?: number[]; // Days of week to disable (0 = Sunday, 6 = Saturday)

  // Initial display date
  initialDate?: Date | string; // Date to display when calendar opens. If not set, uses today or minDate if constrained.

  // Rolling selector configuration
  rollingYearRange?: string; // Year range to display in rolling selector. Examples: "2024" (single year), "2022-2026" (range). Default: currentYear ± 50
  rollingMonthRange?: string; // Month range to display in rolling selector. Format: "MM-MM". Examples: "01-12" (all), "06-08" (summer), "11-12" (year-end). Default: "01-12"

  // Special dates (holidays, events, etc.)
  specialDates?: DecoratedDate[];

  // Property mapping for specialDates array items
  // Specify which properties in your data objects map to DayMetadata fields
  // If not specified, defaults to DayMetadata property names
  dateMember?: string;              // Property containing the date value (default: 'date')
  badgeTextMember?: string;         // Property containing badge text (default: 'badgeText')
  badgeClassMember?: string;        // Property containing badge CSS class (default: 'badgeClass')
  dayClassMember?: string;          // Property containing day CSS class (default: 'dayClass')
  badgeTooltipMember?: string;      // Property containing badge tooltip (default: 'badgeTooltip')
  dayTooltipMember?: string;        // Property containing day tooltip (default: 'dayTooltip')
  isDisabledMember?: string;        // Property containing disabled flag (default: 'isDisabled')

  // Advanced callbacks
  getDateMetadataCallback?: (date: Date) => DayMetadata | null; // Custom styling/labels

  // Custom rendering
  customStylesCallback?: () => string; // Return CSS string to inject into Shadow DOM for use with renderDayCallback classes

  /**
   * Full replacement — return element or HTML string to completely replace day cell content.
   *
   * SECURITY: When returning a string, the value is spliced into innerHTML without escaping.
   * Callers are responsible for sanitizing any user-controlled data interpolated into the
   * returned string. Prefer returning an HTMLElement when content depends on untrusted input.
   */
  renderDayCallback?: (data: DayRenderData) => HTMLElement | string | null;

  /**
   * Augmentation — return element or HTML string to add to default day cell.
   *
   * SECURITY: Same caveat as renderDayCallback — string return values are appended to
   * innerHTML unescaped. Sanitize untrusted data or return an HTMLElement.
   */
  renderDayContentCallback?: (data: DayRenderData) => HTMLElement | string | null;

  // Tooltips (HTML support)
  badgeTooltipCallback?: (data: DayRenderData) => string | null; // Return HTML string for badge hover tooltip (overrides DayMetadata.badgeTooltip)
  dayTooltipCallback?: (data: DayRenderData) => string | null; // Return HTML string for day cell hover tooltip (overrides DayMetadata.dayTooltip)

  // Range selection behavior over disabled dates
  disabledDatesHandling?: 'allow' | 'prevent' | 'block' | 'split' | 'individual';
  // - 'allow': Allow ranges over disabled dates (default)
  // - 'prevent': Prevent selections that cross disabled dates (selection attempt is blocked)
  // - 'block': Snap selection to last enabled date before disabled gap
  // - 'split': Return multiple ranges split by disabled dates (event formatting only)
  // - 'individual': Return flat array of enabled dates (event formatting only)

  // Visual highlighting of disabled dates in selected range
  shouldHighlightDisabledInRange?: boolean; // Default: true. Set to false to only highlight enabled dates in range.

  // Action button configuration
  /** Array of custom action buttons to display. If not provided, uses default buttons based on selectionMode */
  actionButtons?: ActionButton[];

  /** Show Today button (default: true) */
  isTodayButtonShown?: boolean;

  /** Show Clear button (default: true) */
  isClearButtonShown?: boolean;

  /** Show Apply button (default: true for range/multiple modes, false for single mode) */
  isApplyButtonShown?: boolean;

  /** Show selection summary (range mode only — days/nights count). Default: true. Set to false to omit the summary block entirely. */
  isSummaryShown?: boolean;

  // Internationalization
  locale?: string | 'auto'; // Locale for UI strings and date formatting ('auto' = detect from browser, 'en', 'de', 'fr', 'es', etc.)
  displayFormatMask?: string; // Localized format mask for display (e.g., 'dd/mm/aaaa' in Spanish). If not provided, uses dateFormatMask.
  customStrings?: Partial<LocaleStrings>; // Override any UI strings
  monthNames?: string[]; // Custom month names (12 strings). If not provided, uses locale-based names. Examples: ['01', '02', ..., '12'] or ['Jan', 'Feb', ..., 'Dec']

  /**
   * Custom function to format the summary display (receives all selection data, returns HTML string).
   *
   * SECURITY: Return value is spliced into innerHTML without escaping. Callers are responsible
   * for sanitizing any user-controlled data in the returned string.
   */
  formatSummaryCallback?: (data: SummaryDetail) => string;

  /**
   * Callback to customize unified header range display text
   *
   * @param data - Contains first month, last month, anchor month, and month names
   * @returns HTML string to display in unified header
   *
   * @example Display only anchor month
   * getUnifiedHeaderCallback: ({ anchorMonth, monthNames }) => {
   *   return `${monthNames[anchorMonth.getMonth()]} ${anchorMonth.getFullYear()}`;
   *   // Returns: "May 2025" for 3×3 grid with anchor index 4
   * }
   *
   * @example Display full range
   * getUnifiedHeaderCallback: ({ firstMonth, lastMonth, monthNames }) => {
   *   return `${monthNames[firstMonth.getMonth()]} - ${monthNames[lastMonth.getMonth()]} ${lastMonth.getFullYear()}`;
   *   // Returns: "Jan - Sep 2025"
   * }
   *
   * SECURITY: Return value is spliced into innerHTML unescaped. Sanitize untrusted data.
   */
  getUnifiedHeaderCallback?: (data: {
    firstMonth: Date;
    lastMonth: Date;
    anchorMonth: Date;
    monthNames: string[];
  }) => string;

  /**
   * Callback to customize individual month header display text
   *
   * @param data - Contains the month being displayed and localized info
   * @returns String to display in month header
   *
   * Priority order for month headers:
   * 1. monthHeaders from beforeMonthChangedCallback result (if key exists)
   * 2. getMonthHeaderCallback (if defined)
   * 3. Default: "${monthName} ${year}"
   *
   * @example Display room availability
   * getMonthHeaderCallback: ({ month, monthName, year }) => {
   *   const key = `${year}-${String(month.getMonth()).padStart(2, '0')}`;
   *   const rooms = roomAvailability[key] || 0;
   *   return `${monthName} ${year} (${rooms} rooms)`;
   * }
   */
  getMonthHeaderCallback?: (data: {
    month: Date;
    monthIndex: number;
    monthName: string;
    year: number;
  }) => string;

  /**
   * Callback invoked BEFORE a date selection is finalized (single or range mode).
   * Can be sync or async. Allows you to:
   * - Validate against business rules or API
   * - Block/prevent selection
   * - Adjust the selected date(s)
   * - Clear or restore selection
   *
   * Called AFTER local validation (disabled dates, min/max) passes.
   *
   * @param selection - Proposed selection (Date for single mode, DateRange for range mode)
   * @returns BeforeSelectResult or Promise<BeforeSelectResult> with action to take
   *
   * @example Single mode - check against API
   * beforeDateSelectCallback: async (date) => {
   *   const response = await fetch(`/api/check-date/${date.toISOString()}`);
   *   const { available } = await response.json();
   *   return available ? { action: 'accept' } : { action: 'restore', message: 'Date unavailable' };
   * }
   *
   * @example Range mode - adjust to business rules
   * beforeDateSelectCallback: async (range) => {
   *   const nights = Math.floor((range.end - range.start) / (1000 * 60 * 60 * 24));
   *   if (nights < 2) {
   *     return { action: 'restore', message: 'Minimum 2 nights required' };
   *   }
   *   return { action: 'accept' };
   * }
   */
  beforeDateSelectCallback?: (selection: Date | DateRange) => Promise<BeforeSelectResult> | BeforeSelectResult;

  /**
   * Callback invoked BEFORE month navigation occurs (before rendering new month).
   * Can be sync or async. Allows you to:
   * - Load bulk metadata for all visible dates in one API call (performance optimization)
   * - Block navigation to unavailable months
   * - Show loading overlay during async operations
   *
   * Called before the calendar re-renders with the new month.
   *
   * @param context - Context about the target month and visible date range
   * @returns BeforeMonthChangeResult or Promise<BeforeMonthChangeResult> with action and optional bulk metadata
   *
   * @example Hotel availability - bulk load for entire month
   * beforeMonthChangedCallback: async ({ year, month, firstVisibleDate, lastVisibleDate }) => {
   *   const response = await fetch('/api/availability', {
   *     method: 'POST',
   *     body: JSON.stringify({
   *       start: firstVisibleDate.toISOString(),
   *       end: lastVisibleDate.toISOString()
   *     })
   *   });
   *   const data = await response.json();
   *
   *   const metadata = new Map();
   *   data.forEach(day => {
   *     metadata.set(day.date, {
   *       isDisabled: day.available === 0,
   *       badgeText: `$${day.price}`,
   *       dayTooltip: `${day.available} rooms available`
   *     });
   *   });
   *
   *   return { action: 'accept', metadata };
   * }
   *
   * @example Block navigation to unavailable period
   * beforeMonthChangedCallback: async ({ year, month }) => {
   *   const isAvailable = await checkPeriodAvailability(year, month);
   *   return isAvailable
   *     ? { action: 'accept' }
   *     : { action: 'block', message: 'Data not available for this period' };
   * }
   */
  beforeMonthChangedCallback?: (context: BeforeMonthChangeContext) => Promise<BeforeMonthChangeResult> | BeforeMonthChangeResult;

  // Debug mode - enables detailed console logging for troubleshooting
  showDebugInfo?: boolean;
}

export interface LocaleStrings {
  // Button labels
  today: string;
  clear: string;
  apply: string;

  // Summary text
  preview: string;
  day: string;
  days: string;
  night: string;
  nights: string;

  // Time picker (used in pickerMode 'time' / 'datetime')
  time: string;
  now: string;
  am: string;
  pm: string;
  hours: string;
  minutes: string;
  seconds: string;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface FormatOptions {
  format: string;
  separator: string;
  parts: {
    year?: { index: number; length: number };
    month?: { index: number; length: number };
    day?: { index: number; length: number };
  };
  maxLength: number;
}

/**
 * Per-field time selection state for the time picker.
 *
 * Each field is independently nullable so we can distinguish "user committed
 * this value" from "still defaulted". `hour` is stored as 0-23 (canonical, mode-
 * independent). `ampm` is a separate commit-flag-with-value used only for the
 * AM/PM roll highlight in h12 mode; its half is always derivable from `hour`.
 */
export interface SelectedTime {
  hour: number | null;       // 0-23
  minute: number | null;     // 0-59
  second: number | null;     // 0-59
  ampm: 'am' | 'pm' | null;  // h12 mode only; UI commit flag
}

/**
 * Parsed time format mask, parallel to FormatOptions for the date side.
 * Used by time/datetime modes. Tokens recognised: HH/H (24h), hh/h (12h), mm/m, ss/s, a (am/pm).
 */
export interface TimeFormatOptions {
  format: string;
  separator: string;
  parts: {
    hours?: { index: number; length: number };
    minutes?: { index: number; length: number };
    seconds?: { index: number; length: number };
    ampm?: { index: number };
  };
  is12Hour: boolean;
  hasSeconds: boolean;
}

export interface MonthDisplay {
  month: number;
  year: number;
}

export interface DatePickerEventDetail {
  date?: Date;
  dateRange?: DateRange;
  formattedValue: string;

  // For 'allow' mode - arrays of enabled/disabled dates in range
  enabledDates?: Date[];
  disabledDates?: Date[];

  // For 'split' mode - multiple valid ranges
  dateRanges?: DateRange[];

  // For 'individual' mode - flat array of dates
  dates?: Date[];

  // Helper methods for 'allow' mode
  getEnabledDateCount?: () => number;
  getTotalDays?: () => number;
}

// Generic type for specialDates array items
// Users can pass their own data structures and use *Member properties to map fields
export type DecoratedDate = Record<string, any>;

export interface DayMetadata {
  isDisabled?: boolean;      // Override disabled state for this date
  badgeClass?: string;       // CSS class applied to badge cell
  dayClass?: string;         // CSS class applied to day cell
  badgeText?: string;        // Text displayed in badge row above day numbers
  badgeTooltip?: string;     // Plain text hover tooltip for badge cell
  dayTooltip?: string;       // Plain text hover tooltip for day cell
}

export interface SummaryDetail {
  // Basic counts
  days: number;           // Total days selected
  nights: number;         // Total nights (days - 1)

  // Simple range (when rangeDisabledHandling is 'allow' or 'block')
  startDate: Date | null;
  endDate: Date | null;

  // Multiple ranges (when rangeDisabledHandling is 'split')
  dateRanges?: DateRange[];

  // Individual dates (when rangeDisabledHandling is 'individual' or 'split')
  dates?: Date[];

  // For 'allow' mode - breakdown of enabled vs disabled
  enabledDates?: Date[];
  disabledDates?: Date[];

  // Context
  selectionMode: 'single' | 'range' | 'multiple';
  rangeDisabledHandling?: 'allow' | 'block' | 'split' | 'individual';
  localeStrings: LocaleStrings;

  // Preview flag (true when dragging)
  isPreview?: boolean;
}

/**
 * Data passed to renderDay and renderDayContent callbacks
 * Provides complete context about the day being rendered
 */
export interface DayRenderData {
  // Date information
  date: Date;                  // JavaScript Date object for this day
  dateString: string;          // ISO format YYYY-MM-DD
  dayNumber: number;           // Day of month (1-31)

  // State flags
  isDisabled: boolean;         // Day is disabled (cannot be selected)
  isSelected: boolean;         // Day is selected (single mode or start/end in range mode)
  isStartDate: boolean;        // Day is the range start date
  isEndDate: boolean;          // Day is the range end date
  isInRange: boolean;          // Day is between start and end dates
  isToday: boolean;            // Day is today's date
  isWeekend: boolean;          // Day is Saturday or Sunday

  // Context
  monthIndex: number;          // Which month column this day appears in (0-based)
  element: HTMLElement;        // Default rendered element (for augmentation pattern)
  picker: any;                 // Reference to DateRangePicker instance (for calling methods)
}
