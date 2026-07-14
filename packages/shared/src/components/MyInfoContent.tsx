import React from 'react';
import { Lock, Phone, User, Loader2 } from 'lucide-react';
import { LegalGlowCard } from './LegalGlowCard';

interface MyInfoContentProps {
  compact?: boolean;
  showHeader?: boolean;
  phone: string;
  name: string;
  isSaving?: boolean;
  onNameChange: (value: string) => void;
  onSave: () => void;
}

const inputClass =
  'w-full bg-white/10 border border-white/20 text-white px-4 py-3.5 rounded-2xl text-xs font-black placeholder:text-white/40 focus:ring-4 focus:ring-white/10 focus:border-white/40 transition-all outline-none backdrop-blur-md';

export const MyInfoContent: React.FC<MyInfoContentProps> = ({
  compact = false,
  showHeader = true,
  phone,
  name,
  isSaving = false,
  onNameChange,
  onSave,
}) => {
  return (
    <div
      className={`animate-fade-in font-tajawal text-right ${compact ? 'space-y-4' : 'space-y-5'}`}
      dir="rtl"
    >
      {showHeader && (
        <header className="welcome-card-glow welcome-card-border-glow welcome-card-shimmer bg-white/5 border border-white/30 backdrop-blur-md rounded-[2.5rem] p-5 sm:p-6 text-white shadow-2xl relative overflow-hidden text-center">
          <div className="absolute top-0 right-0 w-44 h-44 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none" />
          <div className="relative z-10">
            <div className="welcome-icon-pulse mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-[#fff700] bg-brand-horizontal border border-white shadow-brand-glow-lg">
              <User size={compact ? 28 : 32} />
            </div>
            <h1 className={`font-black text-[#fff700] mb-1.5 ${compact ? 'text-lg' : 'text-2xl'}`}>
              معلوماتي
            </h1>
            <p className="text-[10px] sm:text-xs font-bold text-purple-100">
              رقم الهاتف والاسم الكامل لحسابك
            </p>
          </div>
        </header>
      )}

      <LegalGlowCard>
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-white/15 border border-white/20 text-[#fff700] shrink-0 shadow-sm">
            <Phone size={16} />
          </div>
          <h2 className="font-black text-[#fff700] text-sm sm:text-base leading-relaxed pt-0.5">
            بيانات الحساب
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-purple-100/80 mb-2 mr-1">
              رقم الهاتف (لا يمكن تغييره)
            </label>
            <div className="flex items-center gap-3 bg-white/10 border border-white/20 px-4 py-3.5 rounded-2xl opacity-70 backdrop-blur-md">
              <Phone size={14} className="text-[#fff700]/70" />
              <span className="text-xs font-black text-white/80 tracking-wider" dir="ltr">
                {phone}
              </span>
              <div className="mr-auto">
                <Lock size={12} className="text-white/50" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-purple-100/80 mb-2 mr-1">
              الاسم الكامل
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className={inputClass}
              placeholder="أدخل اسمك الكامل"
              disabled={isSaving}
            />
          </div>
        </div>

        <div className="pt-4">
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="welcome-btn-pulse w-full py-4 bg-brand-horizontal border border-white/30 text-white rounded-2xl text-sm font-black shadow-brand-glow transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin shrink-0" />
                جاري الحفظ...
              </>
            ) : (
              'حفظ التغييرات'
            )}
          </button>
        </div>
      </LegalGlowCard>
    </div>
  );
};
