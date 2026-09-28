# PGP Key Manager

GUI to manage OpenPGP key storage — personal and team vaults, lifecycle actions, SSH setup packs, BYO storage connection registry, and related features.

This repository is a **monorepo**: a Spring Boot API (`backend/`) and a static-hosted Vite + React SPA (`frontend/`). The browser talks to the API directly (CORS); there is no Next.js server.

**Documentation hub:** [https://bbruneel.github.io/PGP-key-manager/](https://bbruneel.github.io/PGP-key-manager/)  
(User guide · Develop · [OpenAPI / Redoc](https://bbruneel.github.io/PGP-key-manager/api/) · [Architecture](https://bbruneel.github.io/PGP-key-manager/develop/architecture))

AI coding agents: see **[AGENTS.md](AGENTS.md)**.

## Prerequisites

- **JDK 25** (Maven Enforcer in `backend/pom.xml`)
- **Node.js 24.16.0** and **npm 11.13.0** (see [`.nvmrc`](.nvmrc) and `frontend/package.json` `engines`)
- Docker Engine + Compose v2 (optional)

Prefer `npm ci` over `npm install`.

## Quick start

**Docker (full stack → http://localhost):**

```bash
cp docker/.env.example docker/.env
docker compose -f docker/compose.yml up --build
```

**Native (API :8080 + Vite :5173):**

```bash
cd backend && ./mvnw spring-boot:run
# other terminal:
cd frontend && cp .env.example .env.local && npm ci && npm run dev
```

Full setup (Auth0, Postgres/Supabase, PgBouncer, env vars): **[Local setup](https://bbruneel.github.io/PGP-key-manager/develop/local-setup)** (source: [`docs/develop/local-setup.md`](docs/develop/local-setup.md)).

## Documentation (local)

From the repository root:

```bash
npm ci
npm run docs:lint      # OpenAPI
npm run docs:dev       # VitePress site
npm run docs:build     # site + Redoc → docs/.vitepress/dist
```

OpenAPI source of truth: [`docs/openapi.yaml`](docs/openapi.yaml).

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) — backend tests, frontend lint/test/build, OpenAPI lint, Docker smoke.  
[`.github/workflows/docs.yml`](.github/workflows/docs.yml) — publishes the docs site to GitHub Pages on push to `main`.

## Contributing

See [`docs/develop/contributing.md`](docs/develop/contributing.md) and [`AGENTS.md`](AGENTS.md) (endpoint test checklists). Manual UI QA: [`docs/develop/manual-qa.md`](docs/develop/manual-qa.md).
