import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CircleMarker, MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin,
  Store as StoreIcon,
  Navigation,
  X,
  Search,
  SlidersHorizontal,
  ChevronDown,
  RefreshCw,
  Eye,
} from 'lucide-react';
import type { Store } from '@shared/types';
import { StoreIdentity } from '@shared/components/StoreIdentity';
import {
  getStoreCategoryLabel,
  getProvinceLabel,
  IRAQ_PROVINCES,
  STORE_CATEGORIES,
  storeCategoriesMatch,
} from '@shared/constants';
import { VerifiedBadge } from '@shared/components/VerifiedBadge';
import { isStoreVerified } from '@shared/utils/storeVerification';
import { isStoreSubscriptionActive } from '@shared/utils/store';
import { bareStoreUsername } from '@shared/utils/storeIdentity';
import {
  formatStoreVisitCount,
  subscribeStoreVisitStats,
} from '@shared/lib/storeVisitTracking';
import 'leaflet/dist/leaflet.css';

const BAGHDAD_CENTER: [number, number] = [33.3152, 44.3661];

/** مراكز تقريبية لمحافظات العراق — للتحريك على الخريطة عند اختيار الفلتر */
const IRAQ_PROVINCE_CENTERS: Record<string, [number, number]> = {
  بغداد: [33.3152, 44.3661],
  البصرة: [30.5081, 47.7835],
  نينوى: [36.34, 43.13],
  أربيل: [36.1911, 44.0114],
  السليمانية: [35.55, 45.4333],
  دهوك: [36.8667, 42.9833],
  كركوك: [35.4667, 44.3833],
  ديالى: [33.75, 44.6333],
  الأنبار: [33.4167, 43.3],
  واسط: [32.5, 45.8333],
  بابل: [32.4682, 44.4361],
  كربلاء: [32.616, 44.0249],
  النجف: [31.9972, 44.3149],
  ميسان: [31.8333, 47.15],
  'ذي قار': [31.05, 46.25],
  المثنى: [31.3167, 45.2833],
  القادسية: [31.9833, 44.9333],
  'صلاح الدين': [34.6, 43.6833],
};

type StoresMapPanelProps = {
  stores: Store[];
  userCoords?: { lat: number; lng: number } | null;
  onStoreSelect: (store: Store) => void;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildUserLocationIcon(): L.DivIcon {
  return L.divIcon({
    className: 'stores-map-user-marker',
    html: `
      <div class="stores-map-user-marker__wrap" aria-hidden="true">
        <span class="stores-map-user-marker__pulse"></span>
        <span class="stores-map-user-marker__dot"></span>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

const USER_LOCATION_ICON = buildUserLocationIcon();

function buildStoreIcon(store: Store): L.DivIcon {
  const logo = String(store.logo || '').trim();
  const safeLogo = logo && !logo.includes('"') && !logo.includes('<') ? logo : '';
  const initial = escapeHtml((store.shopName || 'م').trim().charAt(0) || 'م');

  const inner = safeLogo
    ? `<img src="${safeLogo}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:9999px;display:block;" />`
    : `<span style="font-size:14px;font-weight:900;color:#fff;">${initial}</span>`;

  return L.divIcon({
    className: 'stores-map-marker',
    html: `<div class="stores-map-marker__pin">${inner}</div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 44],
    popupAnchor: [0, -40],
  });
}

function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const refresh = () => {
      map.invalidateSize({ animate: true, pan: false });
    };

    const timer = window.setTimeout(refresh, 120);
    window.addEventListener('resize', refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', refresh);
    };
  }, [map]);

  return null;
}

type MapCameraRequest =
  | { kind: 'point'; latlng: [number, number]; zoom: number }
  | { kind: 'bounds'; points: Array<[number, number]> };

function MapCameraFly({
  request,
  token,
  duration = 1.1,
}: {
  request: MapCameraRequest | null;
  token: number;
  duration?: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!request || token <= 0) return;

    if (request.kind === 'point') {
      map.flyTo(request.latlng, request.zoom, { duration, easeLinearity: 0.25 });
      return;
    }

    if (request.points.length > 1) {
      map.flyToBounds(L.latLngBounds(request.points), {
        padding: [56, 56],
        maxZoom: 14,
        duration,
        easeLinearity: 0.25,
      });
      return;
    }

    if (request.points.length === 1) {
      map.flyTo(request.points[0], 14, { duration, easeLinearity: 0.25 });
      return;
    }

    map.flyTo(BAGHDAD_CENTER, 11, { duration, easeLinearity: 0.25 });
  }, [map, request, token, duration]);

  return null;
}

