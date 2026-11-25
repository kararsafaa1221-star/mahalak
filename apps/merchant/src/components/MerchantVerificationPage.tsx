import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, MessageCircle, ShieldCheck } from 'lucide-react';
import type { Store } from '@shared/types';
import { VerifiedBadge } from '@shared/components/VerifiedBadge';
import {
  buildMerchantVerificationWhatsAppUrl,
  formatVerificationIqd,
  resolveAllVerificationPlans,
} from '@shared/constants/verificationPricing';
import {
  localizeVerificationBenefitText,
  localizeVerificationBenefitsTitle,
  resolveEnabledVerificationBenefits,
  resolveVerificationBenefitsConfig,
} from '@shared/constants/verificationBenefits';
import {
  localizeVerificationPlanBadge,
  localizeVerificationPlanLabel,
} from '@shared/i18n/localizeLabels';

type Props = {
  store: Store;
  adminSettings: Record<string, unknown>;
  supportWhatsApp: string;
};

function verificationStatusLabel(
  store: Store,
  t: (key: string, options?: Record<string, unknown>) => string,
): { title: string; detail: string; active: boolean } {
  if (!store.isVerified) {
    return {
      active: false,
      title: t('profile.verification.notVerifiedTitle'),
      detail: t('profile.verification.notVerifiedDetail'),
    };
  }
  if (store.verificationType === 'lifetime' || store.verificationExpiresAt === 'Lifetime') {
    return {
      active: true,
      title: t('profile.verification.lifetimeTitle'),
      detail: t('profile.verification.lifetimeDetail'),
    };
  }
  const expiry = store.verificationExpiresAt || '—';
  return {
    active: true,
    title: t('profile.verification.verifiedTitle'),
    detail: t('profile.verification.verifiedUntilDetail', { date: expiry }),
  };
}

