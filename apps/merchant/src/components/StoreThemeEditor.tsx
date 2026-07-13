import React, { useMemo, useState } from "react";
import { Check, Loader2, Palette, RotateCcw } from "lucide-react";
import type { Store } from "@shared/types";
import {
  DEFAULT_STORE_THEME,
  STORE_THEME_COLOR_GROUPS,
  getStoreGradientPreviewStyle,
  resolveStoreTheme,
  sanitizeStoreThemeForFirestore,
  type StoreThemeGradientDirection,
  type StoreThemeGradientStyle,
  type StoreThemeSettings,
} from "@shared/utils/storeTheme";
import { showToast } from "@shared/utils/alerts";

type Props = {
  currentMerchant: Store;
  onSave: (theme: StoreThemeSettings) => Promise<void>;
};

const GRADIENT_DIRECTIONS: Array<{ id: StoreThemeGradientDirection; label: string }> = [
  { id: "to-right", label: "يمين" },
  { id: "to-left", label: "يسار" },
  { id: "to-bottom", label: "أسفل" },
  { id: "to-top", label: "أعلى" },
  { id: "to-bottom-right", label: "مائل" },
];

function themeFromStore(store: Store): StoreThemeSettings {
  const resolved = resolveStoreTheme(store);
  return sanitizeStoreThemeForFirestore({
    enabled: resolved.enabled,
    primaryColor: resolved.primaryColor,
    secondaryColor: resolved.secondaryColor,
    accentColor: resolved.accentColor,
    textOnPrimary: resolved.textOnPrimary,
    pageBackground: resolved.pageBackground || "",
    gradientStyle: resolved.gradientStyle,
    gradientDirection: resolved.gradientDirection,
    radialPosition: resolved.radialPosition,
    headerBackground: store.storeTheme?.headerBackground || "",
    infoBarBackground: store.storeTheme?.infoBarBackground || "",
    infoBarTextColor: store.storeTheme?.infoBarTextColor || "",
    infoBarBorderColor: store.storeTheme?.infoBarBorderColor || "",
    shopNameColor: store.storeTheme?.shopNameColor || "",
    sectionTitleColor: store.storeTheme?.sectionTitleColor || "",
    pageTextColor: store.storeTheme?.pageTextColor || "",
    iconColor: store.storeTheme?.iconColor || "",
    filterBadgeColor: store.storeTheme?.filterBadgeColor || "",
    filterChipActiveText: store.storeTheme?.filterChipActiveText || "",
    buttonTextColor: store.storeTheme?.buttonTextColor || "",
    cardPrimaryColor: store.storeTheme?.cardPrimaryColor || "",
    cardSecondaryColor: store.storeTheme?.cardSecondaryColor || "",
    productCardTextColor: store.storeTheme?.productCardTextColor || "",
    productPriceColor: store.storeTheme?.productPriceColor || "",
    addToCartIconColor: store.storeTheme?.addToCartIconColor || "",
    addToCartButtonBg: store.storeTheme?.addToCartButtonBg || "",
    colorFills: store.storeTheme?.colorFills || {},
  });
}

export const StoreThemeEditor: React.FC<Props> = ({ currentMerchant, onSave }) => {
  const [draft, setDraft] = useState<StoreThemeSettings>(() => themeFromStore(currentMerchant));
  const [saving, setSaving] = useState(false);

  const previewStyle = useMemo(
    () => getStoreGradientPreviewStyle(draft) || {
      background: `linear-gradient(to right, ${draft.primaryColor}, ${draft.secondaryColor})`,
    },
    [draft],
  );

  const mvpGroups = STORE_THEME_COLOR_GROUPS.filter((g) =>
    ["core", "header", "products"].includes(g.id),
  );

  const updateField = (key: keyof StoreThemeSettings, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(sanitizeStoreThemeForFirestore(draft));
      showToast("success", "تم الحفظ", "تم تحديث مظهر متجرك بنجاح");
    } catch (e: unknown) {
      showToast("error", "فشل الحفظ", e instanceof Error ? e.message : "تعذر حفظ الثيم");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-[2rem] p-6 shadow-sm border space-y-5 merchant-brand-card relative overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-[#fff700] flex items-center gap-2">
            <Palette size={18} />
            مظهر صفحة المتجر
          </h3>
          <p className="text-xs text-white/70 font-bold mt-1">
            خصّص الألوان كما يراها الزبون في تطبيق محلك
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs font-black text-white bg-white/10 border border-white/20 px-3 py-2 rounded-xl cursor-pointer">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(e) => setDraft((prev) => ({ ...prev, enabled: e.target.checked }))}
            className="accent-[#fff700]"
          />
          تفعيل الثيم
        </label>
      </div>

      <div
        className="h-24 rounded-2xl border border-white/20 relative overflow-hidden flex items-end p-4"
        style={previewStyle}
      >
        <span className="text-white text-sm font-black drop-shadow">معاينة التدرج</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] text-white/60 font-bold mb-1">نوع التدرج</label>
          <select
            value={draft.gradientStyle || "linear"}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                gradientStyle: e.target.value as StoreThemeGradientStyle,
              }))
            }
            className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 text-xs font-bold"
          >
            <option value="linear">خطي</option>
            <option value="radial">دائري</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] text-white/60 font-bold mb-1">اتجاه التدرج</label>
          <select
            value={draft.gradientDirection || "to-right"}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                gradientDirection: e.target.value as StoreThemeGradientDirection,
              }))
            }
            className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 text-xs font-bold"
          >
            {GRADIENT_DIRECTIONS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {mvpGroups.map((group) => (
        <div key={group.id} className="space-y-3">
          <div>
            <h4 className="text-sm font-black text-[#fff700]">{group.title}</h4>
            <p className="text-[10px] text-white/50 font-bold">{group.description}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {group.fields.map((field) => (
              <label key={field.key} className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                <div className="min-w-0">
                  <span className="block text-xs font-black text-white truncate">{field.label}</span>
                  <span className="block text-[9px] text-white/45 font-bold truncate">{field.hint}</span>
                </div>
                <input
                  type="color"
                  value={(() => {
                    const raw = String(draft[field.key] || "");
                    if (/^#[0-9A-Fa-f]{6}$/.test(raw)) return raw;
                    const fallback = String(DEFAULT_STORE_THEME[field.key] || "#7B3DFF");
                    return /^#[0-9A-Fa-f]{6}$/.test(fallback) ? fallback : "#7B3DFF";
                  })()}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  className="w-10 h-10 rounded-lg border border-white/20 bg-transparent cursor-pointer shrink-0"
                />
              </label>
            ))}
          </div>
        </div>
      ))}

      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        <button
          type="button"
          onClick={() => setDraft(themeFromStore(currentMerchant))}
          className="flex-1 py-3 rounded-xl border border-white/20 text-white/80 font-bold text-xs flex items-center justify-center gap-2 hover:bg-white/5"
        >
          <RotateCcw size={14} />
          استعادة الحالي
        </button>
        <button
          type="button"
          onClick={() => setDraft({ ...DEFAULT_STORE_THEME })}
          className="flex-1 py-3 rounded-xl border border-white/20 text-white/80 font-bold text-xs hover:bg-white/5"
        >
          افتراضي المنصة
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="flex-[1.4] py-3 rounded-xl bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white font-black text-xs flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          حفظ المظهر
        </button>
      </div>
    </div>
  );
};
