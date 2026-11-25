import React, { useEffect, useState } from 'react';
import { BadgeCheck, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { showToast } from '../utils/alerts';
import {
  DEFAULT_VERIFICATION_PLANS,
  type VerificationPlanConfig,
  createNewVerificationPlanId,
  formatVerificationIqd,
  resolveAllVerificationPlans,
} from '@shared/constants/verificationPricing';

export interface VerificationPricingSettingsProps {
  adminSettings: Record<string, unknown>;
  updateAdminSettings: (data: Partial<Record<string, unknown>>) => Promise<void>;
}

const planInputClass =
  'w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';

/** Admin-managed verification (blue badge) packages — mirrors subscription plan pricing.
 *  Lives in the same "الاشتراكات والتفعيل التلقائي" settings tab. */
export const VerificationPricingSettingsCard: React.FC<VerificationPricingSettingsProps> = ({
  adminSettings,
  updateAdminSettings,
}) => {
  const [plans, setPlans] = useState<VerificationPlanConfig[]>(() =>
    resolveAllVerificationPlans(adminSettings).map((p) => ({ ...p })),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPlans(resolveAllVerificationPlans(adminSettings).map((p) => ({ ...p })));
  }, [adminSettings]);

  const updatePlan = (id: string, patch: Partial<VerificationPlanConfig>) => {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const handleAddPlan = () => {
    setPlans((prev) => [
      ...prev,
      {
        id: createNewVerificationPlanId(),
        labelAr: 'باقة توثيق جديدة',
        priceIqd: 5000,
        durationDays: 30,
        enabled: true,
        sortOrder: prev.length + 1,
      },
    ]);
  };

  const handleRemovePlan = (id: string) => {
    if (!window.confirm('حذف هذه الباقة؟')) return;
    setPlans((prev) => prev.filter((p) => p.id !== id));
  };

  const handleReset = () => {
    if (!window.confirm('إعادة القيم الافتراضية لباقات التوثيق؟')) return;
    setPlans(DEFAULT_VERIFICATION_PLANS.map((p) => ({ ...p })));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAdminSettings({ verificationPlans: plans });
      showToast('success', 'تم الحفظ', 'تم تحديث باقات وأسعار توثيق المتاجر.');
    } catch (err: unknown) {
      showToast('error', 'خطأ', err instanceof Error ? err.message : 'فشل حفظ باقات التوثيق');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-blue-200/60 bg-white shadow-sm overflow-hidden">
      <div className="bg-gradient-to-l from-blue-600 to-mahalak-navy px-5 py-3.5 flex items-center justify-between gap-3 text-white">
        <div className="flex items-center gap-2">
          <BadgeCheck size={18} className="text-blue-200 shrink-0" />
          <div>
            <h3 className="font-black text-sm">باقات وأسعار توثيق المتاجر (الشارة الرسمية)</h3>
            <p className="text-[10px] text-blue-100/90 font-bold">تُحسب ضمن «أرباح التوثيق» في صفحة الحسابات — يمكن أيضاً إرسالها كهدية بدون مقابل</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-3">
        {plans
          .slice()
          .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99))
          .map((plan) => {
            const daily = plan.durationDays ? Math.round(plan.priceIqd / plan.durationDays) : 0;
            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl border p-4 ${
                  plan.highlight ? 'border-blue-400 ring-1 ring-blue-100' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                      <input
                        type="checkbox"
                        checked={plan.enabled !== false}
                        onChange={(e) => updatePlan(plan.id, { enabled: e.target.checked })}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      مفعّلة
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                      <input
                        type="checkbox"
                        checked={!!plan.highlight}
                        onChange={(e) => updatePlan(plan.id, { highlight: e.target.checked })}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      باقة مميزة
                    </label>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{plan.id}</span>
                  <button
                    type="button"
                    onClick={() => handleRemovePlan(plan.id)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                    title="حذف الباقة"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold text-slate-500">اسم الباقة</span>
                    <input
                      value={plan.labelAr}
                      onChange={(e) => updatePlan(plan.id, { labelAr: e.target.value })}
                      className={planInputClass}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold text-slate-500">السعر (د.ع)</span>
                    <input
                      type="number"
                      min={0}
                      value={plan.priceIqd}
                      onChange={(e) => updatePlan(plan.id, { priceIqd: Math.max(0, Number(e.target.value) || 0) })}
                      className={planInputClass}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold text-slate-500">المدة (يوم)</span>
                    <input
                      type="number"
                      min={1}
                      value={plan.durationDays}
                      onChange={(e) => updatePlan(plan.id, { durationDays: Math.max(1, Number(e.target.value) || 1) })}
                      className={planInputClass}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold text-slate-500">شارة توفير (اختياري)</span>
                    <input
                      value={plan.badge ?? ''}
                      onChange={(e) => updatePlan(plan.id, { badge: e.target.value || undefined })}
                      placeholder="مثال: وفّر 13%"
                      className={planInputClass}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold text-slate-500">ترتيب العرض</span>
                    <input
                      type="number"
                      min={1}
                      value={plan.sortOrder ?? 1}
                      onChange={(e) => updatePlan(plan.id, { sortOrder: Math.max(1, Number(e.target.value) || 1) })}
                      className={planInputClass}
                    />
                  </label>
                  <div className="flex items-end lg:col-span-3">
                    <p className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-2 rounded-xl w-full text-center border border-blue-100">
                      {formatVerificationIqd(plan.priceIqd)} د.ع · {plan.durationDays} يوم — ≈ {formatVerificationIqd(daily)} د.ع / يوم
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

        <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleAddPlan}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-black transition"
          >
            <Plus size={14} />
            إضافة باقة توثيق جديدة
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs transition disabled:opacity-60 shadow-md shadow-blue-600/20"
          >
            <Save size={14} />
            {saving ? 'جاري الحفظ...' : 'حفظ باقات التوثيق'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold text-xs transition"
          >
            <RotateCcw size={14} />
            استعادة الافتراضي
          </button>
        </div>
      </div>
    </section>
  );
};
