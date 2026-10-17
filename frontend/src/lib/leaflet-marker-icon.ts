import L from 'leaflet';

// Leaflet's default marker icon resolves its image paths relative to the CSS file, which breaks
// under webpack's asset bundling -- pointing at the unpkg CDN sidesteps that entirely. Shared by
// every component that renders a Leaflet Marker. Only ever imported from client components that
// are themselves loaded with `next/dynamic({ ssr: false })`, since this touches `window` at
// module-init time through the `leaflet` import.
export const leafletMarkerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
