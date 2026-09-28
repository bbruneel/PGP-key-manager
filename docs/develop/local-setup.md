# Local setup

Canonical instructions for running PGP Key Manager locally. Prefer **`npm ci`** over `npm install` to match CI.

## Prerequisites

- **JDK 25** (Maven Enforcer fails otherwise). Example: `export JAVA_HOME=/usr/lib/jvm/java-25-temurin`
- **Node.js 24.16.0** and **npm 11.13.0** (see [`.nvmrc`](https://github.com/bbruneel/PGP-key-manager/blob/main/.nvmrc) and `frontend/package.json` `engines`)
- **Docker Engine + Compose v2** (optional, for the full-stack path)
- **PostgreSQL** on `localhost:5432` for native `spring-boot:run` (tests use in-memory H2)

## Path A — Docker (full stack)

```bash
cp docker/.env.example docker/.env   # optional: Auth0 for key management
docker compose -f docker/compose.yml up --build
```

Open **http://localhost** — nginx serves the SPA and proxies `/api/*` to Spring Boot. Profile `docker` runs Flyway migrations **V1–V11** on a fresh Postgres volume.

| Service | Role |
|---------|------|
| `postgres` | PostgreSQL 16 (`postgres_data` volume) |
| `backend` | Spring Boot (`SPRING_PROFILES_ACTIVE=docker`) |
| `frontend` | nginx on port **80** |

Leave `VITE_API_BASE_URL` empty in `docker/.env` for same-origin `/api/...`. Add **http://localhost** to Auth0 callback / logout / web origins when using Auth0.

```bash
docker compose -f docker/compose.yml down      # keep DB volume
docker compose -f docker/compose.yml down -v   # wipe postgres_data
```

## Path B — Native (API + Vite)

Terminal 1 — API:

```bash
cd backend
export SPRING_DATASOURCE_PASSWORD=postgres   # if local Postgres uses that password
# For signed-in /api/keys and /api/groups also set AUTH0_ISSUER_URI and AUTH0_AUDIENCE
./mvnw spring-boot:run
# optional: -Dspring-boot.run.profiles=dev
```

API: **http://localhost:8080**. Sample: `GET /api/hello`.

Terminal 2 — SPA:

```bash
cd frontend
cp .env.example .env.local   # VITE_API_BASE_URL=http://localhost:8080 + Auth0
npm ci
npm run dev                  # http://localhost:5173
```

## Tests and quality

```bash
cd backend && ./mvnw test

cd frontend
npm run lint
npm run test
npm run build
```

## Documentation site (this site)

From the **repository root**:

```bash
npm ci
npm run docs:lint      # OpenAPI
npm run docs:dev       # VitePress (open the Local URL including /PGP-key-manager/)
npm run docs:build     # VitePress + Redoc → docs/.vitepress/dist
npm run docs:preview   # serve the built site (SSR HTML; good for curl checks)
```

`docs:dev` is a SPA: `curl` of the URL returns an empty `#app` shell by design. Open the printed **Local** URL in a browser (must include `/PGP-key-manager/`). Ports 5173/5174 are often taken by the product SPA — VitePress will pick the next free port.
## See also

- [Auth0](./auth0)
- [Database](./database)
- [Architecture](./architecture)
- [Contributing](./contributing)
