import React, { useState, useEffect, useRef, useCallback } from "react";
import { AlertTriangle, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix leaflet marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

/** Nominatim Accept-Language: Arabic or Kurdish (Sorani) with Arabic fallback for Iraq maps. */
function nominatimAcceptLanguage(lng: string): string {
  const base = (lng || "ar").toLowerCase().split("-")[0];
  return base === "ckb" || base === "ku" ? "ckb,ku,ar" : "ar";
}

interface LocationPickerProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  initialLat?: number;
  initialLng?: number;
  required?: boolean;
  label?: string;
  labelClassName?: string;
  hintClassName?: string;
  inputClassName?: string;
  height?: string;
}

function LocationMarker({
  position,
  setPosition,
  setAddress,
  onLocationSelect,
}: any) {
  const { t, i18n } = useTranslation();
  const map = useMap();
  const acceptLang = nominatimAcceptLanguage(i18n.language);

  useEffect(() => {
    if (position) {
      map.flyTo(position, 15);
    }
  }, [position, map]);

  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition(e.latlng);
      fetchAddress(lat, lng);
    },
  });

  const fetchAddress = async (lat: number, lng: number) => {
    let address = t('locationPicker.coordinates', {
      lat: lat.toFixed(6),
      lng: lng.toFixed(6),
    });
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=${encodeURIComponent(acceptLang)}`,
        { headers: { "Accept-Language": acceptLang } },
      );
      const data = await response.json();
      if (data.display_name) {
        address = data.display_name;
      }
    } catch (error) {
    }
    setAddress(address);
    onLocationSelect(lat, lng, address);
  };

  return position === null ? null : <Marker position={position}></Marker>;
}

const GPS_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>`;

function GpsLocateControl({
  onLocate,
  isLoading,
}: {
  onLocate: () => void;
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const map = useMap();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const onLocateRef = useRef(onLocate);
  onLocateRef.current = onLocate;

  useEffect(() => {
    const control = L.control({ position: "bottomright" });
    const container = L.DomUtil.create("div", "mahalak-gps-control") as HTMLDivElement;
    const button = L.DomUtil.create("button", "mahalak-gps-button", container) as HTMLButtonElement;

    button.type = "button";
    button.title = t('locationPicker.gpsCurrentTitle');
    button.innerHTML = `${GPS_ICON_SVG}<span>${t('locationPicker.gpsCurrentLabel')}</span>`;

    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);
    L.DomEvent.on(button, "click", (event) => {
      L.DomEvent.preventDefault(event);
      L.DomEvent.stopPropagation(event);
      if (!button.disabled) {
        onLocateRef.current();
      }
    });

    control.onAdd = () => container;
    control.addTo(map);
    buttonRef.current = button;

    return () => {
      L.DomEvent.off(button);
      buttonRef.current = null;
      control.remove();
    };
  }, [map, t]);

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;
    button.title = t('locationPicker.gpsCurrentTitle');
    button.innerHTML = `${GPS_ICON_SVG}<span>${t('locationPicker.gpsCurrentLabel')}</span>`;
    button.disabled = isLoading;
    button.classList.toggle("is-loading", isLoading);
  }, [isLoading, t]);

  return null;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  onLocationSelect,
  initialLat,
  initialLng,
  required = true,
  label,
  labelClassName = "block text-xs font-bold text-gray-500 mb-1",
  hintClassName = "text-[10px] text-gray-400 font-bold text-center mb-1",
  inputClassName = "text-white",
  height = "h-64",
}) => {
  const { t, i18n } = useTranslation();
  const acceptLang = nominatimAcceptLanguage(i18n.language);
  const displayLabel = label ?? t('locationPicker.label');
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null,
  );
  const [address, setAddress] = useState<string>("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const hasAutoLocated = useRef(false);

  // Default to Baghdad
  const defaultCenter = { lat: 33.3152, lng: 44.3661 };

  const handlePositionSuccess = useCallback(async (lat: number, lng: number) => {
    setPosition({ lat, lng });

    let addr = t('locationPicker.coordinates', {
      lat: lat.toFixed(6),
      lng: lng.toFixed(6),
    });
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=${encodeURIComponent(acceptLang)}`,
        { headers: { "Accept-Language": acceptLang } }
      );
      const data = await response.json();
      if (data.display_name) {
        addr = data.display_name;
      }
    } catch (e) {
    }

    setAddress(addr);
    onLocationSelect(lat, lng, addr);
    setIsLoading(false);
  }, [acceptLang, onLocationSelect, t]);

  const handlePositionError = useCallback(async (err: any) => {
    try {
      const ipFallback = await fetch('https://ipapi.co/json/');
      const ipData = await ipFallback.json();
      if (ipData && ipData.latitude && ipData.longitude) {
        const lat = ipData.latitude;
        const lng = ipData.longitude;
        setPosition({ lat, lng });
        const addr = `${ipData.city || ''}, ${ipData.region || ''}, ${ipData.country_name || ''}`;
        const approxCoords = t('locationPicker.approxCoordinates', {
          lat: lat.toFixed(6),
          lng: lng.toFixed(6),
        });
        setAddress(addr || approxCoords);
        onLocationSelect(lat, lng, addr || approxCoords);
        setError(t('locationPicker.approxLocationWarning'));
      } else {
         throw new Error("IP fallback failed");
      }
    } catch {
       setError(t('locationPicker.cannotLocate'));
    }
    setIsLoading(false);
  }, [onLocationSelect, t]);

  const getCurrentLocation = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      if (typeof window !== "undefined" && (window as any).Capacitor?.isNativePlatform()) {
        const { Geolocation } = await import('@capacitor/geolocation');
        const permission = await Geolocation.checkPermissions();
        if (permission.location !== 'granted') {
           const req = await Geolocation.requestPermissions();
           if (req.location !== 'granted') {
              setError(t('locationPicker.permissionDenied'));
              setIsLoading(false);
              return;
           }
        }
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
        handlePositionSuccess(pos.coords.latitude, pos.coords.longitude);
      } else {
        if (!navigator.geolocation) {
          setError(t('locationPicker.browserUnsupported'));
          setIsLoading(false);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => handlePositionSuccess(pos.coords.latitude, pos.coords.longitude),
          handlePositionError,
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
        );
      }
    } catch(err) {
       handlePositionError(err);
    }
  }, [handlePositionSuccess, handlePositionError, t]);

  useEffect(() => {
    if (initialLat && initialLng && !position) {
      const initLocation = () => {
        setPosition({ lat: initialLat, lng: initialLng });
        setAddress(t('locationPicker.alreadySelected'));
      };
      initLocation();
    } else if (!initialLat && !initialLng && !position && !hasAutoLocated.current) {
      hasAutoLocated.current = true;
      getCurrentLocation();
    }
  }, [initialLat, initialLng, position, getCurrentLocation, t]);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const searchLocation = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setError("");
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&accept-language=${encodeURIComponent(acceptLang)}&limit=1`,
        { headers: { "Accept-Language": acceptLang } },
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setPosition({ lat, lng });
        setAddress(data[0].display_name);
        onLocationSelect(lat, lng, data[0].display_name);
      } else {
        setError(t('locationPicker.noSearchResults'));
      }
    } catch {
      setError(t('locationPicker.searchError'));
    }
    setIsSearching(false);
  };

  return (
    <div className="space-y-3">
      {displayLabel && (
        <label className={labelClassName}>
          📍 {displayLabel} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="flex gap-2">
        <input 
          type="text" 
          placeholder={t('locationPicker.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchLocation()}
          className={`flex-1 px-3 py-2 border rounded-xl text-sm focus:outline-none focus:border-indigo-500 ${inputClassName}`}
        />
        <button 
          type="button"
          onClick={searchLocation}
          disabled={isSearching}
          className="bg-indigo-50 text-deep-navy px-4 py-2 rounded-xl text-sm font-bold active:scale-95 disabled:opacity-50"
        >
          {isSearching ? t('locationPicker.searching') : t('common.search')}
        </button>
      </div>

      <div className="relative w-full">
        <div
          className={`mahalak-location-picker-map w-full ${height} rounded-2xl overflow-hidden border-2 transition-all ${
            position 
              ? "border-indigo-400 shadow-md" 
              : required && !isLoading 
                ? "border-red-300 bg-red-50/10 animate-pulse" 
                : "border-gray-200"
          }`}
        >
          <MapContainer
            center={
              position
                ? [position.lat, position.lng]
                : [defaultCenter.lat, defaultCenter.lng]
            }
            zoom={position ? 15 : 11}
            attributionControl={false}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker
              position={position}
              setPosition={setPosition}
              setAddress={setAddress}
              onLocationSelect={onLocationSelect}
            />
            <GpsLocateControl onLocate={getCurrentLocation} isLoading={isLoading} />
          </MapContainer>
        </div>

        {isLoading && (
          <div className={`absolute inset-0 ${height} rounded-2xl bg-white/50 backdrop-blur-sm flex flex-col items-center justify-center z-[1002] pointer-events-none`}>
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2"></div>
            <span className="text-xs font-bold text-indigo-600 shadow-sm">
              {t('locationPicker.locating')}
            </span>
          </div>
        )}
      </div>

      <p className={hintClassName}>
        {t('locationPicker.hint')}
      </p>

      {position && (
        <div className="bg-gradient-to-r from-vibrant-purple to-deep-navy border border-[#FFF700] text-[#FFF700] p-3 rounded-xl flex items-center gap-2">
          <Check size={16} className="text-[#FFF700] shrink-0" />
          <p className="text-xs font-bold text-[#FFF700]">
            {t('locationPicker.selectedSuccess')}
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-xl font-semibold flex items-start space-x-2 space-x-reverse">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {required && !position && !isLoading && !error && (
        <p className="text-[10px] text-orange-500 font-bold flex items-center space-x-1 space-x-reverse">
          <AlertTriangle size={12} />
          <span>{t('locationPicker.requiredHint')}</span>
        </p>
      )}
    </div>
  );
};
