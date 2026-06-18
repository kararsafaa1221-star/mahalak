import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { useApp } from '../context/useApp';
import { getFirstAllowedPageKey, PAGE_KEY_LABELS_AR, type PageKey } from '../lib/permissions';

export const Unauthorized: React.FC = () => {
  const { currentAdminDoc, adminRole } = useApp();
  const location = useLocation();
  const fromKey = (location.state as { from?: PageKey } | null)?.from;
  const homeKey = getFirstAllowedPageKey(currentAdminDoc) ?? 'stores';

  return (
    <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-6" dir="rtl">
      <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-2xl p-8 text-center backdrop-blur-sm">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500/20 flex items-center justify-center">
          <ShieldOff className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-xl font-black text-white mb-2">غير مصرح بالوصول</h1>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          {fromKey
            ? `دورك الحالي (${adminRole ?? '—'}) لا يسمح بفتح «${PAGE_KEY_LABELS_AR[fromKey]}».`
            : 'لا تملك صلاحية الوصول إلى هذه الصفحة.'}
        </p>
        <Link
          to={`/dashboard/${homeKey}`}
          className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-bold text-sm transition"
        >
          العودة للوحة التحكم
        </Link>
      </div>
    </div>
  );
};
