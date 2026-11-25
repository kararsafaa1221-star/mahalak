import React from 'react';
import { Browser } from '@capacitor/browser';
import { Download, Loader2, ShieldCheck, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { UpdatePlatform } from '../lib/updateManager';

export interface UpdateModalProps {
  title: string;
  message: string;
  buttonText: string;
  forceUpdate: boolean;
  platform: UpdatePlatform;
  androidStoreUrl: string;
  iosStoreUrl: string;
  currentVersion?: string;
  minimumVersion?: string;
  onDismiss?: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  title,
  message,
  buttonText,
  forceUpdate,
  platform,
  androidStoreUrl,
  iosStoreUrl,
  currentVersion,
  minimumVersion,
  onDismiss,
}) => {
  const { t } = useTranslation();
  const [openingStore, setOpeningStore] = React.useState(false);
  const storeUrl = platform === 'android' ? androidStoreUrl : iosStoreUrl;

  const openStore = async () => {
    setOpeningStore(true);
    try {
      await Browser.open({ url: storeUrl });
    } catch (error) {
      console.error('[UpdateModal] Could not open the app store.', error);
      window.location.assign(storeUrl);
    } finally {
      setOpeningStore(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2147483647] flex min-h-screen items-center justify-center overflow-y-auto bg-[#0B1320]/95 p-5 text-white safe-area-top safe-area-bottom"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-modal-title"
      aria-describedby="update-modal-description"
    >
      <div className="relative w-full max-w-md rounded-[2rem] border border-white/10 bg-white/5 p-6 text-center shadow-2xl backdrop-blur-xl sm:p-8">
        {!forceUpdate && onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="touch-target-sm absolute left-4 top-4 rounded-full p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label={t('common.close')}
          >
            <X size={20} aria-hidden="true" />
          </button>
        ) : null}

        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-vibrant-purple shadow-lg shadow-vibrant-purple/30">
          <Download size={38} aria-hidden="true" />
        </div>

        <h1 id="update-modal-title" className="mb-3 text-2xl font-black">
          {title}
        </h1>
        <p id="update-modal-description" className="mb-6 text-sm font-semibold leading-7 text-white/75">
          {message}
        </p>

        {forceUpdate ? (
          <div className="mb-6 flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-300">
            <ShieldCheck size={18} aria-hidden="true" />
            {t('update.requiredToContinue')}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => void openStore()}
          disabled={openingStore}
          className="touch-target flex w-full items-center justify-center gap-2 rounded-2xl bg-[#fff700] px-5 py-4 text-sm font-black text-[#0B1320] shadow-lg transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
        >
          {openingStore ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
          {buttonText}
        </button>

        {!forceUpdate && onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="touch-target mt-3 w-full rounded-2xl px-5 py-3 text-sm font-bold text-white/55 transition hover:bg-white/5 hover:text-white/80"
          >
            {t('update.later')}
          </button>
        ) : null}

        {currentVersion && minimumVersion ? (
          <p className="mt-4 text-[11px] font-semibold text-white/40">
            {t('update.versionInfo', { current: currentVersion, minimum: minimumVersion })}
          </p>
        ) : null}
      </div>
    </div>
  );
};
