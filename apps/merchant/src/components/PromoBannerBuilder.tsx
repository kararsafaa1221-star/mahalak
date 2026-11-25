import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Lightbulb, Megaphone, Palette, RotateCcw, Sparkles } from 'lucide-react';
import { showToast } from '@shared/utils/alerts';

export type PromoBannerFormData = {
  title: string;
  subtitle: string;
  backgroundColor: string;
  textColor: string;
  isActive: boolean;
};

type PromoBannerBuilderProps = {
  storeId: string;
  initialData: PromoBannerFormData;
  onSave: (data: PromoBannerFormData) => Promise<void>;
  onToggleActive?: (active: boolean) => void;
};

const SAVE_DELAY_MS = 700;
const TITLE_MAX = 40;
const SUBTITLE_MAX = 80;

const COLOR_KEYS = {
  purple: 'purple',
  dark: 'dark',
  green: 'green',
  gold: 'gold',
  red: 'red',
  light: 'light',
} as const;

const COLOR_PRESETS: Array<{ bg: string; text: string; colorKey: keyof typeof COLOR_KEYS }> = [
  { bg: '#7B3DFF', text: '#ffffff', colorKey: 'purple' },
  { bg: '#0B1320', text: '#fff700', colorKey: 'dark' },
  { bg: '#10B981', text: '#ffffff', colorKey: 'green' },
  { bg: '#F59E0B', text: '#0B1320', colorKey: 'gold' },
  { bg: '#EF4444', text: '#ffffff', colorKey: 'red' },
  { bg: '#ffffff', text: '#7B3DFF', colorKey: 'light' },
];

const OFFER_TEMPLATES: Array<{ title: string; subtitle: string }> = [
  { title: 'عرض خاص!', subtitle: 'خصم 20% على جميع المنتجات لفترة محدودة' },
  { title: 'توصيل مجاني', subtitle: 'على جميع الطلبات داخل محافظتك اليوم' },
  { title: 'تصفية الموسم', subtitle: 'خصومات تصل إلى 50% — الكمية محدودة' },
  { title: 'عرض نهاية الأسبوع', subtitle: 'اشترِ منتجين واحصل على الثالث مجاناً' },
];

function hexLuminance(hex: string): number {
  const raw = hex.replace('#', '');
  if (raw.length !== 6) return 0.5;
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;
  const toLin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
}

