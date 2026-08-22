import { z } from 'zod';

export const venueOpeningHourSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  opensAt: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato HH:mm'),
  closesAt: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato HH:mm'),
  isClosed: z.boolean(),
});

export const venueFormSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres').max(100),
  description: z
    .string()
    .min(20, 'La descripcion debe tener al menos 20 caracteres')
    .max(2000),
  shortDescription: z.string().max(255).optional().or(z.literal('')),
  address: z.string().min(5, 'Ingresa una direccion valida'),
  district: z.string().min(2, 'Ingresa el distrito o zona'),
  city: z.string().min(2, 'Ingresa la ciudad'),
  latitude: z.string().optional().or(z.literal('')),
  longitude: z.string().optional().or(z.literal('')),
  capacityMin: z.coerce.number().min(0).default(0),
  capacityMax: z.coerce
    .number({ invalid_type_error: 'La capacidad maxima es requerida' })
    .min(1, 'La capacidad maxima es requerida')
    .max(5000),
  squareMeters: z.union([z.coerce.number().min(1), z.literal('')]).optional(),
  spaceType: z.string().optional().or(z.literal('')),
  priceUnit: z.enum(['EVENT', 'HOUR', 'DAY']),
  minimumHours: z.coerce.number().min(1).max(24),
  instantBooking: z.boolean(),
  allowsMultipleDays: z.boolean(),
  rules: z.string().max(2000).optional().or(z.literal('')),
  cancellationPolicy: z.string().max(2000).optional().or(z.literal('')),
  basePrice: z.coerce
    .number({ invalid_type_error: 'Ingresa un precio base' })
    .min(1, 'Ingresa un precio base'),
  amenityIds: z.array(z.string()).default([]),
  useTypes: z.array(z.string()).default([]),
  openingHours: z.array(venueOpeningHourSchema).length(7),
});

export type VenueFormValues = z.infer<typeof venueFormSchema>;

export const dayLabels = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

export const defaultOpeningHours = Array.from({ length: 7 }).map((_, dayOfWeek) => ({
  dayOfWeek,
  opensAt: '09:00',
  closesAt: '18:00',
  isClosed: dayOfWeek === 0,
}));

export const venueFormDefaults: VenueFormValues = {
  name: '',
  description: '',
  shortDescription: '',
  address: '',
  district: '',
  city: 'El Alto',
  latitude: '',
  longitude: '',
  capacityMin: 0,
  capacityMax: 1 as unknown as number,
  squareMeters: '',
  spaceType: '',
  priceUnit: 'EVENT',
  minimumHours: 4,
  instantBooking: false,
  allowsMultipleDays: false,
  rules: '',
  cancellationPolicy: '',
  basePrice: 0,
  amenityIds: [],
  useTypes: [],
  openingHours: defaultOpeningHours,
};
