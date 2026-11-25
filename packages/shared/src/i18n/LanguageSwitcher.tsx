import React, { useState } from 'react';
import { Check, Languages } from 'lucide-react';
import { useLocale } from './LocaleProvider';
import type { AppLanguage } from './index';
import { useTranslation } from 'react-i18next';

type LanguageSwitcherProps = {
  variant?: 'row' | 'compact' | 'pills';
  className?: string;
};

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'row',
  className = '',
}) => {
  const { language, setLanguage, languages } = useLocale();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const select = (code: AppLanguage) => {
    setLanguage(code);
    setOpen(false);
  };

  if (variant === 'pills') {
    return (
      <div className={`flex items-center gap-2 ${className}`} dir="rtl">
        {languages.map((lang) => {
          const active = language === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => select(lang.code)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black border transition active:scale-95 ${
                active
                  ? 'bg-vibrant-purple text-white border-white/30'
                  : 'bg-white/5 text-white/70 border-white/15 hover:bg-white/10'
              }`}
            >
              {lang.code === 'ar' ? t('language.arabic') : t('language.kurdish')}
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`relative ${className}`}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white text-[11px] font-bold hover:bg-white/15 transition"
          aria-label={t('language.title')}
        >
          <Languages size={14} />
          {language === 'ar' ? 'ع' : 'ک'}
        </button>
        {open && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 cursor-default bg-transparent"
              aria-label={t('common.close')}
              onClick={() => setOpen(false)}
            />
            <div className="absolute left-0 top-10 z-50 min-w-[10rem] rounded-2xl bg-[#0F1830] border border-white/20 shadow-2xl overflow-hidden">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => select(lang.code)}
                  className="w-full px-3 py-2.5 text-right text-xs font-bold text-white hover:bg-white/10 flex items-center justify-between gap-2"
                >
                  <span>{lang.labelNative}</span>
                  {language === lang.code && <Check size={14} className="text-emerald-400" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`} dir="rtl">
      <p className="text-xs font-black text-white">{t('language.title')}</p>
      <p className="text-[10px] text-white/60 font-bold mb-2">{t('language.subtitle')}</p>
      <div className="grid grid-cols-2 gap-2">
        {languages.map((lang) => {
          const active = language === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => select(lang.code)}
              className={`rounded-2xl px-3 py-3 text-center border transition active:scale-[0.98] ${
                active
                  ? 'bg-vibrant-purple/30 border-vibrant-purple text-white'
                  : 'bg-white/5 border-white/15 text-white/75 hover:bg-white/10'
              }`}
            >
              <span className="block text-sm font-black">{lang.labelNative}</span>
              {active && (
                <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold text-emerald-300">
                  <Check size={10} /> {t('common.active')}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
