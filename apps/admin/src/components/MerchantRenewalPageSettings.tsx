import React, { useEffect, useMemo, useState } from 'react';
import { LayoutTemplate, Save, RotateCcw, MessageCircle, Plus, Trash2 } from 'lucide-react';
import {
  DEFAULT_MERCHANT_RENEWAL_PAGE_SETTINGS,
  type MerchantRenewalPageSettings,
  type MerchantRenewalPlanConfig,
  resolveMerchantRenewalPageSettings,
  createNewSubscriptionPlanId,
  formatIqd,
} from '@shared/constants/merchantRenewalPlans';
import { showToast } from '../utils/alerts';

type Props = {
  adminSettings: Record<string, unknown>;
  updateAdminSettings: (data: Partial<Record<string, unknown>>) => Promise<void>;
  embedded?: boolean;
};

const inputClass =
  'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-mahalak-purple/20 focus:border-mahalak-purple outline-none';
const planInputClass =
  'w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-mahalak-purple focus:ring-2 focus:ring-mahalak-purple/20';

function cloneSettings(adminSettings: Record<string, unknown>): MerchantRenewalPageSettings {
  const resolved = resolveMerchantRenewalPageSettings(adminSettings);
  return {
    titleRenewal: resolved.titleRenewal,
    titleActivation: resolved.titleActivation,
    subtitle: resolved.subtitle,
    footerNote: resolved.footerNote,
    whatsappButtonLabel: resolved.whatsappButtonLabel,
    plans: resolved.plans.map(({ dailyIqd: _d, ...plan }) => ({ ...plan })),
  };
}

