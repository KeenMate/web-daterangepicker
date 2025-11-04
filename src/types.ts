export interface DatePickerOptions {
  mode?: 'single' | 'range';
  position?: string;
  monthsToShow?: number;
  format?: string;
  calendarTrigger?: 'auto' | 'button';
  onSelect?: (date: Date | DateRange) => void;
  container?: HTMLElement; // Where to append the calendar (default: document.body)
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
}
