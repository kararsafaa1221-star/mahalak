import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface OrderMapProps {
  lat: number;
  lng: number;
  orderId: string;
}

const OrderMap: React.FC<OrderMapProps> = ({ lat, lng, orderId }) => (
  <MapContainer
    key={`order-map-${orderId}`}
    center={[lat, lng]}
    zoom={14}
    style={{ height: '100%', width: '100%', zIndex: 0 }}
    zoomControl={false}
    attributionControl={false}
    dragging={false}
    scrollWheelZoom={false}
    doubleClickZoom={false}
  >
    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <Marker position={[lat, lng]} />
  </MapContainer>
);

export default OrderMap;
