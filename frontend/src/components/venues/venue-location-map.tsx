'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';

const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface VenueLocationMapProps {
  latitude: number;
  longitude: number;
  name: string;
}

export const VenueLocationMap = ({ latitude, longitude, name }: VenueLocationMapProps) => {
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={15}
      scrollWheelZoom={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[latitude, longitude]} icon={markerIcon}>
        <Popup>{name}</Popup>
      </Marker>
    </MapContainer>
  );
};