export const MerchantVerificationPage: React.FC<Props> = ({
  store,
  adminSettings,
  supportWhatsApp,
}) => {
  const { t, i18n } = useTranslation();
  const plans = useMemo(() => resolveAllVerificationPlans(adminSettings), [adminSettings]);
  const benefitsConfig = useMemo(
    () => resolveVerificationBenefitsConfig(adminSettings),
    [adminSettings],
  );
  const benefits = useMemo(
    () => resolveEnabledVerificationBenefits(adminSettings),
    [adminSettings],
  );
  const status = verificationStatusLabel(store, t);
  const benefitsTitle = localizeVerificationBenefitsTitle(benefitsConfig, i18n.language);

  const openWhatsAppForPlan = (planLabelAr: string) => {
    const url = buildMerchantVerificationWhatsAppUrl(
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
    <div className="space-y-4 animate-fade-in text-white" dir="rtl">
      <div className="welcome-card-glow welcome-card-border-glow welcome-card-shimmer bg-white/5 border border-white/30 backdrop-blur-md p-5 rounded-[2rem] shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-l from-sky-500/20 to-transparent pointer-events-none" />
        <div className="relative z-10 flex items-center gap-3">
          <span className="welcome-icon-pulse p-2 bg-white/15 border border-white/25 rounded-xl">
            <BadgeCheck className="text-[#fff700]" size={20} />
          </span>
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-1.5">
              {t('profile.verification.title')}
              {status.active && <VerifiedBadge size={16} />}
            </h2>
            <p className="text-[10px] text-white/70 font-bold">{t('profile.verification.pageSubtitle')}</p>
          </div>
        </div>
      </div>

      <div
        className={`welcome-card-glow welcome-card-border-glow rounded-[2rem] p-5 border backdrop-blur-md ${
          status.active
            ? 'bg-sky-500/15 border-sky-300/30'
            : 'bg-white/5 border-white/30'
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 rounded-2xl shrink-0 ${
              status.active ? 'bg-sky-500/30 text-sky-100' : 'bg-white/10 text-white/70'
            }`}
          >
            <ShieldCheck size={22} />
          </div>
          <div className="min-w-0 text-right">
            <p className="text-sm font-black">{status.title}</p>
            <p className="text-[11px] text-white/70 font-bold mt-1 leading-relaxed">{status.detail}</p>
            {status.active && store.verificationIsGift && (
              <p className="text-[10px] font-bold text-amber-200/90 mt-2">{t('profile.verification.giftGranted')}</p>
            )}
          </div>
        </div>
      </div>

      <div className="welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2rem] p-4 space-y-2.5">
        <h3 className="text-sm font-black text-white px-1">{benefitsTitle}</h3>
        {benefits.length === 0 ? (
          <p className="text-center text-white/50 text-xs font-bold py-4">
            {t('profile.verification.noBenefits')}
          </p>
        ) : (
          benefits.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-2.5 rounded-2xl border border-white/15 bg-white/5 px-3 py-2.5"
            >
              <VerifiedBadge size={14} className="shrink-0 mt-0.5" />
              <p className="text-[11px] font-bold text-white/85 leading-relaxed">
                {localizeVerificationBenefitText(item, i18n.language)}
              </p>
            </div>
          ))
        )}
      </div>

      <div className="welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2rem] p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 px-1">
          <h3 className="text-sm font-black text-white">{t('profile.verification.plansTitle')}</h3>
          <span className="text-[9px] font-bold text-white/50">{t('profile.verification.plansViaSupport')}</span>
        </div>

        {plans.length === 0 ? (
          <p className="text-center text-white/50 text-xs font-bold py-6">{t('profile.verification.noPlans')}</p>
        ) : (
          plans.map((plan) => {
            const daily = plan.durationDays ? Math.round(plan.priceIqd / plan.durationDays) : 0;
            const isFeatured = !!plan.highlight;
            const planLabel = localizeVerificationPlanLabel(plan);
            const planBadge = localizeVerificationPlanBadge(plan);
            return (
              <div
                key={plan.id}
                className={[
                  'relative flex items-center gap-2 rounded-2xl px-3 py-3 bg-white/5 backdrop-blur-md transition-all',
                  isFeatured
                    ? 'border-2 border-[#fff700]/35 shadow-sm shadow-vibrant-purple/20'
                    : 'border border-white/15',
                ].join(' ')}
              >
                {planBadge && (
                  <span
                    className={[
                      'absolute -top-2 right-3 text-[8px] font-black px-2 py-0.5 rounded-full leading-none',
                      isFeatured ? 'bg-amber-500 text-white' : 'bg-sky-500 text-white',
                    ].join(' ')}
                  >
                    {planBadge}
                  </span>
                )}

                <div className="flex-1 min-w-0 text-right pt-0.5">
                  <p className="text-xs font-black text-white leading-tight">{planLabel}</p>
                  <p className="text-[9px] text-white/55 font-bold mt-0.5">{t('profile.verification.daysUnit', { count: plan.durationDays })}</p>
                  <div className="flex items-center justify-end gap-2 mt-1 flex-wrap">
                    <span className="text-[8px] font-bold text-[#fff700] bg-white/10 border border-white/15 px-1.5 py-0.5 rounded-md">
                      {t('profile.verification.perDay', { price: formatVerificationIqd(daily) })}
                    </span>
                    <span className="text-base font-black text-[#fff700] tabular-nums leading-none">
                      {formatVerificationIqd(plan.priceIqd)}
                      <span className="text-[9px] font-bold text-white/50 mr-0.5">{t('merchant.delivery.currency')}</span>
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openWhatsAppForPlan(plan.labelAr)}
                  className="shrink-0 flex flex-col items-center justify-center gap-0.5 bg-[#25D366] hover:bg-[#20BD5A] text-white rounded-xl px-3 py-2.5 transition-all active:scale-95 min-w-[56px]"
                  title={t('profile.verification.whatsappTitle')}
                >
                  <MessageCircle size={16} strokeWidth={2.5} />
                  <span className="text-[8px] font-black leading-none">{t('profile.verification.whatsapp')}</span>
                </button>
              </div>
            );
          })
        )}

        <p className="text-[9px] text-center text-white/50 font-bold px-2 pt-1 leading-snug">
          {t('profile.verification.afterPlanHint')}
        </p>
      </div>
    </div>
  );
};
