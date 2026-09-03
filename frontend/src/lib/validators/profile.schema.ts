import { z } from 'zod';
import { PHONE_REGEX } from '@/lib/validators/auth.schema';

export const profileSchema = z.object({
  fullName: z.string().min(2, 'Ingresa tu nombre completo').max(100),
  city: z.string().max(100).optional().or(z.literal('')),
  district: z.string().max(100).optional().or(z.literal('')),
  whatsappPhone: z
    .string()
    .regex(PHONE_REGEX, 'Ingresa los 8 digitos de tu celular')
    .optional()
    .or(z.literal('')),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
