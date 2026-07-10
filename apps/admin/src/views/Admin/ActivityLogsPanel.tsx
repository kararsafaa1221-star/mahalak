import React, { useMemo, useState } from 'react';
import { Activity, Clock, Filter, Shield, Target, User } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { formatSafeDateTimeString } from '../../utils/date';
import { getRoleLabelAr, localizeActivityLogForDisplay } from '../../lib/activityLogI18n';

const LOG_CATEGORIES = [
  { id: 'all', label: 'الكل' },
  { id: 'store', label: 'المتاجر' },
  { id: 'settings', label: 'الإعدادات' },
  { id: 'subscription', label: 'الاشتراكات' },
  { id: 'order', label: 'الطلبات' },
  { id: 'customer', label: 'الزبائن' },
  { id: 'product', label: 'المنتجات' },
  { id: 'staff', label: 'الموظفين' },
] as const;

type LogCategory = (typeof LOG_CATEGORIES)[number]['id'];

function resolveCategory(actionKey?: string | null): LogCategory {
  if (!actionKey) return 'all';
  if (actionKey.startsWith('store.subscription') || actionKey.startsWith('store.auto_subscription') || actionKey === 'subscription.price_update') {
    return 'subscription';
  }
  if (actionKey.startsWith('settings.') || actionKey === 'settings.update') return 'settings';
  if (actionKey.startsWith('store.')) return 'store';
  if (actionKey.startsWith('order.')) return 'order';
  if (actionKey.startsWith('customer.')) return 'customer';
  if (actionKey.startsWith('product.')) return 'product';
  if (actionKey.startsWith('staff.')) return 'staff';
  return 'all';
}

function categoryBadgeClass(category: LogCategory): string {
  switch (category) {
    case 'subscription': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'settings': return 'bg-violet-100 text-violet-800 border-violet-200';
    case 'store': return 'bg-[#f5eeff] text-[#4D2980] border-[#e9daff]';
    case 'order': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'customer': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'product': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'staff': return 'bg-rose-100 text-rose-800 border-rose-200';
    default: return 'bg-slate-100 text-slate-600 border-slate-200';
  }
}

export const ActivityLogsPanel: React.FC = React.memo(function ActivityLogsPanel() {
  const { activityLogs } = useApp();
  const [categoryFilter, setCategoryFilter] = useState<LogCategory>('all');
  const [search, setSearch] = useState('');

  const filteredLogs = useMemo(() => {
    return activityLogs.filter((log) => {
      const cat = resolveCategory(log.actionKey);
      if (categoryFilter !== 'all' && cat !== categoryFilter) return false;
      if (!search.trim()) return true;
      const row = localizeActivityLogForDisplay(log);
      const haystack = `${row.action} ${row.target} ${row.description} ${log.adminName ?? ''}`.toLowerCase();
      return haystack.includes(search.trim().toLowerCase());
    });
  }, [activityLogs, categoryFilter, search]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-gradient-to-l from-[#f5eeff] to-white rounded-2xl border border-[#e9daff] p-4">
        <p className="text-xs text-[#4D2980] font-bold text-right leading-relaxed">
          يُسجَّل هنا كل تغيير في لوحة الإدارة: إعدادات الاشتراك التلقائي، تجديد الاشتراكات، التوثيق، الإعلانات، الطلبات، والمزيد — مع اسم الموظف والتفاصيل الكاملة.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col lg:flex-row gap-3">
        <div className="flex-1 relative">
          <Filter size={14} className="absolute right-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث في السجل (إجراء، متجر، تفاصيل...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-slate-200 p-2 pr-9 rounded-xl text-xs text-right focus:ring-2 focus:ring-[#9952FF] focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {LOG_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-xl border transition ${
                categoryFilter === cat.id
                  ? 'bg-[#9952FF] text-white border-[#9952FF]'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-[#e9daff]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="font-bold text-slate-800 text-md mb-4 flex items-center gap-2">
          <Activity size={20} className="text-[#9952FF]" />
          <span>سجل النشاط ({filteredLogs.length})</span>
        </h3>

        {filteredLogs.length === 0 ? (
          <p className="text-sm text-slate-500">لا توجد سجلات مطابقة للبحث.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                <tr>
                  <th className="px-3 py-2">الوقت</th>
                  <th className="px-3 py-2">الموظف</th>
                  <th className="px-3 py-2">الدور</th>
                  <th className="px-3 py-2">التصنيف</th>
                  <th className="px-3 py-2">الإجراء</th>
                  <th className="px-3 py-2">الهدف</th>
                  <th className="px-3 py-2">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  const row = localizeActivityLogForDisplay(log);
                  const category = resolveCategory(log.actionKey);
                  const categoryLabel = LOG_CATEGORIES.find((c) => c.id === category)?.label ?? 'عام';
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/60 align-top">
                      <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">
                        <Clock size={12} className="inline ml-1" />
                        {formatSafeDateTimeString(log.createdAt)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1 font-bold text-slate-700 text-xs">
                          <User size={14} />
                          {log.adminName || log.adminEmail || log.adminUid}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs bg-[#f5eeff] text-[#4D2980] px-2 py-0.5 rounded-full font-bold">
                          {getRoleLabelAr(log.adminRole)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${categoryBadgeClass(category)}`}>
                          {categoryLabel}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs font-bold text-slate-700">{row.action}</td>
                      <td className="px-3 py-2 text-xs text-slate-600">
                        {row.target !== '—' ? (
                          <span className="inline-flex items-center gap-1">
                            <Target size={12} />
                            {row.target}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-600 max-w-xs">{row.description}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500 flex items-center gap-2">
          <Shield size={14} />
          السجلات تُكتب مع اسم الموظف ودوره وصلاحياته وقت التنفيذ.
        </div>
      </div>
    </div>
  );
});
