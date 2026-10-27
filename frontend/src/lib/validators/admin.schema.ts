import { z } from 'zod';
import { PHONE_REGEX, PHONE_HINT } from '@/lib/validators/auth.schema';
import { departamentoValues } from '@/lib/validators/venue.schema';

/** Solo los campos que realmente salen de una llamada telefonica -- el resto (fotos, comodidades,
 * horarios, precios detallados) se completa despues desde las pantallas de edicion de local que
 * ya existen, una vez creado el local en DRAFT. */
export const ownerInviteFormSchema = z.object({
  ownerFullName: z.string().min(2, 'Ingresa el nombre del propietario').max(100),
  ownerEmail: z.string().email('Email invalido'),
  ownerPhone: z.string().regex(PHONE_REGEX, PHONE_HINT),
  venueName: z.string().min(3, 'El nombre debe tener al menos 3 caracteres').max(100),
  venueAddress: z.string().min(5, 'Ingresa una direccion valida'),
  venueDistrict: z.string().min(2, 'Ingresa el distrito o zona'),
  venueDepartamento: z.enum(departamentoValues, {
    errorMap: () => ({ message: 'Selecciona un departamento' }),
  }),
  venueCapacityMax: z.coerce
    .number({ invalid_type_error: 'La capacidad maxima es requerida' })
    .min(1, 'La capacidad maxima es requerida')
    .max(5000),
});

export type OwnerInviteFormValues = z.infer<typeof ownerInviteFormSchema>;

/** For attaching a real owner to a venue that already exists (e.g. one an admin created
 * directly) -- same contact fields as ownerInviteFormSchema, without any venue fields since the
 * venue is already there. */
export const assignVenueOwnerFormSchema = z.object({
  ownerFullName: z.string().min(2, 'Ingresa el nombre del propietario').max(100),
  ownerEmail: z.string().email('Email invalido'),
  ownerPhone: z.string().regex(PHONE_REGEX, PHONE_HINT),
});

export type AssignVenueOwnerFormValues = z.infer<typeof assignVenueOwnerFormSchema>;
