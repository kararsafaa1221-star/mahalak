import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, Loader2, RotateCcw, ShieldAlert, Store as StoreIcon } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@shared/lib/firebase';
import {
  buildCustomerPointsAudit,
  type CustomerPointsAudit,
  type CustomerShareRewardDay,
} from '@shared/utils/customerPointsAudit';
import type { Customer, Order, PromoCode, RechargeCode, Store, StoreReview } from '@shared/types';

type Props = {
  customer: Customer;
  orders: Order[];
  storeReviews: StoreReview[];
  rechargeCodes: RechargeCode[];
  promoCodes: PromoCode[];
  stores: Store[];
  adminSettings: Record<string, unknown>;
  onResetPoints: (customerId: string, reason: string) => Promise<void>;
};

const SOURCE_COLORS: Record<string, string> = {
  order_purchase: 'bg-emerald-100 text-emerald-800',
  tier_upgrade: 'bg-violet-100 text-violet-800',
  store_review: 'bg-amber-100 text-amber-800',
  share_app: 'bg-sky-100 text-sky-800',
  recharge_code: 'bg-indigo-100 text-indigo-800',
  signup_bonus: 'bg-slate-100 text-slate-700',
  points_redemption: 'bg-rose-100 text-rose-800',
};

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('ar-IQ', { dateStyle: 'short', timeStyle: 'short' });
}