function contrastRatio(a: string, b: string): number {
  const l1 = hexLuminance(a);
  const l2 = hexLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function PromoBannerBuilderInner({
  storeId,
  initialData,
  onSave,
  onToggleActive,
}: PromoBannerBuilderProps) {
  const { t } = useTranslation();
  const defaultTitle = t('merchant.banner.defaultTitle');
  const defaultSubtitle = t('merchant.banner.defaultSubtitle');
  const draftRef = useRef<PromoBannerFormData>({ ...initialData });
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedStoreRef = useRef<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const titlePreviewRef = useRef<HTMLHeadingElement>(null);
  const subtitlePreviewRef = useRef<HTMLParagraphElement>(null);
  const bgHexRef = useRef<HTMLSpanElement>(null);
  const textHexRef = useRef<HTMLSpanElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const subtitleInputRef = useRef<HTMLInputElement>(null);
  const titleCountRef = useRef<HTMLSpanElement>(null);
  const subtitleCountRef = useRef<HTMLSpanElement>(null);

  const [isActive, setIsActive] = useState(initialData.isActive);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lowContrast, setLowContrast] = useState(
    () => contrastRatio(initialData.backgroundColor, initialData.textColor) < 3,
  );

  const syncCounts = (title: string, subtitle: string) => {
    if (titleCountRef.current) titleCountRef.current.textContent = `${title.length}/${TITLE_MAX}`;
    if (subtitleCountRef.current) {
      subtitleCountRef.current.textContent = `${subtitle.length}/${SUBTITLE_MAX}`;
    }
  };

  const applyDraftToDom = (data: PromoBannerFormData) => {
    if (bgInputRef.current) bgInputRef.current.value = data.backgroundColor;
    if (textInputRef.current) textInputRef.current.value = data.textColor;
    if (titleInputRef.current) titleInputRef.current.value = data.title;
    if (subtitleInputRef.current) subtitleInputRef.current.value = data.subtitle;
    if (bgHexRef.current) bgHexRef.current.textContent = data.backgroundColor;
    if (textHexRef.current) textHexRef.current.textContent = data.textColor;
    if (previewRef.current) {
      previewRef.current.style.backgroundColor = data.backgroundColor;
      previewRef.current.style.color = data.textColor;
    }
    if (titlePreviewRef.current) titlePreviewRef.current.textContent = data.title || defaultTitle;
    if (subtitlePreviewRef.current) {
      subtitlePreviewRef.current.textContent = data.subtitle || defaultSubtitle;
    }
    syncCounts(data.title, data.subtitle);
    setLowContrast(contrastRatio(data.backgroundColor, data.textColor) < 3);
  };

  useEffect(() => {
    if (!storeId || initializedStoreRef.current === storeId) return;
    initializedStoreRef.current = storeId;
    draftRef.current = { ...initialData };
    setIsActive(initialData.isActive);
    applyDraftToDom(initialData);
  }, [storeId, initialData]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const persist = useCallback(
    async (data: PromoBannerFormData) => {
      setSaveState('saving');
      try {
        await onSave({ ...data });
        setSaveState('saved');
        window.setTimeout(() => setSaveState('idle'), 1600);
      } catch {
        setSaveState('idle');
        showToast('error', t('merchant.banner.saveFailedTitle'), t('merchant.banner.saveFailedBody'));
      }
    },
    [onSave],
  );

  const flushSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    void persist({ ...draftRef.current });
  }, [persist]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void persist({ ...draftRef.current });
    }, SAVE_DELAY_MS);
  }, [persist]);

  const handleBackgroundColor = (value: string) => {
    draftRef.current.backgroundColor = value;
    if (bgHexRef.current) bgHexRef.current.textContent = value;
    if (bgInputRef.current) bgInputRef.current.value = value;
    if (previewRef.current) previewRef.current.style.backgroundColor = value;
    setLowContrast(contrastRatio(value, draftRef.current.textColor) < 3);
    scheduleSave();
  };

  const handleTextColor = (value: string) => {
    draftRef.current.textColor = value;
    if (textHexRef.current) textHexRef.current.textContent = value;
    if (textInputRef.current) textInputRef.current.value = value;
    if (previewRef.current) previewRef.current.style.color = value;
    setLowContrast(contrastRatio(draftRef.current.backgroundColor, value) < 3);
    scheduleSave();
  };

  const handleTitleChange = (value: string) => {
    const next = value.slice(0, TITLE_MAX);
    draftRef.current.title = next;
    if (titleInputRef.current && titleInputRef.current.value !== next) {
      titleInputRef.current.value = next;
    }
    if (titlePreviewRef.current) titlePreviewRef.current.textContent = next || defaultTitle;
    syncCounts(next, draftRef.current.subtitle);
    scheduleSave();
  };

  const handleSubtitleChange = (value: string) => {
    const next = value.slice(0, SUBTITLE_MAX);
    draftRef.current.subtitle = next;
    if (subtitleInputRef.current && subtitleInputRef.current.value !== next) {
      subtitleInputRef.current.value = next;
    }
    if (subtitlePreviewRef.current) {
      subtitlePreviewRef.current.textContent = next || defaultSubtitle;
    }
    syncCounts(draftRef.current.title, next);
    scheduleSave();
  };

  const applyPreset = (bg: string, text: string) => {
    draftRef.current.backgroundColor = bg;
    draftRef.current.textColor = text;
    applyDraftToDom(draftRef.current);
    scheduleSave();
  };

  const applyTemplate = (tpl: { title: string; subtitle: string }) => {
    draftRef.current.title = tpl.title.slice(0, TITLE_MAX);
    draftRef.current.subtitle = tpl.subtitle.slice(0, SUBTITLE_MAX);
    applyDraftToDom(draftRef.current);
    scheduleSave();
  };

  const resetDefaults = () => {
    const defaults: PromoBannerFormData = {
      title: defaultTitle,
      subtitle: defaultSubtitle,
      backgroundColor: '#7B3DFF',
      textColor: '#ffffff',
      isActive: draftRef.current.isActive,
    };
    draftRef.current = { ...defaults };
    applyDraftToDom(defaults);
    flushSave();
  };

  const handleToggleActive = () => {
    const next = !draftRef.current.isActive;
    draftRef.current.isActive = next;
    setIsActive(next);
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    void persist({ ...draftRef.current });
    onToggleActive?.(next);
  };

  return (
    <div className="rounded-[2rem] p-5 sm:p-6 shadow-sm border space-y-5 flex flex-col merchant-brand-card relative overflow-hidden group hover:shadow-md transition-all duration-300">
      <div className="absolute top-0 left-0 p-4 opacity-10 group-hover:scale-110 transition-transform pointer-events-none">
        <Megaphone size={72} className="text-[#fff700]" />
      </div>

      <div className="relative z-10 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-black text-[#fff700] flex items-center gap-2">
            <div className="p-2 bg-white/10 rounded-xl border border-white/15">
              <Lightbulb size={18} className="text-[#fff700]" />
            </div>
            {t('merchant.banner.title')}
          </h3>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-black rounded-full border ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/35'
                  : 'bg-white/10 text-white/55 border-white/20'
              }`}
            >
              {isActive && (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                </span>
              )}
              {isActive ? t('merchant.banner.active') : t('merchant.banner.inactive')}
            </span>
            <span className="text-[9px] font-bold text-white/40 min-h-[14px]">
              {saveState === 'saving' && t('merchant.banner.saving')}
              {saveState === 'saved' && (
                <span className="inline-flex items-center gap-1 text-emerald-400/90">
                  <Check size={10} /> {t('merchant.banner.saved')}
                </span>
              )}
            </span>
          </div>
        </div>
        <p className="text-xs text-white/75 font-medium leading-relaxed">
          {t('merchant.banner.subtitle')}
        </p>
      </div>

      {/* قوالب سريعة */}
      <div className="relative z-10 space-y-2">
        <p className="text-[10px] font-black text-[#fff700] flex items-center gap-1.5">
          <Sparkles size={12} />
          {t('merchant.banner.templates')}
        </p>
        <div className="flex flex-wrap gap-2">
          {OFFER_TEMPLATES.map((tpl) => (
            <button
              key={tpl.title}
              type="button"
              onClick={() => applyTemplate(tpl)}
              className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold bg-white/5 border border-white/15 text-white/80 hover:bg-white/10 hover:border-white/30 transition active:scale-95"
            >
              {tpl.title}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 flex-1 relative z-10 merchant-panel-inset p-4 rounded-2xl border border-white/10">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-bold text-[#fff700]">{t('merchant.banner.offerTitle')}</label>
            <span ref={titleCountRef} className="text-[9px] font-mono text-white/35">
              {initialData.title.length}/{TITLE_MAX}
            </span>
          </div>
          <input
            ref={titleInputRef}
            type="text"
            maxLength={TITLE_MAX}
            defaultValue={initialData.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            onBlur={flushSave}
            className="w-full bg-[#0B1320] border border-white/10 rounded-xl px-4 py-3 text-sm text-[#E8ECF4] focus:ring-2 focus:ring-vibrant-purple/40 font-medium placeholder:text-slate-500"
            placeholder={t('merchant.banner.titlePlaceholder')}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-bold text-[#fff700]">{t('merchant.banner.offerSubtitle')}</label>
            <span ref={subtitleCountRef} className="text-[9px] font-mono text-white/35">
              {initialData.subtitle.length}/{SUBTITLE_MAX}
            </span>
          </div>
          <input
            ref={subtitleInputRef}
            type="text"
            maxLength={SUBTITLE_MAX}
            defaultValue={initialData.subtitle}
            onChange={(e) => handleSubtitleChange(e.target.value)}
            onBlur={flushSave}
            className="w-full bg-[#0B1320] border border-white/10 rounded-xl px-4 py-3 text-sm text-[#E8ECF4] focus:ring-2 focus:ring-vibrant-purple/40 font-medium placeholder:text-slate-500"
            placeholder={t('merchant.banner.subtitlePlaceholder')}
          />
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-black text-[#fff700] flex items-center gap-1.5">
            <Palette size={12} />
            {t('merchant.banner.quickColors')}
          </p>
          <div className="flex flex-wrap gap-2">
            {COLOR_PRESETS.map((preset) => {
              const label = t(`merchant.banner.colors.${preset.colorKey}`);
              return (
              <button
                key={preset.colorKey}
                type="button"
                title={label}
                onClick={() => applyPreset(preset.bg, preset.text)}
                className="w-8 h-8 rounded-xl border-2 border-white/20 hover:border-white/50 hover:scale-110 transition shadow-sm active:scale-95"
                style={{ background: `linear-gradient(135deg, ${preset.bg} 55%, ${preset.text} 55%)` }}
                aria-label={label}
              />
            );})}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#fff700]">{t('merchant.banner.bgColor')}</label>
            <div className="flex items-center gap-2 bg-[#0B1320] border border-white/10 rounded-xl px-2.5 py-2">
              <input
                ref={bgInputRef}
                type="color"
                defaultValue={initialData.backgroundColor}
                onInput={(e) => handleBackgroundColor(e.currentTarget.value)}
                onChange={(e) => handleBackgroundColor(e.target.value)}
                onBlur={flushSave}
                className="w-9 h-9 rounded-lg cursor-pointer border-none bg-transparent p-0.5 shrink-0"
              />
              <span ref={bgHexRef} className="text-[11px] font-mono text-brand-white truncate">
                {initialData.backgroundColor}
              </span>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#fff700]">{t('merchant.banner.textColor')}</label>
            <div className="flex items-center gap-2 bg-[#0B1320] border border-white/10 rounded-xl px-2.5 py-2">
              <input
                ref={textInputRef}
                type="color"
                defaultValue={initialData.textColor}
                onInput={(e) => handleTextColor(e.currentTarget.value)}
                onChange={(e) => handleTextColor(e.target.value)}
                onBlur={flushSave}
                className="w-9 h-9 rounded-lg cursor-pointer border-none bg-transparent p-0.5 shrink-0"
              />
              <span ref={textHexRef} className="text-[11px] font-mono text-brand-white truncate">
                {initialData.textColor}
              </span>
            </div>
          </div>
        </div>

        {lowContrast && (
          <p className="text-[10px] font-bold text-amber-300/90 bg-amber-500/10 border border-amber-400/25 rounded-xl px-3 py-2">
            {t('merchant.banner.lowContrast')}
          </p>
        )}

        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between gap-3">
            <label className="text-xs font-bold text-[#fff700]">{t('merchant.banner.toggleLabel')}</label>
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={handleToggleActive}
              className={`relative w-12 h-7 rounded-full transition-colors border shrink-0 ${
                isActive
                  ? 'bg-emerald-500/80 border-emerald-300/40'
                  : 'bg-white/10 border-white/20'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                  isActive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <button
            type="button"
            onClick={handleToggleActive}
            className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 border active:scale-[0.98] transition ${
              isActive
                ? 'bg-rose-500/20 text-rose-300 border-rose-400/30 hover:bg-rose-500/30'
                : 'bg-gradient-to-r from-vibrant-purple to-deep-navy border-white text-white hover:opacity-90'
            }`}
          >
            <Megaphone size={16} />
            {isActive ? t('merchant.banner.deactivate') : t('merchant.banner.activate')}
          </button>
        </div>
      </div>

      <div className="pt-3 border-t border-white/10 space-y-3 relative z-10">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-[#fff700]">{t('merchant.banner.previewTitle')}</p>
          <button
            type="button"
            onClick={resetDefaults}
            className="inline-flex items-center gap-1 text-[10px] font-bold text-white/50 hover:text-white/80 transition"
          >
            <RotateCcw size={11} />
            {t('merchant.banner.resetDefault')}
          </button>
        </div>

        <div className="merchant-panel-inset p-3 rounded-2xl border border-dashed border-white/20 space-y-2">
          <div className="flex items-center justify-between text-[9px] font-bold text-white/40 px-1">
            <span>{t('merchant.banner.storePreview')}</span>
            <span>{isActive ? t('merchant.banner.visibleToCustomers') : t('merchant.banner.hiddenNow')}</span>
          </div>
          <div
            ref={previewRef}
            className={`p-4 rounded-xl flex flex-col items-center justify-center text-center shadow-inner min-h-[88px] transition-opacity ${
              isActive ? 'opacity-100' : 'opacity-55'
            }`}
            style={{
              backgroundColor: initialData.backgroundColor,
              color: initialData.textColor,
            }}
          >
            <h4 ref={titlePreviewRef} className="font-black text-lg mb-1 leading-snug">
              {initialData.title || defaultTitle}
            </h4>
            <p ref={subtitlePreviewRef} className="font-medium text-sm opacity-90 leading-relaxed">
              {initialData.subtitle || defaultSubtitle}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export const PromoBannerBuilder = memo(PromoBannerBuilderInner, (prev, next) => {
  return prev.storeId === next.storeId && prev.onSave === next.onSave;
});
