import { AmenityCategory } from '@prisma/client';

// Real reference data the app needs to function (dropdown/filter options for venue creation
// and search) — as opposed to the demo users/venues/bookings in seed.ts, which are fake
// fixtures. Shared between seed.ts (dev/test, wipes and reseeds everything) and
// seed-catalog.ts (production-safe, catalogs only) so the two never drift apart.

export const spaceTypeSeed = [
  { key: 'EVENT_HALL', name: 'Salon de eventos', icon: 'Building2', sortOrder: 1 },
  { key: 'GARDEN', name: 'Jardin', icon: 'Trees', sortOrder: 2 },
  { key: 'TERRACE', name: 'Terraza', icon: 'Sun', sortOrder: 3 },
  { key: 'RESTAURANT', name: 'Restaurante', icon: 'UtensilsCrossed', sortOrder: 4 },
  { key: 'BAR', name: 'Bar', icon: 'Wine', sortOrder: 5 },
  { key: 'AUDITORIUM', name: 'Auditorio', icon: 'Presentation', sortOrder: 6 },
  { key: 'CONFERENCE_ROOM', name: 'Sala de reuniones', icon: 'Users', sortOrder: 7 },
  { key: 'PHOTO_STUDIO', name: 'Estudio fotografico', icon: 'Camera', sortOrder: 8 },
  { key: 'MULTIPURPOSE', name: 'Multiproposito', icon: 'LayoutGrid', sortOrder: 9 },
  { key: 'OUTDOOR_SPACE', name: 'Espacio exterior', icon: 'MapPin', sortOrder: 10 },
];

export const useTypeSeed = [
  { key: 'WEDDING', name: 'Boda', icon: 'Heart', sortOrder: 1 },
  { key: 'BIRTHDAY', name: 'Cumpleaños', icon: 'PartyPopper', sortOrder: 2 },
  { key: 'CORPORATE_EVENT', name: 'Corporativo', icon: 'Briefcase', sortOrder: 3 },
  { key: 'PRIVATE_PARTY', name: 'Fiesta privada', icon: 'Sparkles', sortOrder: 4 },
  { key: 'GRADUATION', name: 'Graduacion', icon: 'GraduationCap', sortOrder: 5 },
  { key: 'CONFERENCE', name: 'Conferencia', icon: 'Presentation', sortOrder: 6 },
  { key: 'WORKSHOP', name: 'Workshop', icon: 'Wrench', sortOrder: 7 },
  { key: 'PHOTO_SHOOT', name: 'Sesion de fotos', icon: 'Camera', sortOrder: 8 },
  { key: 'FILMING', name: 'Rodaje', icon: 'Video', sortOrder: 9 },
  { key: 'POP_UP', name: 'Pop up', icon: 'Store', sortOrder: 10 },
  { key: 'TEAM_BUILDING', name: 'Team building', icon: 'Users', sortOrder: 11 },
];

export const amenitySeed = [
  { key: 'kitchen', name: 'Cocina equipada', category: AmenityCategory.FACILITY, icon: 'ChefHat', sortOrder: 1 },
  { key: 'bathrooms', name: 'Baños', category: AmenityCategory.FACILITY, icon: 'Bath', sortOrder: 2 },
  { key: 'stage', name: 'Escenario', category: AmenityCategory.FACILITY, icon: 'Mic2', sortOrder: 3 },
  { key: 'garden', name: 'Jardin', category: AmenityCategory.FACILITY, icon: 'Trees', sortOrder: 4 },
  { key: 'terrace', name: 'Terraza', category: AmenityCategory.FACILITY, icon: 'Sun', sortOrder: 5 },
  { key: 'wifi', name: 'Wi-Fi', category: AmenityCategory.COMFORT, icon: 'Wifi', sortOrder: 10 },
  { key: 'air-conditioning', name: 'Aire acondicionado', category: AmenityCategory.COMFORT, icon: 'Snowflake', sortOrder: 11 },
  { key: 'furniture', name: 'Mobiliario', category: AmenityCategory.COMFORT, icon: 'Armchair', sortOrder: 12 },
  { key: 'natural-light', name: 'Luz natural', category: AmenityCategory.COMFORT, icon: 'SunMedium', sortOrder: 13 },
  { key: 'sound-system', name: 'Equipo de sonido', category: AmenityCategory.AUDIO_VISUAL, icon: 'Speaker', sortOrder: 20 },
  { key: 'microphones', name: 'Microfonos', category: AmenityCategory.AUDIO_VISUAL, icon: 'Mic', sortOrder: 21 },
  { key: 'projector', name: 'Proyector', category: AmenityCategory.AUDIO_VISUAL, icon: 'Projector', sortOrder: 22 },
  { key: 'professional-lighting', name: 'Iluminacion profesional', category: AmenityCategory.AUDIO_VISUAL, icon: 'Lightbulb', sortOrder: 23 },
  { key: 'in-house-catering', name: 'Catering propio', category: AmenityCategory.CATERING_DRINKS, icon: 'Utensils', sortOrder: 30 },
  { key: 'external-catering', name: 'Permite catering externo', category: AmenityCategory.CATERING_DRINKS, icon: 'Truck', sortOrder: 31 },
  { key: 'alcohol-allowed', name: 'Permite bebidas alcoholicas', category: AmenityCategory.CATERING_DRINKS, icon: 'Wine', sortOrder: 32 },
  { key: 'bar', name: 'Barra incluida', category: AmenityCategory.CATERING_DRINKS, icon: 'Wine', sortOrder: 33 },
  { key: 'private-parking', name: 'Parqueo privado', category: AmenityCategory.PARKING, icon: 'Car', sortOrder: 40 },
  { key: 'car-parking', name: 'Parqueo para autos', category: AmenityCategory.PARKING, icon: 'ParkingCircle', sortOrder: 41 },
  { key: 'wheelchair-access', name: 'Acceso silla de ruedas', category: AmenityCategory.ACCESSIBILITY, icon: 'Accessibility', sortOrder: 50 },
  { key: 'independent-entry', name: 'Entrada independiente', category: AmenityCategory.ACCESSIBILITY, icon: 'DoorOpen', sortOrder: 51 },
  { key: 'security', name: 'Seguridad', category: AmenityCategory.SAFETY, icon: 'ShieldCheck', sortOrder: 60 },
];
