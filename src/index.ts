// Import styles
import './scss/_date-picker.scss';

// Export the web component
export { DateRangePickerElement } from './web-component';

// Export the base class if users want direct access
export { PureDatePicker } from './date-picker';

// Export types
export type { DatePickerOptions, DateRange, FormatInfo, MonthDisplay, DatePickerEventDetail } from './types';

// Auto-register the custom element
import './web-component';
