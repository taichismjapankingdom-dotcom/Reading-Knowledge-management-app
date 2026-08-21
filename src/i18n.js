import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslations from './locales/en.json';
import jaTranslations from './locales/ja.json';
import frTranslations from './locales/fr.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      ja: { translation: jaTranslations },
      fr: { translation: frTranslations },
    },
    lng: 'en', // Will be synchronized with zustand on app load
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already safeguards from XSS
    },
    parseMissingKeyHandler: (key) => {
      console.warn(`[i18n] Missing translation key: ${key}`);
      return key;
    },
  });

export default i18n;
