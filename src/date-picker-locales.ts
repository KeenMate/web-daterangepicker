/**
 * Date Picker Locales
 *
 * Built-in locale strings and Intl API helpers for internationalization.
 */

import type { LocaleStrings } from './types';

/**
 * Built-in locale strings for supported languages
 */
const LOCALE_STRINGS: Record<string, LocaleStrings> = {
  en: {
    today: 'Today',
    clear: 'Clear',
    apply: 'Apply',
    preview: 'Preview',
    day: 'day',
    days: 'days',
    night: 'night',
    nights: 'nights'
  },
  de: {
    today: 'Heute',
    clear: 'Löschen',
    apply: 'Anwenden',
    preview: 'Vorschau',
    day: 'Tag',
    days: 'Tage',
    night: 'Nacht',
    nights: 'Nächte'
  },
  fr: {
    today: 'Aujourd\'hui',
    clear: 'Effacer',
    apply: 'Appliquer',
    preview: 'Aperçu',
    day: 'jour',
    days: 'jours',
    night: 'nuit',
    nights: 'nuits'
  },
  es: {
    today: 'Hoy',
    clear: 'Limpiar',
    apply: 'Aplicar',
    preview: 'Vista previa',
    day: 'día',
    days: 'días',
    night: 'noche',
    nights: 'noches'
  }
};

/**
 * Detect locale from browser if 'auto', otherwise use provided locale
 */
export function resolveLocale(locale: string | 'auto'): string {
  if (locale !== 'auto') {
    return locale;
  }

  // Try to get browser locale
  if (typeof navigator !== 'undefined' && navigator.language) {
    // Extract language code (e.g., 'en-US' -> 'en')
    const browserLocale = navigator.language.split('-')[0].toLowerCase();
    // Return if we have built-in support, otherwise fallback to 'en'
    return LOCALE_STRINGS[browserLocale] ? browserLocale : 'en';
  }

  return 'en'; // Default fallback
}

/**
 * Get locale strings for a given locale, with optional custom overrides
 */
export function getLocaleStrings(locale: string, customStrings?: Partial<LocaleStrings>): LocaleStrings {
  const resolvedLocale = resolveLocale(locale);
  const baseStrings = LOCALE_STRINGS[resolvedLocale] || LOCALE_STRINGS.en;

  // Merge with custom strings if provided
  return customStrings
    ? { ...baseStrings, ...customStrings }
    : baseStrings;
}

/**
 * Get weekday names using Intl API (short format: Mo, Tu, We, etc.)
 * Falls back to English if Intl is not available
 */
export function getWeekdayNames(locale: string): string[] {
  const resolvedLocale = resolveLocale(locale);

  try {
    // Use Intl to get localized weekday names
    const formatter = new Intl.DateTimeFormat(resolvedLocale, { weekday: 'short' });

    // Generate dates for each day of the week (starting from Sunday)
    const weekdays: string[] = [];
    // Use a date in 2017 which starts on Sunday (Jan 1, 2017)
    for (let day = 0; day < 7; day++) {
      const date = new Date(2017, 0, day + 1); // Jan 1-7, 2017 (Sun-Sat)
      weekdays.push(formatter.format(date));
    }

    return weekdays;
  } catch (e) {
    // Fallback to English if Intl fails
    console.warn('[DatePicker] Intl.DateTimeFormat failed, using English weekdays', e);
    return ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  }
}

/**
 * Get month names using Intl API (long format: January, February, etc.)
 * Falls back to English if Intl is not available
 */
export function getMonthNames(locale: string): string[] {
  const resolvedLocale = resolveLocale(locale);

  try {
    // Use Intl to get localized month names
    const formatter = new Intl.DateTimeFormat(resolvedLocale, { month: 'long' });

    // Generate dates for each month
    const months: string[] = [];
    for (let month = 0; month < 12; month++) {
      const date = new Date(2017, month, 1);
      months.push(formatter.format(date));
    }

    return months;
  } catch (e) {
    // Fallback to English if Intl fails
    console.warn('[DatePicker] Intl.DateTimeFormat failed, using English months', e);
    return [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
  }
}
