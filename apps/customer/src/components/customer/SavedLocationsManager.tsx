import React, { useMemo, useState } from 'react';
import { Home, Briefcase, MapPin, Plus, Star, Trash2, X, Check, Pencil } from 'lucide-react';
import { CustomerLocationPicker } from '@/components/CustomerLocationPicker';
import type { CustomerSavedLocation, Province } from '@shared/types';
import {
  createSavedLocation,
  formatSavedLocationSummary,
  isSavedLocationAddressComplete,
  LOCATION_PRESETS,
  setDefaultSavedLocation,
  type LocationPreset,
} from '@shared/utils/customerLocations';

interface SavedLocationsManagerProps {
  locations: CustomerSavedLocation[];
  onChange: (locations: CustomerSavedLocation[]) => void;
  provinces: Province[];
  labelClassName?: string;
  hideHeader?: boolean;
}

interface AddressDraft {
  province: string;
  area: string;
  mahalla: string;
  zuqaq: string;
  dar: string;
  landmark: string;
}

const emptyAddressDraft = (): AddressDraft => ({
  province: 'بغداد',
  area: '',
  mahalla: '',
  zuqaq: '',
  dar: '',
  landmark: '',
});

function locationIcon(label: string) {
  if (label === 'البيت') return Home;
  if (label === 'العمل') return Briefcase;
  return MapPin;
}

const fieldClass =
  'w-full bg-white/10 border border-white/20 px-4 py-3.5 rounded-2xl text-xs font-black text-white placeholder:text-white/50 focus:ring-4 focus:ring-white/10 focus:border-white/40 transition-all outline-none';
const labelClass = 'block text-[10px] font-black text-purple-100/80 mb-2 mr-1';

