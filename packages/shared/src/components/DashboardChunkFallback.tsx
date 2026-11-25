import React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

export const DashboardChunkFallback: React.FC<{ label?: string }> = ({
  label,
}) => {
  const { t } = useTranslation();
  const displayLabel = label ?? t('dashboardChunk.loadingSection');

  return (
  <div
    className="flex min-h-48 w-full items-center justify-center rounded-[2rem] border border-white/20 bg-white/5 text-white"
    role="status"
    aria-live="polite"
  >
    <div className="flex items-center gap-2 text-xs font-black">
      <Loader2 size={18} className="animate-spin text-[#fff700]" />
      <span>{displayLabel}</span>
    </div>
  </div>
  );
};
