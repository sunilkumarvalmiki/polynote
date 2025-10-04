import en from './locales/en.json';
import hi from './locales/hi.json';
import te from './locales/te.json';

export type Language = 'en' | 'te' | 'hi';

const translations = {
  en,
  te,
  hi,
};

let currentLanguage: Language = 'en';

export function setLanguage(lang: Language): void {
  currentLanguage = lang;
}

export function t(key: string): string {
  const keys = key.split('.');
  let value: unknown = translations[currentLanguage];

  for (const k of keys) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      value = (value as Record<string, unknown>)[k];
    } else {
      return key; // Return key if translation not found
    }
  }

  return typeof value === 'string' ? value : key;
}

export function getCurrentLanguage(): Language {
  return currentLanguage;
}