function AddressFields({
  draft,
  onChange,
  provinces,
}: {
  draft: AddressDraft;
  onChange: (next: AddressDraft) => void;
  provinces: Province[];
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>المحافظة</label>
          <select
            value={draft.province}
            onChange={(e) => onChange({ ...draft, province: e.target.value })}
            className={`${fieldClass} appearance-none`}
          >
            {provinces.map((p) => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>المنطقة</label>
          <input
            type="text"
            value={draft.area}
            onChange={(e) => onChange({ ...draft, area: e.target.value })}
            className={fieldClass}
            placeholder="مثال: الكرادة"
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>محلة</label>
          <input
            type="text"
            value={draft.mahalla}
            onChange={(e) => onChange({ ...draft, mahalla: e.target.value })}
            className={fieldClass}
            placeholder="محلة"
          />
        </div>
        <div>
          <label className={labelClass}>زقاق</label>
          <input
            type="text"
            value={draft.zuqaq}
            onChange={(e) => onChange({ ...draft, zuqaq: e.target.value })}
            className={fieldClass}
            placeholder="زقاق"
          />
        </div>
        <div>
          <label className={labelClass}>دار</label>
          <input
            type="text"
            value={draft.dar}
            onChange={(e) => onChange({ ...draft, dar: e.target.value })}
            className={fieldClass}
            placeholder="دار"
          />
        </div>
      </div>
      <div>
        <label className={labelClass}>أقرب نقطة دالة</label>
        <input
          type="text"
          value={draft.landmark}
          onChange={(e) => onChange({ ...draft, landmark: e.target.value })}
          className={fieldClass}
          placeholder="مثال: قرب مدرسة..."
        />
      </div>
    </div>
  );
}

export const SavedLocationsManager: React.FC<SavedLocationsManagerProps> = ({
  locations,
  onChange,
  provinces,
  labelClassName = 'block text-xs font-bold text-white mb-1',
  hideHeader = false,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [preset, setPreset] = useState<LocationPreset | 'custom'>('البيت');
  const [customLabel, setCustomLabel] = useState('');
  const [addressDraft, setAddressDraft] = useState<AddressDraft>(emptyAddressDraft);
  const [draftLat, setDraftLat] = useState<number | undefined>();
  const [draftLng, setDraftLng] = useState<number | undefined>();
  const [draftMapAddress, setDraftMapAddress] = useState('');

  const resolvedLabel = useMemo(() => {
    if (preset === 'custom') return customLabel.trim();
    return preset;
  }, [preset, customLabel]);

  const resetDraft = () => {
    setIsAdding(false);
    setEditingId(null);
    setPreset('البيت');
    setCustomLabel('');
    setAddressDraft(emptyAddressDraft());
    setDraftLat(undefined);
    setDraftLng(undefined);
    setDraftMapAddress('');
  };

  const startEdit = (loc: CustomerSavedLocation) => {
    setIsAdding(false);
    setEditingId(loc.id);
    setPreset(LOCATION_PRESETS.includes(loc.label as LocationPreset) ? (loc.label as LocationPreset) : 'custom');
    setCustomLabel(LOCATION_PRESETS.includes(loc.label as LocationPreset) ? '' : loc.label);
    setAddressDraft({
      province: loc.province || 'بغداد',
      area: loc.area || '',
      mahalla: loc.mahalla || '',
      zuqaq: loc.zuqaq || '',
      dar: loc.dar || '',
      landmark: loc.landmark || '',
    });
    setDraftLat(loc.lat);
    setDraftLng(loc.lng);
    setDraftMapAddress(loc.address || '');
  };

  const validateDraft = (label: string) => {
    if (!label) {
      alert('يرجى إدخال اسم الموقع');
      return false;
    }
    if (!isSavedLocationAddressComplete(addressDraft)) {
      alert('يرجى إكمال المحافظة والمنطقة وأقرب نقطة دالة');
      return false;
    }
    if (draftLat === undefined || draftLng === undefined) {
      alert('يرجى تحديد الموقع على الخريطة');
      return false;
    }
    return true;
  };

  const handleAddLocation = () => {
    if (!validateDraft(resolvedLabel)) return;
    if (locations.some((loc) => loc.label === resolvedLabel)) {
      alert('يوجد موقع محفوظ بنفس الاسم. اختر اسماً مختلفاً.');
      return;
    }

    const isFirst = locations.length === 0;
    onChange([
      ...locations,
      createSavedLocation({
        label: resolvedLabel,
        lat: draftLat!,
        lng: draftLng!,
        province: addressDraft.province,
        area: addressDraft.area.trim(),
        mahalla: addressDraft.mahalla.trim(),
        zuqaq: addressDraft.zuqaq.trim(),
        dar: addressDraft.dar.trim(),
        landmark: addressDraft.landmark.trim(),
        mapAddress: draftMapAddress || undefined,
        isDefault: isFirst,
      }),
    ]);
    resetDraft();
  };

  const handleUpdateLocation = () => {
    if (!editingId) return;
    if (!validateDraft(resolvedLabel)) return;

    const duplicate = locations.some((loc) => loc.id !== editingId && loc.label === resolvedLabel);
    if (duplicate) {
      alert('يوجد موقع محفوظ بنفس الاسم. اختر اسماً مختلفاً.');
      return;
    }

    onChange(
      locations.map((loc) =>
        loc.id === editingId
          ? {
              ...loc,
              label: resolvedLabel,
              lat: draftLat!,
              lng: draftLng!,
              province: addressDraft.province,
              area: addressDraft.area.trim(),
              mahalla: addressDraft.mahalla.trim(),
              zuqaq: addressDraft.zuqaq.trim(),
              dar: addressDraft.dar.trim(),
              landmark: addressDraft.landmark.trim(),
              address: draftMapAddress || undefined,
            }
          : loc,
      ),
    );
    resetDraft();
  };

  const handleDelete = (id: string) => {
    const next = locations.filter((loc) => loc.id !== id);
    if (next.length > 0 && !next.some((loc) => loc.isDefault)) {
      next[0] = { ...next[0], isDefault: true };
    }
    onChange(next);
    if (editingId === id) resetDraft();
  };

  const handleSetDefault = (id: string) => {
    onChange(setDefaultSavedLocation(locations, id));
  };

  const renderLocationForm = (mode: 'add' | 'edit') => (
    <div className="space-y-4 p-4 rounded-2xl welcome-card-border-glow bg-white/5 border border-white/20 animate-fade-in text-right">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-[#fff700]">{mode === 'add' ? 'موقع جديد' : 'تعديل الموقع'}</span>
        <button type="button" onClick={resetDraft} className="p-1.5 rounded-lg hover:bg-white/10 text-white/70">
          <X size={16} />
        </button>
      </div>

      <div>
        <label className={labelClass}>اسم الموقع</label>
        <div className="flex flex-wrap gap-2">
          {LOCATION_PRESETS.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setPreset(name)}
              className={`px-3 py-2 rounded-xl text-[10px] font-black border transition-colors ${
                preset === name
                  ? 'bg-brand-horizontal text-white border-white/30 shadow-brand-glow'
                  : 'bg-white/10 text-white/80 border-white/20 hover:bg-white/15'
              }`}
            >
              {name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPreset('custom')}
            className={`px-3 py-2 rounded-xl text-[10px] font-black border transition-colors ${
              preset === 'custom'
                ? 'bg-brand-horizontal text-white border-white/30 shadow-brand-glow'
                : 'bg-white/10 text-white/80 border-white/20 hover:bg-white/15'
            }`}
          >
            مكان آخر
          </button>
        </div>
        {preset === 'custom' && (
          <input
            type="text"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="مثال: بيت العائلة، الجامعة..."
            className={`${fieldClass} mt-3`}
          />
        )}
      </div>

      <AddressFields draft={addressDraft} onChange={setAddressDraft} provinces={provinces} />

      <CustomerLocationPicker
        key={`${mode}-${editingId ?? 'new'}-${draftLat}-${draftLng}`}
        initialLat={draftLat}
        initialLng={draftLng}
        onLocationSelect={(lat, lng, address) => {
          setDraftLat(lat);
          setDraftLng(lng);
          setDraftMapAddress(address);
        }}
        label="تحديد الموقع على الخريطة"
        labelClassName={labelClassName}
        required
      />

      <button
        type="button"
        onClick={mode === 'add' ? handleAddLocation : handleUpdateLocation}
        className="welcome-btn-pulse w-full py-3 bg-brand-horizontal border border-white/30 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-brand-glow hover:opacity-95 transition-all active:scale-95"
      >
        <Check size={14} />
        {mode === 'add' ? 'حفظ هذا الموقع' : 'تحديث الموقع'}
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      {!hideHeader ? (
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-[10px] font-black text-white uppercase tracking-widest px-1 flex items-center gap-1.5">
            <MapPin size={12} />
            مواقع التوصيل المحفوظة
          </h4>
          {!isAdding && !editingId && (
            <button
              type="button"
              onClick={() => {
                resetDraft();
                setIsAdding(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-[#fff700] text-[10px] font-black border border-white/20 hover:bg-white/15 transition-colors"
            >
              <Plus size={12} />
              إضافة موقع
            </button>
          )}
        </div>
      ) : (
        !isAdding && !editingId && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                resetDraft();
                setIsAdding(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-[#fff700] text-[10px] font-black border border-white/20 hover:bg-white/15 transition-colors"
            >
              <Plus size={12} />
              إضافة موقع
            </button>
          </div>
        )
      )}

      {locations.length > 0 ? (
        <div className="space-y-2">
          {locations.map((loc) => {
            const Icon = locationIcon(loc.label);
            const isEditing = editingId === loc.id;

            return (
              <React.Fragment key={loc.id}>
                <div className="flex items-start gap-3 p-3.5 rounded-2xl welcome-card-border-glow bg-white/5 border border-white/20">
                  <div className="p-2.5 rounded-xl bg-white/15 border border-white/20 text-[#fff700] shrink-0">
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <span className="text-xs font-black text-[#fff700]">{loc.label}</span>
                      {loc.isDefault && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#fff700]/15 text-[#fff700] text-[9px] font-black border border-[#fff700]/30">
                          <Star size={10} fill="currentColor" />
                          الافتراضي
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-purple-100/90 mt-1 leading-relaxed">
                      {formatSavedLocationSummary(loc)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(loc)}
                      className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 hover:text-[#fff700] transition-colors"
                      title="تعديل الموقع"
                    >
                      <Pencil size={14} />
                    </button>
                    {!loc.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(loc.id)}
                        className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 hover:text-[#fff700] transition-colors"
                        title="تعيين كموقع افتراضي"
                      >
                        <Star size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(loc.id)}
                      className="p-2 rounded-xl bg-rose-500/15 text-rose-200 hover:bg-rose-500/25 transition-colors"
                      title="حذف الموقع"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {isEditing && renderLocationForm('edit')}
              </React.Fragment>
            );
          })}
        </div>
      ) : (
        <p className="text-[10px] text-purple-100/70 font-bold text-center py-2">
          لم تُضف أي مواقع بعد. أضف موقع البيت أو العمل مع العنوان الكامل.
        </p>
      )}

      {isAdding && renderLocationForm('add')}
    </div>
  );
};
