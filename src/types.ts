export interface DatePickerOptions {
  selectionMode?: 'single' | 'range';
  calendarPlacement?: string;
  visibleMonthsCount?: number;
  dateFormatMask?: string;
  calendarOpenTrigger?: 'auto' | 'button';
  onSelect?: (date: Date | DateRange) => void;
  container?: HTMLElement; // Where to append the calendar (default: document.body)
  positioningMode?: 'inline' | 'floating'; // Display mode: 'inline' = static block, 'floating' = popup (default: 'floating')

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

  // Special dates (holidays, events, etc.)
  specialDates?: DecoratedDate[];

  // Advanced callbacks
  isDateDisabled?: (date: Date) => boolean; // Custom disable logic
  getDateMetadata?: (date: Date) => DateInfo | null; // Custom styling/labels

  // Range selection behavior over disabled dates
  rangeDisabledHandling?: 'allow' | 'block' | 'split' | 'individual';
  // - 'allow': Allow ranges over disabled dates (default)
  // - 'block': Prevent selections that span disabled dates
  // - 'split': Return multiple ranges split by disabled dates
  // - 'individual': Return array of individual enabled dates

  // Visual highlighting of disabled dates in selected range
  highlightDisabledInRange?: boolean; // Default: true. Set to false to only highlight enabled dates in range.

  // Internationalization
  locale?: string | 'auto'; // Locale for UI strings and date formatting ('auto' = detect from browser, 'en', 'de', 'fr', 'es', etc.)
  displayFormatMask?: string; // Localized format mask for display (e.g., 'dd/mm/aaaa' in Spanish). If not provided, uses dateFormatMask.
  customStrings?: Partial<LocaleStrings>; // Override any UI strings

  // Custom summary formatting
  formatSummaryCallback?: (data: SummaryCallbackData) => string; // Custom function to format the summary display (receives all selection data, returns HTML string)
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

export interface DecoratedDate {
  date: Date | string;
  class?: string;      // Custom CSS class (e.g., 'holiday', 'event')
  label?: string;      // Short text overlay (e.g., '🎄', 'H')
  tooltip?: string;    // Hover tooltip text
}

export interface DateInfo {
  disabled?: boolean;
  class?: string;      // Additional CSS classes
  label?: string;      // Text overlay in day cell
  tooltip?: string;    // Hover tooltip text
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
  selectionMode: 'single' | 'range';
  rangeDisabledHandling?: 'allow' | 'block' | 'split' | 'individual';
  localeStrings: LocaleStrings;

  // Preview flag (true when dragging)
  isPreview?: boolean;
}
