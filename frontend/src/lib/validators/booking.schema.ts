import { z } from 'zod';

export const timeToMinutes = (time: string): number => {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
};

/** "00:00" as an end time means "midnight, end of day" (see booking.service.ts on the
 * backend), not "the very start of the day" — treat it as 24:00 for comparison. */
export const endTimeToMinutes = (time: string): number =>
  time === '00:00' ? 24 * 60 : timeToMinutes(time);

export const bookingSchema = z
  .object({
    eventType: z.string().min(2, 'Indica el tipo de evento').max(100),
    eventDate: z.string().min(1, 'Selecciona una fecha'),
    endDate: z.string().min(1, 'Selecciona una fecha de fin'),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora invalida'),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora invalida'),
    guestCount: z.coerce.number().min(1, 'Debe haber al menos 1 invitado').max(5000),
    specialRequests: z.string().max(1000).optional(),
    selectedAmenityIds: z.array(z.string()).default([]),
  })
  .refine((data) => timeToMinutes(data.startTime) < endTimeToMinutes(data.endTime), {
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
