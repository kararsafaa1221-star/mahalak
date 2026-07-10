import React from 'react';
import { Briefcase, Check, Home, MapPin, Plus } from 'lucide-react';
import type { CustomerSavedLocation } from '@shared/types';

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
        className="absolute inset-0 bg-deep-navy/60 backdrop-blur-sm cursor-default"
        aria-label="إغلاق قائمة المواقع"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-t-3xl shadow-2xl shadow-violet/15 border border-slate-100 overflow-hidden text-right animate-slide-up max-h-[72vh] flex flex-col">
        <div className="p-4 border-b border-slate-50">
          <p className="text-sm font-black text-violet">موقع التوصيل</p>
          <p className="text-[11px] text-slate-400 font-bold mt-0.5">البيت، العمل، أو أي موقع آخر</p>
        </div>

        <div className="overflow-y-auto divide-y divide-slate-50 flex-1">
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
                className={`w-full p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors ${isActive ? 'bg-violet/5' : ''}`}
              >
                <div className={`p-2.5 rounded-xl shrink-0 ${isActive ? 'bg-vibrant-purple text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <LocIcon size={16} />
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-sm font-black text-slate-800">
                    {loc.label}
                    {loc.isDefault ? ' · الافتراضي' : ''}
                  </p>
                  <p className="text-[11px] text-slate-400 font-bold truncate">
                    {loc.province}{loc.area ? ` — ${loc.area}` : ''}
                  </p>
                </div>
                {isActive && <Check size={16} className="text-vibrant-purple shrink-0" />}
              </button>
            );
          })}
          {locations.length === 0 && (
            <p className="p-6 text-center text-xs text-slate-400 font-bold">
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
          className="w-full p-4 flex items-center justify-center gap-2 border-t border-slate-50 text-vibrant-purple hover:bg-violet/5 transition-colors shrink-0"
        >
          <Plus size={16} />
          <span className="text-sm font-black">إضافة أو تعديل موقع</span>
        </button>
      </div>
    </div>
  );
};
