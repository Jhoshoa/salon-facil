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
  // AWS SES — transactional email (verification codes, booking/payment notifications). Reads
  // AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY itself via the SDK's standard env var convention, so
  // only the region and sender identity need their own entries here.
  AWS_REGION: Joi.string().optional(),
  AWS_ACCESS_KEY_ID: Joi.string().optional(),
  AWS_SECRET_ACCESS_KEY: Joi.string().optional(),
  SES_FROM_EMAIL: Joi.string().email().optional(),
  GOOGLE_MAPS_API_KEY: Joi.string().optional(),
  // Google OAuth (sign in / sign up with Google) — see
  // docs/auth-improvement/oauth-redirects-verification.md §1. Optional so the app still boots
  // without them (the Google buttons just won't work); GoogleStrategy checks these are all
  // present before registering itself.
  GOOGLE_CLIENT_ID: Joi.string().optional(),
  GOOGLE_CLIENT_SECRET: Joi.string().optional(),
  GOOGLE_CALLBACK_URL: Joi.string().uri().optional(),
  SENTRY_DSN: Joi.string().uri().optional(),
});
