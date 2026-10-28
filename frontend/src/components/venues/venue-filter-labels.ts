import type { AmenityCategory, Departamento, PriceUnit } from '@/types/api';

export const priceUnitLabels: Record<PriceUnit, string> = {
  HOUR: 'Hora',
  DAY: 'Dia',
};

// Single source of truth -- this used to be defined three times (catalog-manager.tsx,
// venue-detail.tsx, and not at all in venue-form.tsx, which just printed the raw enum), each
// one slightly different and two of them with untranslated English leftovers.
export const amenityCategoryLabels: Record<AmenityCategory, string> = {
  FACILITY: 'Instalaciones',
  COMFORT: 'Confort',
  AUDIO_VISUAL: 'Audio y video',
  CATERING_DRINKS: 'Catering y bebidas',
  PARKING: 'Parqueo',
  ACCESSIBILITY: 'Accesibilidad',
  SAFETY: 'Seguridad',
  SERVICES: 'Servicios',
};

export const departamentoLabels: Record<Departamento, string> = {
  LA_PAZ: 'La Paz',
  SANTA_CRUZ: 'Santa Cruz',
  COCHABAMBA: 'Cochabamba',
  ORURO: 'Oruro',
  POTOSI: 'Potosi',
  CHUQUISACA: 'Chuquisaca',
  TARIJA: 'Tarija',
  BENI: 'Beni',
  PANDO: 'Pando',
};
