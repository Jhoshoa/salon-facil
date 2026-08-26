'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { Marker, TileLayer, useMap } from 'react-leaflet';
import { formatCurrency } from '@/lib/formatters';
import type { Venue } from '@/types/api';
import { StableMapContainer } from './stable-map-container';

export interface LocatedVenue extends Venue {
  latitude: number;
  longitude: number;
}

const getBasePrice = (venue: Venue) =>
  venue.prices?.find((price) => price.priceType === 'BASE')?.price ?? 0;

// Leaflet's divIcon takes a raw HTML string, not JSX — but since it's still rendered inside
// the same document, classes defined in globals.css (`.venue-price-pin`) apply normally.
const makePriceIcon = (venue: Venue, active: boolean) => {
  const price = getBasePrice(venue);
  const label = price > 0 ? formatCurrency(price) : 'Consultar';
  return L.divIcon({
    className: 'venue-price-marker-wrapper',
    html: `<div class="venue-price-pin${active ? ' venue-price-pin-active' : ''}">${label}</div>`,
    iconSize: undefined,
    iconAnchor: [30, 18],
  });
};

// Zooms/pans to fit every marker on mount, instead of a fixed zoom level that looks arbitrary
// when results are spread across the city or clustered tightly. Only runs once.
const FitToMarkers = ({ venues }: { venues: LocatedVenue[] }) => {
  const map = useMap();
  const hasFit = useRef(false);

  useEffect(() => {
    if (hasFit.current || venues.length === 0) return;
    hasFit.current = true;

    if (venues.length === 1) {
      map.setView([venues[0].latitude, venues[0].longitude], 15);
      return;
    }

    const bounds = L.latLngBounds(venues.map((venue) => [venue.latitude, venue.longitude]));
    map.fitBounds(bounds, { padding: [64, 64], maxZoom: 16 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

interface VenuePriceMapProps {
  venues: LocatedVenue[];
  activeId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

const DEFAULT_CENTER: [number, number] = [-16.5, -68.15]; // El Alto, Bolivia

export const VenuePriceMap = ({ venues, activeId, onHover, onSelect }: VenuePriceMapProps) => {
  const center: [number, number] = venues.length
    ? [venues[0].latitude, venues[0].longitude]
    : DEFAULT_CENTER;

  return (
    <StableMapContainer center={center} zoom={12} scrollWheelZoom className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitToMarkers venues={venues} />
      {venues.map((venue) => (
        <Marker
          key={venue.id}
          position={[venue.latitude, venue.longitude]}
          icon={makePriceIcon(venue, venue.id === activeId)}
          zIndexOffset={venue.id === activeId ? 1000 : 0}
          eventHandlers={{
            mouseover: () => onHover(venue.id),
            mouseout: () => onHover(null),
            click: () => onSelect(venue.id),
          }}
        />
      ))}
    </StableMapContainer>
  );
};
