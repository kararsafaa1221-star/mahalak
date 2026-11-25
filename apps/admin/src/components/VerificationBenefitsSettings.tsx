import React, { useEffect, useState } from 'react';
import { ListChecks, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { showToast } from '../utils/alerts';
import {
  DEFAULT_VERIFICATION_BENEFITS,
  DEFAULT_VERIFICATION_BENEFITS_TITLE_AR,
  DEFAULT_VERIFICATION_BENEFITS_TITLE_CKB,
  type VerificationBenefitItem,
  createNewVerificationBenefitId,
  resolveVerificationBenefitsConfig,
} from '@shared/constants/verificationBenefits';

export interface VerificationBenefitsSettingsProps {
  adminSettings: Record<string, unknown>;
  updateAdminSettings: (data: Partial<Record<string, unknown>>) => Promise<void>;
}

const inputClass =
  'w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20';

/** Editable «مميزات الحساب الموثّق» list shown on the merchant verification page. */
export const VerificationBenefitsSettingsCard: React.FC<VerificationBenefitsSettingsProps> = ({
  adminSettings,
  updateAdminSettings,
}) => {
  const resolved = resolveVerificationBenefitsConfig(adminSettings);
  const [titleAr, setTitleAr] = useState(resolved.titleAr);
  const [titleCkb, setTitleCkb] = useState(resolved.titleCkb || '');
  const [items, setItems] = useState<VerificationBenefitItem[]>(() =>
    resolved.items.map((b) => ({ ...b })),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next = resolveVerificationBenefitsConfig(adminSettings);
    setTitleAr(next.titleAr);
    setTitleCkb(next.titleCkb || '');
    setItems(next.items.map((b) => ({ ...b })));
  }, [adminSettings]);

  const updateItem = (id: string, patch: Partial<VerificationBenefitItem>) => {
    setItems((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const handleAdd = () => {
    setItems((prev) => [
      ...prev,
      {
        id: createNewVerificationBenefitId(),
        textAr: 'ميزة جديدة للحساب الموثّق',
        textCkb: '',
        enabled: true,
        sortOrder: prev.length + 1,
      },
    ]);
  };

  const handleRemove = (id: string) => {
    if (!window.confirm('حذف هذه الميزة؟')) return;
    setItems((prev) => prev.filter((b) => b.id !== id));
  };

  const handleReset = () => {
    if (!window.confirm('إعادة مميزات التوثيق إلى القيم الافتراضية؟')) return;
    setTitleAr(DEFAULT_VERIFICATION_BENEFITS_TITLE_AR);
    setTitleCkb(DEFAULT_VERIFICATION_BENEFITS_TITLE_CKB);
    setItems(DEFAULT_VERIFICATION_BENEFITS.map((b) => ({ ...b })));
  };

  const handleSave = async () => {
    const cleaned = items
      .map((b, i) => ({
        ...b,
        textAr: b.textAr.trim(),
        textCkb: b.textCkb?.trim() || undefined,
        sortOrder: Number(b.sortOrder) > 0 ? Number(b.sortOrder) : i + 1,
        enabled: b.enabled !== false,
      }))
      .filter((b) => b.textAr.length > 0);

    if (cleaned.length === 0) {
      showToast('error', 'تنبيه', 'أضف ميزة واحدةحدة على الأقل قبل الحفظ.');
      return;
    }

    setSaving(true);
    try {
      await updateAdminSettings({
        verificationBenefitsTitleAr: titleAr.trim() || DEFAULT_VERIFICATION_BENEFITS_TITLE_AR,
        verificationBenefitsTitleCkb: titleCkb.trim() || DEFAULT_VERIFICATION_BENEFITS_TITLE_CKB,
        verificationBenefits: cleaned,
      });
      showToast('success', 'تم الحفظ', 'تم تحديث مميزات الحساب الموثّق في تطبيق التاجر.');
    } catch (err: unknown) {
      showToast('error', 'خطأ', err instanceof Error ? err.message : 'فشل حفظ المميزات');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-sky-200/60 bg-white shadow-sm overflow-hidden">
      <div className="bg-gradient-to-l from-sky-500 to-blue-700 px-5 py-3.5 flex items-center justify-between gap-3 text-white">
        <div className="flex items-center gap-2">
          <ListChecks size={18} className="text-sky-100 shrink-0" />
          <div>
            <h3 className="font-black text-sm">مميزات الحساب الموثّق</h3>
            <p className="text-[10px] text-sky-100/90 font-bold">
              تظهر في صفحة توثيق الحساب عند التاجر — يمكن إضافة مميزات وتعديلها
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-[10px] font-bold text-slate-500">عنوان القسم (عربي)</span>
            <input
              value={titleAr}
              onChange={(e) => setTitleAr(e.target.value)}
              className={inputClass}
              placeholder={DEFAULT_VERIFICATION_BENEFITS_TITLE_AR}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-bold text-slate-500">عنوان القسم (كردي)</span>
            <input
              value={titleCkb}
              onChange={(e) => setTitleCkb(e.target.value)}
              className={inputClass}
              placeholder={DEFAULT_VERIFICATION_BENEFITS_TITLE_CKB}
              dir="rtl"
            />
          </label>
        </div>

        {items
          .slice()
          .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99))
          .map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <input
                    type="checkbox"
                    checked={item.enabled !== false}
                    onChange={(e) => updateItem(item.id, { enabled: e.target.checked })}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  ظاهرة للتاجر
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                    ترتيب
                    <input
                      type="number"
                      min={1}
                      value={item.sortOrder ?? 1}
                      onChange={(e) =>
                        updateItem(item.id, { sortOrder: Math.max(1, Number(e.target.value) || 1) })
                      }
                      className="w-14 border border-slate-200 rounded-lg px-2 py-1 text-center text-xs font-bold"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                    title="حذف الميزة"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <label className="block space-y-1">
                <span className="text-[10px] font-bold text-slate-500">نص الميزة (عربي)</span>
                <textarea
                  value={item.textAr}
                  onChange={(e) => updateItem(item.id, { textAr: e.target.value })}
                  rows={2}
                  className={`${inputClass} resize-y min-h-[64px]`}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] font-bold text-slate-500">نص الميزة (كردي — اختياري)</span>
                <textarea
                  value={item.textCkb ?? ''}
                  onChange={(e) => updateItem(item.id, { textCkb: e.target.value })}
                  rows={2}
                  dir="rtl"
                  className={`${inputClass} resize-y min-h-[64px]`}
                  placeholder="إن تُرك فارغاً يُعرض النص العربي"
                />
              </label>
            </div>
          ))}

        <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleAdd}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl text-xs font-black transition"
          >
            <Plus size={14} />
            إضافة ميزة
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-black text-xs transition disabled:opacity-60 shadow-md shadow-sky-600/20"
          >
            <Save size={14} />
            {saving ? 'جاري الحفظ...' : 'حفظ المميزات'}
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
