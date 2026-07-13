import React from 'react';
import { Briefcase, Check, Home, MapPin, Plus } from 'lucide-react';
import type { CustomerSavedLocation } from '@shared/types';
import { WelcomeScreenBackground } from '@shared/components/WelcomeScreenBackground';

function savedLocationIcon(label: string) {
  if (label === 'البيت') return Home;
  if (label === 'العمل') return Briefcase;
  return MapPin;
}

interface DeliveryLocationPickerSheetProps {
  open: boolean;
  onClose: () => void;
  locations: CustomerSavedLocation[];
  activeLocationId?: string | null;
  onSelect: (locationId: string) => void;
  onManageLocations: () => void;
}

export const DeliveryLocationPickerSheet: React.FC<DeliveryLocationPickerSheetProps> = ({
  open,
  onClose,
  locations,
  activeLocationId,
  onSelect,
  onManageLocations,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end" dir="rtl">
      <button
        type="button"
        className="absolute inset-0 bg-deep-navy/70 backdrop-blur-sm cursor-default"
        aria-label="إغلاق قائمة المواقع"
        onClick={onClose}
      />
      <div className="relative welcome-card-glow welcome-card-border-glow bg-deep-navy rounded-t-3xl shadow-2xl border border-white/30 overflow-hidden text-right animate-slide-up max-h-[72vh] flex flex-col">
        <WelcomeScreenBackground lite />
        <div className="relative z-10 flex flex-col max-h-[72vh]">
          <div className="welcome-card-shimmer p-4 border-b border-white/15 bg-white/5 backdrop-blur-md">
            <p className="text-sm font-black text-white">موقع التوصيل</p>
            <p className="text-[11px] text-white/55 font-bold mt-0.5">البيت، العمل، أو أي موقع آخر</p>
          </div>

          <div className="overflow-y-auto divide-y divide-white/10 flex-1">
            {locations.map((loc) => {
              const LocIcon = savedLocationIcon(loc.label);
              const isActive = activeLocationId === loc.id;
              return (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => {
                    onSelect(loc.id);
                    onClose();
                  }}
                  className={`w-full p-4 flex items-center gap-3 hover:bg-white/10 transition-colors ${isActive ? 'bg-white/10' : ''}`}
                >
                  <div className={`p-2.5 rounded-xl shrink-0 border ${isActive ? 'bg-vibrant-purple text-white border-white/30 welcome-icon-pulse' : 'bg-white/10 text-white/70 border-white/20'}`}>
                    <LocIcon size={16} />
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <p className="text-sm font-black text-white">
                      {loc.label}
                      {loc.isDefault ? ' · الافتراضي' : ''}
                    </p>
                    <p className="text-[11px] text-white/50 font-bold truncate">
                      {loc.province}{loc.area ? ` — ${loc.area}` : ''}
                    </p>
                  </div>
                  {isActive && <Check size={16} className="text-[#fff700] shrink-0" />}
                </button>
              );
            })}
            {locations.length === 0 && (
              <p className="p-6 text-center text-xs text-white/45 font-bold">
                لا توجد مواقع محفوظة بعد
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onManageLocations();
            }}
            className="welcome-btn-pulse w-full p-4 flex items-center justify-center gap-2 border-t border-white/15 text-white bg-white/5 hover:bg-white/10 transition-colors shrink-0"
          >
            <Plus size={16} />
            <span className="text-sm font-black">إضافة أو تعديل موقع</span>
          </button>
        </div>
      </div>
    </div>
  );
};
