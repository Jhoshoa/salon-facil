# 🏛️ Arquitectura de Software: Plataforma de Alquiler de Locales para Eventos
## Bolivia — Ciudad de El Alto (y expansión nacional)

**Documento de Arquitectura y Planificación de Producto**  
**Versión:** 1.0  
**Fecha:** Julio 2026  
**Autor:** Arquitectura de Software — Documento Estratégico

---

## 📋 Índice

1. [Visión General del Proyecto](#1-visión-general-del-proyecto)
2. [Análisis del Mercado y Oportunidad](#2-análisis-del-mercado-y-oportunidad)
3. [Personas (User Personas)](#3-personas-user-personas)
4. [Modelo de Negocio](#4-modelo-de-negocio)
5. [Features por Módulo](#5-features-por-módulo)
6. [Arquitectura Técnica](#6-arquitectura-técnica)
7. [Stack Tecnológico Recomendado](#7-stack-tecnológico-recomendado)
8. [Flujos de Usuario Principales](#8-flujos-de-usuario-principales)
9. [Modelo de Datos (Entidades Principales)](#9-modelo-de-datos-entidades-principales)
10. [Plan de Implementación (MVP y Roadmap)](#10-plan-de-implementación-mvp-y-roadmap)
11. [Consideraciones Legales y de Mercado](#11-consideraciones-legales-y-de-mercado)
12. [Métricas de Éxito (KPIs)](#12-métricas-de-éxito-kpis)
13. [Riesgos y Mitigaciones](#13-riesgos-y-mitigaciones)
14. [Conclusión y Recomendación Estratégica](#14-conclusión-y-recomendación-estratégica)

---

## 1. Visión General del Proyecto

### 1.1 Nombre Propuesto
**"SalónFácil"** (o similar: EventoYa, MiSalón, FiestaBol, etc.)

### 1.2 Problema Central
En Bolivia, especialmente en ciudades como El Alto, La Paz, Santa Cruz y Cochabamba, la industria de alquiler de locales para eventos (bodas, quinceañeras, bautizos, graduaciones, cumpleaños, eventos corporativos) opera de manera **100% analógica**:

- Los clientes deben **recorrer físicamente** múltiples locales para comparar precios, disponibilidad y características.
- Los precios **varían según fecha, día de la semana y temporada** (septiembre = mes de fiestas patronales, diciembre = fin de año), pero no hay transparencia.
- La información sobre **qué está incluido** (sillas, mesas, cocina, baños, estacionamiento, limpieza, sonido) se transmite verbalmente y genera conflictos post-evento.
- No existe un **calendario centralizado** de disponibilidad; dos personas pueden "reservar" el mismo día por error.
- Los pagos se manejan en **efectivo o transferencias informales**, sin contratos digitales ni garantías.

### 1.3 Visión del Producto
> *"Conectar a dueños de locales con personas que buscan el espacio perfecto para su evento, eliminando la fricción de la búsqueda manual y brindando transparencia total en precios, disponibilidad y servicios incluidos."*

### 1.4 Alcance Inicial
- **Ciudad piloto:** El Alto, Bolivia (alta densidad de locales, mercado no atendido digitalmente).
- **Expansión:** La Paz, Santa Cruz, Cochabamba, Tarija, Sucre.
- **Tipos de eventos:** Bodas, quinceañeras, bautizos, graduaciones, cumpleaños, eventos corporativos, ferias.

---

## 2. Análisis del Mercado y Oportunidad

### 2.1 Tamaño del Mercado (Estimado)

| Métrica | Estimación | Fuente/Justificación |
|---------|-----------|----------------------|
| Población El Alto | ~1,000,000 habitantes | Censo Bolivia |
| Locales de eventos estimados | 500–1,500 | Densidad urbana + cultura de fiestas |
| Eventos sociales/año en El Alto | ~25,000–40,000 | Basado en población + cultura de celebraciones |
| Ticket promedio de alquiler | Bs. 800 – Bs. 5,000 (~$115–$720 USD) | Mercado informal actual |
| Mercado TAM (Total Addressable) | ~Bs. 20M – 200M/año | Rango conservador a optimista |

### 2.2 Ventaja Competitiva
- **Primer en moverse:** No existe una plataforma digital consolidada para este nicho en Bolivia.
- **Conocimiento local:** Entender las costumbres bolivianas (fiestas patronales, aymara/quechua, precios variables por temporada).
- **Baja barrera de adopción:** Los dueños de locales no necesitan invertir en hardware; solo necesitan un celular con WhatsApp.

### 2.3 Diferenciación vs. Modelos Existentes (Airbnb, Peerspace)
- Airbnb está orientado a **hospedaje turístico**, no a eventos sociales locales.
- Peerspace existe en EE.UU./Europa, no en Bolivia, y no entiende la dinámica de precios por temporada ni las costumbres locales.
- **Nuestro diferenciador:** Calendario inteligente con precios dinámicos por temporada boliviana + integración con WhatsApp (el canal de comunicación #1 en Bolivia).

---

## 3. Personas (User Personas)

### 3.1 Persona 1: El Dueño del Local ("Don Mario")

```
Nombre: Mario Quispe
Edad: 52 años
Ubicación: Distrito 8, El Alto
Perfil: Dueño de un salón de eventos con capacidad para 200 personas. 
        También tiene una pequeña tienda de abarrotes. No es tecnológico.

Frustraciones:
- Pierde clientes porque no puede contestar el teléfono mientras atiende su tienda.
- Dos familias "reservaron" el mismo sábado porque olvidó anotar una.
- No sabe cuánto cobrar en fechas especiales (15 de septiembre, 31 de diciembre).
- Los clientes le piden fotos del local y él no tiene buenas fotos.
- Le han dejado "plantado" después de decir que iban a pagar la seña.

Necesidades:
- Un calendario simple donde vea qué días están ocupados y libres.
- Que los clientes vean fotos, precios y servicios incluidos SIN que él tenga que explicar uno por uno.
- Recibir pagos de seña de forma segura y con registro.
- Recordatorios automáticos de eventos próximos.
- Poder bloquear fechas fácilmente.

Objetivo: Llenar su calendario de eventos y cobrar lo que merece por su local.
```

### 3.2 Persona 2: La Organizadora del Evento ("Doña Rosa")

```
Nombre: Rosa Mamani
Edad: 38 años
Ubicación: Distrito 3, El Alto
Perfil: Madre de familia organizando la quinceañera de su hija.
        Trabaja medio tiempo. Usa WhatsApp y Facebook diariamente.

Frustraciones:
- Ha recorrido 6 locales en 2 fines de semana y sigue sin decidirse.
- Cada dueño le dice precios diferentes y no sabe si le están cobrando de más.
- No sabe si el local incluye sillas, mesas, cocina, o si tiene que alquilar todo aparte.
- Le preocupa que el local esté sucio o los baños no funcionen.
- Necesita reservar para el 15 de septiembre (fiesta de El Alto) y teme que ya no haya nada.

Necesidades:
- Ver TODOS los locales disponibles en El Alto en un solo lugar, con fotos reales.
- Comparar precios de forma transparente (por fecha, día de semana, temporada).
- Saber EXACTAMENTE qué está incluido en el alquiler.
- Leer opiniones de otras personas que ya usaron el local.
- Reservar con una seña segura y recibir un comprobante/contrato digital.
- Contactar al dueño por WhatsApp si tiene dudas.

Objetivo: Encontrar el mejor local al mejor precio, con confianza y sin recorrer la ciudad.
```

### 3.3 Persona 3: El Organizador Corporativo ("Juan Carlos")

```
Nombre: Juan Carlos Rojas
Edad: 35 años
Ubicación: La Paz (trabaja en empresa)
Perfil: Coordinador de eventos de una empresa. Organiza capacitaciones, 
        cenas de fin de año, lanzamientos de producto.

Necesidades:
- Locales con proyector, WiFi, espacio para 50–200 personas.
- Facturación (recibo/factura) para reembolso de la empresa.
- Contrato formal y garantía de servicio.
- Poder reservar con anticipación (3–6 meses).
```

---

## 4. Modelo de Negocio

### 4.1 Propuesta de Valor
- **Para dueños de locales:** Más visibilidad, calendario digital, menos tiempo en llamadas, pagos seguros, menos "plantones".
- **Para arrendatarios:** Comparación transparente, reserva segura, información completa, ahorro de tiempo.

### 4.2 Modelo de Ingresos (Monetización)

| Fuente de Ingreso | Descripción | Porcentaje/Monto |
|-------------------|-------------|------------------|
| **Comisión por reserva** | % del valor total del alquiler cobrado a la transacción | 8%–12% por reserva confirmada |
| **Suscripción mensual (Dueños)** | Plan básico gratuito (3 fotos, calendario básico) vs. Plan Pro (fotos ilimitadas, destacado en búsqueda, analytics) | Bs. 50–150/mes (~$7–$22 USD) |
| **Publicidad destacada** | Locales que pagan para aparecer primero en resultados | Bs. 30–100/mes |
| **Servicios adicionales** | Alianzas con proveedores: catering, decoración, DJ, fotografía, sonido | Comisión 5%–10% por referencia |
| **Seña/Depósito gestionado** | Retención de seña hasta confirmar el evento | Comisión fija por transacción (Bs. 10–20) |

### 4.3 Estrategia de Adquisición de Usuarios

| Estrategia | Descripción | Canal |
|------------|-------------|-------|
| **Boca a boca** | Referidos: dueño recomienda a dueño, cliente recomienda a cliente | WhatsApp, Facebook |
| **Recorrido físico** | Equipo visita locales en El Alto, explica el beneficio, ayuda a registrarse | Presencial |
| **Facebook/Instagram Ads** | Anuncios segmentados por ubicación e intereses (eventos, bodas, quinceañeras) | Meta Ads |
| **Alianzas estratégicas** | Proveedores de catering, decoración, sonido recomiendan la plataforma | Offline/Online |
| **SEO local** | "Alquiler de salones en El Alto", "locales para bodas Bolivia" | Google |

---

## 5. Features por Módulo

### 5.1 Módulo: Descubrimiento y Búsqueda (Público)

| # | Feature | Descripción | Prioridad | Impacto |
|---|---------|-------------|-----------|---------|
| F1 | **Búsqueda por ubicación** | Mapa interactivo + lista de locales en El Alto, filtrado por zona/distrito | 🔴 Alta | Crítico |
| F2 | **Filtros avanzados** | Por capacidad, tipo de evento, precio, servicios incluidos, disponibilidad de fecha | 🔴 Alta | Crítico |
| F3 | **Perfil del local** | Fotos (mínimo 5), descripción, capacidad, servicios incluidos, reglas, precios por fecha | 🔴 Alta | Crítico |
| F4 | **Calendario de disponibilidad** | Calendario visual donde el usuario ve qué días están libres/ocupados | 🔴 Alta | Crítico |
| F5 | **Precios dinámicos visibles** | Mostrar precio según fecha seleccionada (día hábil vs. fin de semana vs. feriado/temporada alta) | 🔴 Alta | Diferenciador |
| F6 | **Comparador de locales** | Comparar hasta 3 locales lado a lado (precio, capacidad, servicios) | 🟡 Media | Valor agregado |
| F7 | **Reviews y calificaciones** | Sistema de estrellas + comentarios de clientes que ya alquilaron | 🟡 Media | Confianza |
| F8 | **Galería de fotos 360° / video** | Tour virtual del local (futuro, no MVP) | 🟢 Baja | Diferenciador futuro |

### 5.2 Módulo: Reservas y Pagos

| # | Feature | Descripción | Prioridad | Impacto |
|---|---------|-------------|-----------|---------|
| F9 | **Solicitud de reserva** | Usuario selecciona fecha → solicita reserva → dueño aprueba/rechaza | 🔴 Alta | Crítico |
| F10 | **Pago de seña digital** | Integración con pasarela de pagos (QR, transferencia bancaria, Tigo Money) | 🔴 Alta | Crítico |
| F11 | **Contrato digital** | Generación automática de contrato con términos, precio, fecha, servicios incluidos | 🔴 Alta | Seguridad legal |
| F12 | **Confirmación vía WhatsApp** | Notificación automática al dueño y cliente por WhatsApp cuando hay solicitud/confirmación | 🔴 Alta | Adopción |
| F13 | **Recordatorios automáticos** | 7 días, 3 días y 1 día antes del evento (WhatsApp + email) | 🟡 Media | Reducción de olvidos |
| F14 | **Política de cancelación** | Reglas claras de reembolso de seña según días de anticipación | 🟡 Media | Confianza |
| F15 | **Pago completo online** | Opción de pagar el 100% del alquiler por la plataforma | 🟡 Media | Monetización |

### 5.3 Módulo: Gestión para Dueños de Locales (Dashboard)

| # | Feature | Descripción | Prioridad | Impacto |
|---|---------|-------------|-----------|---------|
| F16 | **Calendario de reservas** | Vista mensual/semanal con eventos confirmados, pendientes y bloqueados | 🔴 Alta | Crítico |
| F17 | **Gestión de precios por temporada** | Configurar precios base, precios fin de semana, precios fechas especiales (15 sep, 31 dic, etc.) | 🔴 Alta | Diferenciador |
| F18 | **Gestión de servicios incluidos** | Checklist editable: sillas, mesas, cocina, baños, estacionamiento, limpieza, sonido, etc. | 🔴 Alta | Transparencia |
| F19 | **Solicitudes entrantes** | Panel para aprobar/rechazar solicitudes de reserva con un clic | 🔴 Alta | Eficiencia |
| F20 | **Perfil del local editable** | Subir fotos, editar descripción, capacidad, reglas de uso | 🔴 Alta | Crítico |
| F21 | **Estadísticas básicas** | Cuántas veces se vio su perfil, cuántas solicitudes recibió, tasa de conversión | 🟡 Media | Valor agregado |
| F22 | **Mensajería integrada** | Chat con clientes dentro de la plataforma + integración WhatsApp | 🟡 Media | Comunicación |
| F23 | **Bloqueo manual de fechas** | Marcar fechas como "no disponible" (uso propio, mantenimiento) | 🔴 Alta | Operativo |
| F24 | **Gestión de múltiples locales** | Un dueño puede registrar varios salones bajo una misma cuenta | 🟢 Baja | Escalabilidad |

### 5.4 Módulo: Administración de Plataforma (Super Admin)

| # | Feature | Descripción | Prioridad |
|---|---------|-------------|-----------|
| F25 | **Panel de administración** | Gestión de usuarios, locales, transacciones, disputas | 🔴 Alta |
| F26 | **Verificación de locales** | Validar que el local existe (fotos, dirección, contacto) antes de publicar | 🔴 Alta |
| F27 | **Gestión de disputas** | Mediación entre dueño y cliente en caso de conflictos | 🟡 Media |
| F28 | **Reportes financieros** | Ingresos por comisiones, transacciones, crecimiento mensual | 🟡 Media |
| F29 | **CMS de contenido** | Blog/tips para organizar eventos (SEO + engagement) | 🟢 Baja |

### 5.5 Módulo: Notificaciones y Comunicación

| # | Feature | Descripción | Prioridad |
|---|---------|-------------|-----------|
| F30 | **WhatsApp Business API** | Notificaciones de reserva, confirmación, recordatorios, cancelaciones | 🔴 Alta |
| F31 | **Email transaccional** | Comprobantes de pago, contratos, confirmaciones | 🟡 Media |
| F32 | **Push notifications** | (Solo si hay app móvil) Alertas de nuevas solicitudes | 🟢 Baja |

---

## 6. Arquitectura Técnica

### 6.1 Diagrama de Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTES                                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│  │   Web App       │  │   Web Mobile    │  │  WhatsApp Bot   │            │
│  │   (React/Vue)   │  │   (Responsive)   │  │  (Twilio/WABA)  │            │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘            │
└───────────┼──────────────────┼──────────────────┼──────────────────────────┘
            │                  │                  │
            ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY (Nginx / AWS ALB)                     │
│                    Rate Limiting, SSL Termination, Routing                   │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Node.js / Python FastAPI)                   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │  Auth Svc   │ │ Booking Svc │ │ Payment Svc │ │ Notif Svc   │            │
│  │  (JWT)      │ │ (Reservas)  │ │ (Señas)     │ │ (WhatsApp)  │            │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │  Search Svc │ │ Calendar Svc│ │ Review Svc  │ │ Admin Svc   │            │
│  │  (Elastic)  │ │ (Disponib.) │ │ (Opiniones) │ │ (SuperAdmin)│            │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘            │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   PostgreSQL    │  │     Redis       │  │   Cloud Storage   │
│   (Datos        │  │   (Cache,       │  │   (AWS S3 /       │
│    principales) │  │    Sesiones,    │  │    Cloudinary)    │
│                 │  │    Colas)       │  │   (Fotos, docs)   │
└─────────────────┘  └─────────────────┘  └─────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SERVICIOS EXTERNOS (Integraciones)                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │ WhatsApp    │ │ Pasarela    │ │  Google     │ │  Email      │            │
│  │ Business API│ │ de Pagos    │ │  Maps API   │ │  (SendGrid) │            │
│  │ (Meta)      │ │ (Stripe/    │ │  (Geocod.)  │ │             │            │
│  │             │ │  local)     │ │             │ │             │            │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Principios de Arquitectura

| Principio | Aplicación |
|-----------|------------|
| **Mobile-First Web** | La mayoría de usuarios en Bolivia accede por celular. La web debe ser PWA (Progressive Web App) para sentirse como app sin costo de desarrollo nativo. |
| **API-First** | Todo el backend expone REST APIs, permitiendo futura app móvil nativa sin reescribir lógica. |
| **Escalabilidad horizontal** | Servicios stateless, base de datos con read replicas, caché distribuido. |
| **Seguridad** | JWT + refresh tokens, encriptación de datos sensibles, HTTPS obligatorio, validación de pagos con webhook. |
| **Alta disponibilidad** | Mínimo 99.5% uptime. El calendario de disponibilidad no puede fallar en temporada alta. |

---

## 7. Stack Tecnológico Recomendado

### 7.1 Opción A: Stack Moderno y Económico (Recomendado para MVP)

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| **Frontend Web** | **Next.js 14 (React)** + Tailwind CSS | SSR para SEO (crítico para búsqueda orgánica), PWA nativa, gran comunidad. |
| **Backend** | **Node.js + Express / NestJS** | Rápido de desarrollar, async I/O perfecto para notificaciones y chat, fácil contratar devs en Bolivia. |
| **Base de Datos** | **PostgreSQL 16** | Relacional robusto, soporte JSON para flexibilidad, PostGIS para búsquedas geográficas. |
| **Caché / Colas** | **Redis** | Cache de búsquedas, sesiones, cola de notificaciones WhatsApp. |
| **Búsqueda** | **PostgreSQL Full-Text Search** (inicial) → **Elasticsearch** (escala) | FTS de PostgreSQL es suficiente para <10,000 locales. Migrar a Elastic cuando escale. |
| **Almacenamiento** | **Cloudinary** o **AWS S3** | Fotos optimizadas automáticamente, CDN global. |
| **Autenticación** | **Auth0** o **Firebase Auth** | Login social (Google, Facebook), verificación SMS. Rápido de implementar. |
| **Pagos** | **Integración con pasarela local** (Banco Union, BNB QR) + **Stripe** (tarjetas internacionales) | Bolivia requiere soporte de pagos locales. QR bancario es clave. |
| **WhatsApp** | **WhatsApp Business API** (via Meta / Twilio) | Canal de comunicación #1 en Bolivia. Notificaciones, confirmaciones, recordatorios. |
| **Hosting** | **Vercel** (frontend) + **Railway / Render / AWS ECS** (backend) + **Supabase / AWS RDS** (DB) | Costo inicial bajo, escala automáticamente. |
| **Monitoreo** | **Sentry** (errores) + **LogRocket** (sesiones de usuario) | Detectar bugs antes de que los usuarios se quejen. |

### 7.2 Opción B: Stack Full Python (Alternativa)

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14 |
| Backend | Python + FastAPI / Django REST |
| Base de Datos | PostgreSQL |
| Caché | Redis |
| Búsqueda | Django-Haystack + Whoosh (inicial) |

### 7.3 ¿App Móvil Nativa o Web?

| Opción | Recomendación | Justificación |
|--------|--------------|---------------|
| **Fase 1 (MVP): PWA Web** | ✅ **RECOMENDADO** | - 90% de usuarios en Bolivia navegan por Chrome/Safari móvil.  <br>- Una PWA se instala como "app" desde el navegador.  <br>- Costo de desarrollo: 1 plataforma vs. 3 (iOS, Android, Web).  <br>- Iteración rápida: actualizas el servidor y todos tienen la versión nueva.  <br>- Sin costo de publicación en App Store / Play Store. |
| **Fase 2: App Nativa** | Considerar a los 6–12 meses | Solo si la métrica de usuarios recurrentes justifica el costo. Flutter (cross-platform) sería la opción más eficiente. |

**Conclusión: Empezar con Web App responsive + PWA. Es suficiente y mucho más rápido/caro de validar.**

---

## 8. Flujos de Usuario Principales

### 8.1 Flujo: Búsqueda y Reserva (Cliente)

```
┌──────────┐     ┌──────────────┐     ┌─────────────┐     ┌─────────────┐     ┌──────────┐
│ Entra a  │────▶│ Busca por    │────▶│ Filtra por  │────▶│ Ve perfil   │────▶│ Selecciona│
│ web/PWA  │     │ ubicación/   │     │ fecha,      │     │ del local   │     │ fecha en  │
│          │     │ tipo evento  │     │ precio,     │     │ (fotos,     │     │ calendario│
│          │     │              │     │ capacidad   │     │ servicios)  │     │           │
└──────────┘     └──────────────┘     └─────────────┘     └─────────────┘     └────┬─────┘
                                                                                   │
┌──────────┐     ┌──────────────┐     ┌─────────────┐     ┌─────────────┐     ┌────┴────┐
│ Recibe   │◀────│ Recibe       │◀────│ Paga seña   │◀────│ Solicita    │◀────│ Confirma│
│ contrato │     │ confirmación │     │ vía QR/     │     │ reserva     │     │ datos   │
│ digital  │     │ por WhatsApp │     │ transferencia│     │ (formulario)│     │         │
└──────────┘     └──────────────┘     └─────────────┘     └─────────────┘     └─────────┘
```

### 8.2 Flujo: Publicación y Gestión (Dueño de Local)

```
┌──────────┐     ┌──────────────┐     ┌─────────────┐     ┌─────────────┐     ┌──────────┐
│ Se       │────▶│ Completa    │────▶│ Sube fotos  │────▶│ Configura   │────▶│ Publica  │
│ registra │     │ perfil del  │     │ del local   │     │ precios por │     │ local    │
│ (teléfono│     │ local       │     │ (mín. 5)    │     │ temporada   │     │          │
│ + email) │     │             │     │             │     │ y servicios │     │          │
└──────────┘     └──────────────┘     └─────────────┘     └─────────────┘     └────┬─────┘
                                                                                   │
┌──────────┐     ┌──────────────┐     ┌─────────────┐     ┌─────────────┐     ┌────┴────┐
│ Marca    │◀────│ Recibe pago │◀────│ Cliente paga│◀────│ Aprueba     │◀────│ Recibe  │
│ fecha    │     │ de seña en  │     │ seña por    │     │ solicitud   │     │ solicitud│
│ ocupada  │     │ plataforma  │     │ plataforma  │     │             │     │         │
└──────────┘     └──────────────┘     └─────────────┘     └─────────────┘     └─────────┘
```

### 8.3 Flujo: Precios Dinámicos

```
Dueño configura:
├── Precio base: Bs. 1,000 (lunes–jueves)
├── Fin de semana: +30% → Bs. 1,300
├── Temporada alta (15 Sep – 15 Oct): +50% → Bs. 1,500
├── Temporada alta (15 Dic – 5 Ene): +60% → Bs. 1,600
├── Feriados específicos: configurable individualmente
└── Descuento por reserva anticipada (>3 meses): -10%

Cliente selecciona fecha → Sistema calcula precio automáticamente → Se muestra precio final transparente.
```

---

## 9. Modelo de Datos (Entidades Principales)

### 9.1 Diagrama Entidad-Relación (Simplificado)

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   USER      │       │   VENUE     │       │  BOOKING    │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)     │       │ id (PK)     │
│ email       │       │ owner_id(FK)│       │ venue_id(FK)│
│ phone       │       │ name        │       │ user_id (FK)│
│ full_name   │◀─────▶│ description │◀─────▶│ event_date  │
│ role        │       │ address     │       │ start_time  │
│ city        │       │ district    │       │ end_time    │
│ avatar_url  │       │ capacity    │       │ total_price │
│ created_at  │       │ latitude    │       │ deposit_paid│
└─────────────┘       │ longitude   │       │ status      │
                      │ photos[]    │       │ contract_url│
                      │ services[]  │       │ created_at  │
                      │ rules       │       └─────────────┘
                      │ is_verified │              │
                      │ is_active   │              │
                      │ created_at  │              ▼
                      └─────────────┘       ┌─────────────┐
                             │              │   PAYMENT   │
                             │              ├─────────────┤
                             │              │ id (PK)     │
                             │              │ booking_id  │
                             ▼              │ amount      │
                      ┌─────────────┐      │ method      │
                      │ VENUE_PRICE │      │ status      │
                      ├─────────────┤      │ reference   │
                      │ id (PK)     │      │ paid_at     │
                      │ venue_id(FK)│      └─────────────┘
                      │ day_type    │
                      │ date_specific│
                      │ price       │
                      │ is_active   │
                      └─────────────┘

┌─────────────┐       ┌─────────────┐
│   REVIEW    │       │   SERVICE   │  (servicios incluidos)
├─────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)     │
│ venue_id(FK)│       │ venue_id(FK)│
│ user_id (FK)│       │ name        │  "Cocina equipada"
│ rating      │       │ icon        │  "Estacionamiento"
│ comment     │       │ is_included │  "Baños (3)"
│ created_at  │       │ description │  "Sonido básico"
└─────────────┘       └─────────────┘
```

### 9.2 Entidades Detalladas

#### `users`
```sql
id: UUID PK
email: VARCHAR(255) UNIQUE
phone: VARCHAR(20) UNIQUE  -- WhatsApp es clave
password_hash: VARCHAR(255)
full_name: VARCHAR(255)
role: ENUM('client', 'owner', 'admin')
city: VARCHAR(100)
avatar_url: TEXT
is_verified: BOOLEAN DEFAULT false
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

#### `venues` (Locales)
```sql
id: UUID PK
owner_id: UUID FK → users.id
name: VARCHAR(255)
slug: VARCHAR(255) UNIQUE  -- SEO friendly
 description: TEXT
address: VARCHAR(500)
district: VARCHAR(100)  -- "Distrito 3", "Distrito 8"
city: VARCHAR(100)  -- "El Alto", "La Paz"
capacity: INTEGER  -- número de personas
latitude: DECIMAL(10,8)
longitude: DECIMAL(11,8)
photos: JSONB  -- array de URLs
rules: TEXT  -- "No se permite pintura en paredes", etc.
is_verified: BOOLEAN DEFAULT false  -- validado por admin
is_active: BOOLEAN DEFAULT true
featured_until: TIMESTAMP  -- para publicidad destacada
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

#### `venue_services` (Servicios incluidos)
```sql
id: UUID PK
venue_id: UUID FK
name: VARCHAR(100)  -- "Sillas", "Mesas redondas", "Cocina", "Baños"
icontype: VARCHAR(50)  -- icono SVG/emoji
is_included: BOOLEAN DEFAULT true  -- true = incluido, false = disponible con costo extra
description: TEXT
created_at: TIMESTAMP
```

#### `venue_prices` (Precios dinámicos)
```sql
id: UUID PK
venue_id: UUID FK
price_type: ENUM('base', 'weekend', 'holiday', 'custom_date')
day_of_week: INTEGER  -- 0=domingo, 6=sábado (solo para weekend)
specific_date: DATE  -- para fechas específicas (15 Sep, 31 Dic)
start_date: DATE  -- para rangos de temporada
end_date: DATE
price: DECIMAL(12,2)  -- en Bolivianos
currency: VARCHAR(3) DEFAULT 'BOB'
is_active: BOOLEAN DEFAULT true
created_at: TIMESTAMP
```

#### `bookings` (Reservas)
```sql
id: UUID PK
venue_id: UUID FK
user_id: UUID FK
event_type: VARCHAR(100)  -- "Boda", "Quinceañera", "Cumpleaños"
event_date: DATE
start_time: TIME
end_time: TIME
guest_count: INTEGER
total_price: DECIMAL(12,2)
deposit_amount: DECIMAL(12,2)
deposit_paid: BOOLEAN DEFAULT false
status: ENUM('pending', 'confirmed', 'cancelled_by_client', 'cancelled_by_owner', 'completed')
contract_url: TEXT
special_requests: TEXT
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

#### `payments`
```sql
id: UUID PK
booking_id: UUID FK
amount: DECIMAL(12,2)
payment_type: ENUM('deposit', 'full', 'remaining')
method: ENUM('qr_bank', 'transfer', 'tigo_money', 'card')
status: ENUM('pending', 'completed', 'failed', 'refunded')
transaction_reference: VARCHAR(255)
paid_at: TIMESTAMP
created_at: TIMESTAMP
```

---

## 10. Plan de Implementación (MVP y Roadmap)

### 10.1 Fase 0: Validación (Semanas 1–2)

| Tarea | Descripción | Entregable |
|-------|-------------|------------|
| Entrevistas con dueños | 10–15 entrevistas en El Alto para validar dolor y disposición a pagar | Reporte de validación |
| Landing page simple | Página con formulario de interés para dueños y clientes | Landing en vivo |
| Lista de locales manual | Recopilar 20–30 locales de El Alto con info básica | Base de datos inicial |
| Test de precios | Preguntar cuánto pagarían por el servicio | Proyección de monetización |

### 10.2 Fase 1: MVP (Semanas 3–10)

**Objetivo:** Tener una plataforma funcional con 30–50 locales y capacidad de reservar.

| Semana | Módulo | Features | Entregable |
|--------|--------|----------|------------|
| 3–4 | Infraestructura | Setup de proyecto, DB, auth, CI/CD | Repo + deploy staging |
| 4–5 | Core Backend | CRUD de locales, usuarios, precios base | API funcional |
| 5–6 | Búsqueda | Filtros, mapa, perfil de local | Página de búsqueda |
| 6–7 | Calendario | Disponibilidad, precios por fecha | Calendario interactivo |
| 7–8 | Reservas | Solicitud de reserva, aprobación del dueño | Flujo de reserva completo |
| 8–9 | Pagos | Integración QR bancario / transferencia | Pago de seña funcional |
| 9–10 | WhatsApp | Notificaciones de reserva y confirmación | Bot básico de notificaciones |
| 10 | Testing + Deploy | QA, pruebas con 5 dueños beta | MVP en producción |

### 10.3 Fase 2: Crecimiento (Meses 3–6)

| Módulo | Features | Métrica de Éxito |
|--------|----------|------------------|
| Reviews | Sistema de calificaciones y comentarios | >50 reviews en 3 meses |
| Precios dinámicos | Temporadas, fines de semana, feriados | 100% de locales con precios configurados |
| Contratos digitales | Generación automática de PDF | >80% de reservas con contrato |
| Panel de admin | Verificación de locales, gestión de disputas | 0 locales fraudulentos |
| SEO y contenido | Blog de tips para eventos, optimización de búsqueda | >1,000 visitas orgánicas/mes |

### 10.4 Fase 3: Monetización y Escalabilidad (Meses 6–12)

| Módulo | Features | Métrica de Éxito |
|--------|----------|------------------|
| Suscripciones Pro | Plan pago para dueños con features avanzadas | 20% de dueños en plan pago |
| Publicidad destacada | Locales que pagan por aparecer primero | >10 locales destacados |
| App móvil nativa | Flutter app (solo si el tráfico móvil justifica) | >5,000 descargas |
| Expansión geográfica | La Paz, Santa Cruz, Cochabamba | >200 locales activos |
| Marketplace de servicios | Catering, decoración, DJ, fotografía | >20 proveedores aliados |

---

## 11. Consideraciones Legales y de Mercado

### 11.1 Aspectos Legales (Bolivia)

| Aspecto | Consideración | Acción Requerida |
|---------|--------------|------------------|
| **Constitución de empresa** | Necesario para facturación y contratos | Registrar SRL o Unipersonal en Fundempresa |
| **Términos y condiciones** | Contratos de uso de plataforma, responsabilidades | Abogado especializado en tecnología |
| **Protección de datos** | Ley de Protección de Datos Personales (en discusión en Bolivia) | Política de privacidad robusta |
| **Contratos de arrendamiento** | La plataforma NO es parte del contrato entre dueño y cliente; es facilitador | Clausula de "marketplace" en T&C |
| **Pagos y retenciones** | Manejo de dinero de terceros puede requerir regulación | Consultar con ASFI sobre modelo de pagos |
| **IVA / IT** | Comisiones deben emitir factura con IT (Impuesto a las Transacciones) | Contador boliviano |

### 11.2 Consideraciones Culturales

| Aspecto | Estrategia |
|---------|-----------|
| **Confianza personal** | Los bolivianos prefieren tratar con personas, no con apps. Integrar WhatsApp es clave. |
| **Negociación de precios** | Permitir que el dueño marque "precio negociable" o establezca un rango. |
| **Eventos religiosos/culturales** | Calendario con feriados locales, fiestas patronales, carnaval. |
| **Idiomas** | Español principal. Considerar aymara/quechua en futuro para El Alto. |
| **Conectividad** | Muchos usuarios tienen datos limitados. La app debe ser ligera (<2MB por página). |
| **Pagos en efectivo** | Ofrecer opción de "reservar con seña presencial" como alternativa para los reacios a pagos digitales. |

---

## 12. Métricas de Éxito (KPIs)

### 12.1 Métricas de Adquisición

| KPI | Meta MVP (3 meses) | Meta 6 meses | Meta 12 meses |
|-----|-------------------|--------------|---------------|
| Locales registrados | 50 | 200 | 500 |
| Locales verificados | 30 | 150 | 400 |
| Usuarios registrados (clientes) | 500 | 3,000 | 10,000 |
| Visitas mensuales a la web | 5,000 | 25,000 | 100,000 |

### 12.2 Métricas de Activación

| KPI | Meta MVP | Meta 6 meses |
|-----|----------|--------------|
| % de locales con perfil completo (>5 fotos, precios, servicios) | 70% | 90% |
| % de búsquedas que resultan en vista de perfil | 30% | 40% |
| % de perfiles vistos que solicitan reserva | 10% | 15% |

### 12.3 Métricas de Retención y Monetización

| KPI | Meta MVP | Meta 6 meses | Meta 12 meses |
|-----|----------|--------------|---------------|
| Reservas confirmadas/mes | 20 | 100 | 400 |
| Tasa de conversión (solicitud → confirmada) | 60% | 70% | 75% |
| Ingresos por comisiones/mes | Bs. 2,000 | Bs. 15,000 | Bs. 80,000 |
| NPS (Net Promoter Score) de clientes | >30 | >40 | >50 |
| NPS de dueños de locales | >30 | >40 | >50 |
| Churn de locales (mensual) | <10% | <8% | <5% |

### 12.4 Métricas de Salud del Negocio

| KPI | Fórmula | Meta |
|-----|---------|------|
| CAC (Costo de Adquisición de Cliente) | Gasto marketing / clientes nuevos | < Bs. 30 |
| LTV (Lifetime Value) | Ingreso promedio por cliente * retención | > Bs. 200 |
| LTV/CAC ratio | LTV / CAC | > 3x |
| Payback period | Tiempo para recuperar CAC | < 6 meses |

---

## 13. Riesgos y Mitigaciones

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|--------|-------------|---------|------------|
| R1 | **Baja adopción por parte de dueños** (no quieren aprender tecnología) | Alta | Alto | - Onboarding presencial en El Alto.  <br>- Interfaz ultra simple (máximo 3 clics para cualquier acción).  <br>- Soporte vía WhatsApp para cualquier duda.  <br>- Ofrecer 3 meses gratis para los primeros 50 locales. |
| R2 | **Fraude / locales falsos** | Media | Alto | - Verificación presencial obligatoria antes de publicar.  <br>- Fotos con geolocalización.  <br>- Sistema de reviews que valida que el usuario realmente reservó. |
| R3 | **Competencia de grandes plataformas** (Airbnb, Booking expandiendo a eventos) | Baja | Alto | - Diferenciación local profunda (precios por temporada boliviana, WhatsApp, idioma).  <br>- Lock-in con dueños mediante relación personal.  <br>- Velocidad de ejecución (llegar primero). |
| R4 | **Problemas de pagos / chargebacks** | Media | Medio | - Seña mínima (20–30%) para reducir exposición.  <br>- Retención de fondos hasta 48h post-evento.  <br>- Contrato digital como respaldo legal. |
| R5 | **Estacionalidad extrema** (septiembre/diciembre = 70% de ingresos) | Alta | Medio | - Diversificar tipos de eventos (corporativos, ferias, capacitaciones).  <br>- Marketing en temporadas bajas con descuentos.  <br>- Planes de suscripción para ingresos recurrentes. |
| R6 | **Falla técnica en temporada alta** | Media | Alto | - Load testing antes de septiembre/diciembre.  <br>- Infraestructura auto-escalable.  <br>- Monitoreo 24/7 con alertas. |
| R7 | **Regulación de pagos digitales** | Baja | Medio | - Consultar con ASFI desde el inicio.  <br>- Usar pasarelas de pago ya reguladas (bancos locales). |

---

## 14. Conclusión y Recomendación Estratégica

### 14.1 Resumen Ejecutivo

Este proyecto tiene **alto potencial** por las siguientes razones:

1. **Mercado virgen:** No existe competencia digital consolidada en Bolivia para este nicho.
2. **Dolor real y cuantificable:** Miles de personas recorren locales físicamente perdiendo tiempo y dinero.
3. **Modelo de negocio claro:** Comisión por transacción + suscripciones, probado en otros mercados.
4. **Barrera de entrada baja para usuarios:** PWA web + WhatsApp, sin necesidad de descargar apps.
5. **Escalable:** El Alto es la prueba de concepto perfecta; el modelo replica a otras ciudades bolivianas y latinoamericanas similares.

### 14.2 Recomendación de Arquitectura

| Decisión | Recomendación | Razón |
|----------|--------------|-------|
| **Plataforma inicial** | PWA Web (Next.js) | 90% de usuarios en Bolivia usan navegador móvil. Sin costo de App Store. Iteración rápida. |
| **Backend** | Node.js + PostgreSQL | Rápido de desarrollar, fácil encontrar talento en Bolivia, robusto. |
| **Comunicación** | WhatsApp Business API | Es el canal de comunicación #1 en Bolivia. No negociable. |
| **Pagos** | QR bancario + transferencia | Adaptado al mercado boliviano. Stripe como opción secundaria. |
| **Estrategia de lanzamiento** | El Alto primero, 50 locales beta | Validar antes de escalar. Relación personal con los primeros dueños. |

### 14.3 Próximos Pasos Inmediatos

1. **Validar con 10–15 dueños de locales en El Alto** (entrevistas de 30 min).
2. **Construir landing page** con formulario de interés y contador de locales.
3. **Registrar dominio** y redes sociales (Facebook/Instagram son clave en Bolivia).
4. **Definir equipo:** Mínimo 1 desarrollador full-stack + 1 persona de operaciones/ventas en El Alto.
5. **Presupuesto inicial estimado:** $5,000–$10,000 USD para MVP (incluye desarrollo, hosting, marketing inicial, viajes a El Alto).

### 14.4 Visión a Largo Plazo (2–3 años)

```
Año 1: Dominar El Alto + La Paz. 500 locales activos. 200 reservas/mes.
Año 2: Expandir a Santa Cruz, Cochabamba, Tarija. 2,000 locales. Marketplace de servicios.
Año 3: Líder en Bolivia. Considerar expansión a Perú/Ecuador con dinámicas similares.
       Serie A de inversión para escalar regionalmente.
```

---

> **"No construyas una app. Construye un puente entre la gente que tiene un local y la gente que necesita uno. La tecnología es solo el puente."**

---

*Documento elaborado con enfoque en arquitectura de software, análisis de producto y estrategia de mercado para el mercado boliviano de alquiler de locales para eventos.*

*© 2026 — Documento interno de planificación.*
