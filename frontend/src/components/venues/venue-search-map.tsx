'use client';

import 'leaflet/dist/leaflet.css';
import L, { type LatLngBounds } from 'leaflet';
import { useRef } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import type { Venue } from '@/types/api';

const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const getBasePrice = (venue: Venue) =>
  venue.prices?.find((price) => price.priceType === 'BASE')?.price ?? 0;

const boundsToParams = (bounds: LatLngBounds) => ({
  north: bounds.getNorth(),
  south: bounds.getSouth(),
  east: bounds.getEast(),
  west: bounds.getWest(),
});

interface SearchAreaButtonProps {
  onSearchArea: (bounds: ReturnType<typeof boundsToParams>) => void;
}

// Tracks pan/zoom so the "Buscar en esta area" button can read the live bounds on click —
// deliberately NOT auto-searching on every moveend, to avoid firing a request per drag frame.
const SearchAreaButton = ({ onSearchArea }: SearchAreaButtonProps) => {
  const map = useMap();
  const boundsRef = useRef<LatLngBounds>(map.getBounds());

  useMapEvents({
    moveend: () => {
      boundsRef.current = map.getBounds();
    },
  });

  return (
    <div className="absolute left-1/2 top-3 z-[1000] -translate-x-1/2">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="shadow-lg"
        onClick={() => onSearchArea(boundsToParams(boundsRef.current))}
      >
        Buscar en esta area
      </Button>
    </div>
  );
};

interface VenueSearchMapProps {
  venues: Venue[];
  center?: [number, number];
  onBoundsChange: (bounds: { north: number; south: number; east: number; west: number }) => void;
}

const DEFAULT_CENTER: [number, number] = [-16.5, -68.15]; // El Alto, Bolivia

export const VenueSearchMap = ({ venues, center, onBoundsChange }: VenueSearchMapProps) => {
  const router = useRouter();
  const located = venues.filter(
    (venue): venue is Venue & { latitude: number; longitude: number } =>
      venue.latitude != null && venue.longitude != null,
  );

  const mapCenter =
    center ??
    (located.length
      ? [located[0].latitude, located[0].longitude]
      : DEFAULT_CENTER);

  return (
    <div className="isolate relative h-full w-full overflow-hidden rounded-lg border">
      <MapContainer center={mapCenter} zoom={12} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <SearchAreaButton onSearchArea={onBoundsChange} />
        {located.map((venue) => (
          <Marker key={venue.id} position={[venue.latitude, venue.longitude]} icon={markerIcon}>
            <Popup>
              <div className="space-y-1">
                <p className="font-semibold">{venue.name}</p>
                <p className="text-xs text-muted-foreground">{venue.district}</p>
                <p className="text-sm">
                  {getBasePrice(venue) > 0 ? formatCurrency(getBasePrice(venue)) : 'Consultar'}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="link"
                  className="h-auto p-0"
                  onClick={() => router.push(`/venues/${venue.slug}`)}
                >
                  Ver local
                </Button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
