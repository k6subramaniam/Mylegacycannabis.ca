/**
 * i18n — Internationalisation layer for My Legacy Cannabis
 *
 * Auto-detects language from IP geolocation (Quebec -> French).
 * Falls back to browser language, then localStorage, then English.
 * Provides a `useT()` hook that returns the current translations.
 */
import { createContext, useContext } from 'react';
import en from './en';
import fr from './fr';
import type { Translations } from './en';

export type Locale = 'en' | 'fr';

export const translations: Record<Locale, Translations> = { en, fr };

// ── Helpers ────────────────────────────────────────────────────
/** Get a nested value from the translations object using dot notation */
function getNestedValue(obj: any, path: string): string | undefined {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

/**
 * Interpolate `{placeholder}` tokens in a string.
 * e.g. t('cart.youHavePoints', { points: 500 }) -> "You have 500 points available"
 */
export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return Object.entries(vars).reduce(
    (str, [key, val]) => str.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val)),
    template,
  );
}

// ── Context ────────────────────────────────────────────────────
export interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translations;
  /** Translate a dot-path key with optional interpolation */
  tt: (key: string, vars?: Record<string, string | number>) => string;
}

export const LanguageContext = createContext<LanguageContextValue>({
  locale: 'en',
  setLocale: () => {},
  t: en,
  tt: (key) => key,
});

export function useLanguage() {
  return useContext(LanguageContext);
}

/** Shortcut: returns the current translations object */
export function useT() {
  return useContext(LanguageContext);
}

// Storage key
export const LOCALE_STORAGE_KEY = 'mlc-locale';

// Quebec provinces/regions that should trigger French
export const FRENCH_PROVINCES = ['QC', 'Quebec', 'Québec'];

export { en, fr };
export type { Translations };
