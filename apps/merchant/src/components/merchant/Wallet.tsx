import React, { memo, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PayoutRequest, Store } from '@shared/types';
import {
  Wallet as WalletIcon,
  ArrowUpRight,
  Clock,
  CheckCircle,
  X,
  Check,
  AlertCircle,
  Info,
} from 'lucide-react';
import { showToast } from '@shared/utils/alerts';
import { formatSafeDateTimeString } from '@shared/utils/date';

const MIN_WITHDRAW_IQD = 5000;

function extractErrorMessage(err: unknown, fallback: string, insufficientKey: string): string {
  if (!(err instanceof Error)) return fallback;
  try {
    const parsed = JSON.parse(err.message) as { error?: string };
    if (parsed.error?.includes('رصيد')) return parsed.error;
    if (parsed.error) return parsed.error;
  } catch {
    if (err.message.includes('رصيد') || err.message.includes('Insufficient')) {
      return insufficientKey;
    }
  }
  return fallback;
}

interface WalletProps {
  currentMerchant: Store;
  payoutRequests: PayoutRequest[];
  requestPayout: (
    amount: number,
    methodUsed: 'zain_cash' | 'mastercard',
    methodDetails: string,
  ) => Promise<void>;
  updateStoreProfile: (data: Partial<Store>) => Promise<void>;
}

