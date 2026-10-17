'use client';

import 'leaflet/dist/leaflet.css';
import { Marker, Popup, TileLayer } from 'react-leaflet';
import { StableMapContainer } from './stable-map-container';
import { leafletMarkerIcon } from '@/lib/leaflet-marker-icon';

interface VenueLocationMapProps {
  latitude: number;
  longitude: number;
  name: string;
}

export const VenueLocationMap = ({ latitude, longitude, name }: VenueLocationMapProps) => {
  return (
    <StableMapContainer
      center={[latitude, longitude]}
      zoom={15}
      scrollWheelZoom={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[latitude, longitude]} icon={leafletMarkerIcon}>
        <Popup>{name}</Popup>
      </Marker>
    </StableMapContainer>
  );
};
