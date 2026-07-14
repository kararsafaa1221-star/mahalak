import React from 'react';
import { Phone, Shield, Loader2 } from 'lucide-react';
import { LegalGlowCard } from './LegalGlowCard';

interface ChangePasswordContentProps {
  compact?: boolean;
  showHeader?: boolean;
  phone: string;
  pwStep: 1 | 2;
  otpPwCode: string;
  newPassword: string;
  isSendingOtp?: boolean;
  isUpdatingPassword?: boolean;
  onOtpChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  onResendOtp?: () => void;
}

const inputClass =
  'w-full bg-white/10 border border-white/20 px-4 py-4 rounded-2xl text-center text-sm font-black text-white placeholder:text-white/50 focus:ring-4 focus:ring-white/10 focus:border-white/40 outline-none transition-all';

export const ChangePasswordContent: React.FC<ChangePasswordContentProps> = ({
  compact = false,
  showHeader = true,
  phone,
  pwStep,
  otpPwCode,
  newPassword,
  isSendingOtp = false,
  isUpdatingPassword = false,
  onOtpChange,
  onNewPasswordChange,
  onSubmit,
  onResendOtp,
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
              <Shield size={compact ? 28 : 32} />
            </div>
            <h1 className={`font-black text-[#fff700] mb-1.5 ${compact ? 'text-lg' : 'text-2xl'}`}>
              تغيير كلمة المرور
            </h1>
            <p className="text-[10px] sm:text-xs font-bold text-purple-100">
              {pwStep === 1
                ? 'سنرسل رمز تحقق إلى رقم هاتفك المسجل لتأكيد هويتك'
                : 'أدخل رمز التحقق وكلمة المرور الجديدة'}
            </p>
          </div>
        </header>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        {pwStep === 1 ? (
          <LegalGlowCard>
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-white/15 border border-white/20 text-[#fff700] shrink-0 shadow-sm">
                <Phone size={16} />
              </div>
              <p className="text-[11px] sm:text-xs font-bold text-purple-100/90 leading-relaxed pt-0.5">
                سنقوم بإرسال رمز التحقق (OTP) إلى رقم هاتفك المسجل عبر واتساب لتأكيد هويتك قبل
                تحديث كلمة المرور.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-white/5 border border-white/15 rounded-2xl p-4 flex items-center justify-center gap-3">
                <Phone size={18} className="text-[#fff700] shrink-0" />
                <div className="text-center min-w-0">
                  <span className="text-[10px] text-purple-100/80 font-bold block mb-0.5">
                    رقم الهاتف المسجل
                  </span>
                  <span className="text-sm font-black text-white font-mono tracking-wider" dir="ltr">
                    {phone}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSendingOtp}
                className="welcome-btn-pulse w-full py-4 bg-brand-horizontal border border-white/30 text-white font-black text-sm rounded-2xl shadow-brand-glow transition-all hover:opacity-95 active:scale-95 disabled:opacity-70 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {isSendingOtp ? (
                  <>
                    <Loader2 size={16} className="animate-spin shrink-0" />
                    جار ارسال رمز التحقق
                  </>
                ) : (
                  'إرسال رمز التحقق'
                )}
              </button>
            </div>
          </LegalGlowCard>
        ) : (
          <LegalGlowCard>
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-white/15 border border-white/20 text-[#fff700] shrink-0 shadow-sm">
                <Shield size={16} />
              </div>
              <h2 className="font-black text-[#fff700] text-sm sm:text-base leading-relaxed pt-0.5">
                تأكيد الرمز وكلمة المرور الجديدة
              </h2>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpPwCode}
                onChange={(e) => onOtpChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="إدخال رمز التحقق"
                className={`${inputClass} text-lg tracking-[0.5em] placeholder:tracking-normal placeholder:text-[10px]`}
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => onNewPasswordChange(e.target.value)}
                placeholder="كلمة المرور الجديدة (8+ رموز)"
                className={inputClass}
              />
              <button
                type="submit"
                disabled={isUpdatingPassword || isSendingOtp}
                className="welcome-btn-pulse w-full py-4 bg-brand-horizontal border border-white/30 text-white font-black text-sm rounded-2xl shadow-brand-glow transition-all hover:opacity-95 active:scale-95 disabled:opacity-70 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {isUpdatingPassword ? (
                  <>
                    <Loader2 size={16} className="animate-spin shrink-0" />
                    جاري تحديث كلمة المرور...
                  </>
                ) : (
                  'تحديث كلمة المرور'
                )}
              </button>
              {onResendOtp && (
                <button
                  type="button"
                  onClick={onResendOtp}
                  disabled={isSendingOtp || isUpdatingPassword}
                  className="w-full py-3 text-white/60 text-xs font-black hover:text-[#fff700] transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  {isSendingOtp ? (
                    <>
                      <Loader2 size={14} className="animate-spin shrink-0" />
                      جار ارسال رمز التحقق
                    </>
                  ) : (
                    'لم يصلك الرمز؟ أعد الإرسال'
                  )}
                </button>
              )}
            </div>
          </LegalGlowCard>
        )}
      </form>
    </div>
  );
};
