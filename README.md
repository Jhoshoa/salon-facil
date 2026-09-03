# SalonFacil

Plataforma de alquiler de locales para eventos en Bolivia.

## Inicio rapido

### Prerrequisitos

- Docker + Docker Compose
- Node.js 22+ para desarrollo local sin Docker
- npm 10+

### Configurar variables

```bash
cp backend/.env.example backend/.env.local
cp frontend/.env.example frontend/.env.local
```

### Levantar con Docker

```bash
make up
```

Comando equivalente:

```bash
docker compose up -d
```

### Verificar servicios

| Servicio | URL |
| --- | --- |
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001/api/v1 |
| Health Check | http://localhost:3001/api/v1/health |
| PostgreSQL | localhost:5434 |
| Redis | localhost:6379 |

### Comandos utiles

```bash
make help
make logs
make db-shell
make redis-cli
make migrate
make studio
```

## Estructura

```text
salon-facil/
├── backend/                 # NestJS API
├── frontend/                # Next.js 14 App Router
├── nginx/                   # Reverse proxy (produccion)
├── deploy/                  # Scripts de deploy (produccion)
├── docs/deploy/             # Guia de deploy
├── docker-compose.yml       # Infraestructura local
├── docker-compose.prod.yml  # Infraestructura de produccion
├── Makefile                 # Comandos comunes
└── .github/workflows/       # CI
```

## Deploy en produccion

Ver [docs/deploy/hostinger-vps.md](docs/deploy/hostinger-vps.md) para la guia completa (Docker
Compose de produccion, nginx con TLS de Let's Encrypt, migraciones, backups).

## Desarrollo local

### Backend

```bash
cd backend
npm install
npm run start:dev
npm run test
npm run lint
```

### Frontend

```bash
cd frontend
npm install
npm run dev
npm run test
npm run lint
```

## Licencia

MIT - SalonFacil Team
