// Import styles
import './css/main.css';

// Import web component for auto-registration
import { WebDaterangepickerElement } from './web-component';

// Import logging functions
import { enableLogging, disableLogging, setLogLevel, setCategoryLevel, getCategories } from './logger';

// Export the web component
export { WebDaterangepickerElement } from './web-component';

// Export the base class if users want direct access
export { DateRangePicker } from './date-picker';

// Export types
export type { DatePickerOptions, DateRange, FormatOptions, MonthDisplay, DatePickerEventDetail } from './types';

// ==============================================================================
// GLOBAL API INTERFACE
// ==============================================================================

export interface GlobalWebDaterangepickerAPI {
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
    logging: {
        enableLogging: () => void;
        disableLogging: () => void;
        setLogLevel: (level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent') => void;
        setCategoryLevel: (category: string, level?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent') => void;
        getCategories: () => string[];
    };
}

// ==============================================================================
// GLOBAL NAMESPACE REGISTRATION
// ==============================================================================

// Declare global namespace
declare global {
    interface Window {
        components?: {
            'web-daterangepicker'?: GlobalWebDaterangepickerAPI;
        };
    }
}

// Helper function to get all instances
function getAllInstances(): HTMLElement[] {
    return Array.from(document.querySelectorAll('web-daterangepicker'));
}

// Initialize global API
if (typeof window !== 'undefined') {
    window.components = window.components || {};
    window.components['web-daterangepicker'] = {
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
            if (typeof customElements !== 'undefined' && !customElements.get('web-daterangepicker')) {
                customElements.define('web-daterangepicker', WebDaterangepickerElement);
            }
        },
        getInstances: () => getAllInstances(),
        logging: {
            enableLogging,
            disableLogging,
            setLogLevel,
            setCategoryLevel,
            getCategories
        }
    };

    // Auto-register the custom element
    window.components['web-daterangepicker'].register();
}