export const CustomerPointsAuditPanel: React.FC<Props> = ({
  customer,
  orders,
  storeReviews,
  rechargeCodes,
  promoCodes,
  stores,
  adminSettings,
  onResetPoints,
}) => {
  const [shareDays, setShareDays] = useState<CustomerShareRewardDay[]>([]);
  const [loadingShare, setLoadingShare] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [resetReason, setResetReason] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const loadShareRewards = useCallback(async () => {
    setLoadingShare(true);
    try {
      const fn = httpsCallable(getFunctions(app), 'getCustomerShareRewardsAudit');
      const result = await fn({ customerId: customer.id });
      const days = (result.data as { days?: CustomerShareRewardDay[] })?.days ?? [];
      setShareDays(days);
    } catch {
      setShareDays([]);
    } finally {
      setLoadingShare(false);
    }
  }, [customer.id]);

  useEffect(() => {
    void loadShareRewards();
  }, [loadShareRewards]);

  const audit: CustomerPointsAudit = useMemo(
    () =>
      buildCustomerPointsAudit({
        customer,
        orders,
        storeReviews,
        rechargeCodes,
        promoCodes,
        stores,
        adminSettings,
        shareRewardDays: shareDays,
      }),
    [customer, orders, storeReviews, rechargeCodes, promoCodes, stores, adminSettings, shareDays],
  );

  const handleReset = async () => {
    if (!window.confirm(`تصفير ${audit.currentBalance} نقطة للزبون «${customer.name}»؟ لا يمكن التراجع.`)) return;
    setResetting(true);
    try {
      await onResetPoints(customer.id, resetReason.trim() || 'اشتباه احتيال');
      setShowResetConfirm(false);
      setResetReason('');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
          <BarChart3 size={16} className="text-mahalak-purple" />
          تدقيق نقاط الولاء
        </h4>
        {loadingShare && (
          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
            <Loader2 size={12} className="animate-spin" /> جاري تحميل مشاركات التطبيق...
          </span>
        )}
      </div>

      {audit.fraudFlags.length > 0 && (
        <div className="space-y-2">
          {audit.fraudFlags.map((flag, idx) => (
            <div
              key={idx}
              className={`rounded-xl px-3 py-2.5 text-[10px] font-bold flex items-start gap-2 ${
                flag.severity === 'critical'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-amber-50 text-amber-900 border border-amber-200'
              }`}
            >
              {flag.severity === 'critical' ? <ShieldAlert size={14} className="shrink-0 mt-0.5" /> : <AlertTriangle size={14} className="shrink-0 mt-0.5" />}
              <span>{flag.messageAr}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3 text-center">
          <span className="text-[9px] font-bold text-yellow-700 block">الرصيد الحالي</span>
          <span className="text-lg font-black text-yellow-800">{audit.currentBalance}</span>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
          <span className="text-[9px] font-bold text-emerald-700 block">إجمالي المكتسب</span>
          <span className="text-lg font-black text-emerald-800">{audit.totalEarned}</span>
        </div>
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-center">
          <span className="text-[9px] font-bold text-rose-700 block">المستبدل</span>
          <span className="text-lg font-black text-rose-800">{audit.totalSpent}</span>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
          <span className="text-[9px] font-bold text-slate-500 block">فجوة التدقيق</span>
          <span className={`text-lg font-black ${audit.balanceGap === 0 ? 'text-slate-700' : 'text-orange-600'}`}>
            {audit.balanceGap > 0 ? `+${audit.balanceGap}` : audit.balanceGap}
          </span>
        </div>
      </div>

      {audit.byStore.length > 0 && (
        <div className="bg-slate-50 rounded-xl border border-slate-100 p-3">
          <p className="text-[10px] font-black text-slate-700 mb-2 flex items-center gap-1">
            <StoreIcon size={12} /> توزيع النقاط حسب المتجر
          </p>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {audit.byStore.map((row) => (
              <div key={row.storeId} className="flex items-center justify-between gap-2 text-[10px] font-bold bg-white rounded-lg px-2.5 py-1.5 border border-slate-100">
                <span className="text-slate-800 truncate">{row.storeName}</span>
                <span className="text-slate-500 shrink-0">
                  {row.totalPoints} ن ({row.orderCount} طلب) — {row.shareOfEarnedPercent}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <p className="text-[10px] font-black text-slate-600 px-3 py-2 border-b border-slate-100">سجل الحركات</p>
        <div className="max-h-48 overflow-y-auto divide-y divide-slate-50">
          {audit.entries.length === 0 ? (
            <p className="text-[10px] text-slate-400 font-bold p-4 text-center">لا توجد حركات موثّقة</p>
          ) : (
            audit.entries.map((entry) => (
              <div key={entry.id} className="px-3 py-2 flex items-start justify-between gap-2 text-[10px]">
                <div className="min-w-0">
                  <span className={`inline-block px-1.5 py-0.5 rounded font-black mb-0.5 ${SOURCE_COLORS[entry.type] || 'bg-slate-100'}`}>
                    {entry.labelAr}
                  </span>
                  {entry.storeName && (
                    <p className="text-slate-500 font-bold truncate">{entry.storeName}</p>
                  )}
                  <p className="text-slate-400 font-bold">{formatDate(entry.occurredAt)}</p>
                </div>
                <span className={`font-black shrink-0 ${entry.points >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {entry.points >= 0 ? `+${entry.points}` : entry.points}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-rose-50 border border-rose-100 rounded-xl p-3">
        <p className="text-[10px] font-black text-rose-800 mb-2 flex items-center gap-1">
          <RotateCcw size={12} /> تصفير النقاط (احتيال)
        </p>
        {!showResetConfirm ? (
          <button
            type="button"
            disabled={audit.currentBalance <= 0}
            onClick={() => setShowResetConfirm(true)}
            className="w-full py-2.5 rounded-xl bg-rose-600 text-white text-[10px] font-black hover:bg-rose-700 disabled:opacity-40"
          >
            تصفير {audit.currentBalance} نقطة
          </button>
        ) : (
          <div className="space-y-2">
            <input
              className="w-full border border-rose-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-rose-400"
              placeholder="سبب التصفير (مثال: احتيال مع متجر X)"
              value={resetReason}
              onChange={(e) => setResetReason(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={resetting}
                onClick={() => void handleReset()}
                className="flex-1 py-2 rounded-xl bg-rose-600 text-white text-[10px] font-black disabled:opacity-60"
              >
                {resetting ? 'جاري التصفير...' : 'تأكيد التصفير'}
              </button>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl bg-white border border-rose-200 text-rose-700 text-[10px] font-black"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
