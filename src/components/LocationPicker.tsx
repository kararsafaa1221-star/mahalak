import React, { useState, useEffect, useRef, useCallback } from "react";
import { Navigation, AlertTriangle, Check } from "lucide-react";
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

interface LocationPickerProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  initialLat?: number;
  initialLng?: number;
  required?: boolean;
  label?: string;
  height?: string;
}

function LocationMarker({
  position,
  setPosition,
  setAddress,
  onLocationSelect,
}: any) {
  const map = useMap();

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
    let address = `إحداثيات: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar`,
      );
      const data = await response.json();
      if (data.display_name) {
        address = data.display_name;
      }
    } catch (error) {
      console.log("Error fetching address:", error);
    }
    setAddress(address);
    onLocationSelect(lat, lng, address);
  };

  return position === null ? null : <Marker position={position}></Marker>;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  onLocationSelect,
  initialLat,
  initialLng,
  required = true,
  label = "تحديد الموقع على الخريطة",
  height = "h-64",
}) => {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null,
  );
  const [address, setAddress] = useState<string>(
    initialLat && initialLng ? "تم تحديد الموقع مسبقاً" : "",
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const hasAutoLocated = useRef(false);

  // Default to Baghdad
  const defaultCenter = { lat: 33.3152, lng: 44.3661 };

  const handlePositionSuccess = useCallback(async (lat: number, lng: number) => {
    setPosition({ lat, lng });

    let addr = `إحداثيات: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar`,
        { headers: { "Accept-Language": "ar" } }
      );
      const data = await response.json();
      if (data.display_name) {
        addr = data.display_name;
      }
    } catch (e) {
      console.log("Could not fetch address", e);
    }

    setAddress(addr);
    onLocationSelect(lat, lng, addr);
    setIsLoading(false);
  }, [onLocationSelect]);

  const handlePositionError = useCallback(async (err: any) => {
    console.warn("Geolocation error, attempting IP fallback:", err);
    try {
      const ipFallback = await fetch('https://ipapi.co/json/');
      const ipData = await ipFallback.json();
      if (ipData && ipData.latitude && ipData.longitude) {
        const lat = ipData.latitude;
        const lng = ipData.longitude;
        setPosition({ lat, lng });
        const addr = `${ipData.city || ''}, ${ipData.region || ''}, ${ipData.country_name || ''}`;
        setAddress(addr || `إحداثيات التقريبية: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        onLocationSelect(lat, lng, addr || `إحداثيات التقريبية: ${lat.toFixed(6)}`);
        setError("تم تحديد موقع تقريبي بناءً على شبكة الإنترنت. يرجى تعديله يدوياً لمزيد من الدقة.");
      } else {
         throw new Error("IP fallback failed");
      }
    } catch {
       setError("لا يمكن تحديد الموقع حالياً. يرجى اختيار الموقع من الخريطة بالضغط عليها أو البحث.");
    }
    setIsLoading(false);
  }, [onLocationSelect]);

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
              setError("لم يتم منح صلاحيات الوصول للموقع.");
              setIsLoading(false);
              return;
           }
        }
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
        handlePositionSuccess(pos.coords.latitude, pos.coords.longitude);
      } else {
        if (!navigator.geolocation) {
          setError("المتصفح لا يدعم خدمة تحديد الموقع");
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
  }, [handlePositionSuccess, handlePositionError]);

  useEffect(() => {
    if (initialLat && initialLng && !position) {
      const initLocation = () => {
        setPosition({ lat: initialLat, lng: initialLng });
        setAddress("تم تحديد الموقع مسبقاً");
      };
      initLocation();
    } else if (!initialLat && !initialLng && !position && !hasAutoLocated.current) {
      hasAutoLocated.current = true;
      getCurrentLocation();
    }
  }, [initialLat, initialLng, position, getCurrentLocation]);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const searchLocation = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setError("");
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&accept-language=ar&limit=1`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setPosition({ lat, lng });
        setAddress(data[0].display_name);
        onLocationSelect(lat, lng, data[0].display_name);
      } else {
        setError("لم يتم العثور على نتائج للبحث. يرجى المحاولة بكلمات مختلفة.");
      }
    } catch {
      setError("حدث خطأ أثناء البحث.");
    }
    setIsSearching(false);
  };

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-xs font-bold text-gray-500 mb-1">
          📍 {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="flex gap-2">
        <input 
          type="text" 
          placeholder="ابحث عن منطقة، حي، أو مدينة..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchLocation()}
          className="flex-1 px-3 py-2 border rounded-xl text-sm focus:outline-none focus:border-indigo-500"
        />
        <button 
          type="button"
          onClick={searchLocation}
          disabled={isSearching}
          className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl text-sm font-bold active:scale-95 disabled:opacity-50"
        >
          {isSearching ? "جاري البحث..." : "بحث"}
        </button>
      </div>

      <div
        className={`w-full ${height} rounded-2xl overflow-hidden border-2 relative transition-all ${
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
          style={{ height: "100%", width: "100%", zIndex: 10 }}
        >
          <TileLayer
            attribution='&amp;copy <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker
            position={position}
            setPosition={setPosition}
            setAddress={setAddress}
            onLocationSelect={onLocationSelect}
          />
        </MapContainer>

        {/* زر تحديد الموقع داخل الخريطة */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            getCurrentLocation();
          }}
          disabled={isLoading}
          className="absolute bottom-4 right-4 z-[400] bg-white px-4 py-2 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.15)] border-2 border-indigo-100 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-200 focus:outline-none transition-all active:scale-95 flex items-center justify-center gap-2 font-bold text-xs"
          title="تحديد موقعي الحالي"
        >
          <Navigation size={18} className={isLoading ? "animate-pulse" : ""} fill={position ? "currentColor" : "none"} />
          <span>تحديد موقعي (GPS)</span>
        </button>

        {isLoading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex flex-col items-center justify-center z-[500]">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2"></div>
            <span className="text-xs font-bold text-indigo-600 shadow-sm">
              جارٍ تحديد موقعك...
            </span>
          </div>
        )}
      </div>

      <p className="text-[10px] text-gray-400 font-bold text-center mb-1">
        💡 يمكنك التحريك والضغط على الخريطة لتحديد موقعك بدقة
      </p>

      {position && (
        <div className="bg-green-50 border border-green-200 p-3 rounded-xl flex items-start gap-2">
          <Check size={16} className="text-green-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-green-700 mb-0.5">
              تم تحديد الموقع!
            </p>
            <p className="text-[10px] text-green-600 leading-tight line-clamp-2">
              {address}
            </p>
          </div>
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
          <span>تحديد الموقع إجباري لتسهيل التوصيل وتحديد المسافات</span>
        </p>
      )}
    </div>
  );
};
