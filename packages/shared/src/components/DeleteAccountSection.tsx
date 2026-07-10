import React, { useState } from 'react';
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Props = {
  accountLabel: string;
  onConfirmDelete: () => Promise<void>;
  className?: string;
};

export const DeleteAccountSection: React.FC<Props> = ({
  accountLabel,
  onConfirmDelete,
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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={[
          'w-full py-4 bg-red-600 text-white rounded-[2rem] font-black text-sm',
          'flex items-center justify-center gap-3 border-2 border-red-700',
          'hover:bg-red-700 transition-all shadow-lg shadow-red-600/25 active:scale-[0.98]',
          className,
        ].join(' ')}
      >
        <Trash2 size={20} />
        <span>حذف الحساب</span>
      </button>

      <AnimatePresence>
        {open && (
          <div
            className="fixed inset-0 z-[200] bg-deep-navy/70 backdrop-blur-sm flex items-center justify-center p-4"
            dir="rtl"
            onClick={() => !busy && setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden border border-red-100"
            >
              <div className="bg-gradient-to-l from-red-600 to-red-700 px-6 py-5 text-white flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-white/15 rounded-xl shrink-0">
                    <AlertTriangle size={22} />
                  </div>
                  <div>
                    <h3 className="font-black text-lg leading-tight">تأكيد حذف الحساب</h3>
                    <p className="text-xs text-red-100 font-bold mt-1">{accountLabel}</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition disabled:opacity-50"
                  aria-label="إغلاق"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4 text-right">
                <p className="text-sm font-bold text-slate-700 leading-relaxed">
                  هذا الإجراء <span className="text-red-600">نهائي ولا يمكن التراجع عنه</span>.
                  سيتم حذف بيانات حسابك الشخصية من منصة محلك، بما في ذلك:
                </p>
                <ul className="text-xs font-bold text-slate-600 space-y-2 list-disc list-inside">
                  <li>الاسم ورقم الهاتف ومواقع التوصيل المحفوظة</li>
                  <li>نقاط الولاء والإعدادات الشخصية</li>
                  <li>بيانات تسجيل الدخول (Firebase Auth)</li>
                </ul>
                <p className="text-[11px] text-slate-500 font-bold leading-relaxed bg-slate-50 border border-slate-100 rounded-xl p-3">
                  قد تُحتفظ بعض السجلات التشغيلية (مثل الطلبات السابقة) بشكل مجهول لأغراض قانونية
                  ومحاسبية وفق سياسة الخصوصية.
                </p>

                {error && (
                  <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
                    {error}
                  </p>
                )}

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleConfirm}
                    className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition active:scale-[0.98]"
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
                    className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-2xl transition"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