export const StoresMapPanel: React.FC<StoresMapPanelProps> = ({
  stores,
  userCoords,
  onStoreSelect,
}) => {
  const { t, i18n } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [visitCounts, setVisitCounts] = useState<Record<string, number>>({});
  const [cameraToken, setCameraToken] = useState(0);
  const [cameraRequest, setCameraRequest] = useState<MapCameraRequest | null>(null);
  const [cameraDuration, setCameraDuration] = useState(0);
  const initialCameraDoneRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const markerIconsRef = useRef(new Map<string, L.DivIcon>());

  const triggerCamera = useCallback((request: MapCameraRequest, duration = 1.1) => {
    setCameraRequest(request);
    setCameraDuration(duration);
    setCameraToken((token) => token + 1);
  }, []);

  // عرض عدد الزيارات عند اختيار متجر على الخريطة (العدّ عند دخول صفحة المتجر)
  useEffect(() => {
    if (!selectedId) return;
    const unsub = subscribeStoreVisitStats(selectedId, (stats) => {
      setVisitCounts((prev) => ({ ...prev, [selectedId]: stats.visitCount }));
    });
    return () => unsub();
  }, [selectedId]);

  const selectedVisitLabel = selectedId
    ? t('map.visitsCount', {
        count: formatStoreVisitCount(visitCounts[selectedId] ?? 0, i18n.language),
      })
    : '';

  const selectProvince = (value: string) => {
    setProvinceFilter(value);
    if (value && IRAQ_PROVINCE_CENTERS[value]) {
      triggerCamera({ kind: 'point', latlng: IRAQ_PROVINCE_CENTERS[value], zoom: 11 });
      return;
    }

    const resetPoints = stores
      .filter((store) => {
        if (store.isBanned) return false;
        if (!isStoreSubscriptionActive(store)) return false;
        if (store.showMap === false) return false;
        if (typeof store.lat !== 'number' || typeof store.lng !== 'number') return false;
        return Number.isFinite(store.lat) && Number.isFinite(store.lng);
      })
      .map((store) => [store.lat as number, store.lng as number] as [number, number]);

    triggerCamera({ kind: 'bounds', points: resetPoints });
  };

  const mappableStores = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const bareQ = bareStoreUsername(searchQuery).toLowerCase();

    return stores.filter((store) => {
      if (store.isBanned) return false;
      if (!isStoreSubscriptionActive(store)) return false;
      if (store.showMap === false) return false;
      if (typeof store.lat !== 'number' || typeof store.lng !== 'number') return false;
      if (!Number.isFinite(store.lat) || !Number.isFinite(store.lng)) return false;

      if (provinceFilter && store.province !== provinceFilter) return false;
      if (categoryFilter && !storeCategoriesMatch(store.category, categoryFilter)) return false;
      if (verifiedOnly && !isStoreVerified(store)) return false;

      if (!q) return true;

      const username = bareStoreUsername(store.username).toLowerCase();
      const categoryLabel = getStoreCategoryLabel(store.category).toLowerCase();
      return (
        store.shopName.toLowerCase().includes(q) ||
        username.includes(bareQ) ||
        (store.area || '').toLowerCase().includes(q) ||
        (store.province || '').toLowerCase().includes(q) ||
        (store.landmark || '').toLowerCase().includes(q) ||
        categoryLabel.includes(q)
      );
    });
  }, [stores, searchQuery, provinceFilter, categoryFilter, verifiedOnly]);

  const points = useMemo(
    () => mappableStores.map((store) => [store.lat as number, store.lng as number] as [number, number]),
    [mappableStores],
  );

  useEffect(() => {
    if (initialCameraDoneRef.current) return;

    if (points.length > 0) {
      initialCameraDoneRef.current = true;
      triggerCamera({ kind: 'bounds', points }, 0);
      return;
    }

    if (userCoords) {
      initialCameraDoneRef.current = true;
      triggerCamera({ kind: 'point', latlng: [userCoords.lat, userCoords.lng], zoom: 12 }, 0);
      return;
    }

    if (stores.length > 0) {
      initialCameraDoneRef.current = true;
      triggerCamera({ kind: 'point', latlng: BAGHDAD_CENTER, zoom: 11 }, 0);
    }
  }, [points, userCoords, stores.length, triggerCamera]);

  const getIcon = (store: Store) => {
    const cached = markerIconsRef.current.get(store.id);
    if (cached) return cached;
    const icon = buildStoreIcon(store);
    markerIconsRef.current.set(store.id, icon);
    return icon;
  };

  const selectedStore = selectedId
    ? mappableStores.find((store) => store.id === selectedId) || null
    : null;

  useEffect(() => {
    if (selectedId && !mappableStores.some((store) => store.id === selectedId)) {
      setSelectedId(null);
    }
  }, [mappableStores, selectedId]);

  const hasActiveFilters = Boolean(searchQuery.trim() || provinceFilter || categoryFilter || verifiedOnly);

  const resetFilters = () => {
    setSearchQuery('');
    setProvinceFilter('');
    setCategoryFilter('');
    setVerifiedOnly(false);
  };

  const mapCenter: [number, number] = userCoords
    ? [userCoords.lat, userCoords.lng]
    : points[0] || BAGHDAD_CENTER;

  return (
    <div className="stores-map-fullscreen relative w-full overflow-hidden bg-deep-navy" dir="rtl">
      <div className="stores-map-shell absolute inset-0">
        <MapContainer
          center={mapCenter}
          zoom={12}
          className="h-full w-full z-0"
          scrollWheelZoom
          attributionControl={false}
          zoomControl={false}
          fadeAnimation
          zoomAnimation
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            updateWhenIdle
            updateWhenZooming={false}
            keepBuffer={4}
          />
          <MapResizeHandler />
          <MapCameraFly request={cameraRequest} token={cameraToken} duration={cameraDuration} />

          {userCoords ? (
            <>
              <CircleMarker
                center={[userCoords.lat, userCoords.lng]}
                radius={18}
                pathOptions={{
                  color: '#3b82f6',
                  fillColor: '#3b82f6',
                  fillOpacity: 0.15,
                  weight: 1,
                  opacity: 0.45,
                }}
              />
              <Marker
                position={[userCoords.lat, userCoords.lng]}
                icon={USER_LOCATION_ICON}
                zIndexOffset={1000}
              >
                <Popup className="stores-map-popup" closeButton={false}>
                  <div className="stores-map-popup__card stores-map-popup__card--static">
                    <div className="stores-map-popup__meta">
                      <span className="text-sm font-black text-deep-navy">{t('map.yourLocation')}</span>
                      <span className="stores-map-popup__category">{t('map.locationSet')}</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            </>
          ) : null}

          {mappableStores.map((store) => (
            <Marker
              key={store.id}
              position={[store.lat as number, store.lng as number]}
              icon={getIcon(store)}
              eventHandlers={{
                click: () => setSelectedId(store.id),
              }}
            >
              <Popup
                className="stores-map-popup"
                closeButton={false}
                eventHandlers={{
                  remove: () => {
                    setSelectedId((current) => (current === store.id ? null : current));
                  },
                }}
              >
                <button
                  type="button"
                  className="stores-map-popup__card"
                  onClick={() => onStoreSelect(store)}
                >
                  <img
                    src={store.logo || undefined}
                    alt=""
                    className="stores-map-popup__logo"
                  />
                  <div className="stores-map-popup__meta">
                    <StoreIdentity
                      name={store.shopName}
                      username={store.username}
                      verified={isStoreVerified(store)}
                      size="sm"
                      nameClassName="text-deep-navy"
                      usernameClassName="text-slate-500"
                    />
                    {getStoreCategoryLabel(store.category) ? (
                      <span className="stores-map-popup__category">
                        {getStoreCategoryLabel(store.category)}
                      </span>
                    ) : null}
                    <span className="stores-map-popup__category inline-flex items-center gap-1">
                      <Eye size={11} className="shrink-0 opacity-70" />
                      {t('map.visitsCount', {
                        count: formatStoreVisitCount(visitCounts[store.id] ?? 0, i18n.language),
                      })}
                    </span>
                    <span className="stores-map-popup__cta">{t('map.enterStore')}</span>
                  </div>
                </button>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[450] safe-area-top p-3">
        <div className="pointer-events-auto mx-auto max-w-lg space-y-2 rounded-[1.35rem] border border-white/20 bg-deep-navy/92 p-2.5 text-white shadow-xl">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex flex-1 items-center gap-2 pl-1">
              <StoreIcon size={15} className="shrink-0 text-violet-300" />
              <div className="min-w-0">
                <p className="text-[11px] font-black truncate leading-tight">{t('map.title')}</p>
                <p className="text-[10px] font-bold text-white/60 truncate leading-tight">
                  {t('map.visibleCount', { count: mappableStores.length })}
                </p>
              </div>
            </div>

            <button
              type="button"
              className={`touch-target-sm inline-flex items-center justify-center rounded-xl border px-2.5 py-2 ${
                filtersOpen || hasActiveFilters
                  ? 'border-vibrant-purple/60 bg-vibrant-purple/30 text-white'
                  : 'border-white/25 bg-white/10 text-white'
              }`}
              title={t('map.filters')}
              aria-label={t('map.filters')}
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <SlidersHorizontal size={15} />
            </button>

            {userCoords ? (
              <button
                type="button"
                className="touch-target-sm inline-flex items-center gap-1 rounded-xl border border-white/25 bg-white/10 px-2.5 py-2 text-[10px] font-black"
                title={t('map.goToMyLocation')}
                aria-label={t('map.goToMyLocation')}
                onClick={() =>
                  triggerCamera({
                    kind: 'point',
                    latlng: [userCoords.lat, userCoords.lng],
                    zoom: 14,
                  })
                }
              >
                <Navigation size={14} />
              </button>
            ) : null}
          </div>

          <div className="relative">
            <Search size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/45" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t('map.searchPlaceholder')}
              className="w-full rounded-xl border border-white/20 bg-white/10 py-2.5 pr-9 pl-3 text-[11px] font-bold text-white outline-none placeholder:text-white/40 focus:border-vibrant-purple/50"
            />
          </div>

          {filtersOpen ? (
            <div className="space-y-2 border-t border-white/10 pt-2 animate-fade-in">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="relative">
                  <select
                    value={provinceFilter}
                    onChange={(event) => selectProvince(event.target.value)}
                    className="welcome-select welcome-select--md welcome-select--with-chevron w-full !py-2 !text-[11px]"
                  >
                    <option value="">{t('map.allProvinces')}</option>
                    {IRAQ_PROVINCES.map((province) => (
                      <option key={province.id} value={province.name}>
                        {getProvinceLabel(province)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="welcome-select-chevron" aria-hidden />
                </div>

                <div className="relative">
                  <select
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                    className="welcome-select welcome-select--md welcome-select--with-chevron w-full !py-2 !text-[11px]"
                  >
                    <option value="">{t('map.allCategories')}</option>
                    {STORE_CATEGORIES.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="welcome-select-chevron" aria-hidden />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setVerifiedOnly((prev) => !prev)}
                className={`inline-flex w-full items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-[10px] font-black transition ${
                  verifiedOnly
                    ? 'border-sky-400/50 bg-sky-500/25 text-sky-50'
                    : 'border-white/20 bg-white/5 text-white/85'
                }`}
              >
                <VerifiedBadge size={12} />
                <span>{t('map.verifiedOnly')}</span>
              </button>

              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/5 px-2.5 py-1.5 text-[10px] font-black text-white/85"
                >
                  <RefreshCw size={12} />
                  {t('map.clearFilters')}
                </button>
              ) : null}
            </div>
          ) : null}

          {mappableStores.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl border border-amber-300/25 bg-amber-500/10 px-2.5 py-2">
              <MapPin size={14} className="shrink-0 text-amber-300" />
              <p className="min-w-0 flex-1 text-[10px] font-bold leading-snug text-amber-50">
                {hasActiveFilters
                  ? t('map.emptyFiltered')
                  : t('map.emptyNoLocations')}
              </p>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="shrink-0 rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-[9px] font-black"
                >
                  {t('map.clear')}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {selectedStore ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[450] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="pointer-events-auto mx-auto flex max-w-lg items-stretch gap-2">
            <button
              type="button"
              onClick={() => onStoreSelect(selectedStore)}
              className="min-w-0 flex-1 rounded-[1.5rem] border border-white/25 bg-deep-navy/95 p-3 flex items-center gap-3 text-white text-right shadow-2xl touch-target active:scale-[0.99] transition"
            >
              <img
                src={selectedStore.logo || undefined}
                alt=""
                className="w-14 h-14 rounded-2xl object-cover border border-white/25 bg-white/10 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <StoreIdentity
                  name={selectedStore.shopName}
                  username={selectedStore.username}
                  verified={isStoreVerified(selectedStore)}
                  size="md"
                  nameClassName="text-white"
                  usernameClassName="text-white/70"
                />
                {getStoreCategoryLabel(selectedStore.category) ? (
                  <p className="mt-1 text-[10px] font-black text-violet-200/90 truncate">
                    {getStoreCategoryLabel(selectedStore.category)}
                  </p>
                ) : null}
                {(selectedStore.province || selectedStore.area) && (
                  <p className="mt-0.5 text-[10px] font-bold text-white/55 truncate">
                    {[selectedStore.province, selectedStore.area].filter(Boolean).join(' · ')}
                  </p>
                )}
                {selectedVisitLabel ? (
                  <p className="mt-1 text-[10px] font-black text-violet-200/90 flex items-center gap-1 truncate">
                    <Eye size={11} className="shrink-0 opacity-80" />
                    <span>{selectedVisitLabel}</span>
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 text-[11px] font-black px-3 py-2 rounded-xl bg-brand-horizontal border border-white/30">
                {t('map.enter')}
              </span>
            </button>
            <button
              type="button"
              aria-label={t('common.close')}
              onClick={() => setSelectedId(null)}
              className="touch-target shrink-0 self-center rounded-2xl border border-white/25 bg-deep-navy/95 p-3 text-white shadow-2xl"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