export const MerchantRenewalPageSettings: React.FC<Props> = ({
  adminSettings,
  updateAdminSettings,
  embedded = false,
}) => {
  const [form, setForm] = useState<MerchantRenewalPageSettings>(() => cloneSettings(adminSettings));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(cloneSettings(adminSettings));
  }, [adminSettings]);

  const preview = useMemo(
    () => resolveMerchantRenewalPageSettings({ merchantRenewalPage: form }),
    [form],
  );

  const updatePlan = (id: string, patch: Partial<MerchantRenewalPlanConfig>) => {
    setForm((prev) => ({
      ...prev,
      plans: prev.plans.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAdminSettings({ merchantRenewalPage: form });
      showToast('success', 'تم الحفظ', 'تم تحديث صفحة باقات التاجر في التطبيق.');
    } catch {
      showToast('error', 'فشل الحفظ', 'تعذر حفظ الإعدادات. حاول مرة أخرى.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!window.confirm('إعادة القيم الافتراضية لصفحة الباقات؟')) return;
    setForm(DEFAULT_MERCHANT_RENEWAL_PAGE_SETTINGS);
  };

  const handleAddPlan = () => {
    const id = createNewSubscriptionPlanId();
    setForm((prev) => ({
      ...prev,
      plans: [
        ...prev.plans,
        {
          id,
          labelAr: 'باقة جديدة',
          priceIqd: 25000,
          durationDays: 30,
          enabled: true,
          sortOrder: prev.plans.length + 1,
        },
      ],
    }));
  };

  const handleRemovePlan = (id: string) => {
    if (!window.confirm('حذف هذه الباقة؟ المتاجر المرتبطة بها ستبقى على نفس subscriptionId.')) return;
    setForm((prev) => ({ ...prev, plans: prev.plans.filter((p) => p.id !== id) }));
  };

  const content = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-5 space-y-4">
          <h4 className="text-sm font-black text-mahalak-navy border-b border-slate-200 pb-2">نصوص الصفحة</h4>

          <label className="block space-y-1">
            <span className="text-xs font-bold text-slate-500">عنوان التجديد</span>
            <input value={form.titleRenewal} onChange={(e) => setForm((f) => ({ ...f, titleRenewal: e.target.value }))} className={inputClass} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-bold text-slate-500">عنوان التفعيل (تاجر جديد)</span>
            <input value={form.titleActivation} onChange={(e) => setForm((f) => ({ ...f, titleActivation: e.target.value }))} className={inputClass} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-bold text-slate-500">النص التوضيحي</span>
            <textarea value={form.subtitle} onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} rows={3} className={`${inputClass} resize-none`} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-bold text-slate-500">نص التذييل</span>
            <input value={form.footerNote} onChange={(e) => setForm((f) => ({ ...f, footerNote: e.target.value }))} className={inputClass} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-bold text-slate-500">نص زر واتساب</span>
            <input value={form.whatsappButtonLabel} onChange={(e) => setForm((f) => ({ ...f, whatsappButtonLabel: e.target.value }))} className={inputClass} />
          </label>
        </div>

        <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-5">
          <h4 className="text-sm font-black text-mahalak-navy mb-3 flex items-center gap-2">
            <MessageCircle size={16} className="text-[#25D366]" />
            معاينة سريعة (تطبيق التاجر)
          </h4>
          <div className="bg-white rounded-xl border border-mahalak-purple/15 overflow-hidden text-sm shadow-sm">
            <div className="bg-gradient-to-l from-mahalak-purple to-mahalak-navy text-white px-3 py-2.5">
              <p className="font-black text-sm">{preview.titleRenewal}</p>
              <p className="text-[10px] text-mahalak-violet/90 font-bold mt-0.5 leading-snug">{preview.subtitle}</p>
            </div>
            <div className="p-2 space-y-1.5">
              {preview.plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5 text-[11px] ${
                    plan.highlight ? 'border-mahalak-purple/40 bg-mahalak-purple/5' : 'border-slate-100'
                  }`}
                >
                  <span className="font-black text-mahalak-navy">{plan.labelAr}</span>
                  <span className="font-black text-mahalak-purple">{formatIqd(plan.priceIqd)} د.ع</span>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-center text-slate-400 font-bold px-2 py-2 border-t border-slate-100">{preview.footerNote}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="text-sm font-black text-mahalak-navy">الباقات والأسعار (subscriptionId)</h4>
          <button
            type="button"
            onClick={handleAddPlan}
            className="flex items-center gap-1.5 px-4 py-2 bg-mahalak-purple/10 hover:bg-mahalak-purple/15 text-mahalak-purple border border-mahalak-purple/20 rounded-xl text-xs font-black transition"
          >
            <Plus size={14} />
            إنشاء باقة جديدة
          </button>
        </div>
        {form.plans
          .slice()
          .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99))
          .map((plan) => {
            const daily =
              plan.dailyIqd && plan.dailyIqd > 0
                ? plan.dailyIqd
                : plan.durationDays
                  ? Math.round(plan.priceIqd / plan.durationDays)
                  : 0;
            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl border p-4 ${
                  plan.highlight ? 'border-mahalak-purple/40 ring-1 ring-mahalak-purple/15' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                      <input type="checkbox" checked={plan.enabled !== false} onChange={(e) => updatePlan(plan.id, { enabled: e.target.checked })} className="rounded border-slate-300 text-mahalak-purple focus:ring-mahalak-purple" />
                      مفعّلة
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                      <input type="checkbox" checked={!!plan.highlight} onChange={(e) => updatePlan(plan.id, { highlight: e.target.checked })} className="rounded border-slate-300 text-mahalak-purple focus:ring-mahalak-purple" />
                      باقة مميزة
                    </label>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{plan.id}</span>
                  {!DEFAULT_MERCHANT_RENEWAL_PAGE_SETTINGS.plans.some((d) => d.id === plan.id) && (
                    <button type="button" onClick={() => handleRemovePlan(plan.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg" title="حذف الباقة">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <label className="block space-y-1 md:col-span-2">
                    <span className="text-[10px] font-bold text-slate-500">معرف الباقة (subscriptionId)</span>
                    <input value={plan.id} readOnly className={`${planInputClass} bg-slate-100 font-mono text-[11px]`} dir="ltr" />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold text-slate-500">اسم الباقة</span>
                    <input value={plan.labelAr} onChange={(e) => updatePlan(plan.id, { labelAr: e.target.value })} className={planInputClass} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold text-slate-500">السعر (د.ع)</span>
                    <input type="number" min={0} value={plan.priceIqd} onChange={(e) => updatePlan(plan.id, { priceIqd: Math.max(0, Number(e.target.value) || 0) })} className={planInputClass} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold text-slate-500">المدة (يوم)</span>
                    <input type="number" min={1} value={plan.durationDays} onChange={(e) => updatePlan(plan.id, { durationDays: Math.max(1, Number(e.target.value) || 1) })} className={planInputClass} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold text-slate-500">التكلفة اليومية (اختياري)</span>
                    <input type="number" min={0} placeholder={String(daily)} value={plan.dailyIqd ?? ''} onChange={(e) => { const v = e.target.value; updatePlan(plan.id, { dailyIqd: v === '' ? undefined : Math.max(0, Number(v) || 0) }); }} className={planInputClass} />
                  </label>
                  <label className="block space-y-1 md:col-span-2">
                    <span className="text-[10px] font-bold text-slate-500">شارة (اختياري)</span>
                    <input value={plan.badge ?? ''} onChange={(e) => updatePlan(plan.id, { badge: e.target.value || undefined })} placeholder="مثال: التوفير الذكي" className={planInputClass} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold text-slate-500">ترتيب العرض</span>
                    <input type="number" min={1} value={plan.sortOrder ?? 1} onChange={(e) => updatePlan(plan.id, { sortOrder: Math.max(1, Number(e.target.value) || 1) })} className={planInputClass} />
                  </label>
                  <div className="flex items-end">
                    <p className="text-xs font-bold text-mahalak-purple bg-mahalak-purple/10 px-3 py-2 rounded-xl w-full text-center border border-mahalak-purple/15">
                      ≈ {formatIqd(daily)} د.ع / يوم
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-200">
        <button type="button" onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-mahalak-purple hover:bg-mahalak-purple/90 text-white rounded-xl font-black text-sm transition disabled:opacity-60 shadow-md shadow-mahalak-purple/20">
          <Save size={18} />
          {saving ? 'جاري الحفظ...' : 'حفظ باقات التاجر'}
        </button>
        <button type="button" onClick={handleReset} className="flex items-center gap-2 px-5 py-3 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold text-sm transition">
          <RotateCcw size={16} />
          استعادة الافتراضي
        </button>
      </div>
    </div>
  );

  if (embedded) {
    return (
      <section className="rounded-2xl border border-mahalak-purple/15 bg-white shadow-sm overflow-hidden text-right" dir="rtl">
        <div className="bg-gradient-to-l from-mahalak-purple to-mahalak-navy px-5 py-3.5 flex items-center gap-2 text-white">
          <LayoutTemplate size={18} className="text-mahalak-violet shrink-0" />
          <div>
            <h3 className="font-black text-sm">صفحة باقات التاجر</h3>
            <p className="text-[10px] text-mahalak-violet/90 font-bold">مرتبطة بـ subscriptionId — تظهر في تطبيق التاجر ولوحة الحسابات</p>
          </div>
        </div>
        <div className="p-5">{content}</div>
      </section>
    );
  }

  return (
    <div className="space-y-6 admin-tab-content text-right" dir="rtl">
      <div className="bg-gradient-to-l from-mahalak-purple to-mahalak-navy rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-white/10 shrink-0">
            <LayoutTemplate size={28} className="text-mahalak-violet" />
          </div>
          <div>
            <h2 className="text-xl font-black mb-1">صفحة باقات تجديد التاجر</h2>
            <p className="text-sm text-mahalak-violet/90 font-bold leading-relaxed max-w-2xl">
              تحكم بنصوص وأسعار الباقات التي تظهر للتاجر عند انتهاء الاشتراك. التغييرات تنعكس فوراً في تطبيق التاجر.
            </p>
          </div>
        </div>
      </div>
      {content}
    </div>
  );
};
