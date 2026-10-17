'use client';

import 'leaflet/dist/leaflet.css';
import { useState } from 'react';
import type { LeafletMouseEvent } from 'leaflet';
import { Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { toast } from 'sonner';
import { Crosshair, Loader2 } from 'lucide-react';
import { StableMapContainer } from './stable-map-container';
import { leafletMarkerIcon } from '@/lib/leaflet-marker-icon';
import { Button } from '@/components/ui/button';

export interface LatLng {
  lat: number;
  lng: number;
}

// La Paz / El Alto metro area -- centers the map somewhere relevant on first open, before the
// owner has picked or located anything.
const DEFAULT_CENTER: [number, number] = [-16.5, -68.15];
const DEFAULT_ZOOM = 12;
const SELECTED_ZOOM = 16;

const ClickHandler = ({ onSelect }: { onSelect: (position: LatLng) => void }) => {
  useMapEvents({
    click(event: LeafletMouseEvent) {
      onSelect({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
};

const LocateButton = ({ onLocated }: { onLocated: (position: LatLng) => void }) => {
  const map = useMap();
  const [locating, setLocating] = useState(false);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      toast.error('Tu navegador no soporta geolocalizacion', {
        description: 'Marca el punto manualmente en el mapa.',
      });
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (result) => {
        const next = { lat: result.coords.latitude, lng: result.coords.longitude };
        setLocating(false);
        onLocated(next);
        map.flyTo([next.lat, next.lng], SELECTED_ZOOM);
      },
      (error) => {
        setLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          toast.error('Permiso de ubicacion denegado', {
            description:
              'Activalo desde la configuracion del navegador, o marca el punto manualmente en el mapa.',
          });
        } else if (error.code === error.TIMEOUT) {
          toast.error('No se pudo obtener tu ubicacion a tiempo', {
            description: 'Intenta de nuevo o marca el punto manualmente.',
          });
        } else {
          toast.error('No se pudo obtener tu ubicacion', {
            description: 'Marca el punto manualmente en el mapa.',
          });
        }
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      className="absolute right-3 top-3 z-[1000] shadow-md"
      onClick={handleLocate}
      disabled={locating}
    >
      {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
      Usar mi ubicacion
    </Button>
  );
};

interface VenueLocationPickerMapProps {
  position: LatLng | null;
  onChange: (position: LatLng) => void;
}

export const VenueLocationPickerMap = ({ position, onChange }: VenueLocationPickerMapProps) => {
  const center: [number, number] = position ? [position.lat, position.lng] : DEFAULT_CENTER;
  const zoom = position ? SELECTED_ZOOM : DEFAULT_ZOOM;

  return (
    <StableMapContainer center={center} zoom={zoom} scrollWheelZoom className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onSelect={onChange} />
      {position ? (
        <Marker
          position={[position.lat, position.lng]}
          icon={leafletMarkerIcon}
          draggable
          eventHandlers={{
            dragend: (event) => {
              const latlng = event.target.getLatLng();
              onChange({ lat: latlng.lat, lng: latlng.lng });
            },
          }}
        />
      ) : null}
      <LocateButton onLocated={onChange} />
    </StableMapContainer>
  );
};
