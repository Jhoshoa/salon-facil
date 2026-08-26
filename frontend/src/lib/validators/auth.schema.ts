import { z } from 'zod';

// Mirrors backend/src/modules/auth/application/dto/register.dto.ts exactly. The API is the
// real gate (it rejects invalid input regardless of what the client sends), but duplicating
// the rule here lets the form catch mistakes before a round trip and show the requirement
// upfront instead of only after a failed submit.
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#=])[A-Za-z\d@$!%*?&#=]{8,}$/;
export const PASSWORD_HINT = 'Minimo 8 caracteres: 1 mayuscula, 1 minuscula, 1 numero y 1 caracter especial (@$!%*?&#=)';

export const PHONE_REGEX = /^\+591\d{8}$/;
export const PHONE_HINT = 'Formato boliviano: +591 seguido de 8 digitos, ej. +59171234567';

export const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(1, 'La contrasena es requerida'),
});

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Ingresa tu nombre completo').max(100),
  email: z.string().email('Email invalido'),
  phone: z.string().regex(PHONE_REGEX, PHONE_HINT),
  password: z.string().regex(PASSWORD_REGEX, PASSWORD_HINT),
  role: z.enum(['CLIENT', 'OWNER']),
  city: z.string().optional(),
  district: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email invalido'),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().regex(PASSWORD_REGEX, PASSWORD_HINT),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
