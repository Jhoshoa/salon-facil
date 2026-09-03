import { z } from 'zod';

export const profileSchema = z.object({
  fullName: z.string().min(2, 'Ingresa tu nombre completo').max(100),
  city: z.string().max(100).optional().or(z.literal('')),
  district: z.string().max(100).optional().or(z.literal('')),
  whatsappPhone: z.string().max(20).optional().or(z.literal('')),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
