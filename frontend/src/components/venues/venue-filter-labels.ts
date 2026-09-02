import type { Departamento, PriceUnit } from '@/types/api';

export const priceUnitLabels: Record<PriceUnit, string> = {
  EVENT: 'Evento',
  HOUR: 'Hora',
  DAY: 'Dia',
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
