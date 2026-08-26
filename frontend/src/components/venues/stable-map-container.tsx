'use client';

import type { Map as LeafletMap } from 'leaflet';
import { useEffect, useRef, type ComponentProps } from 'react';
import { MapContainer } from 'react-leaflet';

type StableMapContainerProps = ComponentProps<typeof MapContainer>;

interface StampedContainer extends HTMLElement {
  _leaflet_id?: number | null;
}

/**
 * Next.js dev mode runs React 18 StrictMode, which mounts every component twice (mount ->
 * cleanup -> mount) to surface missing-cleanup bugs. react-leaflet's `MapContainer` stamps a
 * `_leaflet_id` on its container DOM node when it creates the Leaflet Map instance, and that
 * stamp isn't always cleared before the phantom second mount tries to create another one —
 * so every dev reload throws "Map container is already initialized" in the console. It's
 * dev-only noise (StrictMode's double-invoke never happens in production) and the map still
 * renders and works correctly either way, but this wrapper clears the stamp itself in an
 * unmount cleanup so the phantom remount never sees a stale id.
 */
export const StableMapContainer = ({ children, ...props }: StableMapContainerProps) => {
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    return () => {
      // Deliberately read the ref's value at cleanup time, not an earlier-captured copy —
      // `mapRef` holds a Leaflet Map instance (not a DOM node React itself manages), so it's
      // still the live map when this cleanup runs.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const container = mapRef.current?.getContainer() as StampedContainer | undefined;
      if (container) {
        container._leaflet_id = null;
      }
    };
  }, []);

  return (
    <MapContainer {...props} ref={mapRef}>
      {children}
    </MapContainer>
  );
};
