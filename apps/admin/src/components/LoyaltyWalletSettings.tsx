import React, { useEffect, useMemo, useState } from 'react';
import { Award, Gift, Plus, RotateCcw, Save, Trash2, Wallet } from 'lucide-react';
import {
  DEFAULT_LOYALTY_SETTINGS,
  createLoyaltyEarnRuleId,
  createLoyaltyRedemptionId,
  formatTierResetNoteAr,
  resolveLoyaltySettings,
  type LoyaltyEarnRule,
  type LoyaltyRedemptionPackage,
  type LoyaltySettings,
} from '@shared/constants/loyaltySettings';
import { showToast } from '../utils/alerts';

type Props = {
  adminSettings: Record<string, unknown>;
  updateAdminSettings: (data: Partial<Record<string, unknown>>) => Promise<void>;
};

const inputClass =
  'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-mahalak-purple/20 focus:border-mahalak-purple outline-none';
const smallInputClass =
  'w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-bold outline-none focus:border-mahalak-purple';

function cloneSettings(adminSettings: Record<string, unknown>): LoyaltySettings {
  return JSON.parse(JSON.stringify(resolveLoyaltySettings(adminSettings)));
}

export const LoyaltyWalletSettings: React.FC<Props> = ({ adminSettings, updateAdminSettings }) => {
  const [form, setForm] = useState<LoyaltySettings>(() => cloneSettings(adminSettings));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(cloneSettings(adminSettings));
  }, [adminSettings]);

  const preview = useMemo(() => resolveLoyaltySettings({ loyaltyWallet: form }), [form]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAdminSettings({ loyaltyWallet: buildPayload(form) });
      showToast('success', 'تم الحفظ', 'تُطبَّق التغييرات فوراً على تطبيق الزبون.');
    } catch {
      showToast('error', 'فشل الحفظ', 'تعذر حفظ إعدادات المحفظة.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!window.confirm('إعادة جميع إعدادات المحفظة للقيم الافتراضية؟')) return;
    setForm(JSON.parse(JSON.stringify(DEFAULT_LOYALTY_SETTINGS)));
  };

  const updateText = (key: keyof LoyaltySettings['texts'], value: string) => {
    setForm((prev) => ({ ...prev, texts: { ...prev.texts, [key]: value } }));
  };

  const updateTier = (key: string, patch: Partial<LoyaltySettings['tiers'][number]>) => {
    setForm((prev) => ({
      ...prev,
      tiers: prev.tiers.map((t) => (t.key === key ? { ...t, ...patch } : t)),
    }));
  };

  const updateResetPeriod = (months: number) => {
    const period = Math.max(1, months);
    setForm((prev) => ({
      ...prev,
      tierResetPeriodMonths: period,
      texts: { ...prev.texts, tierUpgradeNote: formatTierResetNoteAr(period) },
    }));
  };

  const buildPayload = (settings: LoyaltySettings): LoyaltySettings => {
    const byKey = Object.fromEntries(settings.tiers.map((t) => [t.key, t.upgradeBonusPoints])) as Record<
      string,
      number
    >;
    return {
      ...settings,
      tierUpgradeBonuses: {
        silverToGold: byKey.Gold ?? 0,
        goldToPlatinum: byKey.Platinum ?? 0,
        platinumToDiamond: byKey.Diamond ?? 0,
      },
      texts: {
        ...settings.texts,
        tierUpgradeNote: formatTierResetNoteAr(settings.tierResetPeriodMonths),
      },
    };
  };

  const updatePackage = (id: string, patch: Partial<LoyaltyRedemptionPackage>) => {
    setForm((prev) => ({
      ...prev,
      redemptionPackages: prev.redemptionPackages.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  };

  const updateEarnRule = (id: string, patch: Partial<LoyaltyEarnRule>) => {
    setForm((prev) => ({
      ...prev,
      earnRules: prev.earnRules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  };

  const addRedemptionPackage = () => {
    setForm((prev) => ({
      ...prev,
      redemptionPackages: [
        ...prev.redemptionPackages,
        {
          id: createLoyaltyRedemptionId(),
          points: 200,
          discountIqd: 7500,
          title: 'مكافأة جديدة',
          enabled: true,
        },
      ],
    }));
  };

  const addEarnRule = () => {
    setForm((prev) => ({
      ...prev,
      earnRules: [
        ...prev.earnRules,
        {
          id: createLoyaltyEarnRuleId(),
          type: 'custom',
          titleAr: 'مكافأة مخصصة',
          descriptionAr: 'وصف المكافأة للزبون.',
          emoji: '✨',
          points: 10,
          enabled: true,
        },
      ],
    }));
  };

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="bg-gradient-to-l from-mahalak-purple to-mahalak-navy px-5 py-4 flex flex-wrap items-center justify-between gap-3 text-white">
        <div className="flex items-center gap-2">
          <Wallet size={20} />
          <div>
            <h3 className="font-black text-sm">محفظة النقاط والولاء — تطبيق الزبون</h3>
            <p className="text-[10px] text-white/75 font-bold">النصوص، المستويات، المكافآت، وعدد النقاط</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={handleReset} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-[10px] font-black flex items-center gap-1">
            <RotateCcw size={12} /> افتراضي
          </button>
          <button type="button" onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl bg-white text-mahalak-purple text-[10px] font-black flex items-center gap-1 disabled:opacity-60">
            <Save size={12} /> {saving ? 'جاري الحفظ...' : 'حفظ وتطبيق'}
          </button>
        </div>
      </div>

      <div className="p-5 space-y-8 text-right max-h-none overflow-visible">
        {/* أرقام أساسية */}
        <div>
          <h4 className="text-xs font-black text-slate-800 mb-3 flex items-center gap-2">
            <Award size={14} className="text-amber-500" /> إعدادات النقاط الأساسية
          </h4>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { key: 'pointsPer1000Iqd', label: 'نقطة لكل 1000 د.ع (طلب مكتمل)' },
              { key: 'signupBonusPoints', label: 'مكافأة التسجيل' },
              { key: 'shareRewardPoints', label: 'مكافأة مشاركة التطبيق' },
              { key: 'shareDailyLimit', label: 'حد المشاركة اليومي' },
              { key: 'storeReviewRewardPoints', label: 'مكافأة تقييم المتجر' },
              { key: 'productReviewRewardPoints', label: 'مكافأة تقييم المنتج' },
              { key: 'redemptionBasePoints', label: 'نقاط أساس الاستبدال' },
              { key: 'redemptionBaseDiscountIqd', label: 'خصم أساس الاستبدال (د.ع)' },
            ].map(({ key, label }) => (
              <label key={key} className="block">
                <span className="text-[10px] font-bold text-slate-500 mb-1 block">{label}</span>
                <input
                  type="number"
                  className={smallInputClass}
                  value={form[key as keyof LoyaltySettings] as number}
                  onChange={(e) => setForm((prev) => ({ ...prev, [key]: Number(e.target.value) || 0 }))}
                />
              </label>
            ))}
          </div>
        </div>

        {/* المستويات */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h4 className="text-xs font-black text-slate-800">مستويات الولاء ومكافآت الترقية</h4>
            <label className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
              <span>تصفير المستوى كل</span>
              <select
                className={`${smallInputClass} w-auto min-w-[120px]`}
                value={form.tierResetPeriodMonths}
                onChange={(e) => updateResetPeriod(Number(e.target.value) || 1)}
              >
                <option value={1}>شهر</option>
                <option value={2}>شهرين</option>
                <option value={3}>3 أشهر</option>
                <option value={6}>6 أشهر</option>
                <option value={12}>سنة</option>
              </select>
            </label>
          </div>
          <p className="text-[9px] font-bold text-slate-400 mb-2">{form.texts.tierUpgradeNote}</p>
          <div className="hidden sm:grid grid-cols-5 gap-2 px-3 pb-1 text-[9px] font-black text-slate-400">
            <span>الاسم</span>
            <span>أيقونة</span>
            <span>طلبات مطلوبة</span>
            <span>نقاط الترقية</span>
            <span className="text-center">المفتاح</span>
          </div>
          <div className="space-y-2">
            {form.tiers.map((tier) => (
              <div key={tier.key} className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                <input className={smallInputClass} value={tier.labelAr} onChange={(e) => updateTier(tier.key, { labelAr: e.target.value })} placeholder="الاسم" />
                <input className={smallInputClass} value={tier.shortIcon} onChange={(e) => updateTier(tier.key, { shortIcon: e.target.value })} placeholder="أيقونة" />
                <input type="number" className={smallInputClass} value={tier.ordersRequired} onChange={(e) => updateTier(tier.key, { ordersRequired: Number(e.target.value) || 0 })} placeholder="طلبات" />
                <input
                  type="number"
                  className={smallInputClass}
                  value={tier.upgradeBonusPoints}
                  onChange={(e) => updateTier(tier.key, { upgradeBonusPoints: Number(e.target.value) || 0 })}
                  placeholder="نقاط"
                  disabled={tier.key === 'Silver'}
                  title={tier.key === 'Silver' ? 'لا مكافأة للمستوى الفضي' : undefined}
                />
                <span className="text-[10px] font-black text-slate-400 text-center col-span-2 sm:col-span-1">{tier.key}</span>
              </div>
            ))}
          </div>
        </div>

        {/* متجر المكافآت */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-2">
              <Gift size={14} className="text-violet-500" /> كوبونات الاستبدال
            </h4>
            <button type="button" onClick={addRedemptionPackage} className="text-[10px] font-black text-mahalak-purple flex items-center gap-1">
              <Plus size={12} /> إضافة كوبون
            </button>
          </div>
          <div className="space-y-2">
            {form.redemptionPackages.map((pkg) => (
              <div key={pkg.id} className="grid sm:grid-cols-5 gap-2 items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                <input className={`${smallInputClass} sm:col-span-2`} value={pkg.title} onChange={(e) => updatePackage(pkg.id, { title: e.target.value })} placeholder="العنوان" />
                <input type="number" className={smallInputClass} value={pkg.points} onChange={(e) => updatePackage(pkg.id, { points: Number(e.target.value) || 0 })} placeholder="نقاط" />
                <input type="number" className={smallInputClass} value={pkg.discountIqd} onChange={(e) => updatePackage(pkg.id, { discountIqd: Number(e.target.value) || 0 })} placeholder="خصم د.ع" />
                <div className="flex items-center justify-end gap-2">
                  <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600">
                    <input type="checkbox" checked={pkg.enabled} onChange={(e) => updatePackage(pkg.id, { enabled: e.target.checked })} />
                    مفعّل
                  </label>
                  <button type="button" onClick={() => setForm((prev) => ({ ...prev, redemptionPackages: prev.redemptionPackages.filter((p) => p.id !== pkg.id) }))} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* طرق كسب النقاط */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-black text-slate-800">طرق كسب النقاط (بما فيها مخصصة)</h4>
            <button type="button" onClick={addEarnRule} className="text-[10px] font-black text-mahalak-purple flex items-center gap-1">
              <Plus size={12} /> مكافأة جديدة
            </button>
          </div>
          <div className="space-y-3">
            {form.earnRules.map((rule) => (
              <div key={rule.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input className="w-12 text-center border rounded-lg py-1 text-sm" value={rule.emoji} onChange={(e) => updateEarnRule(rule.id, { emoji: e.target.value })} />
                    <select className={smallInputClass} value={rule.type} onChange={(e) => updateEarnRule(rule.id, { type: e.target.value as LoyaltyEarnRule['type'] })}>
                      <option value="order_completed">طلب مكتمل</option>
                      <option value="tier_upgrade">ترقية مستوى</option>
                      <option value="share_app">مشاركة التطبيق</option>
                      <option value="store_review">تقييم متجر</option>
                      <option value="product_review">تقييم منتج</option>
                      <option value="signup">تسجيل</option>
                      <option value="custom">مخصصة</option>
                    </select>
                    <label className="flex items-center gap-1 text-[10px] font-bold">
                      <input type="checkbox" checked={rule.enabled} onChange={(e) => updateEarnRule(rule.id, { enabled: e.target.checked })} />
                      مفعّلة
                    </label>
                  </div>
                  {rule.type === 'custom' && (
                    <button type="button" onClick={() => setForm((prev) => ({ ...prev, earnRules: prev.earnRules.filter((r) => r.id !== rule.id) }))} className="text-rose-500 p-1">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <input className={inputClass} value={rule.titleAr} onChange={(e) => updateEarnRule(rule.id, { titleAr: e.target.value })} placeholder="العنوان" />
                <textarea className={`${inputClass} min-h-[60px]`} value={rule.descriptionAr} onChange={(e) => updateEarnRule(rule.id, { descriptionAr: e.target.value })} placeholder="الوصف" />
                <div className="grid grid-cols-3 gap-2">
                  {rule.type !== 'tier_upgrade' && (
                    <input type="number" className={smallInputClass} value={rule.points} onChange={(e) => updateEarnRule(rule.id, { points: Number(e.target.value) || 0 })} placeholder="نقاط" />
                  )}
                  {rule.type === 'tier_upgrade' && (
                    <p className="col-span-3 text-[9px] font-bold text-slate-500 bg-white border border-slate-100 rounded-lg px-2.5 py-2">
                      نقاط الترقية تُحدَّد لكل مستوى في قسم «مستويات الولاء» أعلاه.
                    </p>
                  )}
                  {rule.type === 'order_completed' && (
                    <input type="number" className={smallInputClass} value={rule.pointsPer1000Iqd ?? form.pointsPer1000Iqd} onChange={(e) => updateEarnRule(rule.id, { pointsPer1000Iqd: Number(e.target.value) || 0 })} placeholder="لكل 1000 د.ع" />
                  )}
                  {rule.type === 'share_app' && (
                    <input type="number" className={smallInputClass} value={rule.dailyLimit ?? form.shareDailyLimit} onChange={(e) => updateEarnRule(rule.id, { dailyLimit: Number(e.target.value) || 0 })} placeholder="حد يومي" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* النصوص */}
        <div>
          <h4 className="text-xs font-black text-slate-800 mb-3">نصوص صفحة المحفظة</h4>
          <div className="grid sm:grid-cols-2 gap-3">
            {(Object.keys(form.texts) as Array<keyof LoyaltySettings['texts']>).map((key) => (
              <label key={key} className="block">
                <span className="text-[9px] font-bold text-slate-400 mb-1 block">{key}</span>
                <input className={smallInputClass} value={form.texts[key]} onChange={(e) => updateText(key, e.target.value)} />
              </label>
            ))}
          </div>
        </div>

        <div className="bg-mahalak-purple/5 border border-mahalak-purple/15 rounded-2xl p-4 text-[10px] font-bold text-slate-600">
          معاينة: {preview.texts.pageTitle} — {preview.redemptionPackages.filter((p) => p.enabled).length} كوبون — {preview.earnRules.filter((r) => r.enabled).length} طريقة كسب
        </div>
      </div>
    </section>
  );
};
