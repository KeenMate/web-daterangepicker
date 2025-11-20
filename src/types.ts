/**
 * Result from beforeDateSelect callback
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
}

/**
 * @deprecated Use BeforeSelectResult instead. Will be removed in v2.0.0
 */
export type AsyncValidationResult = BeforeSelectResult;

/**
 * Action button configuration for calendar actions (Today, Clear, Apply, custom actions)
 * Aligned with web-multiselect ActionButton interface
 */
export interface ActionButton {
  /** Action identifier ('today', 'clear', 'apply', or 'custom' for custom actions) */
  action: 'today' | 'clear' | 'apply' | 'custom';

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

export interface DatePickerOptions {
  selectionMode?: 'single' | 'range' | 'multiple';
  calendarPlacement?: string;
  visibleMonthsCount?: number;
  dateFormatMask?: string;
  calendarOpenTrigger?: 'focus' | 'typing' | 'manual';
  onSelect?: (date: Date | DateRange | DateRange[] | Date[]) => void;
  container?: HTMLElement; // Where to append the calendar (default: document.body)
  positioningMode?: 'inline' | 'floating'; // Display mode: 'inline' = static block, 'floating' = popup (default: 'floating')

  /**
   * Controls when the calendar auto-closes (floating mode only)
   * - 'never': Never auto-close, not even when Apply is clicked - user must close manually
   * - 'selection': Close when selection completes (single date click, range completion, drag-adjust) - DEFAULT
   *                Note: Multiple mode never auto-closes on selection, inherently requires Apply
   * - 'apply': Only close when Apply button is clicked
   */
  autoClose?: 'never' | 'selection' | 'apply';

  // Calendar layout
  monthLayout?: 'horizontal' | 'grid'; // Layout mode: 'horizontal' = flex row (default), 'grid' = CSS grid
  gridRows?: number; // Number of rows for grid layout (e.g., 2 for 2x3 grid)
  gridColumns?: number; // Number of columns for grid layout (e.g., 3 for 2x3 grid)

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
  // Specify which properties in your data objects map to DateInfo fields
  // If not specified, defaults to DateInfo property names
  dateMember?: string;              // Property containing the date value (default: 'date')
  badgeTextMember?: string;         // Property containing badge text (default: 'badgeText')
  badgeClassMember?: string;        // Property containing badge CSS class (default: 'badgeClass')
  dayClassMember?: string;          // Property containing day CSS class (default: 'dayClass')
  badgeTooltipMember?: string;      // Property containing badge tooltip (default: 'badgeTooltip')
  dayTooltipMember?: string;        // Property containing day tooltip (default: 'dayTooltip')
  isDisabledMember?: string;        // Property containing disabled flag (default: 'isDisabled')

  // Advanced callbacks
  getDateMetadataCallback?: (date: Date) => DateInfo | null; // Custom styling/labels

  // Custom rendering
  customStylesCallback?: () => string; // Return CSS string to inject into Shadow DOM for use with renderDayCallback classes
  renderDayCallback?: (data: DayRenderData) => HTMLElement | string | null; // Full replacement - return element/HTML to completely replace day cell content
  renderDayContentCallback?: (data: DayRenderData) => HTMLElement | string | null; // Augmentation - return element/HTML to add to default day cell

  // Tooltips (HTML support)
  badgeTooltipCallback?: (data: DayRenderData) => string | null; // Return HTML string for badge hover tooltip (overrides DateInfo.badgeTooltip)
  dayTooltipCallback?: (data: DayRenderData) => string | null; // Return HTML string for day cell hover tooltip (overrides DateInfo.dayTooltip)

  // Range selection behavior over disabled dates
  disabledDatesHandling?: 'allow' | 'prevent' | 'block' | 'split' | 'individual';
  // - 'allow': Allow ranges over disabled dates (default)
  // - 'prevent': Prevent selections that cross disabled dates (selection attempt is blocked)
  // - 'block': Snap selection to last enabled date before disabled gap
  // - 'split': Return multiple ranges split by disabled dates (event formatting only)
  // - 'individual': Return flat array of enabled dates (event formatting only)

  // Visual highlighting of disabled dates in selected range
  highlightDisabledInRange?: boolean; // Default: true. Set to false to only highlight enabled dates in range.

  // Action button configuration
  /** Array of custom action buttons to display. If not provided, uses default buttons based on selectionMode */
  actionButtons?: ActionButton[];

  /** Show Today button (default: true) */
  showTodayButton?: boolean;

  /** Show Clear button (default: true) */
  showClearButton?: boolean;

  /** Show Apply button (default: true for range/multiple modes, false for single mode) */
  showApplyButton?: boolean;

  // Internationalization
  locale?: string | 'auto'; // Locale for UI strings and date formatting ('auto' = detect from browser, 'en', 'de', 'fr', 'es', etc.)
  displayFormatMask?: string; // Localized format mask for display (e.g., 'dd/mm/aaaa' in Spanish). If not provided, uses dateFormatMask.
  customStrings?: Partial<LocaleStrings>; // Override any UI strings
  monthNames?: string[]; // Custom month names (12 strings). If not provided, uses locale-based names. Examples: ['01', '02', ..., '12'] or ['Jan', 'Feb', ..., 'Dec']

  // Custom summary formatting
  formatSummaryCallback?: (data: SummaryCallbackData) => string; // Custom function to format the summary display (receives all selection data, returns HTML string)

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
   * beforeDateSelect: async (date) => {
   *   const response = await fetch(`/api/check-date/${date.toISOString()}`);
   *   const { available } = await response.json();
   *   return available ? { action: 'accept' } : { action: 'restore', message: 'Date unavailable' };
   * }
   *
   * @example Range mode - adjust to business rules
   * beforeDateSelect: async (range) => {
   *   const nights = Math.floor((range.end - range.start) / (1000 * 60 * 60 * 24));
   *   if (nights < 2) {
   *     return { action: 'restore', message: 'Minimum 2 nights required' };
   *   }
   *   return { action: 'accept' };
   * }
   */
  beforeDateSelect?: (selection: Date | DateRange) => Promise<BeforeSelectResult> | BeforeSelectResult;

  /**
   * @deprecated Use beforeDateSelect instead. Will be removed in v2.0.0
   */
  validateRangeCallback?: (startDate: Date, endDate: Date) => Promise<AsyncValidationResult>;

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
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface FormatInfo {
  format: string;
  separator: string;
  parts: {
    year?: { index: number; length: number };
    month?: { index: number; length: number };
    day?: { index: number; length: number };
  };
  maxLength: number;
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

export interface DateInfo {
  isDisabled?: boolean;      // Override disabled state for this date
  badgeClass?: string;       // CSS class applied to badge cell
  dayClass?: string;         // CSS class applied to day cell
  badgeText?: string;        // Text displayed in badge row above day numbers
  badgeTooltip?: string;     // Plain text hover tooltip for badge cell
  dayTooltip?: string;       // Plain text hover tooltip for day cell
}

export interface SummaryCallbackData {
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
