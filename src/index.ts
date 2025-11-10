// Import styles
import './scss/main.scss';

// Import web component for auto-registration
import { DateRangePickerElement } from './web-component';

// Export the web component
export { DateRangePickerElement } from './web-component';

// Export the base class if users want direct access
export { PureDatePicker } from './date-picker';

// Export types
export type { DatePickerOptions, DateRange, FormatInfo, MonthDisplay, DatePickerEventDetail } from './types';

// ==============================================================================
// GLOBAL API INTERFACE
// ==============================================================================

export interface GlobalDateRangePickerAPI {
    version: () => string;
    config: {
        name: string;
        version: string;
        author: string;
        license: string;
        repository: string;
        homepage: string;
    };
    register: () => void;
    getInstances: () => HTMLElement[];
}

// ==============================================================================
// GLOBAL NAMESPACE REGISTRATION
// ==============================================================================

// Declare global namespace
declare global {
    interface Window {
        keenmate?: {
            daterangepicker?: GlobalDateRangePickerAPI;
        };
    }
}

// Helper function to get all instances
function getAllInstances(): HTMLElement[] {
    return Array.from(document.querySelectorAll('date-range-picker'));
}

// Initialize global API
if (typeof window !== 'undefined') {
    window.keenmate = window.keenmate || {};
    window.keenmate.daterangepicker = {
        version: () => __VERSION__,
        config: {
            name: __PACKAGE_NAME__,
            version: __VERSION__,
            author: __AUTHOR__,
            license: __LICENSE__,
            repository: __REPOSITORY__,
            homepage: __HOMEPAGE__
        },
        register: () => {
            if (typeof customElements !== 'undefined' && !customElements.get('date-range-picker')) {
                customElements.define('date-range-picker', DateRangePickerElement);
            }
        },
        getInstances: () => getAllInstances()
    };

    // Auto-register the custom element
    window.keenmate.daterangepicker.register();
}
