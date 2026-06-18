import React from 'react';
import { Activity, Clock, Shield, Target, User } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { formatSafeDateTimeString } from '../../utils/date';
import { getRoleLabelAr, localizeActivityLogForDisplay } from '../../lib/activityLogI18n';

export const ActivityLogsPanel: React.FC = () => {
  const { activityLogs } = useApp();

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="font-bold text-slate-800 text-md mb-4 flex items-center gap-2">
          <Activity size={20} className="text-[#9952FF]" />
          <span>سجل النشاط (Activity Logs)</span>
        </h3>

        {activityLogs.length === 0 ? (
          <p className="text-sm text-slate-500">لا توجد سجلات نشاط حتى الآن.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                <tr>
                  <th className="px-3 py-2">الوقت</th>
                  <th className="px-3 py-2">الموظف</th>
                  <th className="px-3 py-2">الدور</th>
                  <th className="px-3 py-2">الإجراء</th>
                  <th className="px-3 py-2">الهدف</th>
                  <th className="px-3 py-2">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activityLogs.map((log) => {
                  const row = localizeActivityLogForDisplay(log);
                  return (
                  <tr key={log.id} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">
                      <Clock size={12} className="inline ml-1" />
                      {formatSafeDateTimeString(log.createdAt)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1 font-bold text-slate-700">
                        <User size={14} />
                        {log.adminName || log.adminEmail || log.adminUid}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs bg-[#f5eeff] text-[#4D2980] px-2 py-0.5 rounded-full font-bold">
                        {getRoleLabelAr(log.adminRole)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs font-bold text-slate-700">{row.action}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {row.target !== '—' ? (
                        <span className="inline-flex items-center gap-1">
                          <Target size={12} />
                          {row.target}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">{row.description}</td>
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
};
