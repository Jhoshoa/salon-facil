import { z } from 'zod';

export const bookingSchema = z
  .object({
    eventType: z.string().min(2, 'Indica el tipo de evento').max(100),
    eventDate: z.string().min(1, 'Selecciona una fecha'),
    endDate: z.string().min(1, 'Selecciona una fecha de fin'),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora invalida'),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora invalida'),
    guestCount: z.coerce.number().min(1, 'Debe haber al menos 1 invitado').max(5000),
    specialRequests: z.string().max(1000).optional(),
  })
  .refine((data) => data.startTime < data.endTime, {
    path: ['endTime'],
    message: 'La hora de fin debe ser posterior al inicio',
  })
  .refine((data) => new Date(data.eventDate) >= new Date(new Date().toDateString()), {
    path: ['eventDate'],
    message: 'La fecha no puede ser pasada',
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.eventDate), {
    path: ['endDate'],
    message: 'La fecha de fin debe ser igual o posterior a la de inicio',
  });

export type BookingFormValues = z.infer<typeof bookingSchema>;
