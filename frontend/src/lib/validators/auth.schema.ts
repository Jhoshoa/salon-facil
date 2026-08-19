import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(1, 'La contrasena es requerida'),
});

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Ingresa tu nombre completo').max(100),
  email: z.string().email('Email invalido'),
  phone: z.string().min(8, 'Ingresa un telefono valido').max(20),
  password: z.string().min(8, 'La contrasena debe tener al menos 8 caracteres'),
  role: z.enum(['CLIENT', 'OWNER']),
  city: z.string().optional(),
  district: z.string().optional(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
