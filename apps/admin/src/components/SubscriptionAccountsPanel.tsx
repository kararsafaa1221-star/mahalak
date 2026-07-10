import React, { useMemo } from 'react';
import { Wallet, Store as StoreIcon, TrendingUp, Calendar } from 'lucide-react';
import type { Store } from '@shared/types';
import { isStoreSubscriptionActive } from '@shared/utils/store';
import {
  computeSubscriptionAccounts,
  formatIqd,
} from '@shared/constants/merchantRenewalPlans';

type Props = {
  stores: Store[];
  adminSettings: Record<string, unknown>;
};

export const SubscriptionAccountsPanel: React.FC<Props> = ({ stores, adminSettings }) => {
  const summary = useMemo(
    () => computeSubscriptionAccounts(stores, adminSettings, isStoreSubscriptionActive),
    [stores, adminSettings],
  );

  const now = new Date();
  const monthLabel = now.toLocaleDateString('ar-IQ', { month: 'long', year: 'numeric' });
  const yearLabel = String(now.getFullYear());

  return (
    <section className="rounded-2xl border border-mahalak-purple/15 bg-white shadow-sm overflow-hidden text-right" dir="rtl">
      <div className="bg-gradient-to-l from-mahalak-navy to-mahalak-purple px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-white">
        <div className="flex items-center gap-2">
          <Wallet size={18} className="text-mahalak-violet shrink-0" />
          <div>
            <h3 className="font-black text-sm">الحسابات — أرباح الاشتراكات</h3>
            <p className="text-[10px] text-mahalak-violet/90 font-bold">المبالغ تبقى محسوبة حتى بعد انتهاء الاشتراك</p>
          </div>
        </div>
        <div className="text-left shrink-0">
          <p className="text-[10px] text-white/70 font-bold">إجمالي أرباح الشركة (كل المتاجر)</p>
          <p className="text-lg font-black tabular-nums">{formatIqd(summary.grandTotalLifetimeIqd)} <span className="text-xs">د.ع</span></p>
        </div>
      </div>

      <div className="p-5 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-mahalak-purple/5 border border-mahalak-purple/15 rounded-xl p-4">
            <p className="text-[10px] font-bold text-mahalak-navy mb-1 flex items-center gap-1">
              <TrendingUp size={12} /> اليوم
            </p>
            <p className="text-lg font-black text-mahalak-purple tabular-nums">{formatIqd(summary.periods.todayIqd)} د.ع</p>
          </div>
          <div className="bg-mahalak-purple/5 border border-mahalak-purple/15 rounded-xl p-4">
            <p className="text-[10px] font-bold text-mahalak-navy mb-1 flex items-center gap-1">
              <Calendar size={12} /> {monthLabel}
            </p>
            <p className="text-lg font-black text-mahalak-purple tabular-nums">{formatIqd(summary.periods.monthIqd)} د.ع</p>
          </div>
          <div className="bg-mahalak-purple/5 border border-mahalak-purple/15 rounded-xl p-4">
            <p className="text-[10px] font-bold text-mahalak-navy mb-1">سنة {yearLabel}</p>
            <p className="text-lg font-black text-mahalak-purple tabular-nums">{formatIqd(summary.periods.yearIqd)} د.ع</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-[10px] font-bold text-slate-500 mb-1">اشتراكات نشطة الآن</p>
            <p className="text-lg font-black text-slate-700 tabular-nums">{formatIqd(summary.grandTotalActiveIqd)} د.ع</p>
            <p className="text-[9px] text-slate-400 font-bold mt-0.5">{summary.activeStoresCount} متجر</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-black text-mahalak-navy">{summary.totalStoresWithRevenue}</p>
            <p className="text-xs font-bold text-slate-500 mt-1">متجر سجّل إيراد اشتراك (نشط أو منتهي)</p>
          </div>
          <div className="bg-mahalak-purple/5 border border-mahalak-purple/15 rounded-xl p-4 text-center">
            <p className="text-xl font-black text-mahalak-purple tabular-nums">{formatIqd(summary.grandTotalLifetimeIqd)} د.ع</p>
            <p className="text-xs font-bold text-mahalak-navy mt-1">مجموع أرباح الاشتراكات التراكمية</p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-black text-mahalak-navy mb-3">ملخص حسب الباقة</h4>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs min-w-[640px]">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-right font-black">الباقة</th>
                  <th className="px-3 py-2 text-right font-black">السعر</th>
                  <th className="px-3 py-2 text-right font-black">متاجر</th>
                  <th className="px-3 py-2 text-right font-black">نشطة</th>
                  <th className="px-3 py-2 text-right font-black">إجمالي الأرباح</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.byPlan.map((row) => (
                  <tr key={row.planId} className="hover:bg-slate-50/80">
                    <td className="px-3 py-2.5">
                      <p className="font-bold text-mahalak-navy">{row.labelAr}</p>
                      <p className="font-mono text-[9px] text-slate-400">{row.planId}</p>
                    </td>
                    <td className="px-3 py-2.5 font-bold text-mahalak-purple tabular-nums">{formatIqd(row.priceIqd)} د.ع</td>
                    <td className="px-3 py-2.5 font-bold">{row.totalStores}</td>
                    <td className="px-3 py-2.5 font-bold text-emerald-600">{row.activeStores}</td>
                    <td className="px-3 py-2.5 font-black text-mahalak-navy tabular-nums">{formatIqd(row.totalRevenueIqd)} د.ع</td>
                  </tr>
                ))}
                {summary.byPlan.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-slate-400 font-bold">لا توجد إيرادات اشتراك مسجّلة</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-black text-mahalak-navy mb-3 flex items-center gap-2">
            <StoreIcon size={16} />
            سجل المتاجر ({summary.ledger.length})
          </h4>
          <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
            {summary.ledger.slice(0, 150).map((row) => (
              <div key={row.storeId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-xs hover:bg-slate-50">
                <div className="min-w-0">
                  <p className="font-black text-mahalak-navy truncate">{row.shopName}</p>
                  <p className="text-[10px] text-slate-500 font-bold">{row.planLabel} · <span className="font-mono">{row.subscriptionId}</span></p>
                </div>
                <div className="text-left shrink-0">
                  <p className="font-black text-mahalak-purple tabular-nums">{formatIqd(row.lifetimeRevenueIqd)} د.ع</p>
                  <p className={`text-[10px] font-bold ${row.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {row.isActive ? `نشط · ${row.expiry}` : `منتهي · ${row.expiry}`}
                  </p>
                </div>
              </div>
            ))}
            {summary.ledger.length === 0 && (
              <p className="px-3 py-8 text-center text-slate-400 font-bold text-xs">لا توجد اشتراكات مسجّلة للمتاجر</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
