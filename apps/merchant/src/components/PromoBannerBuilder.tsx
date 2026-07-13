import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Lightbulb } from 'lucide-react';

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

function PromoBannerBuilderInner({
  storeId,
  initialData,
  onSave,
  onToggleActive,
}: PromoBannerBuilderProps) {
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

  const [isActive, setIsActive] = useState(initialData.isActive);

  useEffect(() => {
    if (!storeId || initializedStoreRef.current === storeId) return;
    initializedStoreRef.current = storeId;
    draftRef.current = { ...initialData };
    setIsActive(initialData.isActive);
    if (bgInputRef.current) bgInputRef.current.value = initialData.backgroundColor;
    if (textInputRef.current) textInputRef.current.value = initialData.textColor;
    if (bgHexRef.current) bgHexRef.current.textContent = initialData.backgroundColor;
    if (textHexRef.current) textHexRef.current.textContent = initialData.textColor;
    if (previewRef.current) {
      previewRef.current.style.backgroundColor = initialData.backgroundColor;
      previewRef.current.style.color = initialData.textColor;
    }
    if (titlePreviewRef.current) titlePreviewRef.current.textContent = initialData.title || 'عنوان العرض';
    if (subtitlePreviewRef.current) {
      subtitlePreviewRef.current.textContent = initialData.subtitle || 'قم بكتابة تفاصيل العرض هنا';
    }
  }, [storeId, initialData]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const flushSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    void onSave({ ...draftRef.current });
  }, [onSave]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void onSave({ ...draftRef.current });
    }, SAVE_DELAY_MS);
  }, [onSave]);

  const handleBackgroundColor = (value: string) => {
    draftRef.current.backgroundColor = value;
    if (bgHexRef.current) bgHexRef.current.textContent = value;
    if (previewRef.current) previewRef.current.style.backgroundColor = value;
    scheduleSave();
  };

  const handleTextColor = (value: string) => {
    draftRef.current.textColor = value;
    if (textHexRef.current) textHexRef.current.textContent = value;
    if (previewRef.current) previewRef.current.style.color = value;
    scheduleSave();
  };

  const handleTitleChange = (value: string) => {
    draftRef.current.title = value;
    if (titlePreviewRef.current) {
      titlePreviewRef.current.textContent = value || 'عنوان العرض';
    }
    scheduleSave();
  };

  const handleSubtitleChange = (value: string) => {
    draftRef.current.subtitle = value;
    if (subtitlePreviewRef.current) {
      subtitlePreviewRef.current.textContent = value || 'قم بكتابة تفاصيل العرض هنا';
    }
    scheduleSave();
  };

  const handleToggleActive = () => {
    const next = !draftRef.current.isActive;
    draftRef.current.isActive = next;
    setIsActive(next);
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    void onSave({ ...draftRef.current });
    onToggleActive?.(next);
  };

  return (
    <div className="rounded-[2rem] p-6 shadow-sm border space-y-6 flex flex-col merchant-brand-card relative overflow-hidden group hover:shadow-md transition-all duration-300">
      <div className="absolute top-0 left-0 p-4 opacity-10 group-hover:scale-110 transition-transform pointer-events-none">
        <Lightbulb size={72} className="text-[#fff700]" />
      </div>
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className="text-lg font-black text-[#fff700] flex items-center gap-2">
            <div className="p-2 bg-white/10 rounded-xl">
              <Lightbulb size={18} className="text-[#fff700]" />
            </div>
            صناعة العروض المرئية
          </h3>
          <span
            className={`px-2.5 py-1 text-[9px] font-bold rounded-full border shrink-0 ${
              isActive
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                : 'bg-white/10 text-white/60 border-white/20'
            }`}
          >
            {isActive ? 'بانر نشط' : 'بانر متوقف'}
          </span>
        </div>
        <p className="text-xs text-white/80 font-medium">
          صمم لافتة إعلانية تظهر أعلى متجرك لجذب انتباه الزبائن للعروض الحالية.
        </p>
      </div>

      <div className="space-y-4 flex-1 relative z-10 merchant-panel-inset p-4 rounded-2xl border border-white/10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#fff700]">عنوان العرض</label>
            <input
              type="text"
              defaultValue={initialData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              onBlur={flushSave}
              className="w-full bg-[#0B1320] border border-white/10 rounded-xl px-4 py-3 text-sm text-[#E8ECF4] focus:ring-2 focus:ring-vibrant-purple/40 font-medium placeholder:text-slate-500"
              placeholder="مثال: عرض نهاية العام!"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#fff700]">لون الخلفية</label>
            <div className="flex items-center gap-3 bg-[#0B1320] border border-white/10 rounded-xl px-3 py-2">
              <input
                ref={bgInputRef}
                type="color"
                defaultValue={initialData.backgroundColor}
                onInput={(e) => handleBackgroundColor(e.currentTarget.value)}
                onChange={(e) => handleBackgroundColor(e.target.value)}
                onBlur={flushSave}
                className="w-9 h-9 rounded-lg cursor-pointer border-none bg-transparent p-0.5 shrink-0"
              />
              <span ref={bgHexRef} className="text-xs font-mono text-brand-white">
                {initialData.backgroundColor}
              </span>
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#fff700]">لون النص</label>
          <div className="flex items-center gap-3 bg-[#0B1320] border border-white/10 rounded-xl px-3 py-2 max-w-xs">
            <input
              ref={textInputRef}
              type="color"
              defaultValue={initialData.textColor}
              onInput={(e) => handleTextColor(e.currentTarget.value)}
              onChange={(e) => handleTextColor(e.target.value)}
              onBlur={flushSave}
              className="w-9 h-9 rounded-lg cursor-pointer border-none bg-transparent p-0.5 shrink-0"
            />
            <span ref={textHexRef} className="text-xs font-mono text-brand-white">
              {initialData.textColor}
            </span>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#fff700]">تفاصيل العرض (النص الفرعي)</label>
          <input
            type="text"
            defaultValue={initialData.subtitle}
            onChange={(e) => handleSubtitleChange(e.target.value)}
            onBlur={flushSave}
            className="w-full bg-[#0B1320] border border-white/10 rounded-xl px-4 py-3 text-sm text-[#E8ECF4] focus:ring-2 focus:ring-vibrant-purple/40 font-medium placeholder:text-slate-500"
            placeholder="خصم 20% على جميع المنتجات الشتوية"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#fff700]">تفعيل العرض في المتجر</label>
          <button
            type="button"
            onClick={handleToggleActive}
            className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 border active:scale-95 ${
              isActive
                ? 'bg-rose-500/20 text-rose-300 border-rose-400/30 hover:bg-rose-500/30'
                : 'bg-gradient-to-r from-vibrant-purple to-deep-navy border-white text-white hover:opacity-90'
            }`}
          >
            {isActive ? 'إيقاف عرض البانر' : 'تفعيل البانر الآن'}
          </button>
        </div>
      </div>

      <div className="pt-4 border-t border-white/10 space-y-3 relative z-10">
        <p className="text-xs font-bold text-[#fff700] mb-2">كيف سيبدو البانر في المتجر:</p>
        <div className="merchant-panel-inset p-3 rounded-2xl border border-dashed border-white/20">
          <div
            ref={previewRef}
            className="p-4 rounded-xl flex flex-col items-center justify-center text-center shadow-inner min-h-[80px]"
            style={{
              backgroundColor: initialData.backgroundColor,
              color: initialData.textColor,
            }}
          >
            <h4 ref={titlePreviewRef} className="font-black text-lg mb-1">
              {initialData.title || 'عنوان العرض'}
            </h4>
            <p ref={subtitlePreviewRef} className="font-medium text-sm opacity-90">
              {initialData.subtitle || 'قم بكتابة تفاصيل العرض هنا'}
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
