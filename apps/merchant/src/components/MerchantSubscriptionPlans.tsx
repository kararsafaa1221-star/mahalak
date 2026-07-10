import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Crown, MessageCircle, Store as StoreIcon } from 'lucide-react';
import type { Store } from '@shared/types';
import {
  buildMerchantRenewalWhatsAppUrl,
  formatIqd,
  type MerchantRenewalPageResolved,
} from '@shared/constants/merchantRenewalPlans';

type Props = {
  store: Store;
  supportWhatsApp: string;
  pageSettings: MerchantRenewalPageResolved;
  onClose: () => void;
  isRenewal?: boolean;
};

export const MerchantSubscriptionPlans: React.FC<Props> = ({
  store,
  supportWhatsApp,
  pageSettings,
  onClose,
  isRenewal = false,
}) => {
  const title = isRenewal ? pageSettings.titleRenewal : pageSettings.titleActivation;

  const openWhatsAppForPlan = (planLabelAr: string) => {
    const url = buildMerchantRenewalWhatsAppUrl(
      supportWhatsApp,
      {
        shopName: store.shopName,
        username: store.username,
        phone: store.phone,
      },
      planLabelAr,
    );
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <AnimatePresence>
      <motion.div
        key="subscription-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-deep-navy/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 400 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-sm bg-white sm:rounded-2xl rounded-2xl shadow-2xl shadow-vibrant-purple/20 overflow-hidden border border-violet/15"
          dir="rtl"
        >
          <div className="relative bg-gradient-to-l from-vibrant-purple to-deep-navy px-3 py-2.5 text-white">
            <button
              type="button"
              onClick={onClose}
              className="absolute top-2 left-2 z-10 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              aria-label="إغلاق"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2 pr-1 pl-8">
              <div className="shrink-0 w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Crown size={16} className="text-violet" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-black leading-tight">{title}</h2>
                <p className="text-[9px] text-violet/90 font-bold leading-snug mt-0.5">
                  {pageSettings.subtitle}
                </p>
                <div className="flex items-center gap-1.5 mt-1 min-w-0">
                  {store.logo ? (
                    <img src={store.logo} alt="" className="w-4 h-4 rounded-full object-cover shrink-0" />
                  ) : (
                    <StoreIcon size={10} className="text-violet shrink-0" />
                  )}
                  <span className="text-[9px] font-bold text-white/80 truncate">{store.shopName}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="px-2.5 py-2 space-y-1.5 bg-slate-50/50">
            {pageSettings.plans.map((plan) => {
              const isFeatured = plan.highlight;
              return (
                <div
                  key={plan.id}
                  className={[
                    'relative flex items-center gap-2 rounded-xl px-2.5 py-2 bg-white transition-all',
                    isFeatured
                      ? 'border-2 border-vibrant-purple/35 shadow-sm shadow-vibrant-purple/10'
                      : 'border border-slate-100',
                  ].join(' ')}
                >
                  {plan.badge && (
                    <span
                      className={[
                        'absolute -top-1.5 right-2 text-[7px] font-black px-1.5 py-0.5 rounded-full leading-none',
                        isFeatured
                          ? 'bg-amber-500 text-white'
                          : 'bg-vibrant-purple text-white',
                      ].join(' ')}
                    >
                      {plan.badge}
                      {isFeatured ? ' 🔥' : ''}
                    </span>
                  )}

                  <div className="flex-1 min-w-0 text-right">
                    <p className="text-[11px] font-black text-deep-navy leading-tight">{plan.labelAr}</p>
                    <div className="flex items-center justify-end gap-2 mt-0.5 flex-wrap">
                      <span className="text-[8px] font-bold text-vibrant-purple bg-vibrant-purple/8 px-1.5 py-0.5 rounded-md">
                        {formatIqd(plan.dailyIqd)} د.ع/يوم
                      </span>
                      <span className="text-base font-black text-vibrant-purple tabular-nums leading-none">
                        {formatIqd(plan.priceIqd)}
                        <span className="text-[9px] font-bold text-slate-400 mr-0.5">د.ع</span>
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openWhatsAppForPlan(plan.labelAr)}
                    className="shrink-0 flex flex-col items-center justify-center gap-0.5 bg-[#25D366] hover:bg-[#20BD5A] text-white rounded-lg px-2.5 py-2 transition-all active:scale-95 min-w-[52px]"
                    title={isRenewal ? 'تجديد عبر واتساب' : 'تواصل مع الدعم'}
                  >
                    <MessageCircle size={14} strokeWidth={2.5} />
                    <span className="text-[8px] font-black leading-none">{pageSettings.whatsappButtonLabel}</span>
                  </button>
                </div>
              );
            })}
          </div>

          <p className="text-[8px] text-center text-slate-400 font-bold px-3 py-2 bg-white border-t border-slate-100 leading-snug">
            {pageSettings.footerNote}
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
