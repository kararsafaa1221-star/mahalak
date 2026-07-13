import React, { useState } from 'react';
import { AlertTriangle, ChevronLeft, Loader2, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WelcomeScreenBackground } from './WelcomeScreenBackground';

type Props = {
  accountLabel: string;
  onConfirmDelete: () => Promise<void>;
  /** `glass` = customer welcome cards, `merchant` = merchant settings rows */
  variant?: 'glass' | 'merchant';
  className?: string;
};

export const DeleteAccountSection: React.FC<Props> = ({
  accountLabel,
  onConfirmDelete,
  variant = 'glass',
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirmDelete();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر حذف الحساب. حاول مجدداً أو تواصل مع الدعم.');
    } finally {
      setBusy(false);
    }
  };

  const trigger =
    variant === 'merchant' ? (
      <div
        className={[
          'rounded-2xl border shadow-sm overflow-hidden text-right merchant-brand-card',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          className="w-full p-4 flex items-center justify-between gap-3 transition-colors hover:bg-white/5"
          dir="rtl"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2 bg-rose-500/10 text-rose-400/80 rounded-xl shrink-0">
              <Trash2 size={20} />
            </div>
            <div className="text-right min-w-0">
              <h3 className="font-black text-[#E8ECF4] text-sm">حذف الحساب</h3>
              <p className="text-[10px] text-slate-400 font-bold">حذف دائم لبياناتك</p>
            </div>
          </div>
          <ChevronLeft size={20} className="text-slate-400 shrink-0" />
        </button>
      </div>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={[
          'w-full text-right welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2rem] p-5 shadow-sm',
          'flex items-center justify-between hover:bg-white/10 transition-colors group',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-rose-500/10 border border-rose-400/20 text-rose-300/80 rounded-2xl group-hover:bg-rose-500/20 transition-colors">
            <Trash2 size={20} />
          </div>
          <div className="text-right">
            <span className="text-sm font-black text-white block">حذف الحساب</span>
            <span className="text-[10px] text-white/50 font-bold">حذف دائم لبياناتك</span>
          </div>
        </div>
        <ChevronLeft size={18} className="text-white/50 group-hover:translate-x-1 transition-transform" />
      </button>
    );

  return (
    <>
      {trigger}

      <AnimatePresence>
        {open && (
          <div
            className="fixed inset-0 z-[200] bg-deep-navy/75 backdrop-blur-md flex items-center justify-center p-4"
            dir="rtl"
            onClick={() => !busy && setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="relative welcome-card-glow welcome-card-border-glow bg-deep-navy rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden border border-white/30"
            >
              <WelcomeScreenBackground lite />
              <div className="relative z-10">
                <div className="welcome-card-shimmer bg-white/5 border-b border-white/15 px-6 py-5 text-white flex items-start justify-between gap-3 backdrop-blur-md">
                  <div className="flex items-start gap-3">
                    <div className="welcome-icon-pulse p-2.5 bg-rose-500/20 border border-rose-400/30 rounded-xl shrink-0 text-rose-300">
                      <AlertTriangle size={22} />
                    </div>
                    <div>
                      <h3 className="font-black text-lg leading-tight">تأكيد حذف الحساب</h3>
                      <p className="text-xs text-white/60 font-bold mt-1">{accountLabel}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setOpen(false)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition disabled:opacity-50"
                    aria-label="إغلاق"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-6 space-y-4 text-right text-white">
                  <p className="text-sm font-bold text-white/80 leading-relaxed">
                    هذا الإجراء <span className="text-rose-300">نهائي ولا يمكن التراجع عنه</span>.
                    سيتم حذف بيانات حسابك الشخصية من منصة محلك، بما في ذلك:
                  </p>
                  <ul className="text-xs font-bold text-white/65 space-y-2 list-disc list-inside">
                    <li>الاسم ورقم الهاتف ومواقع التوصيل المحفوظة</li>
                    <li>نقاط الولاء والإعدادات الشخصية</li>
                    <li>بيانات تسجيل الدخول (Firebase Auth)</li>
                  </ul>
                  <p className="text-[11px] text-white/50 font-bold leading-relaxed bg-white/5 border border-white/15 rounded-xl p-3">
                    قد تُحتفظ بعض السجلات التشغيلية (مثل الطلبات السابقة) بشكل مجهول لأغراض قانونية
                    ومحاسبية وفق سياسة الخصوصية.
                  </p>

                  {error && (
                    <p className="text-xs font-bold text-rose-200 bg-rose-500/15 border border-rose-400/25 rounded-xl p-3">
                      {error}
                    </p>
                  )}

                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={handleConfirm}
                      className="welcome-btn-pulse w-full py-4 bg-gradient-to-r from-rose-600 to-[#0B1320] hover:brightness-110 disabled:opacity-60 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition active:scale-[0.98] border border-rose-400/40"
                    >
                      {busy ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          جاري الحذف...
                        </>
                      ) : (
                        <>
                          <Trash2 size={18} />
                          نعم، احذف حسابي نهائياً
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setOpen(false)}
                      className="w-full py-3.5 bg-white/10 hover:bg-white/15 text-white font-black rounded-2xl transition border border-white/20"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
