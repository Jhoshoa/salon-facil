import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3001),
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRATION: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),
  BCRYPT_ROUNDS: Joi.number().default(12),
  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),
  // Only needed if the frontend and backend end up on different subdomains in production
  // (e.g. app.salonfacil.bo + api.salonfacil.bo) — see auth-cookies.util.ts. Leave unset for
  // local dev and for any setup where they share an origin/host.
  COOKIE_DOMAIN: Joi.string().optional(),
  SUPABASE_URL: Joi.string().uri().optional(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().optional(),
  CLOUDINARY_CLOUD_NAME: Joi.string().optional(),
  CLOUDINARY_API_KEY: Joi.string().optional(),
  CLOUDINARY_API_SECRET: Joi.string().optional(),
  TWILIO_ACCOUNT_SID: Joi.string().optional(),
  TWILIO_AUTH_TOKEN: Joi.string().optional(),
  TWILIO_WHATSAPP_NUMBER: Joi.string().optional(),
  RESEND_API_KEY: Joi.string().optional(),
  RESEND_FROM_EMAIL: Joi.string().email().optional(),
  GOOGLE_MAPS_API_KEY: Joi.string().optional(),
  SENTRY_DSN: Joi.string().uri().optional(),
});
