import React, { useState } from 'react';
import { CreditCard, Settings, X } from 'lucide-react';
import { showToast } from '../utils/alerts';

export interface AutoSubscriptionSettingsProps {
  adminSettings: Record<string, unknown>;
  updateAdminSettings: (data: Partial<Record<string, unknown>>) => Promise<void>;
}

function durationUnitAr(unit: string): string {
  if (unit === 'days') return 'يوم';
  if (unit === 'years') return 'سنة';
  return 'شهر';
}

export const AutoSubscriptionSettingsCard: React.FC<AutoSubscriptionSettingsProps & { onOpenModal?: () => void }> = ({
  adminSettings,
  onOpenModal,
}) => {
  const enabled = adminSettings?.autoSubscriptionEnabled === true;
  const value = Number(adminSettings?.autoSubscriptionDurationValue ?? 1);
  const unit = String(adminSettings?.autoSubscriptionDurationUnit ?? 'months');

  return (
    <section className="rounded-2xl border border-mahalak-purple/15 bg-white shadow-sm overflow-hidden">
      <div className="bg-gradient-to-l from-mahalak-purple to-mahalak-navy px-5 py-3.5 flex items-center justify-between gap-3 text-white">
        <div className="flex items-center gap-2">
          <CreditCard size={18} className="text-mahalak-violet shrink-0" />
          <h3 className="font-black text-sm">الاشتراك التلقائي للتجار الجدد</h3>
        </div>
        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-white/15 border border-white/20">
          موافقة تلقائية
        </span>
      </div>

      <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p className="text-xs text-slate-600 leading-relaxed font-bold flex-1">
          الموافقة على المتاجر الجديدة تلقائية. فعّل الاشتراك التلقائي لمنح كل تاجر مدة اشتراك فور التسجيل.
        </p>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {enabled && (
            <span className="text-[10px] font-black px-3 py-1.5 rounded-full bg-mahalak-purple/10 border border-mahalak-purple/20 text-mahalak-purple">
              المدة: {value} {durationUnitAr(unit)}
            </span>
          )}
          <button
            type="button"
            onClick={onOpenModal}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-mahalak-purple hover:bg-mahalak-purple/90 text-white rounded-xl text-xs font-bold shadow-md shadow-mahalak-purple/25 transition"
          >
            <Settings size={14} />
            إعدادات الاشتراك التلقائي
          </button>
        </div>
      </div>
    </section>
  );
};

export const AutoSubscriptionSettingsModal: React.FC<
  AutoSubscriptionSettingsProps & { open: boolean; onClose: () => void }
> = ({ open, onClose, adminSettings, updateAdminSettings }) => {
  const [form, setForm] = useState({
    enabled: false,
    durationValue: 1,
    durationUnit: 'months' as 'days' | 'months' | 'years',
  });

  React.useEffect(() => {
    if (!open) return;
    setForm({
      enabled: adminSettings?.autoSubscriptionEnabled === true,
      durationValue: Number(adminSettings?.autoSubscriptionDurationValue ?? 1),
      durationUnit: (adminSettings?.autoSubscriptionDurationUnit as 'days' | 'months' | 'years') ?? 'months',
    });
  }, [open, adminSettings]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-mahalak-navy/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-in">
        <div className="bg-gradient-to-l from-mahalak-purple to-mahalak-navy p-5 flex justify-between items-center text-white">
          <h3 className="font-black flex items-center gap-2 text-sm">
            <CreditCard size={18} />
            إعدادات الاشتراك التلقائي
          </h3>
          <button type="button" onClick={onClose} className="bg-white/10 p-1.5 rounded-lg hover:bg-white/20 transition">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5 text-right">
          <p className="text-xs text-slate-500 leading-relaxed font-bold">
            عند التفعيل، يُفعَّل اشتراك تلقائي لكل تاجر جديد. الموافقة على المتاجر الجديدة تتم تلقائياً دائماً.
          </p>

          <div className="flex items-center justify-between bg-mahalak-purple/5 p-4 rounded-2xl border border-mahalak-purple/15">
            <span className="text-[10px] font-black px-3 py-1 rounded-full bg-mahalak-purple/10 text-mahalak-purple border border-mahalak-purple/20">
              ● مفعّل دائماً
            </span>
            <div>
              <span className="text-xs font-black text-slate-800 block">الموافقة التلقائية على المتاجر</span>
              <span className="text-[10px] text-slate-500 font-bold">كل تاجر جديد يُفعَّل فور التسجيل بدون انتظار الأدمن</span>
            </div>
          </div>

          <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, enabled: !prev.enabled }))}
              className={`relative w-14 h-8 rounded-full transition-all shrink-0 ${
                form.enabled ? 'bg-mahalak-purple' : 'bg-slate-300'
              }`}
            >
              <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all ${
                form.enabled ? 'left-1' : 'right-1'
              }`}
              />
            </button>
            <div>
              <span className="text-xs font-black text-slate-800 block">تفعيل الاشتراك التلقائي</span>
              <span className="text-[10px] text-slate-500 font-bold">{form.enabled ? 'مفعّل للتسجيلات الجديدة' : 'معطّل حالياً'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">المدة</label>
              <input
                type="number"
                min={1}
                max={999}
                value={form.durationValue}
                onChange={(e) => setForm((prev) => ({
                  ...prev,
                  durationValue: Math.max(1, parseInt(e.target.value, 10) || 1),
                }))}
                className="w-full text-xs font-bold border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-mahalak-purple/30 focus:border-mahalak-purple"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">الوحدة</label>
              <select
                value={form.durationUnit}
                onChange={(e) => setForm((prev) => ({
                  ...prev,
                  durationUnit: e.target.value as 'days' | 'months' | 'years',
                }))}
                className="w-full text-xs font-bold border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-mahalak-purple/30 focus:border-mahalak-purple bg-white"
              >
                <option value="days">أيام</option>
                <option value="months">أشهر</option>
                <option value="years">سنوات</option>
              </select>
            </div>
          </div>

          <div className="bg-mahalak-purple/5 border border-mahalak-purple/15 p-3 rounded-xl text-[10px] text-mahalak-purple font-bold">
            المعاينة: كل تاجر جديد يحصل على اشتراك لمدة {form.durationValue} {durationUnitAr(form.durationUnit)}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  await updateAdminSettings({
                    autoSubscriptionEnabled: form.enabled,
                    autoSubscriptionDurationValue: form.durationValue,
                    autoSubscriptionDurationUnit: form.durationUnit,
                  });
                  onClose();
                  showToast('success', 'تم الحفظ', 'تم تحديث إعدادات الاشتراك التلقائي بنجاح');
                } catch (err: unknown) {
                  showToast('error', 'خطأ', err instanceof Error ? err.message : 'فشل الحفظ');
                }
              }}
              className="flex-1 py-3 bg-mahalak-purple hover:bg-mahalak-purple/90 text-white font-bold rounded-xl shadow-md shadow-mahalak-purple/25 transition text-xs"
            >
              حفظ الإعدادات
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl transition hover:bg-slate-200 text-xs"
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
