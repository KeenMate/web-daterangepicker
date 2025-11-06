export interface DatePickerOptions {
  mode?: 'single' | 'range';
  position?: string;
  monthsToShow?: number;
  format?: string;
  calendarTrigger?: 'auto' | 'button';
  onSelect?: (date: Date | DateRange) => void;
  container?: HTMLElement; // Where to append the calendar (default: document.body)
  display?: 'inline' | 'floating'; // Display mode: 'inline' = static block, 'floating' = popup (default: 'floating')

  // Calendar layout
  layout?: 'horizontal' | 'grid'; // Layout mode: 'horizontal' = flex row (default), 'grid' = CSS grid
  gridRows?: number; // Number of rows for grid layout (e.g., 2 for 2x3 grid)
  gridColumns?: number; // Number of columns for grid layout (e.g., 3 for 2x3 grid)

  // Week start configuration
  weekStartDay?: 'auto' | 0 | 1 | 2 | 3 | 4 | 5 | 6; // 'auto' = detect from locale, 0 = Sunday, 1 = Monday, etc.

  // Date restrictions
  minDate?: Date | string;
  maxDate?: Date | string;
  disabledDates?: (Date | string)[]; // Specific dates to disable
  disabledDays?: number[]; // Days of week to disable (0 = Sunday, 6 = Saturday)

  // Special dates (holidays, events, etc.)
  specialDates?: SpecialDate[];

  // Advanced callbacks
  isDateDisabled?: (date: Date) => boolean; // Custom disable logic
  getDateInfo?: (date: Date) => DateInfo | null; // Custom styling/labels

  // Range selection behavior over disabled dates
  rangeDisabledMode?: 'allow' | 'block' | 'split' | 'individual';
  // - 'allow': Allow ranges over disabled dates (default)
  // - 'block': Prevent selections that span disabled dates
  // - 'split': Return multiple ranges split by disabled dates
  // - 'individual': Return array of individual enabled dates

  // Visual highlighting of disabled dates in selected range
  highlightDisabledInRange?: boolean; // Default: true. Set to false to only highlight enabled dates in range.
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

export interface SpecialDate {
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
