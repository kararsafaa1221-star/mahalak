import React, { useEffect, useMemo, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { Dices, Filter, Gift, Loader2, Search } from 'lucide-react';
import type { SpinWheelPrizeType } from '@shared/constants/spinWheelSettings';
import { db } from '@shared/lib/firebase';
import { useApp } from '../context/useApp';
import { formatSafeDateTimeString } from '../utils/date';

type SpinHistoryRow = {
  id: string;
  customerId: string;
  optionId?: string;
  optionLabel: string;
  prizeType: SpinWheelPrizeType | string;
  pointsAwarded: number;
  costPoints: number;
  promoCode: string | null;
  externalDetails: string | null;
  dayKey?: string;
  createdAt: string;
};

const PRIZE_FILTERS: { id: 'all' | SpinWheelPrizeType; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'points', label: 'نقاط' },
  { id: 'promo_amount', label: 'خصم مبلغ' },
  { id: 'promo_percent', label: 'خصم نسبة' },
  { id: 'external', label: 'جائزة خارجية' },
  { id: 'nothing', label: 'حظ أوفر' },
];

const PRIZE_TYPE_LABELS: Record<string, string> = {
  points: 'نقاط',
  promo_amount: 'كود خصم (مبلغ)',
  promo_percent: 'كود خصم (%)',
  external: 'جائزة خارجية',
  nothing: 'حظ أوفر',
};

function prizeBadgeClass(prizeType: string): string {
  switch (prizeType) {
    case 'points':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'promo_amount':
    case 'promo_percent':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'external':
      return 'bg-violet-100 text-violet-800 border-violet-200';
    case 'nothing':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200';
  }
}

function formatPrizeDetail(row: SpinHistoryRow): string {
  switch (row.prizeType) {
    case 'points':
      return row.pointsAwarded > 0 ? `+${row.pointsAwarded.toLocaleString('ar-IQ')} نقطة` : '—';
    case 'promo_amount':
    case 'promo_percent':
      return row.promoCode ? `كود: ${row.promoCode}` : 'كود خصم';
    case 'external':
      return row.externalDetails?.trim() || row.optionLabel || 'جائزة خارجية';
    case 'nothing':
      return 'بدون جائزة';
    default:
      return row.optionLabel || '—';
  }
}

export const SpinWheelHistoryPanel: React.FC = () => {
  const { customers } = useApp();
  const [rows, setRows] = useState<SpinHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [prizeFilter, setPrizeFilter] = useState<(typeof PRIZE_FILTERS)[number]['id']>('all');

  useEffect(() => {
    const q = query(collection(db, 'spin_wheel_history'), orderBy('createdAt', 'desc'), limit(300));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRows(
          snap.docs.map((docSnap) => {
            const data = docSnap.data() || {};
            return {
              id: docSnap.id,
              customerId: String(data.customerId || ''),
              optionId: typeof data.optionId === 'string' ? data.optionId : undefined,
              optionLabel: String(data.optionLabel || ''),
              prizeType: String(data.prizeType || 'nothing'),
              pointsAwarded: Number(data.pointsAwarded) || 0,
              costPoints: Number(data.costPoints) || 0,
              promoCode: data.promoCode ? String(data.promoCode) : null,
              externalDetails: data.externalDetails ? String(data.externalDetails) : null,
              dayKey: typeof data.dayKey === 'string' ? data.dayKey : undefined,
              createdAt:
                data.createdAt?.toDate?.()?.toISOString?.() ??
                (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString()),
            };
          }),
        );
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, []);

  const customersById = useMemo(() => {
    const map = new Map<string, { name: string; phone: string }>();
    for (const c of customers) {
      map.set(c.id, { name: c.name || '—', phone: c.phone || '' });
    }
    return map;
  }, [customers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (prizeFilter !== 'all' && row.prizeType !== prizeFilter) return false;
      if (!q) return true;
      const customer = customersById.get(row.customerId);
      const haystack = [
        row.optionLabel,
        row.prizeType,
        row.promoCode || '',
        row.externalDetails || '',
        row.customerId,
        customer?.name || '',
        customer?.phone || '',
        formatPrizeDetail(row),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, prizeFilter, search, customersById]);

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-l from-[#f5eeff] to-white rounded-2xl border border-[#e9daff] p-4">
        <p className="text-xs text-[#4D2980] font-bold text-right leading-relaxed">
          يظهر هنا كل زبون دوّر عجلة الحظ والجائزة التي ربحها (نقاط، كود خصم، جائزة خارجية، أو حظ أوفر) — يُحدَّث مباشرة.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col lg:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={14} className="absolute right-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث بالاسم، الهاتف، الجائزة، أو كود الخصم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-slate-200 p-2 pr-9 rounded-xl text-xs text-right focus:ring-2 focus:ring-[#9952FF] focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
            <Filter size={12} /> النوع:
          </span>
          {PRIZE_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setPrizeFilter(f.id)}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-xl border transition ${
                prizeFilter === f.id
                  ? 'bg-[#9952FF] text-white border-[#9952FF]'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-[#e9daff]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="font-bold text-slate-800 text-md mb-4 flex items-center gap-2">
          <Dices size={20} className="text-[#9952FF]" />
          <span>سجل تدويرات عجلة الحظ ({filtered.length})</span>
        </h3>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-slate-500 text-sm font-bold">
            <Loader2 size={18} className="animate-spin" />
            جاري تحميل السجل...
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">لا توجد تدويرات مطابقة حالياً.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                <tr>
                  <th className="px-3 py-2.5 font-black">الوقت</th>
                  <th className="px-3 py-2.5 font-black">الزبون</th>
                  <th className="px-3 py-2.5 font-black">الجائزة</th>
                  <th className="px-3 py-2.5 font-black">النوع</th>
                  <th className="px-3 py-2.5 font-black">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => {
                  const customer = customersById.get(row.customerId);
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className="px-3 py-3 text-[11px] font-bold text-slate-600 whitespace-nowrap">
                        {formatSafeDateTimeString(row.createdAt)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-black text-slate-800 text-xs">{customer?.name || 'زبون محذوف'}</div>
                        <div className="text-[10px] font-bold text-slate-400 mt-0.5" dir="ltr">
                          {customer?.phone || row.customerId}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                          <Gift size={13} className="text-[#9952FF] shrink-0" />
                          <span>{row.optionLabel || '—'}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-lg text-[10px] font-black border ${prizeBadgeClass(row.prizeType)}`}
                        >
                          {PRIZE_TYPE_LABELS[row.prizeType] || row.prizeType}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-[11px] font-bold text-slate-700">
                        {formatPrizeDetail(row)}
                        {row.costPoints > 0 ? (
                          <span className="block text-[10px] text-rose-500 mt-0.5">
                            تكلفة: {row.costPoints.toLocaleString('ar-IQ')} نقطة
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
