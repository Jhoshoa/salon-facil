.PHONY: help up down down-v restart logs logs-backend logs-frontend backend-shell frontend-shell db-shell redis-cli test-backend test-frontend migrate studio seed

help: ## Mostrar ayuda
	@echo "Comandos disponibles:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

up: ## Levantar toda la infraestructura
	docker compose up -d

down: ## Detener toda la infraestructura
	docker compose down

down-v: ## Detener y eliminar volumenes
	docker compose down -v

restart: down up ## Reiniciar todo

logs: ## Ver logs de todos los servicios
	docker compose logs -f

logs-backend: ## Ver logs del backend
	docker compose logs -f backend

logs-frontend: ## Ver logs del frontend
	docker compose logs -f frontend

backend-shell: ## Entrar al contenedor del backend
	docker compose exec backend sh

frontend-shell: ## Entrar al contenedor del frontend
	docker compose exec frontend sh

db-shell: ## Entrar a PostgreSQL
	docker compose exec postgres psql -U salonfacil -d salonfacil_dev

redis-cli: ## Entrar a Redis CLI
	docker compose exec redis redis-cli

test-backend: ## Ejecutar tests del backend
	docker compose exec backend npm test

test-frontend: ## Ejecutar tests del frontend
	docker compose exec frontend npm test

migrate: ## Ejecutar migraciones de Prisma
	docker compose exec backend npx prisma migrate dev

studio: ## Abrir Prisma Studio
	docker compose exec backend npx prisma studio

seed: ## Ejecutar seed de datos
	docker compose exec backend npx prisma db seed
