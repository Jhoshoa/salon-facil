import type { PriceUnit, VenueSpaceType, VenueUseType } from '@/types/api';

export const spaceTypeLabels: Record<VenueSpaceType, string> = {
  EVENT_HALL: 'Salon de eventos',
  GARDEN: 'Jardin',
  TERRACE: 'Terraza',
  RESTAURANT: 'Restaurante',
  BAR: 'Bar',
  AUDITORIUM: 'Auditorio',
  CONFERENCE_ROOM: 'Sala de reuniones',
  PHOTO_STUDIO: 'Estudio fotografico',
  MULTIPURPOSE: 'Multiproposito',
  OUTDOOR_SPACE: 'Espacio exterior',
};

export const useTypeLabels: Record<VenueUseType, string> = {
  WEDDING: 'Boda',
  BIRTHDAY: 'Cumpleanos',
  CORPORATE_EVENT: 'Corporativo',
  PRIVATE_PARTY: 'Fiesta privada',
  GRADUATION: 'Graduacion',
  CONFERENCE: 'Conferencia',
  WORKSHOP: 'Workshop',
  PHOTO_SHOOT: 'Sesion de fotos',
  FILMING: 'Rodaje',
  POP_UP: 'Pop up',
  TEAM_BUILDING: 'Team building',
};

export const priceUnitLabels: Record<PriceUnit, string> = {
  EVENT: 'Evento',
  HOUR: 'Hora',
  DAY: 'Dia',
};
