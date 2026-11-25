import React, { memo, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle,
  ChevronDown,
  Gift,
  Plus,
  Ticket,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import type { PromoCode } from '@shared/types';
import { CopyButton } from '@shared/components/CopyButton';
import { formatSafeDate } from '@shared/utils/date';
import {
  formatPromoDiscount,
  isPromoActive,
  normalizePromoCode,
} from '@shared/utils/promoCode';
import { showToast } from '@shared/utils/alerts';

type FilterTab = 'all' | 'active' | 'expired';

type TargetAudience = PromoCode['targetAudience'];

function audienceLabelKey(audience: NonNullable<TargetAudience>): string {
  switch (audience) {
    case 'FOLLOWERS':
      return 'merchant.promos.audienceFollowers';
    case 'PAST_BUYERS':
      return 'merchant.promos.audiencePastBuyers';
    case 'FOLLOWERS_AND_PAST_BUYERS':
      return 'merchant.promos.audienceFollowersAndBuyers';
    default:
      return 'merchant.promos.audienceAll';
  }
}

function getDaysRemaining(expiresAt?: string | null): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function isPromoExhausted(promo: PromoCode): boolean {
  const maxUses = promo.maxGlobalUses ?? promo.maxUses ?? 0;
  const used = promo.currentGlobalUses ?? promo.usedCount ?? 0;
  return maxUses > 0 && used >= maxUses;
}

function isPromoDateExpired(promo: PromoCode): boolean {
  const exp = promo.expiresAt || promo.expirationDate;
  return Boolean(exp && Date.now() > new Date(exp).getTime());
}

function promoIsExpired(promo: PromoCode): boolean {
  if (promo.status === 'expired' || promo.status === 'used') return true;
  if (isPromoDateExpired(promo)) return true;
  return isPromoExhausted(promo);
}

function generatePromoCodeSuggestion(): string {
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SAVE${suffix}`;
}

export type MerchantPromoCodesManagerProps = {
  storeId: string;
  promos: PromoCode[];
  allPromoCodes: PromoCode[];
  createPromoCode: (data: Record<string, unknown>) => Promise<void>;
  togglePromoCodeStatus: (id: string) => void;
  deletePromoCode: (id: string) => void;
  modalOpen?: boolean;
  onModalOpenChange?: (open: boolean) => void;
};

export const MerchantPromoCodesManager = memo(function MerchantPromoCodesManager({
  storeId,
  promos,
  allPromoCodes,
  createPromoCode,
  togglePromoCodeStatus,
  deletePromoCode,
  modalOpen: modalOpenProp,
  onModalOpenChange,
}: MerchantPromoCodesManagerProps) {
  const { t } = useTranslation();
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const modalOpen = modalOpenProp ?? internalModalOpen;

  const setModalOpen = (open: boolean) => {
    if (modalOpenProp === undefined) setInternalModalOpen(open);
    onModalOpenChange?.(open);
  };

  const [filter, setFilter] = useState<FilterTab>('all');
  const [pCode, setPCode] = useState('');
  const [pDiscountType, setPDiscountType] = useState<'percent' | 'amount'>('amount');
  const [pDiscount, setPDiscount] = useState(0);
  const [pMaxUses, setPMaxUses] = useState(10);
  const [pMaxUsesPerUser, setPMaxUsesPerUser] = useState(1);
  const [pTargetAudience, setPTargetAudience] = useState<NonNullable<TargetAudience>>('ALL');
  const [pExpiryType, setPExpiryType] = useState<'days' | 'date'>('days');
  const [pStartDate, setPStartDate] = useState('');
  const [pEndDate, setPEndDate] = useState('');
  const [pExpiryDays, setPExpiryDays] = useState(30);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setPCode('');
    setPDiscountType('amount');
    setPDiscount(0);
    setPMaxUses(10);
    setPMaxUsesPerUser(1);
    setPTargetAudience('ALL');
    setPExpiryType('days');
    setPStartDate('');
    setPEndDate('');
    setPExpiryDays(30);
    setFormError('');
  };

  useEffect(() => {
    if (!modalOpen) resetForm();
  }, [modalOpen]);

  const filteredPromos = useMemo(() => {
    return promos.filter((p) => {
      const expired = promoIsExpired(p);
      if (filter === 'active') return isPromoActive(p) && !expired;
      if (filter === 'expired') return expired || !isPromoActive(p);
      return true;
    });
  }, [promos, filter]);

  const stats = useMemo(() => {
    const active = promos.filter((p) => isPromoActive(p) && !promoIsExpired(p)).length;
    const totalUses = promos.reduce(
      (sum, p) => sum + (p.currentGlobalUses ?? p.usedCount ?? 0),
      0,
    );
    return { active, totalUses };
  }, [promos]);

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const normalizedCode = normalizePromoCode(pCode);
    if (normalizedCode.length < 3) {
      setFormError(t('merchant.promos.errorCodeMin'));
      return;
    }
    if (pDiscount < 1) {
      setFormError(t('merchant.promos.errorDiscountMin'));
      return;
    }
    if (pDiscountType === 'percent' && pDiscount > 99) {
      setFormError(t('merchant.promos.errorDiscountMax'));
      return;
    }
    if (pMaxUses < 1 || pMaxUsesPerUser < 1) {
      setFormError(t('merchant.promos.errorUsageMin'));
      return;
    }

    const duplicate = allPromoCodes.some(
      (p) => normalizePromoCode(p.code) === normalizedCode && p.storeId === storeId,
    );
    if (duplicate) {
      setFormError(t('merchant.promos.errorDuplicate'));
      return;
    }

    let finalEndDate: string | null = pEndDate || null;
    if (pExpiryType === 'days') {
      if (pExpiryDays < 1) {
        setFormError(t('merchant.promos.errorDaysMin'));
        return;
      }
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + pExpiryDays);
      finalEndDate = expDate.toISOString().split('T')[0];
    } else if (!finalEndDate) {
      setFormError(t('merchant.promos.errorEndDate'));
      return;
    }

    const finalStartDate = pStartDate || new Date().toISOString().split('T')[0];

    const data = {
      storeId,
      merchantId: storeId,
      code: normalizedCode,
      discountType: pDiscountType === 'amount' ? 'FIXED' : 'PERCENTAGE',
      discountValue: pDiscount,
      ...(pDiscountType === 'amount' ? { discountAmount: pDiscount } : {}),
      maxGlobalUses: pMaxUses,
      currentGlobalUses: 0,
      maxUses: pMaxUses,
      maxUsesPerUser: pMaxUsesPerUser,
      targetAudience: pTargetAudience,
      targetStores: [storeId],
      validityDays: pExpiryType === 'days' ? pExpiryDays : 0,
      startDate: finalStartDate,
      expiresAt: finalEndDate || null,
      expirationDate: finalEndDate || null,
      source: 'merchant',
      sponsor: 'MERCHANT',
    };

    setIsSubmitting(true);
    try {
      await createPromoCode(data);
      setModalOpen(false);
      showToast(
        'success',
        t('merchant.promos.createSuccessTitle'),
        t('merchant.promos.createSuccessBody', { code: String(data.code || '') }),
      );
    } catch {
      setFormError(t('merchant.promos.errorCreateFailed'));
      showToast('error', t('merchant.promos.errorCreateFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (promo: PromoCode) => {
    if (!window.confirm(t('merchant.promos.deleteConfirm', { code: promo.code }))) return;
    try {
      await deletePromoCode(promo.id);
      showToast(
        'success',
        t('merchant.promos.deleteSuccessTitle'),
        t('merchant.promos.deleteSuccessBody', { code: promo.code }),
      );
    } catch {
      showToast('error', t('merchant.promos.deleteFailedTitle'), t('merchant.promos.deleteFailedBody'));
    }
  };

  const filterTabs = useMemo(
    () =>
      ([
        { id: 'all', label: t('merchant.promos.filterAll') },
        { id: 'active', label: t('merchant.promos.filterActive') },
        { id: 'expired', label: t('merchant.promos.filterExpired') },
      ] as const),
    [t],
  );

  return (
    <>
      <div className="space-y-6">
        <div className="p-6 rounded-[2rem] shadow-sm border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 merchant-brand-card relative overflow-hidden group">
          <div className="absolute top-0 left-0 p-4 opacity-10 pointer-events-none">
            <Gift size={64} className="text-[#fff700]" />
          </div>
          <div className="relative z-10">
            <h2 className="text-lg font-black text-[#fff700] flex items-center gap-2">
              <Gift size={20} className="text-[#fff700]" />
              {t('merchant.promos.title')}
            </h2>
            <p className="text-xs text-white/70 mt-1">
              {t('merchant.promos.subtitle')}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="text-[10px] font-bold text-[#fff700] bg-white/10 border border-white/20 px-2.5 py-1 rounded-full">
                {t('merchant.promos.activeCount', { count: stats.active })}
              </span>
              <span className="text-[10px] font-bold text-white/70 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                {t('merchant.promos.totalUses', { count: stats.totalUses })}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="relative z-10 px-4 py-2.5 bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white font-bold rounded-xl shadow-md flex items-center gap-2 active:scale-95 transition-all"
          >
            <Plus size={18} />
            <span>{t('merchant.promos.createBtn')}</span>
          </button>
        </div>

        {promos.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition border ${
                  filter === tab.id
                    ? 'bg-gradient-to-r from-vibrant-purple to-deep-navy border-white text-white'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {filteredPromos.length === 0 ? (
          <div className="p-12 rounded-[2rem] border border-dashed border-white/20 text-center merchant-brand-card">
            <Gift size={48} className="mx-auto text-[#fff700] mb-4 opacity-80" />
            <p className="font-bold text-brand-white mb-1">
              {filter === 'all'
                ? t('merchant.promos.emptyAll')
                : filter === 'active'
                  ? t('merchant.promos.emptyActive')
                  : t('merchant.promos.emptyExpired')}
            </p>
            <p className="text-xs text-white/60">
              {t('merchant.promos.emptyHint')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPromos.map((p) => {
              const expired = promoIsExpired(p);
              const active = isPromoActive(p) && !expired;
              const maxUses = p.maxGlobalUses ?? p.maxUses ?? 0;
              const used = p.currentGlobalUses ?? p.usedCount ?? 0;
              const usagePct = maxUses > 0 ? Math.min(100, (used / maxUses) * 100) : 0;
              const daysLeft = getDaysRemaining(p.expiresAt || p.expirationDate);

              return (
                <div
                  key={p.id}
                  className="merchant-brand-card p-5 rounded-[2rem] border shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <div className="flex items-center gap-1 min-w-0">
                      <code className="report-stat-badge px-3 py-1.5 rounded-xl font-black tracking-wider truncate">
                        {p.code}
                      </code>
                      <CopyButton text={p.code} size={11} />
                    </div>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full shrink-0 ${
                        active
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                      }`}
                    >
                      {active ? t('merchant.promos.statusActive') : t('merchant.promos.statusExpired')}
                    </span>
                  </div>

                  <span className="text-lg font-black text-brand-white">{formatPromoDiscount(p)}</span>

                  {p.targetAudience && p.targetAudience !== 'ALL' && (
                    <p className="text-[10px] text-[#fff700]/80 mt-1 font-bold">
                      {t(audienceLabelKey(p.targetAudience))}
                    </p>
                  )}

                  <div className="mt-3 space-y-2">
                    <div className="flex justify-between text-xs text-white/60">
                      <p>{t('merchant.promos.usage', { used, max: maxUses || '∞' })}</p>
                      {p.maxUsesPerUser ? <p>{t('merchant.promos.perUserQuota', { count: p.maxUsesPerUser })}</p> : null}
                    </div>
                    {maxUses > 0 && (
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            usagePct >= 90 ? 'bg-rose-400' : 'bg-[#fff700]'
                          }`}
                          style={{ width: `${usagePct}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <p className="text-[10px] text-white/50 mt-2 merchant-panel-inset p-1.5 rounded-lg text-center border border-white/10">
                    {p.startDate ? `${formatSafeDate(p.startDate)} ${t('merchant.promos.dateRangeTo')} ` : ''}
                    {p.expiresAt || p.expirationDate
                      ? formatSafeDate(p.expiresAt || p.expirationDate!)
                      : t('merchant.promos.ongoing')}
                    {daysLeft !== null && active && (
                      <span className="block text-[#fff700] font-bold mt-0.5">
                        {daysLeft === 0 ? t('merchant.promos.expiresToday') : t('merchant.promos.daysRemaining', { count: daysLeft })}
                      </span>
                    )}
                  </p>

                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/10">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await togglePromoCodeStatus(p.id);
                          showToast(
                            'success',
                            active
                              ? t('merchant.promos.pauseSuccessTitle')
                              : t('merchant.promos.activateSuccessTitle'),
                            active
                              ? t('merchant.promos.pauseSuccessBody')
                              : t('merchant.promos.activateSuccessBody'),
                          );
                        } catch {
                          showToast(
                            'error',
                            t('merchant.promos.toggleFailedTitle'),
                            t('merchant.promos.toggleFailedBody'),
                          );
                        }
                      }}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl transition border ${
                        active
                          ? 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border-amber-400/30'
                          : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border-emerald-400/30'
                      }`}
                    >
                      {active ? t('merchant.promos.pause') : t('merchant.promos.activate')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p)}
                      className="p-1.5 text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/30 hover:text-white rounded-xl transition"
                      title={t('merchant.promos.deleteTitle')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {modalOpen && (
          <div
            className="fixed inset-0 bg-deep-navy/40 backdrop-blur-md z-[110] flex items-center justify-center p-4 overflow-y-auto"
            dir="rtl"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="merchant-glass-sheet welcome-card-glow welcome-card-border-glow rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl text-right max-h-[90vh] overflow-y-auto relative text-white no-scrollbar"
            >
              <div className="absolute top-1/2 -left-3 w-6 h-6 bg-[#0b1320] border border-white/20 rounded-full transform -translate-y-1/2 z-10 hidden sm:block" />
              <div className="absolute top-1/2 -right-3 w-6 h-6 bg-[#0b1320] border border-white/20 rounded-full transform -translate-y-1/2 z-10 hidden sm:block" />

              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/10 text-[#fff700] rounded-2xl flex items-center justify-center border border-white/20 shrink-0">
                    <Ticket size={24} className="transform -rotate-12" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-white leading-tight">{t('merchant.promos.modalTitle')}</h3>
                    <p className="text-[10px] font-medium text-white/55 mt-0.5">
                      {t('merchant.promos.modalSubtitle')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreatePromo} className="space-y-5">
                <div className="bg-slate-50/50 p-4 rounded-3xl border border-dashed border-slate-200">
                  <label className="block text-[11px] font-black text-slate-500 mb-2.5">
                    {t('merchant.promos.codeLabel')}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={pCode}
                      onChange={(e) => setPCode(e.target.value.toUpperCase())}
                      required
                      placeholder={t('merchant.promos.codePlaceholder')}
                      className="w-full bg-white border border-slate-200 hover:border-purple-200 focus:border-vibrant-purple focus:ring-4 focus:ring-purple-50 p-4 rounded-2xl font-mono text-center text-lg font-black uppercase tracking-widest text-violet transition-all"
                    />
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-300">
                      <Gift size={18} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 gap-2">
                    <p className="text-[9px] text-slate-400">
                      {t('merchant.promos.codeAutoUppercase')}
                    </p>
                    <button
                      type="button"
                      onClick={() => setPCode(generatePromoCodeSuggestion())}
                      className="text-[9px] font-black text-vibrant-purple hover:underline shrink-0"
                    >
                      {t('merchant.promos.suggestCode')}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 mb-1.5">{t('merchant.promos.discountType')}</label>
                    <div className="relative">
                      <select
                        value={pDiscountType}
                        onChange={(e) => setPDiscountType(e.target.value as 'percent' | 'amount')}
                        className="welcome-select welcome-select--sm welcome-select--with-chevron"
                      >
                        <option value="amount">{t('merchant.promos.discountFixed')}</option>
                        <option value="percent">{t('merchant.promos.discountPercent')}</option>
                      </select>
                      <ChevronDown size={14} className="welcome-select-chevron" aria-hidden />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 mb-1.5">{t('merchant.promos.value')}</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={pDiscount || ''}
                        onChange={(e) => setPDiscount(parseInt(e.target.value, 10) || 0)}
                        required
                        min={1}
                        max={pDiscountType === 'percent' ? 99 : undefined}
                        placeholder="0"
                        className="w-full bg-white border border-slate-200 hover:border-purple-200 focus:border-vibrant-purple focus:ring-4 focus:ring-purple-50 p-3.5 rounded-2xl text-center text-xs font-black text-slate-800 transition-all"
                      />
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-xs font-black text-slate-400 font-mono">
                        {pDiscountType === 'amount' ? 'IQD' : '%'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 mb-1.5">{t('merchant.promos.totalUsesLabel')}</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={pMaxUses || ''}
                        onChange={(e) => setPMaxUses(parseInt(e.target.value, 10) || 0)}
                        required
                        min={1}
                        className="w-full bg-white border border-slate-200 hover:border-purple-200 focus:border-vibrant-purple focus:ring-4 focus:ring-purple-50 p-3.5 rounded-2xl text-center text-xs font-black text-slate-800 transition-all"
                      />
                      <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-300">
                        <Users size={14} />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 mb-1.5">{t('merchant.promos.perCustomer')}</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={pMaxUsesPerUser || ''}
                        onChange={(e) => setPMaxUsesPerUser(parseInt(e.target.value, 10) || 0)}
                        required
                        min={1}
                        className="w-full bg-white border border-slate-200 hover:border-purple-200 focus:border-vibrant-purple focus:ring-4 focus:ring-purple-50 p-3.5 rounded-2xl text-center text-xs font-black text-slate-800 transition-all"
                      />
                      <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-300">
                        <User size={14} />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-500 mb-1.5">{t('merchant.promos.targetAudience')}</label>
                  <div className="welcome-select-wrap">
                    <select
                      value={pTargetAudience}
                      onChange={(e) => setPTargetAudience(e.target.value as NonNullable<TargetAudience>)}
                      className="welcome-select welcome-select--sm welcome-select--with-chevron"
                    >
                      <option value="ALL">{t('merchant.promos.audienceAll')}</option>
                      <option value="FOLLOWERS">{t('merchant.promos.audienceFollowers')}</option>
                      <option value="PAST_BUYERS">{t('merchant.promos.audiencePastBuyers')}</option>
                      <option value="FOLLOWERS_AND_PAST_BUYERS">{t('merchant.promos.audienceFollowersAndBuyers')}</option>
                    </select>
                    <ChevronDown size={14} className="welcome-select-chevron" aria-hidden />
                  </div>
                </div>

                <div className="bg-slate-50/50 p-4 rounded-3xl border border-slate-100 space-y-3">
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 mb-1.5">{t('merchant.promos.validityLabel')}</label>
                    <div className="relative">
                      <select
                        value={pExpiryType}
                        onChange={(e) => setPExpiryType(e.target.value as 'days' | 'date')}
                        className="welcome-select welcome-select--sm welcome-select--with-chevron"
                      >
                        <option value="days">{t('merchant.promos.validityDays')}</option>
                        <option value="date">{t('merchant.promos.validityDateRange')}</option>
                      </select>
                      <ChevronDown size={14} className="welcome-select-chevron" aria-hidden />
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    {pExpiryType === 'days' ? (
                      <motion.div
                        key="days"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="relative"
                      >
                        <input
                          type="number"
                          placeholder={t('merchant.promos.daysPlaceholder')}
                          value={pExpiryDays || ''}
                          onChange={(e) => setPExpiryDays(parseInt(e.target.value, 10) || 0)}
                          required
                          min={1}
                          className="w-full bg-white border border-slate-200 hover:border-purple-200 focus:border-vibrant-purple focus:ring-4 focus:ring-purple-50 p-3 rounded-2xl text-center text-xs font-black text-slate-800 transition-all"
                        />
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-xs font-bold text-slate-400 font-tajawal">
                          {t('merchant.promos.daysUnit')}
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="date"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="grid grid-cols-2 gap-3"
                      >
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 mb-1">
                            {t('merchant.promos.startDateOptional')}
                          </label>
                          <input
                            type="date"
                            value={pStartDate}
                            onChange={(e) => setPStartDate(e.target.value)}
                            className="w-full bg-white border border-slate-200 hover:border-purple-200 focus:border-vibrant-purple p-2.5 rounded-xl text-center text-xs font-bold text-slate-700 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 mb-1">{t('merchant.promos.endDate')}</label>
                          <input
                            type="date"
                            value={pEndDate}
                            onChange={(e) => setPEndDate(e.target.value)}
                            required
                            className="w-full bg-white border border-slate-200 hover:border-purple-200 focus:border-vibrant-purple p-2.5 rounded-xl text-center text-xs font-bold text-slate-700 transition-all"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {formError && (
                  <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 text-center">
                    {formError}
                  </p>
                )}

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    disabled={isSubmitting}
                    className="w-1/3 py-3.5 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-600 font-black rounded-2xl text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {t('merchant.promos.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-2/3 py-3.5 bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white active:scale-[0.98] text-white font-black rounded-2xl shadow-lg shadow-purple-100/50 text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    <CheckCircle size={15} />
                    <span>{isSubmitting ? t('merchant.promos.submitting') : t('merchant.promos.submit')}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
});
