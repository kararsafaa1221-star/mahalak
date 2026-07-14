import React from 'react';
import { MapPin } from 'lucide-react';
import { LegalSheetModal } from '@shared/components/LegalSheetModal';
import { LegalGlowCard } from '@shared/components/LegalGlowCard';
import type { CustomerSavedLocation, Province } from '@shared/types';
import { SavedLocationsManager } from './SavedLocationsManager';

interface SavedLocationsModalProps {
  open: boolean;
  onClose: () => void;
  locations: CustomerSavedLocation[];
  onChange: (locations: CustomerSavedLocation[]) => void;
  provinces: Province[];
  onSave: () => void;
  isSaving?: boolean;
}

export const SavedLocationsModal: React.FC<SavedLocationsModalProps> = ({
  open,
  onClose,
  locations,
  onChange,
  provinces,
  onSave,
  isSaving = false,
}) => {
  return (
    <LegalSheetModal
      open={open}
      onClose={onClose}
      title="مواقع التوصيل المحفوظة"
      icon={MapPin}
      variant="home"
    >
      <div className="animate-fade-in font-tajawal text-right space-y-4" dir="rtl">
        <header className="welcome-card-glow welcome-card-border-glow welcome-card-shimmer bg-white/5 border border-white/30 backdrop-blur-md rounded-[2.5rem] p-5 sm:p-6 text-white shadow-2xl relative overflow-hidden text-center">
          <div className="absolute top-0 right-0 w-44 h-44 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none" />
          <div className="relative z-10">
            <div className="welcome-icon-pulse mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-[#fff700] bg-brand-horizontal border border-white shadow-brand-glow-lg">
              <MapPin size={28} />
            </div>
            <h1 className="font-black text-[#fff700] mb-1.5 text-lg">مواقع التوصيل المحفوظة</h1>
            <p className="text-[10px] sm:text-xs font-bold text-purple-100">
              {locations.length > 0
                ? `${locations.length} موقع محفوظ — البيت، العمل، وأماكن أخرى`
                : 'أضف مواقع البيت والعمل وغيرها لسرعة الطلب'}
            </p>
          </div>
        </header>

        <LegalGlowCard>
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-white/15 border border-white/20 text-[#fff700] shrink-0 shadow-sm">
              <MapPin size={16} />
            </div>
            <h2 className="font-black text-[#fff700] text-sm sm:text-base leading-relaxed pt-0.5">
              إدارة عناوينك
            </h2>
          </div>

          <SavedLocationsManager
            locations={locations}
            onChange={onChange}
            provinces={provinces}
            hideHeader
            labelClassName="block text-[10px] font-black text-purple-100/80 mb-2 mr-1"
          />

          <div className="pt-4">
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="welcome-btn-pulse w-full py-4 bg-brand-horizontal border border-white/30 text-white rounded-2xl text-sm font-black shadow-brand-glow transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
            >
              {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </button>
          </div>
        </LegalGlowCard>
      </div>
    </LegalSheetModal>
  );
};
