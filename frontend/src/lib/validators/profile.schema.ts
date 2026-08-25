import { z } from 'zod';

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
  whatsappPhone: z.string().max(20).optional().or(z.literal('')),
  facebookUrl: optionalUrl,
  instagramUrl: optionalUrl,
  tiktokUrl: optionalUrl,
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