const WalletInner: React.FC<WalletProps> = ({
  currentMerchant,
  payoutRequests,
  requestPayout,
  updateStoreProfile,
}) => {
  const { t } = useTranslation();

  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingMethods, setIsSavingMethods] = useState(false);
  const [zainCashNumber, setZainCashNumber] = useState('');
  const [mastercardNumber, setMastercardNumber] = useState('');

  useEffect(() => {
    setZainCashNumber(currentMerchant.payoutMethods?.zainCashNumber || '');
    setMastercardNumber(currentMerchant.payoutMethods?.mastercardNumber || '');
  }, [
    currentMerchant.id,
    currentMerchant.payoutMethods?.zainCashNumber,
    currentMerchant.payoutMethods?.mastercardNumber,
  ]);

  const balance = currentMerchant.walletBalance ?? 0;

  const myRequests = useMemo(
    () =>
      payoutRequests
        .filter((r) => r.merchantId === currentMerchant.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [payoutRequests, currentMerchant.id],
  );

  const pendingTotal = useMemo(
    () =>
      myRequests
        .filter((r) => r.status === 'pending')
        .reduce((sum, r) => sum + (r.requestedAmount || 0), 0),
    [myRequests],
  );

  const hasPendingRequest = pendingTotal > 0;
  const availableBalance = Math.max(0, balance - pendingTotal);

  const hasPayoutMethod = Boolean(
    zainCashNumber.trim() || mastercardNumber.trim()
    || currentMerchant.payoutMethods?.zainCashNumber
    || currentMerchant.payoutMethods?.mastercardNumber,
  );

  const preferredMethod = currentMerchant.payoutMethods?.zainCashNumber
    ? 'zain_cash' as const
    : 'mastercard' as const;
  const preferredDetails =
    currentMerchant.payoutMethods?.zainCashNumber
    || currentMerchant.payoutMethods?.mastercardNumber
    || '';

  const handleSavePayoutMethods = async () => {
    const zain = zainCashNumber.trim().replace(/\s/g, '');
    const master = mastercardNumber.trim().replace(/\s/g, '');

    if (!zain && !master) {
      showToast('warning', t('merchantWallet.toast.payoutMethodsTitle'), t('merchantWallet.toast.addMethod'));
      return;
    }
    if (zain) {
      const cleaned = zain.replace(/\D/g, '');
      if (!/^0(77|78|79|75)\d{8}$/.test(cleaned)) {
        showToast('error', t('merchantWallet.toast.zainCashTitle'), t('merchantWallet.toast.zainCashInvalid'));
        return;
      }
    }

    setIsSavingMethods(true);
    try {
      await updateStoreProfile({
        payoutMethods: {
          zainCashNumber: zain,
          mastercardNumber: master,
        },
      });
      showToast('success', t('merchantWallet.toast.saveSuccessTitle'), t('merchantWallet.toast.saveSuccess'));
    } catch (e) {
      showToast('error', t('merchantWallet.toast.saveFailedTitle'), extractErrorMessage(e, t('merchantWallet.toast.saveFailed'), t('merchantWallet.toast.insufficientBalance')));
    } finally {
      setIsSavingMethods(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseInt(withdrawAmount, 10);
    if (!amount || Number.isNaN(amount) || amount < MIN_WITHDRAW_IQD) {
      showToast('warning', t('merchantWallet.toast.minTitle'), t('merchantWallet.toast.minWithdraw', { amount: MIN_WITHDRAW_IQD.toLocaleString() }));
      return;
    }
    if (hasPendingRequest) {
      showToast('warning', t('merchantWallet.toast.pendingTitle'), t('merchantWallet.toast.pendingBody'));
      return;
    }
    if (amount > availableBalance) {
      showToast('error', t('merchantWallet.toast.insufficientTitle'), t('merchantWallet.toast.insufficientBody', { amount: availableBalance.toLocaleString() }));
      return;
    }
    if (!currentMerchant.payoutMethods?.zainCashNumber && !currentMerchant.payoutMethods?.mastercardNumber) {
      showToast('warning', t('merchantWallet.toast.payoutMethodsTitle'), t('merchantWallet.toast.needMethod'));
      return;
    }

    setIsSubmitting(true);
    try {
      await requestPayout(amount, preferredMethod, preferredDetails);
      showToast('success', t('merchantWallet.toast.sentTitle'), t('merchantWallet.toast.sentSuccess'));
      setShowWithdrawModal(false);
      setWithdrawAmount('');
    } catch (e) {
      showToast('error', t('merchantWallet.toast.requestFailedTitle'), extractErrorMessage(e, t('merchantWallet.toast.requestFailed'), t('merchantWallet.toast.insufficientBalance')));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="merchant-glass-page space-y-5 animate-fade-in" dir="rtl">
      {/* Balance Card */}
      <div className="welcome-card-glow welcome-card-border-glow welcome-card-shimmer bg-gradient-to-l from-vibrant-purple to-deep-navy rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-white/30">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-5 opacity-90">
            <WalletIcon size={22} className="text-[#fff700]" />
            <h2 className="text-lg font-bold text-[#fff700]">{t('merchantWallet.title')}</h2>
          </div>

          <div className="mb-6">
            <p className="text-sm mb-1 opacity-80">{t('merchantWallet.availableBalance')}</p>
            <h3 className="text-3xl sm:text-4xl font-black font-mono tracking-tight">
              {availableBalance.toLocaleString()}{' '}
              <span className="text-lg opacity-80 font-bold font-sans">{t('merchantWallet.currency')}</span>
            </h3>
            {pendingTotal > 0 && (
              <p className="text-[11px] mt-2 text-white/75 font-bold">
                {t('merchantWallet.pendingProcessing', { pending: pendingTotal.toLocaleString(), total: balance.toLocaleString() })}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowWithdrawModal(true)}
            disabled={availableBalance < MIN_WITHDRAW_IQD || hasPendingRequest}
            className="bg-white text-violet px-6 py-3 w-full rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowUpRight size={18} />
            <span>{t('merchantWallet.withdraw')}</span>
          </button>
          {hasPendingRequest && (
            <p className="text-[10px] text-amber-100 mt-2 font-bold text-center flex items-center justify-center gap-1">
              <Clock size={12} />
              {t('merchantWallet.pendingRequest')}
            </p>
          )}
          <p className="text-[#fff700]/75 text-[10px] mt-2 font-semibold text-center leading-relaxed">
            {t('merchantWallet.withdrawHint')}
          </p>
        </div>
      </div>

      {/* Withdrawal history */}
      <div className="welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-2xl p-5">
        <h3 className="text-base font-black text-[#fff700] mb-4">{t('merchantWallet.historyTitle')}</h3>

        {myRequests.length === 0 ? (
          <div className="text-center py-8 text-white font-bold text-sm">
            {t('merchantWallet.historyEmpty')}
          </div>
        ) : (
          <div className="space-y-3">
            {myRequests.map((req) => (
              <div
                key={req.id}
                className="flex justify-between items-center gap-3 p-4 border border-white/10 rounded-xl bg-white/5"
              >
                <div className="min-w-0">
                  <div className="font-black text-white text-base mb-1" dir="ltr">
                    {req.requestedAmount.toLocaleString()} {t('merchantWallet.currency')}
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold">
                    {formatSafeDateTimeString(req.createdAt, 'ar-IQ', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {req.payoutMethodUsed === 'zain_cash' ? t('merchantWallet.zainCash') : t('merchantWallet.mastercard')}
                    {' · '}
                    <span dir="ltr">{req.payoutMethodDetails}</span>
                  </div>
                </div>
                <div className="shrink-0">
                  {req.status === 'pending' ? (
                    <div className="flex items-center gap-1.5 text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-500/20">
                      <Clock size={14} />
                      <span>{t('merchantWallet.statusPending')}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-emerald-300 bg-emerald-500/10 px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-500/20">
                      <CheckCircle size={14} />
                      <span>{t('merchantWallet.statusComplete')}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payout methods */}
      <div className="welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-2xl p-5">
        <div className="mb-4">
          <h4 className="font-black text-[#fff700] text-sm">{t('merchantWallet.payoutMethodsTitle')}</h4>
          <p className="text-[10px] text-white font-bold mt-0.5">{t('merchantWallet.payoutMethodsHint')}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-white mb-1.5">{t('merchantWallet.zainCashLabel')}</label>
            <input
              type="tel"
              placeholder="07X XXXX XXXX"
              value={zainCashNumber}
              onChange={(e) => setZainCashNumber(e.target.value)}
              className="w-full bg-white/5 border border-white/75 text-white placeholder:text-slate-500 p-3 rounded-xl text-sm font-mono text-left focus:border-vibrant-purple outline-none transition"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-white mb-1.5">{t('merchantWallet.mastercardLabel')}</label>
            <input
              type="text"
              placeholder="XXXX XXXX XXXX XXXX"
              value={mastercardNumber}
              onChange={(e) => setMastercardNumber(e.target.value)}
              className="w-full bg-white/5 border border-white/75 text-white placeholder:text-slate-500 p-3 rounded-xl text-sm font-mono text-left focus:border-vibrant-purple outline-none transition"
              dir="ltr"
            />
            <p className="text-[10px] text-[#fff700] mt-1">{t('merchantWallet.mastercardHint')}</p>
          </div>
        </div>
        {!hasPayoutMethod && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-[#fff700]/20 text-[#fff700] text-xs font-bold flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{t('merchantWallet.addPayoutMethod')}</span>
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleSavePayoutMethods}
            disabled={isSavingMethods}
            className="px-6 py-2.5 bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white font-bold rounded-xl shadow-md text-xs flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-60"
          >
            <Check size={16} />
            <span>{isSavingMethods ? t('merchantWallet.saving') : t('merchantWallet.saveAccounts')}</span>
          </button>
        </div>
      </div>

      {/* How wallet balance works — في نهاية الصفحة */}
      <div className="welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-white/10 border border-white/20 text-[#fff700] rounded-xl shrink-0">
            <Info size={18} />
          </div>
          <div className="space-y-3 text-right min-w-0">
            <h3 className="text-sm font-black text-[#fff700]">{t('merchantWallet.whenCreditedTitle')}</h3>
            <p className="text-[11px] text-white leading-relaxed font-bold">
              {t('merchantWallet.whenCreditedIntro')}
            </p>
            <ul className="space-y-2 text-[11px] text-slate-300 font-bold">
              <li className="flex items-start gap-2">
                <CheckCircle size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-white">{t('merchantWallet.creditOnDelivery')}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-white">{t('merchantWallet.creditAmount')}</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle size={14} className="text-[#fff700] shrink-0 mt-0.5" />
                <span className="text-white">{t('merchantWallet.ownPromoNote')}</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle size={14} className="text-[#fff700] shrink-0 mt-0.5" />
                <span className="text-white">{t('merchantWallet.noCreditNote')}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Withdraw modal */}
      {showWithdrawModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => !isSubmitting && setShowWithdrawModal(false)}
        >
          <div
            className="merchant-glass-sheet welcome-card-glow welcome-card-border-glow rounded-3xl w-full max-w-md shadow-2xl overflow-hidden text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-white/10 flex justify-between items-center">
              <h3 className="font-black text-white text-lg">{t('merchantWallet.withdrawModalTitle')}</h3>
              <button
                type="button"
                onClick={() => !isSubmitting && setShowWithdrawModal(false)}
                className="text-slate-400 hover:text-white transition p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                <p className="text-[10px] text-slate-400 font-bold mb-1">{t('merchantWallet.availableLabel')}</p>
                <p className="text-xl font-black text-white font-mono">{availableBalance.toLocaleString()} {t('merchantWallet.currency')}</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">{t('merchantWallet.amountLabel')}</label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full bg-white/5 border border-white/15 focus:border-vibrant-purple text-white p-4 rounded-2xl text-lg font-mono outline-none transition text-left placeholder:text-slate-500"
                  placeholder={t('merchantWallet.amountPlaceholder')}
                  dir="ltr"
                  min={MIN_WITHDRAW_IQD}
                />
                <p className="text-xs text-slate-500 mt-2">
                  {t('merchantWallet.minWithdraw', { amount: MIN_WITHDRAW_IQD.toLocaleString() })}
                </p>
              </div>

              {!currentMerchant.payoutMethods?.zainCashNumber && !currentMerchant.payoutMethods?.mastercardNumber ? (
                <div className="p-3 bg-rose-500/10 text-rose-200 rounded-xl text-xs font-bold border border-rose-500/20">
                  {t('merchantWallet.needPayoutMethod')}
                </div>
              ) : (
                <div className="p-3 bg-white/5 text-slate-300 rounded-xl text-xs font-bold border border-white/10">
                  {t('merchantWallet.transferTo')}{' '}
                  <span className="text-violet-300 mr-1" dir="ltr">
                    {currentMerchant.payoutMethods?.zainCashNumber
                      ? t('merchantWallet.transferZainCash', { number: currentMerchant.payoutMethods.zainCashNumber })
                      : t('merchantWallet.transferMastercard', { number: currentMerchant.payoutMethods?.mastercardNumber ?? '' })}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={handleWithdraw}
                disabled={
                  isSubmitting
                  || !withdrawAmount
                  || parseInt(withdrawAmount, 10) < MIN_WITHDRAW_IQD
                  || (!currentMerchant.payoutMethods?.zainCashNumber && !currentMerchant.payoutMethods?.mastercardNumber)
                }
                className="w-full bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white p-4 rounded-xl font-bold transition disabled:opacity-50 shadow-md flex items-center justify-center gap-2"
              >
                {isSubmitting ? t('merchantWallet.submitting') : t('merchantWallet.confirmWithdraw')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const Wallet = memo(WalletInner);
