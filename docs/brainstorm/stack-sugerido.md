# Stack Tecnológico Sugerido - SalónFácil

## Frontend
| Tecnología | Por qué |
|------------|---------|
| **Next.js 14** (App Router) | SSR para SEO, PWA nativo, API routes |
| **TypeScript** | Menos bugs, mejor mantenimiento |
| **Tailwind CSS** | UI rápida, responsive fácil |
| **React Query** | Manejo de datos/cache del servidor |

## Backend
| Tecnología | Por qué |
|------------|---------|
| **Next.js API Routes** | Todo en un solo proyecto, menos complejidad |
| **Prisma ORM** | Type-safe queries, migraciones fáciles |
| **PostgreSQL** | Fechas/disponibilidad necesitan queries relacionales |
| **Redis** | Cache de búsquedas, sesiones, colas de WhatsApp |

## Servicios Externos
| Servicio | Proveedor | Por qué |
|----------|-----------|---------|
| **Fotos** | Cloudinary | Optimización automática, CDN global |
| **Auth** | NextAuth.js | Gratis, login con Google/Facebook |
| **WhatsApp** | Twilio o Meta API | Notificaciones de reserva/confirmación |
| **Pagos** | QR bancario local + Stripe | Bolivia necesita pagos locales |
| **Email** | Resend | Transaccional, barato |
| **Hosting** | Vercel | Deploy automático, serverless |

## Por qué este stack:

1. **Un solo proyecto** - Next.js maneja frontend + API, menos mantenimiento
2. **Costo bajo** - Vercel free tier, PostgreSQL en Supabase gratis para empezar
3. **Escalable** - Si crece, separas backend de frontend fácilmente
4. **Developer experience** - TypeScript end-to-end, Prisma type-safe
5. **PWA nativo** - Next.js soporta service workers sin config extra

## Estructura del proyecto:
```
salon-facil/
├── app/                    # Next.js App Router
│   ├── (public)/          # Rutas públicas (clientes)
│   │   ├── page.tsx       # Home/search
│   │   ├── venue/[id]/   # Perfil del local
│   │   └── book/         # Reserva
│   ├── (dashboard)/       # Rutas del dueño
│   │   ├── venues/       # Gestión de locales
│   │   ├── calendar/     # Calendario
│   │   └── bookings/    # Reservas
│   └── api/              # API routes
├── components/
├── lib/
│   ├── prisma.ts         # Cliente Prisma
│   └── whatsapp.ts       # Helper WhatsApp
└── prisma/
    └── schema.prisma     # Modelo de datos
```
