import React, { useEffect, useMemo, useState } from 'react';
import { Type, Save, RotateCcw, Eye } from 'lucide-react';
import {
  DEFAULT_FLASH_SALES_CUSTOMER_DISPLAY,
  type FlashSalesCustomerDisplaySettings,
  resolveFlashSalesCustomerDisplay,
} from '@shared/constants/flashSalesDisplay';
import { showToast } from '../utils/alerts';

type Props = {
  adminSettings: Record<string, unknown>;
  updateAdminSettings: (data: Partial<Record<string, unknown>>) => Promise<void>;
};

const inputClass =
  'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-[#9952FF]/20 focus:border-[#9952FF] outline-none bg-white';

function cloneSettings(adminSettings: Record<string, unknown>): FlashSalesCustomerDisplaySettings {
  return { ...resolveFlashSalesCustomerDisplay(adminSettings) };
}

export const FlashSalesDisplaySettings: React.FC<Props> = ({
  adminSettings,
  updateAdminSettings,
}) => {
  const [form, setForm] = useState<FlashSalesCustomerDisplaySettings>(() =>
    cloneSettings(adminSettings),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(cloneSettings(adminSettings));
  }, [adminSettings]);

  const preview = useMemo(
    () => resolveFlashSalesCustomerDisplay({ flashSalesCustomerDisplay: form }),
    [form],
  );

  const patch = (partial: Partial<FlashSalesCustomerDisplaySettings>) => {
    setForm((prev) => ({ ...prev, ...partial }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAdminSettings({ flashSalesCustomerDisplay: form });
      showToast('success', 'تم الحفظ', 'تم تحديث نصوص فلاش سيلز الظاهرة للزبائن.');
    } catch {
      showToast('error', 'فشل الحفظ', 'تعذر حفظ النصوص. حاول مرة أخرى.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!window.confirm('إعادة النصوص الافتراضية لقسم فلاش سيلز عند الزبون؟')) return;
    setForm({ ...DEFAULT_FLASH_SALES_CUSTOMER_DISPLAY });
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#f5eeff] text-[#9952FF] rounded-xl">
            <Type size={20} />
          </div>
          <div>
            <h4 className="font-black text-slate-800 text-base">نصوص واجهة الزبون</h4>
            <p className="text-xs text-slate-500 font-medium">
              التحكم بالعناوين والتسميات الظاهرة في قسم الفلاش سيلز داخل تطبيق الزبون
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-2 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 flex items-center gap-1.5"
          >
            <RotateCcw size={14} />
            افتراضي
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-xs font-black text-white bg-[#9952FF] rounded-xl hover:bg-[#4D2980] disabled:opacity-60 flex items-center gap-1.5 shadow-md shadow-[#e9daff]"
          >
            <Save size={14} />
            {saving ? 'جاري الحفظ...' : 'حفظ النصوص'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-black text-slate-500 mb-1.5 block">
            العنوان الرئيسي للقسم
          </label>
          <input
            type="text"
            value={form.sectionTitle}
            onChange={(e) => patch({ sectionTitle: e.target.value })}
            className={inputClass}
            placeholder={DEFAULT_FLASH_SALES_CUSTOMER_DISPLAY.sectionTitle}
          />
        </div>
        <div>
          <label className="text-[11px] font-black text-slate-500 mb-1.5 block">
            نص تسمية العدّاد (ينتهي خلال)
          </label>
          <input
            type="text"
            value={form.countdownLabel}
            onChange={(e) => patch({ countdownLabel: e.target.value })}
            className={inputClass}
            placeholder={DEFAULT_FLASH_SALES_CUSTOMER_DISPLAY.countdownLabel}
          />
        </div>
        <div>
          <label className="text-[11px] font-black text-slate-500 mb-1.5 block">
            شارة العرض على صورة المنتج
          </label>
          <input
            type="text"
            value={form.offerBadge}
            onChange={(e) => patch({ offerBadge: e.target.value })}
            className={inputClass}
            placeholder={DEFAULT_FLASH_SALES_CUSTOMER_DISPLAY.offerBadge}
          />
        </div>
        <div>
          <label className="text-[11px] font-black text-slate-500 mb-1.5 block">
            عدد المنتجات في كل صفحة تقليب
          </label>
          <input
            type="number"
            min={1}
            max={6}
            value={form.productsPerPage}
            onChange={(e) => patch({ productsPerPage: Number(e.target.value) || 3 })}
            className={inputClass}
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-[11px] font-black text-slate-500 mb-1.5 block">
            رسالة عدم وجود منتجات معتمدة
          </label>
          <textarea
            rows={2}
            value={form.emptyProductsText}
            onChange={(e) => patch({ emptyProductsText: e.target.value })}
            className={`${inputClass} resize-none`}
            placeholder={DEFAULT_FLASH_SALES_CUSTOMER_DISPLAY.emptyProductsText}
          />
        </div>
        <label className="md:col-span-2 flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer">
          <input
            type="checkbox"
            checked={form.showCountdown}
            onChange={(e) => patch({ showCountdown: e.target.checked })}
            className="w-4 h-4 accent-[#9952FF]"
          />
          <span className="text-xs font-bold text-slate-700">إظهار العدّاد الحي لنهاية الفعالية</span>
        </label>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-gradient-to-l from-[#1a1430] to-[#0b1320] p-4 text-white">
        <div className="flex items-center gap-2 mb-3 text-[#fff700]">
          <Eye size={14} />
          <span className="text-[10px] font-black">معاينة سريعة للزبون</span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 text-right">
            <p className="text-xs font-black truncate">{preview.sectionTitle}</p>
            <span className="inline-block mt-1.5 text-[9px] font-black bg-white/10 border border-white/20 text-[#fff700] px-2 py-0.5 rounded-full">
              عنوان الفعالية
            </span>
          </div>
          {preview.showCountdown && (
            <div className="shrink-0 bg-white/10 border border-white/20 rounded-xl px-2.5 py-1.5 text-center">
              <span className="text-[8px] font-bold text-white/55 block">{preview.countdownLabel}</span>
              <span className="font-mono font-black text-sm text-[#fff700]" dir="ltr">
                12:34:56
              </span>
            </div>
          )}
        </div>
        <div className="mt-3 inline-flex items-center gap-2 text-[9px] font-bold text-white/70">
          <span className="bg-rose-500/90 text-white px-1.5 py-0.5 rounded-md border border-rose-300/30">
            {preview.offerBadge}
          </span>
          <span>× {preview.productsPerPage} منتجات / صفحة</span>
        </div>
      </div>
    </div>
  );
};
