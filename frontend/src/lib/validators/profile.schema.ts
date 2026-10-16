import { z } from 'zod';
import { PHONE_REGEX } from '@/lib/validators/auth.schema';

const optionalUrl = z
  .string()
  .trim()
  .url('Ingresa una URL valida (ej. https://facebook.com/tu-pagina)')
  .optional()
  .or(z.literal(''));

export const profileSchema = z.object({
  fullName: z.string().min(2, 'Ingresa tu nombre completo').max(100),
  city: z.string().max(100).optional().or(z.literal('')),
  district: z.string().max(100).optional().or(z.literal('')),
  whatsappPhone: z
    .string()
    .regex(PHONE_REGEX, 'Ingresa los 8 digitos de tu celular')
    .optional()
    .or(z.literal('')),
  facebookUrl: optionalUrl,
  instagramUrl: optionalUrl,
  tiktokUrl: optionalUrl,
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
