import React, { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import { StorageService } from '../services/storageService';
import {
  checkForAppUpdate,
  type UpdateCheckResult,
  type UpdateManagerDefaults,
} from '../lib/updateManager';
import { UpdateModal } from './UpdateModal';

const DISMISS_STORAGE_KEY = 'UPDATE_PROMPT_DISMISSED_VERSION';

interface UpdateManagerProps {
  children: ReactNode;
  appName: string;
  currentVersion: string;
  androidStoreUrl: string;
  iosStoreUrl: string;
  defaults?: Partial<UpdateManagerDefaults>;
}

export const UpdateManager: React.FC<UpdateManagerProps> = ({
  children,
  appName,
  currentVersion,
  androidStoreUrl,
  iosStoreUrl,
  defaults,
}) => {
  const { t } = useTranslation();
  const isNative = Capacitor.isNativePlatform();
  const [result, setResult] = useState<UpdateCheckResult | null>(isNative ? null : {
    required: false,
    forceUpdate: false,
    updateTitle: t('update.title'),
    updateMessage: t('update.message'),
    updateButtonText: t('update.button'),
  });
  const [dismissed, setDismissed] = useState(false);

  const resolvedDefaults = useMemo<UpdateManagerDefaults>(
    () => ({
      updateTitle: defaults?.updateTitle ?? t('update.title'),
      updateMessage: defaults?.updateMessage ?? t('update.message'),
      updateButtonText: defaults?.updateButtonText ?? t('update.button'),
    }),
    [defaults?.updateButtonText, defaults?.updateMessage, defaults?.updateTitle, t],
  );

  useEffect(() => {
    let active = true;
    void checkForAppUpdate(currentVersion, resolvedDefaults, appName).then((nextResult) => {
      if (!active) return;

      const dismissedVersion = StorageService.get<string>(DISMISS_STORAGE_KEY);
      const softDismissed =
        !nextResult.forceUpdate &&
        nextResult.required &&
        dismissedVersion === nextResult.minimumVersion;

      setDismissed(softDismissed);
      setResult(nextResult);
    });
    return () => {
      active = false;
    };
  }, [appName, currentVersion, resolvedDefaults]);

  const handleDismiss = () => {
    if (result?.minimumVersion) {
      StorageService.save(DISMISS_STORAGE_KEY, result.minimumVersion);
    }
    setDismissed(true);
  };

  // Native only: block briefly while checking so outdated builds never flash the dashboard.
  if (!result) {
    return (
      <div
        className="fixed inset-0 z-[2147483647] flex min-h-screen items-center justify-center bg-mahalak-gradient text-white"
        dir="rtl"
        aria-label={t('update.checkingVersion')}
      >
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={38} className="animate-spin" />
          <p className="text-sm font-bold">{t('update.checkingVersion')}</p>
        </div>
      </div>
    );
  }

  const showModal = result.required && result.platform && (!dismissed || result.forceUpdate);

  if (showModal && result.forceUpdate) {
    return (
      <UpdateModal
        title={result.updateTitle}
        message={result.updateMessage}
        buttonText={result.updateButtonText}
        forceUpdate
        platform={result.platform}
        androidStoreUrl={androidStoreUrl}
        iosStoreUrl={iosStoreUrl}
        currentVersion={result.currentVersion}
        minimumVersion={result.minimumVersion}
      />
    );
  }

  return (
    <>
      {showModal && result.platform ? (
        <UpdateModal
          title={result.updateTitle}
          message={result.updateMessage}
          buttonText={result.updateButtonText}
          forceUpdate={false}
          platform={result.platform}
          androidStoreUrl={androidStoreUrl}
          iosStoreUrl={iosStoreUrl}
          currentVersion={result.currentVersion}
          minimumVersion={result.minimumVersion}
          onDismiss={handleDismiss}
        />
      ) : null}
      {children}
    </>
  );
};
