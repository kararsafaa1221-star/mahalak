import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from './locales/ar.json';
import ckb from './locales/ckb.json';

export type AppLanguage = 'ar' | 'ckb';

export const APP_LANGUAGES: Array<{
  code: AppLanguage;
  labelAr: string;
  labelNative: string;
  locale: string;
}> = [
  { code: 'ar', labelAr: 'العربية', labelNative: 'العربية', locale: 'ar-IQ' },
  { code: 'ckb', labelAr: 'الكردية (سوراني)', labelNative: 'کوردی (سۆرانی)', locale: 'ckb-IQ' },
];

export const LANGUAGE_STORAGE_KEY = 'MAHALAK_APP_LANGUAGE';

export function isAppLanguage(value: unknown): value is AppLanguage {
  return value === 'ar' || value === 'ckb';
}

export function getLanguageMeta(code: AppLanguage) {
  return APP_LANGUAGES.find((l) => l.code === code) ?? APP_LANGUAGES[0];
}

/** Both Arabic and Sorani use RTL Arabic script */
export function getLanguageDir(_code: AppLanguage): 'rtl' | 'ltr' {
  return 'rtl';
}

export function applyDocumentLanguage(code: AppLanguage) {
  if (typeof document === 'undefined') return;
  const dir = getLanguageDir(code);
  const root = document.documentElement;
  root.lang = code === 'ckb' ? 'ckb' : 'ar';
  root.dir = dir;
  root.classList.remove('lang-ar', 'lang-ckb');
  root.classList.add(code === 'ckb' ? 'lang-ckb' : 'lang-ar');
  document.body?.setAttribute('dir', dir);
  document.body?.classList.remove('lang-ar', 'lang-ckb');
  document.body?.classList.add(code === 'ckb' ? 'lang-ckb' : 'lang-ar');
}

const saved =
  typeof localStorage !== 'undefined'
    ? localStorage.getItem(LANGUAGE_STORAGE_KEY)
    : null;
const initialLng: AppLanguage = isAppLanguage(saved) ? saved : 'ar';

void i18n.use(initReactI18next).init({
  resources: {
    ar: { translation: ar },
    ckb: { translation: ckb },
  },
  lng: initialLng,
  fallbackLng: 'ar',
  interpolation: { escapeValue: false },
  returnNull: false,
});

applyDocumentLanguage(initialLng);

export default i18n;
