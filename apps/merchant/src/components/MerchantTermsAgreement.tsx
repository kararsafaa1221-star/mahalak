import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Store } from '@shared/types';
import { ChevronRight } from 'lucide-react';
import { MahalakLogo } from '@shared/components/MahalakLogo';
import { StoreIdentity } from '@shared/components/StoreIdentity';
import { isStoreVerified } from '@shared/utils/storeVerification';

const TERMS_SECTION_KEYS = [
  'acceptance',
  'responsibility',
  'billing',
  'privacy',
  'termination',
] as const;

export const MerchantTermsAgreement: React.FC<{
  currentMerchant: Store;
  onAccept: () => void | Promise<void>;
  isSaving?: boolean;
}> = ({ currentMerchant, onAccept, isSaving = false }) => {
  const { t } = useTranslation();
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      setHasScrolledToEnd(true);
    }
  };

  const merchantName = currentMerchant.ownerName || currentMerchant.shopName;

  return (
    <div className="merchant-glass-screen flex items-center justify-center p-4" dir="rtl">
    <div className="merchant-glass-sheet welcome-card-glow welcome-card-border-glow welcome-card-shimmer rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden">
        <div className="p-6 border-b border-white/15 bg-white/5">
          <div className="flex items-center gap-3 mb-2">
            <MahalakLogo className="h-10 w-10 shrink-0 object-contain" />
            <div>
              <h1 className="text-xl font-black text-white">{t('merchant.terms.pageTitle')}</h1>
              <StoreIdentity
                name={currentMerchant.shopName}
                username={currentMerchant.username}
                verified={isStoreVerified(currentMerchant)}
                size="xs"
                nameClassName="text-white/80"
                usernameClassName="text-white/60"
              />
            </div>
          </div>
          <p className="text-sm text-[#fff700] font-bold bg-amber-500/10 border border-amber-400/25 rounded-xl p-3 mt-3">
            {t('merchant.terms.acceptNotice')}
          </p>
        </div>

        <div
          className="p-6 max-h-[50vh] overflow-y-auto text-sm text-white/75 leading-relaxed space-y-5"
          onScroll={handleScroll}
        >
          {TERMS_SECTION_KEYS.map((key, index) => (
            <div key={key} className="flex gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-vibrant-purple/30 text-[#fff700] flex items-center justify-center font-bold border border-white/20">
                {index + 1}
              </div>
              <div>
                <p className="font-bold text-white mb-1">{t(`merchant.terms.sections.${key}.title`)}</p>
                <p>{t(`merchant.terms.sections.${key}.body`)}</p>
              </div>
            </div>
          ))}

          <div className="bg-white/5 rounded-2xl p-4 border border-white/15">
            <p className="font-black text-[#fff700] mb-2">{t('merchant.terms.contractTitle')}</p>
            <p className="text-[13px] text-white/80">
              {t('merchant.terms.contractBody', { name: merchantName })}
            </p>
          </div>
        </div>

        {!hasScrolledToEnd && (
          <p className="px-6 pb-2 text-xs text-rose-300 font-bold">
            {t('merchant.terms.scrollHint')}
          </p>
        )}

        <div className="p-6 border-t border-white/15 bg-white/5">
          <button
            type="button"
            disabled={!hasScrolledToEnd || isSaving}
            onClick={() => void onAccept()}
            className="w-full py-4 bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white font-black text-lg rounded-xl shadow-brand-glow hover:opacity-95 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span>{isSaving ? t('merchant.terms.saving') : t('merchant.terms.acceptBtn')}</span>
            {!isSaving && <ChevronRight size={20} className="rotate-180" />}
          </button>
        </div>
      </div>
    </div>
  );
};
