import React, { memo, useEffect, useMemo, useState } from 'react';
import { Store } from '@shared/types';
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
import { useApp } from '@shared/context/useApp';
import { showToast } from '@shared/utils/alerts';
import { formatSafeDateTimeString } from '@shared/utils/date';

const MIN_WITHDRAW_IQD = 5000;

function extractErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;
  try {
    const parsed = JSON.parse(err.message) as { error?: string };
    if (parsed.error?.includes('رصيد')) return parsed.error;
    if (parsed.error) return parsed.error;
  } catch {
    if (err.message.includes('رصيد') || err.message.includes('Insufficient')) {
      return 'رصيدك غير كافٍ لإتمام عملية السحب.';
    }
  }
  return fallback;
}

const WalletInner: React.FC<{ currentMerchant: Store }> = ({ currentMerchant }) => {
  const { requestPayout, payoutRequests, updateStoreProfile } = useApp();

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
      showToast('warning', 'طرق الدفع', 'أضف رقم زين كاش أو بطاقة ماستركارد على الأقل.');
      return;
    }
    if (zain) {
      const cleaned = zain.replace(/\D/g, '');
      if (!/^0(77|78|79|75)\d{8}$/.test(cleaned)) {
        showToast('error', 'زين كاش', 'رقم الهاتف غير صحيح. يبدأ بـ 077/078/079/075 ويتكون من 11 رقم.');
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
      showToast('success', 'تم الحفظ', 'تم حفظ طرق استلام الأرباح بنجاح ✅');
    } catch (e) {
      showToast('error', 'فشل الحفظ', extractErrorMessage(e, 'تعذر حفظ طرق الدفع.'));
    } finally {
      setIsSavingMethods(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseInt(withdrawAmount, 10);
    if (!amount || Number.isNaN(amount) || amount < MIN_WITHDRAW_IQD) {
      showToast('warning', 'الحد الأدنى', `الحد الأدنى للسحب هو ${MIN_WITHDRAW_IQD.toLocaleString()} د.ع`);
      return;
    }
    if (hasPendingRequest) {
      showToast('warning', 'طلب قيد المعالجة', 'لديك طلب سحب قيد المعالجة. انتظر اكتماله قبل طلب جديد.');
      return;
    }
    if (amount > availableBalance) {
      showToast('error', 'رصيد غير كافٍ', `الرصيد المتاح للسحب: ${availableBalance.toLocaleString()} د.ع`);
      return;
    }
    if (!currentMerchant.payoutMethods?.zainCashNumber && !currentMerchant.payoutMethods?.mastercardNumber) {
      showToast('warning', 'طرق الدفع', 'يرجى حفظ طريقة دفع (زين كاش أو ماستركارد) أولاً.');
      return;
    }

    setIsSubmitting(true);
    try {
      await requestPayout(amount, preferredMethod, preferredDetails);
      showToast('success', 'تم الإرسال', 'تم إرسال طلب السحب بنجاح. ستصلك الأموال خلال 5 دقائق تقريباً.');
      setShowWithdrawModal(false);
      setWithdrawAmount('');
    } catch (e) {
      showToast('error', 'فشل الطلب', extractErrorMessage(e, 'حدث خطأ أثناء إرسال طلب السحب.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in" dir="rtl">
      {/* Balance Card */}
      <div className="bg-brand-horizontal rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border [border-image:linear-gradient(90deg,rgba(11,19,32,1)_0%,rgba(123,61,255,1)_100%)_1]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-5 opacity-90">
            <WalletIcon size={22} className="text-[#fff700]" />
            <h2 className="text-lg font-bold text-[#fff700]">المحفظة المالية</h2>
          </div>

          <div className="mb-6">
            <p className="text-sm mb-1 opacity-80">الرصيد القابل للسحب</p>
            <h3 className="text-3xl sm:text-4xl font-black font-mono tracking-tight">
              {availableBalance.toLocaleString()}{' '}
              <span className="text-lg opacity-80 font-bold font-sans">د.ع</span>
            </h3>
            {pendingTotal > 0 && (
              <p className="text-[11px] mt-2 text-white/75 font-bold">
                {pendingTotal.toLocaleString()} د.ع قيد المعالجة — الإجمالي {balance.toLocaleString()} د.ع
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
            <span>سحب الأرباح</span>
          </button>
          {hasPendingRequest && (
            <p className="text-[10px] text-amber-100 mt-2 font-bold text-center flex items-center justify-center gap-1">
              <Clock size={12} />
              لديك طلب سحب قيد المعالجة
            </p>
          )}
          <p className="text-[#fff700]/75 text-[10px] mt-2 font-semibold text-center leading-relaxed">
            عند طلب سحب الأموال ستصلك خلال 5 دقائق، وإذا حصل تأخير تواصل مع الدعم الفني
          </p>
        </div>
      </div>

      {/* How wallet balance works */}
      <div className="merchant-brand-card rounded-2xl border border-violet/20 p-5 bg-violet/5">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-violet/15 text-[#fff700] rounded-xl shrink-0">
            <Info size={18} />
          </div>
          <div className="space-y-3 text-right min-w-0">
            <h3 className="text-sm font-black text-[#fff700]">متى يُضاف الرصيد؟</h3>
            <p className="text-[11px] text-white leading-relaxed font-bold">
              المحفظة المالية <span className="text-[#fff700]">ليست</span> مبيعات متجرك اليومية.
              مبيعاتك تُحصَّل نقداً عند التوصيل. هذه المحفظة مخصّصة لتعويضك عن
              <span className="text-[#fff700]"> الخصومات التي تتحملها منصة محلك</span> على طلباتك.
            </p>
            <ul className="space-y-2 text-[11px] text-slate-300 font-bold">
              <li className="flex items-start gap-2">
                <CheckCircle size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-white">
                  يُضاف الرصيد تلقائياً عند <strong className="text-[#fff700]">تسليم الطلب</strong> إذا استخدم
                  الزبون كود خصم من <strong className="text-white">الإدارة</strong> أو
                  <strong className="text-white"> نقاط الولاء</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-white">
                  المبلغ المُضاف = <strong className="text-[#fff700]">قيمة الخصم</strong> في الطلب
                  (مثال: خصم 5,000 د.ع ← يُضاف 5,000 د.ع للمحفظة).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle size={14} className="text-[#fff700] shrink-0 mt-0.5" />
                <span className="text-white">
                  أكواد الخصم <strong className="text-[#fff700]">التي تطلقها أنت</strong> لا تُضاف للمحفظة
                  — الخصم يُخصم من مبيعاتك مباشرة.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle size={14} className="text-[#fff700] shrink-0 mt-0.5" />
                <span className="text-white">
                  الطلبات بدون خصم، أو الملغاة/المرفوضة، لا تُضيف أي رصيد.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Withdrawal history */}
      <div className="merchant-brand-card rounded-2xl border border-white/10 p-5">
        <h3 className="text-base font-black text-[#fff700] mb-4">سجل طلبات السحب</h3>

        {myRequests.length === 0 ? (
          <div className="text-center py-8 text-white font-bold text-sm">
            لا توجد نشاطات سحب سابقة.
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
                    {req.requestedAmount.toLocaleString()} د.ع
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold">
                    {formatSafeDateTimeString(req.createdAt, 'ar-IQ', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {req.payoutMethodUsed === 'zain_cash' ? 'زين كاش' : 'ماستركارد'}
                    {' · '}
                    <span dir="ltr">{req.payoutMethodDetails}</span>
                  </div>
                </div>
                <div className="shrink-0">
                  {req.status === 'pending' ? (
                    <div className="flex items-center gap-1.5 text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-500/20">
                      <Clock size={14} />
                      <span>قيد المعالجة</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-emerald-300 bg-emerald-500/10 px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-500/20">
                      <CheckCircle size={14} />
                      <span>مكتمل</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payout methods */}
      <div className="merchant-brand-card rounded-2xl border border-white/10 p-5">
        <div className="mb-4">
          <h4 className="font-black text-[#fff700] text-sm">طرق الدفع لاستلام الأرباح</h4>
          <p className="text-[10px] text-white font-bold mt-0.5">لإرسال المستحقات وتسوية الرصيد</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-white mb-1.5">محفظة زين كاش (رقم الهاتف)</label>
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
            <label className="block text-xs font-bold text-white mb-1.5">رقم بطاقة الماستركارد (اختياري)</label>
            <input
              type="text"
              placeholder="XXXX XXXX XXXX XXXX"
              value={mastercardNumber}
              onChange={(e) => setMastercardNumber(e.target.value)}
              className="w-full bg-white/5 border border-white/75 text-white placeholder:text-slate-500 p-3 rounded-xl text-sm font-mono text-left focus:border-vibrant-purple outline-none transition"
              dir="ltr"
            />
            <p className="text-[10px] text-[#fff700] mt-1">يُستخدم لإرسال المستحقات عبر التحويل البنكي</p>
          </div>
        </div>
        {!hasPayoutMethod && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-[#fff700]/20 text-[#fff700] text-xs font-bold flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>أضف طريقة دفع واحدة على الأقل لتتمكن من سحب أرباحك.</span>
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
            <span>{isSavingMethods ? 'جاري الحفظ...' : 'حفظ الحسابات البنكية'}</span>
          </button>
        </div>
      </div>

      {/* Withdraw modal */}
      {showWithdrawModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => !isSubmitting && setShowWithdrawModal(false)}
        >
          <div
            className="merchant-brand-card rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-white/10 flex justify-between items-center">
              <h3 className="font-black text-white text-lg">سحب رصيد</h3>
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
                <p className="text-[10px] text-slate-400 font-bold mb-1">الرصيد المتاح</p>
                <p className="text-xl font-black text-white font-mono">{availableBalance.toLocaleString()} د.ع</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">المبلغ المطلوب سحبه (د.ع)</label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full bg-white/5 border border-white/15 focus:border-vibrant-purple text-white p-4 rounded-2xl text-lg font-mono outline-none transition text-left placeholder:text-slate-500"
                  placeholder="مثال: 50000"
                  dir="ltr"
                  min={MIN_WITHDRAW_IQD}
                />
                <p className="text-xs text-slate-500 mt-2">
                  الحد الأدنى للسحب: {MIN_WITHDRAW_IQD.toLocaleString()} د.ع
                </p>
              </div>

              {!currentMerchant.payoutMethods?.zainCashNumber && !currentMerchant.payoutMethods?.mastercardNumber ? (
                <div className="p-3 bg-rose-500/10 text-rose-200 rounded-xl text-xs font-bold border border-rose-500/20">
                  يجب حفظ طريقة دفع (زين كاش أو ماستركارد) قبل السحب.
                </div>
              ) : (
                <div className="p-3 bg-white/5 text-slate-300 rounded-xl text-xs font-bold border border-white/10">
                  سيتم التحويل إلى:{' '}
                  <span className="text-violet-300 mr-1" dir="ltr">
                    {currentMerchant.payoutMethods?.zainCashNumber
                      ? `زين كاش (${currentMerchant.payoutMethods.zainCashNumber})`
                      : `ماستركارد (${currentMerchant.payoutMethods?.mastercardNumber})`}
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
                {isSubmitting ? 'جاري الإرسال...' : 'تأكيد طلب السحب'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const Wallet = memo(WalletInner);
