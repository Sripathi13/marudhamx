import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ta from './locales/ta.json';
import hi from './locales/hi.json';
import { Language } from './types';

const STORAGE_KEY = 'marudhamx_lang';

const getInitialLanguage = (): Language => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'en' || saved === 'ta' || saved === 'hi') {
    return saved;
  }
  const browser = navigator.language.toLowerCase();
  if (browser.startsWith('ta')) return 'ta';
  if (browser.startsWith('hi')) return 'hi';
  return 'en';
};

const initialLang = getInitialLanguage();

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ta: { translation: ta },
      hi: { translation: hi },
    },
    lng: initialLang,
    fallbackLng: false, // Strict: don't silently fallback to English for Tamil
    interpolation: {
      escapeValue: false,
    },
  });

export const setAppLanguage = (lang: Language) => {
  i18n.changeLanguage(lang);
  localStorage.setItem(STORAGE_KEY, lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = 'ltr';
  document.title = i18n.t('app_name');
};

// Set initial document attributes
if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLang;
  document.documentElement.dir = 'ltr';
  document.title = i18n.t('app_name');
}

export default i18n;
