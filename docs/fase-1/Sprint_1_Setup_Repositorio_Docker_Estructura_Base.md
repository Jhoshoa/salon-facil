# 🏗️ Sprint 1: Setup del Repositorio, Docker y Estructura Base

**Proyecto:** SalónFácil — Plataforma de Alquiler de Locales para Eventos  
**Fase:** 1 — Setup y Fundación  
**Sprint:** 1 de 6  
**Duración estimada:** 2–3 días  
**Stack:** NestJS + Next.js 14 + PostgreSQL + Redis + Docker

---

## 📋 Índice

1. [Objetivo del Sprint](#1-objetivo-del-sprint)
2. [Prerrequisitos](#2-prerrequisitos)
3. [Estructura del Repositorio](#3-estructura-del-repositorio)
4. [Setup del Backend (NestJS)](#4-setup-del-backend-nestjs)
5. [Setup del Frontend (Next.js 14)](#5-setup-del-frontend-nextjs-14)
6. [Docker Compose — Infraestructura Local](#6-docker-compose--infraestructura-local)
7. [Configuración de Variables de Entorno](#7-configuración-de-variables-de-entorno)
8. [Scripts de Inicio](#8-scripts-de-inicio)
9. [CI/CD Base (GitHub Actions)](#9-cicd-base-github-actions)
10. [Criterios de Aceptación](#10-criterios-de-aceptación)
11. [Precauciones y Mejores Prácticas](#11-precauciones-y-mejores-prácticas)
12. [Checklist de Completitud](#12-checklist-de-completitud)

---

## 1. Objetivo del Sprint

Crear la estructura base del proyecto monorepo con:
- ✅ Backend NestJS con Clean Architecture lista para desarrollar
- ✅ Frontend Next.js 14 con App Router y Tailwind CSS
- ✅ Docker Compose con PostgreSQL 16, Redis 7, y servicios de la app
- ✅ Variables de entorno configuradas para local y producción
- ✅ CI/CD base con GitHub Actions (lint + build)
- ✅ README profesional con instrucciones de inicio

**Al finalizar este sprint, cualquier desarrollador debe poder clonar el repo y tener todo corriendo con `docker-compose up`.**

---

## 2. Prerrequisitos

| Herramienta | Versión mínima | Verificación |
|-------------|---------------|--------------|
| Node.js | 20.x LTS | `node -v` |
| npm | 10.x | `npm -v` |
| Docker | 24.x | `docker -v` |
| Docker Compose | 2.x | `docker compose version` |
| Git | 2.x | `git -v` |

---

## 3. Estructura del Repositorio

```
salon-facil/
├── .github/
│   └── workflows/
│       └── ci.yml                    # CI base: lint + build
├── backend/                          # NestJS API
│   ├── src/
│   ├── test/
│   ├── docker/
│   ├── prisma/
│   ├── .env.example
│   ├── .env.local                    # NO commitear
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   ├── jest.config.ts
│   └── eslint.config.js
├── frontend/                         # Next.js 14
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── stores/
│   ├── types/
│   ├── public/
│   ├── styles/
│   ├── .env.example
│   ├── .env.local                    # NO commitear
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   └── postcss.config.js
├── docker-compose.yml                # Infra local completa
├── docker-compose.override.yml       # Overrides para dev
├── Makefile                          # Comandos comunes
├── README.md                         # Documentación de inicio
└── .gitignore                        # Global
```

### 3.1 Crear estructura

```bash
# Crear directorio raíz
mkdir salon-facil && cd salon-facil
git init

# Crear estructura de carpetas
mkdir -p .github/workflows
mkdir -p backend/{src,test,docker,prisma/migrations}
mkdir -p frontend/{app,components,hooks,lib,stores,types,public,styles}

# Archivos base
touch README.md Makefile .gitignore
```

---

## 4. Setup del Backend (NestJS)

### 4.1 Inicializar NestJS

```bash
cd backend

# Instalar CLI de NestJS globalmente (si no lo tienes)
npm install -g @nestjs/cli

# Crear proyecto NestJS con strict mode
nest new . --strict --package-manager npm

# Seleccionar: npm como package manager
# Esto crea: src/, test/, package.json, tsconfig.json, etc.
```

### 4.2 Instalar dependencias principales

```bash
# Core NestJS
npm install @nestjs/common @nestjs/core @nestjs/platform-express @nestjs/config

# Validación y transformación
npm install class-validator class-transformer

# Seguridad
npm install @nestjs/throttler helmet compression

# Autenticación
npm install @nestjs/passport passport passport-jwt passport-local
npm install @types/passport-jwt @types/passport-local
npm install bcrypt
npm install @types/bcrypt

# Base de datos
npm install @prisma/client
npm install -D prisma

# Redis y colas
npm install ioredis bullmq

# Utilidades
npm install reflect-metadata rxjs

# Testing
npm install -D @nestjs/testing supertest @types/supertest

# Linting y formateo
npm install -D @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint prettier eslint-config-prettier eslint-plugin-import
```

### 4.3 Configurar TypeScript estricto

```json
// backend/tsconfig.json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["src/*"],
      "@shared/*": ["src/shared/*"],
      "@config/*": ["src/config/*"],
      "@modules/*": ["src/modules/*"],
      "@prisma/*": ["prisma/*"]
    }
  }
}
```

### 4.4 Configurar ESLint y Prettier

```json
// backend/.eslintrc.js
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', 'dist/'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
};
```

```json
// backend/.prettierrc
{
  "singleQuote": true,
  "trailingComma": "all",
  "tabWidth": 2,
  "semi": true,
  "printWidth": 100
}
```

### 4.5 Crear estructura Clean Architecture base

```bash
# Crear carpetas de Clean Architecture
mkdir -p src/{shared/{decorators,enums,filters,guards,interceptors,pipes,utils,types},config,prisma,modules}

# Crear archivos base
touch src/main.ts
touch src/app.module.ts
touch src/shared/decorators/public.decorator.ts
touch src/shared/filters/http-exception.filter.ts
touch src/shared/pipes/validation.pipe.ts
```

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet());

  // Compression
  app.use(compression());

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipe(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 Backend running on http://localhost:${port}/api/v1`);
  console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap();
```

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validationSchema } from './config/validation.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validationSchema,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minuto
        limit: 100, // 100 requests por minuto
      },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

```typescript
// src/app.controller.ts
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  health() {
    return this.appService.health();
  }
}
```

```typescript
// src/app.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'salon-facil-api',
      version: '0.1.0',
    };
  }
}
```

```typescript
// src/config/validation.schema.ts
import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3001),
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRATION: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),
  BCRYPT_ROUNDS: Joi.number().default(12),
  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),
});
```

### 4.6 Crear Dockerfile del Backend

```dockerfile
# backend/docker/Dockerfile
# Multi-stage build para producción

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./

USER nestjs

EXPOSE 3001

CMD ["node", "dist/main.js"]
```

```dockerfile
# backend/docker/Dockerfile.dev
FROM node:20-alpine
WORKDIR /app

# Instalar dependencias de desarrollo
RUN apk add --no-cache libc6-compat

# Copiar package.json primero (cache de Docker)
COPY package*.json ./
RUN npm install

# Copiar el resto
COPY . .

EXPOSE 3001

CMD ["npm", "run", "start:dev"]
```

---

## 5. Setup del Frontend (Next.js 14)

### 5.1 Inicializar Next.js

```bash
cd ../frontend

# Crear proyecto Next.js con App Router
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-import-alias

# NOTA: Cuando pregunte, seleccionar:
# - TypeScript: Yes
# - ESLint: Yes
# - Tailwind CSS: Yes
# - src/ directory: Yes
# - App Router: Yes
# - import alias: No (usaremos @/ manualmente)
```

### 5.2 Instalar dependencias

```bash
# UI Components (shadcn/ui)
npx shadcn-ui@latest init
# Seleccionar: Default style, Zinc base color

# Instalar componentes shadcn necesarios para el MVP
npx shadcn add button input label card badge skeleton sheet dialog toast

# Estado y fetching
npm install @tanstack/react-query zustand

# Formularios y validación
npm install react-hook-form @hookform/resolvers zod

# Utilidades
npm install clsx tailwind-merge class-variance-authority
npm install lucide-react

# Notificaciones
npm install sonner

# Cliente HTTP
npm install axios

# Supabase
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs

# Testing
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jest jest-environment-jsdom

# TypeScript types
npm install -D @types/node
```

### 5.3 Configurar Tailwind

```typescript
// frontend/tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

### 5.4 Configurar Next.js

```javascript
// frontend/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Server Actions están habilitados por defecto en App Router
  },
  images: {
    domains: ['res.cloudinary.com'],
    formats: ['image/avif', 'image/webp'],
  },
  env: {
    API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
};

module.exports = nextConfig;
```

### 5.5 Crear estructura base del frontend

```bash
# Crear carpetas
mkdir -p src/{app/{(public),(dashboard),(admin)},components/ui,components/layout,components/shared,hooks,lib/{api,supabase,validators},stores,types}

# Archivos base
touch src/app/layout.tsx
touch src/app/page.tsx
touch src/app/globals.css
touch src/lib/utils.ts
```

```typescript
// src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

```typescript
// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SalónFácil — Encuentra el local perfecto para tu evento',
  description: 'Alquiler de locales para bodas, quinceañeras, cumpleaños y eventos en El Alto, Bolivia.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
```

```typescript
// src/app/page.tsx
export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">SalónFácil</h1>
        <p className="text-lg text-gray-600">
          Encuentra el local perfecto para tu evento en El Alto
        </p>
        <p className="mt-4 text-sm text-gray-400">
          Backend status: <BackendStatus />
        </p>
      </div>
    </main>
  );
}

async function BackendStatus() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/health`, {
      next: { revalidate: 30 },
    });
    const data = await res.json();
    return (
      <span className={data.status === 'ok' ? 'text-green-500' : 'text-red-500'}>
        {data.status === 'ok' ? '✅ Conectado' : '❌ Error'}
      </span>
    );
  } catch {
    return <span className="text-red-500">❌ No disponible</span>;
  }
}
```

```css
/* src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 240 5.9% 10%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 240 5.9% 10%;
    --radius: 0.5rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

### 5.6 Crear Dockerfile del Frontend

```dockerfile
# frontend/Dockerfile.dev
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

---

## 6. Docker Compose — Infraestructura Local

```yaml
# docker-compose.yml (raíz del proyecto)
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: salonfacil-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: salonfacil
      POSTGRES_PASSWORD: salonfacil_dev_password
      POSTGRES_DB: salonfacil_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U salonfacil -d salonfacil_dev"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: salonfacil-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: docker/Dockerfile.dev
    container_name: salonfacil-backend
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      NODE_ENV: development
      PORT: 3001
      DATABASE_URL: postgresql://salonfacil:salonfacil_dev_password@postgres:5432/salonfacil_dev
      REDIS_URL: redis://redis:6379
      JWT_SECRET: dev_jwt_secret_change_in_production_min_32_chars
      JWT_REFRESH_SECRET: dev_refresh_secret_change_in_production_min_32_chars
      JWT_ACCESS_EXPIRATION: 15m
      JWT_REFRESH_EXPIRATION: 7d
      BCRYPT_ROUNDS: 12
      CORS_ORIGINS: http://localhost:3000
    volumes:
      - ./backend:/app
      - /app/node_modules
      - /app/dist
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: npm run start:dev

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    container_name: salonfacil-frontend
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3001
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next
    depends_on:
      - backend
    command: npm run dev

volumes:
  postgres_data:
  redis_data:
```

---

## 7. Configuración de Variables de Entorno

### 7.1 Backend .env.example

```bash
# ============================================
# AMBIENTE
# ============================================
NODE_ENV=development
PORT=3001

# ============================================
# BASE DE DATOS (Local Docker)
# ============================================
DATABASE_URL=postgresql://salonfacil:salonfacil_dev_password@localhost:5432/salonfacil_dev

# Producción (Supabase) - descomentar en prod
# DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres

# ============================================
# REDIS (Local Docker)
# ============================================
REDIS_URL=redis://localhost:6379

# Producción (Upstash)
# REDIS_URL=rediss://default:[PASSWORD]@[HOST]:[PORT]

# ============================================
# AUTENTICACIÓN JWT
# ============================================
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
BCRYPT_ROUNDS=12

# ============================================
# SUPABASE AUTH
# ============================================
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ============================================
# CLOUDINARY
# ============================================
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_FOLDER=salonfacil

# ============================================
# TWILIO (WhatsApp)
# ============================================
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# ============================================
# RESEND (Email)
# ============================================
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=noreply@salonfacil.bo

# ============================================
# GOOGLE MAPS
# ============================================
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# ============================================
# FRONTEND / CORS
# ============================================
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000

# ============================================
# MONITOREO
# ============================================
SENTRY_DSN=https://your-sentry-dsn
```

### 7.2 Frontend .env.example

```bash
# ============================================
# API BACKEND
# ============================================
NEXT_PUBLIC_API_URL=http://localhost:3001

# ============================================
# SUPABASE
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# ============================================
# CLOUDINARY
# ============================================
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
```

---

## 8. Scripts de Inicio

### 8.1 Makefile (raíz del proyecto)

```makefile
# Makefile — Comandos comunes para SalónFácil

.PHONY: help up down restart logs backend-shell frontend-shell db-shell redis-cli test

help: ## Mostrar ayuda
	@echo "Comandos disponibles:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \\033[36m%-20s\\033[0m %s\\n", $$1, $$2}'

up: ## Levantar toda la infraestructura
	docker-compose up -d

down: ## Detener toda la infraestructura
	docker-compose down

down-v: ## Detener y eliminar volúmenes (⚠️ borra datos)
	docker-compose down -v

restart: down up ## Reiniciar todo

logs: ## Ver logs de todos los servicios
	docker-compose logs -f

logs-backend: ## Ver logs del backend
	docker-compose logs -f backend

logs-frontend: ## Ver logs del frontend
	docker-compose logs -f frontend

backend-shell: ## Entrar al contenedor del backend
	docker-compose exec backend sh

frontend-shell: ## Entrar al contenedor del frontend
	docker-compose exec frontend sh

db-shell: ## Entrar a PostgreSQL
	docker-compose exec postgres psql -U salonfacil -d salonfacil_dev

redis-cli: ## Entrar a Redis CLI
	docker-compose exec redis redis-cli

test-backend: ## Ejecutar tests del backend
	docker-compose exec backend npm test

test-frontend: ## Ejecutar tests del frontend
	docker-compose exec frontend npm test

migrate: ## Ejecutar migraciones de Prisma
	docker-compose exec backend npx prisma migrate dev

studio: ## Abrir Prisma Studio
	docker-compose exec backend npx prisma studio

seed: ## Ejecutar seed de datos
	docker-compose exec backend npx prisma db seed
```

### 8.2 README.md

```markdown
# 🏛️ SalónFácil

Plataforma de alquiler de locales para eventos en Bolivia.

## 🚀 Inicio Rápido

### Prerrequisitos
- Docker + Docker Compose
- Node.js 20+ (solo para desarrollo local sin Docker)

### 1. Clonar y configurar

```bash
git clone https://github.com/tu-usuario/salon-facil.git
cd salon-facil

# Copiar variables de entorno
cp backend/.env.example backend/.env.local
cp frontend/.env.example frontend/.env.local

# Editar .env.local con tus credenciales
```

### 2. Levantar con Docker

```bash
make up
# o manualmente:
docker-compose up -d
```

### 3. Verificar que todo corre

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001/api/v1 |
| Health Check | http://localhost:3001/api/v1/health |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

### 4. Comandos útiles

```bash
make help          # Ver todos los comandos
make logs          # Ver logs
make db-shell      # Entrar a PostgreSQL
make redis-cli     # Entrar a Redis
make migrate       # Ejecutar migraciones Prisma
make studio        # Abrir Prisma Studio
```

## 📁 Estructura del Proyecto

```
salon-facil/
├── backend/          # NestJS API (Clean Architecture)
├── frontend/         # Next.js 14 (App Router)
├── docker-compose.yml
└── Makefile
```

## 🛠️ Desarrollo

### Backend
```bash
cd backend
npm install
npm run start:dev    # Modo watch
npm run test         # Tests
npm run lint         # Linter
```

### Frontend
```bash
cd frontend
npm install
npm run dev          # Modo desarrollo
npm run test         # Tests
npm run lint         # Linter
```

## 📝 Licencia

MIT — SalónFácil Team
```

---

## 9. CI/CD Base (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  backend-lint-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json
      
      - name: Install dependencies
        working-directory: backend
        run: npm ci
      
      - name: Run linter
        working-directory: backend
        run: npm run lint
      
      - name: Build
        working-directory: backend
        run: npm run build

  frontend-lint-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      
      - name: Install dependencies
        working-directory: frontend
        run: npm ci
      
      - name: Run linter
        working-directory: frontend
        run: npm run lint
      
      - name: Build
        working-directory: frontend
        run: npm run build
```

---

## 10. Criterios de Aceptación

| # | Criterio | Cómo verificar |
|---|----------|----------------|
| CA1 | `docker-compose up` levanta todos los servicios sin errores | `docker-compose ps` muestra todos healthy |
| CA2 | Backend responde en `http://localhost:3001/api/v1/health` | `curl http://localhost:3001/api/v1/health` devuelve JSON con status ok |
| CA3 | Frontend muestra página de inicio con status del backend | Navegar a `http://localhost:3000` y ver "Backend status: ✅ Conectado" |
| CA4 | PostgreSQL acepta conexiones | `make db-shell` entra a psql sin errores |
| CA5 | Redis acepta conexiones | `make redis-cli` y ejecutar `PING` devuelve `PONG` |
| CA6 | CI pasa en GitHub Actions | Push a `main` o PR ejecuta workflow sin errores |
| CA7 | README tiene instrucciones claras | Un nuevo dev puede levantar el proyecto en <10 min |
| CA8 | `.env.local` NO está en git | `git status` no muestra archivos .env.local |

---

## 11. Precauciones y Mejores Prácticas

| # | Precaución | Por qué | Cómo mitigar |
|---|-----------|---------|--------------|
| P1 | **NUNCA commitear `.env.local`** | Expone secrets, passwords, API keys | `.env.local` y `.env` en `.gitignore`. Solo `.env.example` en repo. |
| P2 | **Usar `npm ci` en CI/CD, no `npm install`** | `npm ci` usa `package-lock.json` exacto. `npm install` puede actualizar versiones. | En GitHub Actions y Dockerfiles usar `npm ci`. |
| P3 | **Health checks en Docker** | Sin health checks, Docker considera "up" un servicio que aún no está listo. | PostgreSQL y Redis tienen health checks configurados. Backend depende de ellos. |
| P4 | **Volumen para `node_modules` anónimo** | Si montamos `./backend:/app` sin excluir `node_modules`, sobrescribimos los del contenedor. | Usar `- /app/node_modules` en volumes para que Docker maneje el volumen anónimo. |
| P5 | **JWT secrets mínimo 32 caracteres** | Secrets cortos son vulnerables a fuerza bruta. | Validación con Joi: `.min(32).required()`. Generar con `openssl rand -base64 32`. |
| P6 | **Usar Alpine Linux en Docker** | Imágenes más pequeñas = menos superficie de ataque, más rápidas. | Todas las imágenes usan `node:20-alpine`. |
| P7 | **No correr como root en producción** | Procesos root en contenedores son riesgo de seguridad. | Dockerfile de producción crea usuario `nestjs` con UID 1001. |
| P8 | **TypeScript strict mode** | Previene null/undefined errors en runtime. | `strictNullChecks: true`, `noImplicitAny: true` en tsconfig. |

---

## 12. Checklist de Completitud

### Estructura
- [ ] Repo inicializado con Git
- [ ] Estructura de carpetas backend/frontend creada
- [ ] `.gitignore` configurado (node_modules, .env, .next, dist)
- [ ] `README.md` con instrucciones de inicio
- [ ] `Makefile` con comandos comunes

### Backend
- [ ] NestJS instalado y corriendo
- [ ] TypeScript strict configurado
- [ ] ESLint + Prettier configurados
- [ ] `main.ts` con helmet, compression, CORS, validation pipe
- [ ] `app.module.ts` con ConfigModule y ThrottlerModule
- [ ] Health endpoint `/api/v1/health` funcional
- [ ] Carpetas Clean Architecture creadas (shared, config, modules)
- [ ] `validation.schema.ts` con Joi para variables de entorno
- [ ] Dockerfile.dev creado

### Frontend
- [ ] Next.js 14 instalado y corriendo
- [ ] Tailwind CSS configurado
- [ ] shadcn/ui inicializado
- [ ] Componentes base instalados (button, input, card, skeleton, sheet, dialog, toast)
- [ ] `layout.tsx` con metadata y Toaster
- [ ] `page.tsx` con mensaje de bienvenida y status del backend
- [ ] `globals.css` con variables CSS
- [ ] `lib/utils.ts` con función `cn()`
- [ ] Dockerfile.dev creado

### Docker
- [ ] `docker-compose.yml` con postgres, redis, backend, frontend
- [ ] Health checks en postgres y redis
- [ ] `depends_on` con `condition: service_healthy`
- [ ] Volumes persistentes para postgres y redis
- [ ] Variables de entorno inyectadas correctamente

### Variables de Entorno
- [ ] `backend/.env.example` completo
- [ ] `frontend/.env.example` completo
- [ ] `backend/.env.local` creado (NO en git)
- [ ] `frontend/.env.local` creado (NO en git)

### CI/CD
- [ ] `.github/workflows/ci.yml` creado
- [ ] Workflow ejecuta lint + build para backend
- [ ] Workflow ejecuta lint + build para frontend
- [ ] Workflow pasa en push a main/develop

### Verificación Final
- [ ] `make up` levanta todo sin errores
- [ ] `curl http://localhost:3001/api/v1/health` devuelve status ok
- [ ] `http://localhost:3000` muestra página con backend conectado
- [ ] `make db-shell` entra a PostgreSQL
- [ ] `make redis-cli` responde PONG
- [ ] CI pasa en GitHub

---

> **"Un buen setup es el 50% del éxito. Si tu entorno de desarrollo es doloroso, tu código será doloroso."**

---

*Sprint 1 — Setup y Fundación*  
*© 2026 — SalónFácil Development Team*
"""