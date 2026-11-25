import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  ChevronRight,
  Eye,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Store as StoreIcon,
  Truck,
  X,
} from 'lucide-react';
import type { Product, Store } from '@shared/types';
import { getStoreCategoryLabel } from '@shared/constants';
import { StoreIdentity } from '@shared/components/StoreIdentity';
import { StoreProductSections } from '@shared/components/StoreProductSections';
import { ProductImage } from '@shared/components/ProductImage';
import { isStoreVerified } from '@shared/utils/storeVerification';
import { getStoreDeliveryInfo } from '@shared/utils/delivery';
import {
  resolveStoreTheme,
  storeInfoBarProps,
  storePageBackgroundProps,
  storeThemeCssVars,
  storeGradientToLeftProps,
  themeFieldTextStyle,
} from '@shared/utils/storeTheme';
import { showToast } from '@shared/utils/alerts';
import 'leaflet/dist/leaflet.css';

type MerchantStorePreviewProps = {
  store: Store;
  products: Product[];
  onClose: () => void;
};

function FitStoreMarker({ position }: { position: [number, number] }) {
  const map = useMap();
  React.useEffect(() => {
    map.setView(position, 15, { animate: false });
    map.invalidateSize({ animate: false });
  }, [map, position]);
  return null;
}

function buildStorePin(store: Store): L.DivIcon {
  const logo = String(store.logo || '').trim();
  const safeLogo = logo && !logo.includes('"') && !logo.includes('<') ? logo : '';
  const initial = (store.shopName || 'م').trim().charAt(0) || 'م';
  const inner = safeLogo
    ? `<img src="${safeLogo}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:9999px;display:block;" />`
    : `<span style="font-size:13px;font-weight:900;color:#fff;">${initial}</span>`;
  return L.divIcon({
    className: 'stores-map-marker',
    html: `<div class="stores-map-marker__pin">${inner}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  });
}

function previewOnlyToast(
  action: string,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  showToast('info', t('merchant.storePreview.previewModeTitle'), t('merchant.storePreview.previewModeBody', { action }));
}

export const MerchantStorePreview: React.FC<MerchantStorePreviewProps> = ({
  store,
  products,
  onClose,
}) => {
  const { t } = useTranslation();
  const [showMapPreview, setShowMapPreview] = useState(false);
  const theme = useMemo(() => resolveStoreTheme(store), [store]);
  const categoryLabel = getStoreCategoryLabel(store.category);
  const delivery = getStoreDeliveryInfo(store, store.province || 'بغداد');
  const publishedProducts = useMemo(
    () => products.filter((p) => p.storeId === store.id && p.status === 'published'),
    [products, store.id],
  );

  const hasMapLocation =
    store.showMap !== false &&
    typeof store.lat === 'number' &&
    typeof store.lng === 'number' &&
    Number.isFinite(store.lat) &&
    Number.isFinite(store.lng);

  const mapPosition: [number, number] | null = hasMapLocation
    ? [store.lat as number, store.lng as number]
    : null;

  const addressLine = [store.province, store.area, store.landmark].filter(Boolean).join(' · ');
  const pinIcon = useMemo(() => buildStorePin(store), [store]);

  return (
    <div
      className="fixed inset-0 z-[160] flex flex-col overflow-hidden bg-deep-navy animate-fade-in"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label={t('merchant.storePreview.ariaLabel')}
    >
      {/* شريط المعاينة */}
      <div className="shrink-0 z-20 bg-gradient-to-l from-amber-500 to-amber-400 text-slate-900 px-3 py-2.5 flex items-center justify-between gap-2 shadow-lg border-b border-amber-300/40">
        <div className="min-w-0 flex items-center gap-2">
          <span className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900/10">
            <Eye size={16} />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] font-black truncate">{t('merchant.storePreview.bannerTitle')}</p>
            <p className="text-[10px] font-bold text-slate-800/80 truncate">
              {t('merchant.storePreview.bannerSubtitle')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 text-white px-3 py-2 text-[11px] font-black active:scale-95"
        >
          <ChevronRight size={14} />
          {t('merchant.storePreview.close')}
        </button>
      </div>

      <div
        className={`flex-1 min-h-0 overflow-y-auto ${
          theme.enabled ? storePageBackgroundProps(theme).className : 'bg-deep-navy'
        }`}
        style={{
          ...storeThemeCssVars(theme),
          ...(theme.enabled ? storePageBackgroundProps(theme).style : {}),
        }}
      >
        <header
          className={`relative shadow-xs ${
            theme.enabled
              ? 'bg-white'
              : 'welcome-card-glow welcome-card-border-glow bg-white/5 border-b border-white/20'
          }`}
        >
          <div
            className={`h-14 overflow-hidden relative ${
              theme.enabled
                ? storeGradientToLeftProps(theme).className
                : 'bg-gradient-to-l from-vibrant-purple/80 to-deep-navy/90'
            }`}
            style={theme.enabled ? storeGradientToLeftProps(theme).style : undefined}
          />

          <div
            className={`max-w-4xl mx-auto px-3 py-4 flex flex-col items-center relative gap-3 text-center w-full ${
              theme.enabled
                ? storeInfoBarProps(theme).className
                : 'welcome-card-border-glow bg-white/5 border border-white/20 rounded-b-2xl'
            }`}
            style={theme.enabled ? storeInfoBarProps(theme).style : undefined}
          >
            <ProductImage
              src={store.logo}
              alt={store.shopName}
              size="custom"
              priority
              className="!w-16 !h-16 rounded-xl border-2 border-white/40 shadow-md -mt-10 bg-white relative z-10 overflow-hidden"
              imageClassName="rounded-xl object-cover"
            />

            <StoreIdentity
              name={store.shopName}
              username={store.username}
              verified={isStoreVerified(store)}
              size="lg"
              align="center"
              nameAs="h1"
              nameClassName={theme.enabled ? '' : 'text-white'}
              usernameClassName={theme.enabled ? '' : 'text-white/80'}
              nameStyle={theme.enabled ? themeFieldTextStyle(theme.fields.shopNameColor) : undefined}
            />

            <div
              className={`flex flex-wrap items-center justify-center gap-2 text-[10px] font-bold ${
                theme.enabled ? 'text-slate-600' : 'text-white/75'
              }`}
            >
              {categoryLabel ? (
                <span className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-2 py-1">
                  <StoreIcon size={11} />
                  {categoryLabel}
                </span>
              ) : null}
              {addressLine ? (
                <span className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-2 py-1">
                  <MapPin size={11} />
                  {addressLine}
                </span>
              ) : null}
              <span
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 ${
                  delivery.isFree
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    : 'bg-white/10 text-inherit border-white/20'
                }`}
              >
                <Truck size={11} className={`shrink-0 ${delivery.isFree ? 'text-emerald-600' : 'text-amber-400'}`} />
                {delivery.isFree
                  ? t('merchant.storePreview.freeDelivery')
                  : `${t('storePage.delivery')} ${delivery.price.toLocaleString()} ${t('common.currency')}`}
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-2 py-1">
                <Package size={11} className="shrink-0 opacity-90" />
                {t('merchant.storePreview.productCount', { count: publishedProducts.length })}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 w-full">
              <button
                type="button"
                onClick={() => {
                  if (!mapPosition) {
                    showToast(
                      'warning',
                      t('merchant.storePreview.locationHiddenTitle'),
                      store.showMap === false
                        ? t('merchant.storePreview.locationHiddenDisabled')
                        : t('merchant.storePreview.locationHiddenMissing'),
                    );
                    return;
                  }
                  setShowMapPreview(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-[10px] font-black text-white active:scale-95"
              >
                <MapPin size={13} className="text-amber-300" />
                {t('merchant.storePreview.mapBtn')}
              </button>

              {store.showPhone !== false && store.phone ? (
                <button
                  type="button"
                  onClick={() => previewOnlyToast(t('merchant.storePreview.actionCallStore'), t)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300/40 bg-emerald-500/20 px-3 py-2 text-[10px] font-black text-emerald-50 active:scale-95"
                >
                  <Phone size={13} />
                  {t('merchant.storePreview.contactBtn')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => previewOnlyToast(t('merchant.storePreview.actionContactRequest'), t)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/30 bg-vibrant-purple/40 px-3 py-2 text-[10px] font-black text-white active:scale-95"
                >
                  <MessageCircle size={13} />
                  {t('merchant.storePreview.contactBtn')}
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto w-full p-3 sm:p-5 space-y-4 pb-10">
          {(store as Store & { promoBanner?: { isActive?: boolean; title?: string; subtitle?: string; backgroundColor?: string; textColor?: string } }).promoBanner?.isActive ? (
            <div
              className="p-4 rounded-[1.5rem] text-center shadow-lg"
              style={{
                backgroundColor:
                  (store as any).promoBanner.backgroundColor || '#7B3DFF',
                color: (store as any).promoBanner.textColor || '#ffffff',
              }}
            >
              <h4 className="font-black text-lg mb-1">{(store as any).promoBanner.title}</h4>
              <p className="font-bold text-xs opacity-95">{(store as any).promoBanner.subtitle}</p>
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-6 rounded-full ${theme.enabled ? '' : 'bg-vibrant-purple'}`} style={theme.enabled ? { backgroundColor: theme.primaryColor } : undefined} />
            <h2 className={`text-sm font-black ${theme.enabled ? '' : 'text-white'}`}>
              {t('merchant.storePreview.productsTitle')}
            </h2>
          </div>

          <StoreProductSections
            variant="onDark"
            products={publishedProducts}
            storeCategoryId={store.category}
            storeTheme={theme}
            showStoreName={false}
            emptyTitle={t('merchant.storePreview.emptyTitle')}
            emptySubtitle={t('merchant.storePreview.emptySubtitle')}
            getStoreName={() => store.shopName}
            getStoreUsername={() => store.username}
            getStoreVerified={() => isStoreVerified(store)}
            onProductClick={() => previewOnlyToast(t('merchant.storePreview.actionProductDetails'), t)}
            onAddToCart={() => previewOnlyToast(t('merchant.storePreview.actionAddToCart'), t)}
            onShareProduct={() => previewOnlyToast(t('merchant.storePreview.actionShareProduct'), t)}
          />
        </main>
      </div>

      {showMapPreview && mapPosition ? (
        <div className="absolute inset-0 z-30 flex flex-col bg-deep-navy/95 animate-fade-in">
          <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-3 border-b border-white/15 text-white">
            <div className="min-w-0">
              <p className="text-[12px] font-black truncate">{t('merchant.storePreview.mapModalTitle')}</p>
              <p className="text-[10px] font-bold text-white/65 truncate">
                {t('merchant.storePreview.mapModalSubtitle')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowMapPreview(false)}
              className="shrink-0 rounded-xl border border-white/25 bg-white/10 p-2"
              aria-label={t('merchant.storePreview.closeMap')}
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 min-h-0 relative">
            <MapContainer
              center={mapPosition}
              zoom={15}
              className="h-full w-full"
              scrollWheelZoom={false}
              attributionControl={false}
              zoomControl={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                updateWhenZooming={false}
                keepBuffer={4}
              />
              <FitStoreMarker position={mapPosition} />
              <Marker position={mapPosition} icon={pinIcon} />
            </MapContainer>
          </div>
          <div className="shrink-0 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <div className="rounded-2xl border border-white/20 bg-deep-navy/95 p-3 flex items-center gap-3 text-white">
              <img
                src={store.logo || undefined}
                alt=""
                className="w-12 h-12 rounded-xl object-cover border border-white/25 bg-white/10"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-black truncate">{store.shopName}</p>
                <p className="text-[10px] font-bold text-white/60 truncate">{addressLine || t('merchant.storePreview.storeLocationFallback')}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default MerchantStorePreview;
