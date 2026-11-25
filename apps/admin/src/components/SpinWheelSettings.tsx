import React, { useEffect, useMemo, useState } from 'react';
import { Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import {
  buildSpinWheelPayload,
  createEmptySpinWheelOption,
  getSpinWheelChancePercent,
  resolveSpinWheelSettings,
  type SpinWheelOption,
  type SpinWheelPrizeType,
  type SpinWheelSettings,
  DEFAULT_SPIN_WHEEL_SETTINGS,
} from '@shared/constants/spinWheelSettings';
import { SpinWheelIcon } from '@shared/components/SpinWheelIcon';
import { showToast } from '../utils/alerts';
import { ImageUploader } from './ImageUploader';
import { uploadSpinWheelImageStorage } from '../lib/firebase';

type Props = {
  adminSettings: Record<string, unknown>;
  updateAdminSettings: (data: Partial<Record<string, unknown>>) => Promise<void>;
};

const inputClass =
  'w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-[#9952FF]/20 focus:border-[#9952FF] outline-none bg-white';

const PRIZE_LABELS: Record<SpinWheelPrizeType, string> = {
  points: 'نقاط',
  promo_amount: 'كود خصم بمبلغ (د.ع)',
  promo_percent: 'كود خصم بنسبة %',
  external: 'جائزة خارجية',
  nothing: 'بدون جائزة (حظ أوفر)',
};

function cloneSettings(adminSettings: Record<string, unknown>): SpinWheelSettings {
  const resolved = resolveSpinWheelSettings(adminSettings);
  return {
    ...resolved,
    options: resolved.options.map((o) => ({ ...o })),
  };
}

/** Upload data-URL images to Storage; keep existing https URLs as-is. */
async function persistSpinWheelImages(settings: SpinWheelSettings): Promise<SpinWheelSettings> {
  let centerImageUrl = String(settings.centerImageUrl || '').trim();
  if (centerImageUrl.startsWith('data:')) {
    centerImageUrl = await uploadSpinWheelImageStorage(centerImageUrl, 'center');
  }

  const options: SpinWheelOption[] = [];
  for (const opt of settings.options) {
    let imageUrl = String(opt.imageUrl || '').trim();
    if (imageUrl.startsWith('data:')) {
      imageUrl = await uploadSpinWheelImageStorage(imageUrl, opt.id || 'option');
    }
    options.push(imageUrl ? { ...opt, imageUrl } : { ...opt, imageUrl: undefined });
  }

  return {
    ...settings,
    ...(centerImageUrl ? { centerImageUrl } : { centerImageUrl: undefined }),
    options,
  };
}

export const SpinWheelSettingsCard: React.FC<Props> = ({
  adminSettings,
  updateAdminSettings,
}) => {
  const [form, setForm] = useState<SpinWheelSettings>(() => cloneSettings(adminSettings));
  const [saving, setSaving] = useState(false);
  const spinWheelSnapshot = JSON.stringify(
    (adminSettings as { spinWheel?: unknown } | null)?.spinWheel ?? null,
  );

  useEffect(() => {
    if (saving) return;
    setForm(cloneSettings(adminSettings));
    // مزامنة النموذج فقط عند تغيّر إعدادات العجلة في السيرفر — لا تمسح تعديلات المستخدم عند أي تحديث آخر
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: sync on spinWheel payload only
  }, [spinWheelSnapshot, saving]);

  const totalChance = useMemo(
    () => form.options.filter((o) => o.enabled && o.weight > 0).reduce((s, o) => s + o.weight, 0),
    [form.options],
  );

  const totalChancePercent = useMemo(() => {
    return Math.round(totalChance * 10) / 10;
  }, [totalChance]);

  const patch = (partial: Partial<SpinWheelSettings>) => {
    setForm((prev) => ({ ...prev, ...partial }));
  };

  const updateOption = (id: string, partial: Partial<SpinWheelOption>) => {
    setForm((prev) => ({
      ...prev,
      options: prev.options.map((opt) => (opt.id === id ? { ...opt, ...partial } : opt)),
    }));
  };

  /** Set chance % directly — 0 is allowed (option stays listed but cannot win). */
  const setOptionChancePercent = (id: string, raw: string) => {
    if (raw.trim() === '') {
      updateOption(id, { weight: 0 });
      return;
    }
    const percent = Number(raw);
    if (!Number.isFinite(percent)) return;
    const value = Math.max(0, Math.min(100, percent));
    updateOption(id, { weight: Math.round(value * 10) / 10 });
  };

  /** Scale all enabled weights so they sum exactly to 100. */
  const normalizeChancesTo100 = () => {
    setForm((prev) => {
      const enabled = prev.options.filter((o) => o.enabled && o.weight > 0);
      const sum = enabled.reduce((s, o) => s + o.weight, 0);
      if (sum <= 0) return prev;
      return {
        ...prev,
        options: prev.options.map((opt) => {
          if (!opt.enabled || opt.weight <= 0) return opt;
          return {
            ...opt,
            weight: Math.round((opt.weight / sum) * 1000) / 10,
          };
        }),
      };
    });
  };

  const removeOption = (id: string) => {
    setForm((prev) => ({
      ...prev,
      options: prev.options.filter((opt) => opt.id !== id),
    }));
  };

  const addOption = () => {
    setForm((prev) => ({
      ...prev,
      options: [...prev.options, createEmptySpinWheelOption(prev.options.length)],
    }));
  };

  const handleSave = async () => {
    if (form.options.length < 2) {
      showToast('error', 'خيارات غير كافية', 'أضف خيارين على الأقل لعجلة الحظ.');
      return;
    }
    const enabled = form.options.filter((o) => o.enabled && o.weight > 0);
    if (enabled.length < 2) {
      showToast(
        'error',
        'نسب غير صالحة',
        'فعّل خيارين على الأقل بنسبة أكبر من 0%. يمكنك وضع 0% لخيار معيّن لاستبعاده من السحب.',
      );
      return;
    }
    setSaving(true);
    try {
      const withUploadedImages = await persistSpinWheelImages(form);
      const payload = buildSpinWheelPayload(withUploadedImages);
      await updateAdminSettings({ spinWheel: payload });
      setForm({
        ...payload,
        options: payload.options.map((o) => ({ ...o })),
      });
      showToast('success', 'تم الحفظ', 'تم تحديث إعدادات عجلة الحظ.');
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      let detail = 'تعذر حفظ إعدادات العجلة. حاول مرة أخرى.';
      try {
        const parsed = JSON.parse(raw) as { error?: string };
        if (parsed?.error?.includes('undefined')) {
          detail = 'بيانات العجلة تحتوي حقولاً غير صالحة. حدّث الصفحة وحاول مجدداً.';
        } else if (parsed?.error?.includes('Permission') || parsed?.error?.includes('permission')) {
          detail = 'ليس لديك صلاحية حفظ إعدادات عجلة الحظ.';
        } else if (parsed?.error?.includes('Storage') || parsed?.error?.includes('storage')) {
          detail = 'فشل رفع الصور. تحقق من صلاحيات التخزين ثم أعد المحاولة.';
        } else if (parsed?.error) {
          detail = parsed.error.slice(0, 180);
        }
      } catch {
        if (raw.includes('Permission')) detail = 'ليس لديك صلاحية حفظ إعدادات عجلة الحظ.';
        else if (raw.includes('Storage') || raw.includes('storage')) {
          detail = 'فشل رفع الصور. تحقق من صلاحيات التخزين ثم أعد المحاولة.';
        }
      }
      showToast('error', 'فشل الحفظ', detail);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!window.confirm('إعادة إعدادات عجلة الحظ للقيم الافتراضية؟')) return;
    setForm({
      ...DEFAULT_SPIN_WHEEL_SETTINGS,
      options: DEFAULT_SPIN_WHEEL_SETTINGS.options.map((o) => ({ ...o })),
    });
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#f5eeff] text-[#9952FF] rounded-xl">
            <SpinWheelIcon size={20} />
          </div>
          <div>
            <h4 className="font-black text-slate-800 text-base">عجلة الحظ — تطبيق الزبون</h4>
            <p className="text-xs text-slate-500 font-medium">
              التحكم الكامل بالخيارات ونسب الفوز وصور العجلة
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
            {saving ? 'جاري الحفظ...' : 'حفظ العجلة'}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
        <div>
          <p className="text-sm font-black text-slate-800">تفعيل عجلة الحظ للزبائن</p>
          <p className="text-[11px] text-slate-500 font-bold">عند الإيقاف تختفي من صفحة حسابي</p>
        </div>
        <button
          type="button"
          onClick={() => patch({ enabled: !form.enabled })}
          className={`relative h-7 w-12 rounded-full transition-colors ${form.enabled ? 'bg-[#9952FF]' : 'bg-slate-300'}`}
          aria-pressed={form.enabled}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              form.enabled ? 'right-0.5' : 'right-5'
            }`}
          />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-black text-slate-500 mb-1.5 block">عنوان الصفحة</label>
          <input className={inputClass} value={form.title} onChange={(e) => patch({ title: e.target.value })} />
        </div>
        <div>
          <label className="text-[11px] font-black text-slate-500 mb-1.5 block">نص زر التدوير</label>
          <input
            className={inputClass}
            value={form.spinButtonLabel}
            onChange={(e) => patch({ spinButtonLabel: e.target.value })}
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-[11px] font-black text-slate-500 mb-1.5 block">الوصف</label>
          <input
            className={inputClass}
            value={form.subtitle}
            onChange={(e) => patch({ subtitle: e.target.value })}
          />
        </div>
        <div>
          <label className="text-[11px] font-black text-slate-500 mb-1.5 block">تكلفة التدوير (نقاط)</label>
          <input
            type="number"
            min={0}
            className={inputClass}
            value={form.costPoints}
            onChange={(e) => patch({ costPoints: Number(e.target.value) || 0 })}
          />
          <p className="text-[10px] text-slate-400 font-bold mt-1">0 = مجاني</p>
        </div>
        <div>
          <label className="text-[11px] font-black text-slate-500 mb-1.5 block">حد المحاولات لكل فترة</label>
          <input
            type="number"
            min={0}
            className={inputClass}
            value={form.dailyLimit}
            onChange={(e) => patch({ dailyLimit: Number(e.target.value) || 0 })}
          />
          <p className="text-[10px] text-slate-400 font-bold mt-1">0 = بدون حد</p>
        </div>
        <div>
          <label className="text-[11px] font-black text-slate-500 mb-1.5 block">
            مدة إعادة المحاولات (ساعات)
          </label>
          <input
            type="number"
            min={1}
            max={168}
            className={inputClass}
            value={form.resetPeriodHours}
            onChange={(e) =>
              patch({ resetPeriodHours: Math.max(1, Math.min(168, Number(e.target.value) || 24)) })
            }
          />
          <p className="text-[10px] text-slate-400 font-bold mt-1">
            بعد نفاد المحاولات يظهر عدّاد للزبون — الافتراضي 24 ساعة
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 space-y-2 max-w-sm">
        <ImageUploader
          value={form.centerImageUrl || ''}
          onChange={(url) => patch({ centerImageUrl: url || undefined })}
          label="صورة وسط العجلة"
          placeholder="أضف صورة للمركز (اختياري)"
          aspectRatio="square"
          maxSizeMB={5}
          showUrlOption={true}
        />
        <p className="text-[10px] text-slate-400 font-bold">
          تظهر في دائرة الوسط بدل أيقونة النرد الافتراضية. اتركها فارغة للإبقاء على النرد.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h5 className="text-sm font-black text-slate-800">خيارات العجلة ونسب الفرصة</h5>
          <p className="text-[11px] text-slate-500 font-bold">
            اكتب نسبة الفرصة لكل خيار (مثال: 40 = فرصة 40%، و 0 = مستبعد من السحب). مجموع النسب:{' '}
            <span className={Math.abs(totalChancePercent - 100) < 0.2 ? 'text-emerald-600' : 'text-amber-600'}>
              {totalChancePercent}%
            </span>
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={normalizeChancesTo100}
            disabled={totalChance <= 0}
            className="px-3 py-2 text-xs font-black text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50"
            title="ضبط النسب لتساوي 100% مع الحفاظ على نسبها النسبية"
          >
            تطبيع إلى 100%
          </button>
          <button
            type="button"
            onClick={addOption}
            className="px-3 py-2 text-xs font-black text-[#9952FF] bg-[#f5eeff] border border-[#e9daff] rounded-xl hover:bg-[#efe4ff] flex items-center gap-1.5"
          >
            <Plus size={14} />
            إضافة خيار
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {form.options.map((opt, index) => {
          const chance = getSpinWheelChancePercent(opt, form.options);
          return (
            <div
              key={opt.id}
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-4 h-4 rounded-full border border-white shadow shrink-0"
                    style={{ backgroundColor: opt.color }}
                  />
                  <span className="text-xs font-black text-slate-700 truncate">خيار {index + 1}</span>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 border ${
                      !opt.enabled || opt.weight <= 0
                        ? 'text-slate-500 bg-slate-100 border-slate-200'
                        : 'text-[#9952FF] bg-[#f5eeff] border-[#e9daff]'
                    }`}
                  >
                    {!opt.enabled
                      ? 'متوقف'
                      : opt.weight <= 0
                        ? 'فرصة 0% — مستبعد'
                        : `فرصة فعلية ${chance}%`}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <label className="text-[10px] font-black text-slate-500 flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={opt.enabled}
                      onChange={(e) => updateOption(opt.id, { enabled: e.target.checked })}
                    />
                    مفعّل
                  </label>
                  <button
                    type="button"
                    onClick={() => removeOption(opt.id)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                    title="حذف"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="lg:col-span-2">
                  <label className="text-[10px] font-black text-slate-500 mb-1 block">النص على العجلة</label>
                  <input
                    className={inputClass}
                    value={opt.label}
                    onChange={(e) => updateOption(opt.id, { label: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 mb-1 block">نسبة الفرصة %</label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="any"
                      className={`${inputClass} pl-8 font-black text-[#9952FF]`}
                      value={opt.weight}
                      onChange={(e) => setOptionChancePercent(opt.id, e.target.value)}
                    />
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                      %
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold mt-1">
                    يقبل 0% — الخيار يبقى في القائمة ولن يُختار عند التدوير
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 mb-1 block">لون الشريحة</label>
                  <input
                    type="color"
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white cursor-pointer"
                    value={opt.color}
                    onChange={(e) => updateOption(opt.id, { color: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 mb-1 block">نوع الجائزة</label>
                  <select
                    className={inputClass}
                    value={opt.prizeType}
                    onChange={(e) =>
                      updateOption(opt.id, { prizeType: e.target.value as SpinWheelPrizeType })
                    }
                  >
                    {(Object.keys(PRIZE_LABELS) as SpinWheelPrizeType[]).map((key) => (
                      <option key={key} value={key}>
                        {PRIZE_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="max-w-[160px]">
                <ImageUploader
                  value={opt.imageUrl || ''}
                  onChange={(url) => updateOption(opt.id, { imageUrl: url || undefined })}
                  label="صورة الخيار"
                  placeholder="صورة على الشريحة"
                  aspectRatio="square"
                  maxSizeMB={5}
                  showUrlOption={true}
                />
              </div>

              {opt.prizeType === 'points' && (
                <div className="max-w-xs">
                  <label className="text-[10px] font-black text-slate-500 mb-1 block">عدد النقاط</label>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={opt.points ?? 0}
                    onChange={(e) => updateOption(opt.id, { points: Number(e.target.value) || 0 })}
                  />
                </div>
              )}

              {opt.prizeType === 'external' && (
                <div>
                  <label className="text-[10px] font-black text-slate-500 mb-1 block">
                    تفاصيل الجائزة الخارجية وطريقة الاستلام
                  </label>
                  <textarea
                    className={`${inputClass} min-h-[88px] resize-y`}
                    placeholder="مثال: هدية عينية — تواصل مع الدعم عبر واتساب خلال 48 ساعة لاستلامها"
                    value={opt.externalDetails ?? ''}
                    onChange={(e) => updateOption(opt.id, { externalDetails: e.target.value })}
                  />
                  <p className="text-[9px] text-slate-400 font-bold mt-1">
                    يظهر هذا النص للزبون عند الفوز بالجائزة الخارجية
                  </p>
                </div>
              )}

              {(opt.prizeType === 'promo_amount' || opt.prizeType === 'promo_percent') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 mb-1 block">
                      {opt.prizeType === 'promo_percent' ? 'نسبة الخصم %' : 'قيمة الخصم (د.ع)'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      className={inputClass}
                      value={opt.discountValue ?? 0}
                      onChange={(e) =>
                        updateOption(opt.id, { discountValue: Number(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 mb-1 block">
                      صلاحية الكود (أيام)
                    </label>
                    <input
                      type="number"
                      min={0}
                      className={inputClass}
                      value={opt.promoValidityDays ?? 0}
                      onChange={(e) =>
                        updateOption(opt.id, { promoValidityDays: Number(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
