import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import i18n, {
  APP_LANGUAGES,
  AppLanguage,
  LANGUAGE_STORAGE_KEY,
  applyDocumentLanguage,
  getLanguageMeta,
  isAppLanguage,
} from './index';
import { StorageService } from '../services/storageService';

type LocaleContextValue = {
  language: AppLanguage;
  setLanguage: (code: AppLanguage) => void;
  locale: string;
  dir: 'rtl' | 'ltr';
  languages: typeof APP_LANGUAGES;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readStoredLanguage(): AppLanguage {
  const fromStorage = StorageService.get(LANGUAGE_STORAGE_KEY);
  if (isAppLanguage(fromStorage)) return fromStorage;
  try {
    const raw = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isAppLanguage(raw)) return raw;
  } catch {
    // ignore
  }
  return 'ar';
}

export const LocaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>(() => readStoredLanguage());

  const setLanguage = useCallback((code: AppLanguage) => {
    setLanguageState(code);
    StorageService.save(LANGUAGE_STORAGE_KEY, code);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
    } catch {
      // ignore
    }
    void i18n.changeLanguage(code);
    applyDocumentLanguage(code);
  }, []);

  useEffect(() => {
    if (i18n.language !== language) {
      void i18n.changeLanguage(language);
    }
    applyDocumentLanguage(language);
    if (typeof document !== 'undefined') {
      const appTitle = i18n.t('app.name', { lng: language });
      if (appTitle) document.title = appTitle;
    }
  }, [language]);

  const value = useMemo<LocaleContextValue>(() => {
    const meta = getLanguageMeta(language);
    return {
      language,
      setLanguage,
      locale: meta.locale,
      dir: 'rtl',
      languages: APP_LANGUAGES,
    };
  }, [language, setLanguage]);

  return (
    <I18nextProvider i18n={i18n}>
      <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
    </I18nextProvider>
  );
};

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return ctx;
}

/** Safe hook when provider might be missing during early boot */
export function useLocaleSafe() {
  return useContext(LocaleContext);
}

export function useAppTranslation() {
  const { t, i18n: i18nInstance } = useTranslation();
  const locale = useLocaleSafe();
  return {
    t,
    language: (locale?.language ?? (isAppLanguage(i18nInstance.language) ? i18nInstance.language : 'ar')) as AppLanguage,
    setLanguage: locale?.setLanguage,
    locale: locale?.locale ?? 'ar-IQ',
    dir: locale?.dir ?? 'rtl',
  };
}
