-include .env
.DEFAULT_GOAL := help

COMPOSE := docker compose
SERVICES := database backend frontend

ARCH := $(shell uname -m)
DB_MODE ?= mssql

# Dynamically resolve MSSQL platform/image across ARM64 (Apple Silicon) and x86_64
ifeq ($(ARCH),arm64)
  ifeq ($(DB_MODE),edge)
    export DB_PLATFORM ?= linux/arm64
    export DB_IMAGE ?= mcr.microsoft.com/azure-sql-edge:latest
  else
    export DB_PLATFORM ?= linux/amd64
    export DB_IMAGE ?= mcr.microsoft.com/mssql/server:2022-latest
  endif
else
  export DB_PLATFORM ?= linux/amd64
  export DB_IMAGE ?= mcr.microsoft.com/mssql/server:2022-latest
endif

.PHONY: help env all up start frontend backend database db \
        build build-frontend build-backend build-database \
        stop stop-frontend stop-backend stop-database \
        down restart logs logs-frontend logs-backend logs-database \
        status ps clean fclean db-init db-shell clean-cache clean-storage

help:
	@echo "Usage: make [target] [DB_MODE=mssql|edge]"
	@echo ""
	@echo "Start targets:"
	@echo "  all / up / start   Build and start all services (database, backend, frontend)"
	@echo "  frontend           Build and start only frontend (with dependencies)"
	@echo "  backend            Build and start only backend (with dependencies)"
	@echo "  database / db      Build and start only database"
	@echo "  start-only-%       Start a single service without starting its dependencies (e.g. make start-only-frontend)"
	@echo ""
	@echo "Database targets:"
	@echo "  db-init            Execute initialization schema scripts (DB_ITEM_TABLE.sql)"
	@echo "  db-shell           Open interactive SQL Server command line (sqlcmd)"
	@echo ""
	@echo "Build targets:"
	@echo "  build              Build all service images"
	@echo "  build-frontend     Build frontend image"
	@echo "  build-backend      Build backend image"
	@echo "  build-database     Build database image"
	@echo ""
	@echo "Control & Inspection targets:"
	@echo "  stop               Stop all running services"
	@echo "  stop-<service>     Stop a specific service (frontend, backend, database)"
	@echo "  down               Stop and remove containers and networks"
	@echo "  restart            Restart all services"
	@echo "  logs               Follow logs for all services"
	@echo "  logs-<service>     Follow logs for a specific service"
	@echo "  status / ps        List running containers and status"
	@echo ""
	@echo "Cleanup targets:"
	@echo "  clean              Stop and remove containers, networks, volumes, and temporary cache"
	@echo "  clean-cache        Clear files in storage/temporary/"
	@echo "  clean-storage      Clear files in both storage/products/ and storage/temporary/"
	@echo "  fclean             Full clean: remove containers, networks, volumes, images, and storage files"

# Automatically create .env from .env.example if .env does not exist yet
env:
	@test -f .env || cp .env.example .env

all: up

up: env
	$(COMPOSE) up -d --build

start: up

frontend: env
	$(COMPOSE) up -d --build frontend

backend: env
	$(COMPOSE) up -d --build backend

database: env
	$(COMPOSE) up -d --build database

db: database

# Start a specific service container without bringing up linked depends_on services
start-only-%: env
	$(COMPOSE) up -d --no-deps --build $*

build: env
	$(COMPOSE) build

build-frontend: env
	$(COMPOSE) build frontend

build-backend: env
	$(COMPOSE) build backend

build-database: env
	$(COMPOSE) build database

stop:
	$(COMPOSE) stop

stop-frontend:
	$(COMPOSE) stop frontend

stop-backend:
	$(COMPOSE) stop backend

stop-database:
	$(COMPOSE) stop database

down:
	$(COMPOSE) down

restart:
	$(COMPOSE) restart

logs:
	$(COMPOSE) logs -f

logs-frontend:
	$(COMPOSE) logs -f frontend

logs-backend:
	$(COMPOSE) logs -f backend

logs-database:
	$(COMPOSE) logs -f database

status:
	$(COMPOSE) ps

ps: status

# Execute initial schema script inside running database container
db-init:
	$(COMPOSE) exec -T database /opt/mssql-tools18/bin/sqlcmd -S localhost -U $(DB_USER) -P "$$MSSQL_SA_PASSWORD" -C -i /scripts/schema/DB_ITEM_TABLE.sql

# Open interactive sqlcmd terminal in running database container
db-shell:
	$(COMPOSE) exec database /opt/mssql-tools18/bin/sqlcmd -S localhost -U $(DB_USER) -P "$$MSSQL_SA_PASSWORD" -C

clean-cache:
	@find storage/temporary -mindepth 1 ! -name '.gitkeep' -delete 2>/dev/null || true

clean-storage: clean-cache
	@find storage/products -mindepth 1 ! -name '.gitkeep' -delete 2>/dev/null || true

clean: clean-cache
	$(COMPOSE) down -v --remove-orphans

fclean: clean-storage
	$(COMPOSE) down -v --rmi local --remove-orphans
