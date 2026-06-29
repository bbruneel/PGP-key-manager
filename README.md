# PGP Key Manager

GUI to manage PGP keys storage. BYO cloud storage, set alerts for expiry, host public keys and more.

This repository is a **monorepo**: a Spring Boot API (`backend/`) and a static-hosted Vite + React SPA (`frontend/`). The browser talks to the API directly (CORS enabled for local Vite); there is no Next.js server.

For system diagrams, request flows, and component layout, see **[ARCHITECTURE.md](ARCHITECTURE.md)**.

## Prerequisites

- **JDK 25** (enforced by Maven Enforcer in `backend/pom.xml`). Example: `export JAVA_HOME=/usr/lib/jvm/java-25-openjdk-amd64` on Linux.
- **Maven** (optional if you use `./mvnw` from `backend/`)
- **Node.js 24.16.0** and **npm 11.13.0** (pinned for CI; see [`.nvmrc`](.nvmrc) and `frontend/package.json` `engines` / `packageManager`)

Tailwind for the SPA uses the official **`@tailwindcss/vite`** plugin (Tailwind v4).

**CI:** [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs `backend` Maven tests, `frontend` `npm ci` (lint, test, build), OpenAPI lint (`npm run docs:lint`), and a Docker build + smoke test on every push/PR to `main`. Pushes to `main` also publish API docs to GitHub Pages via [`.github/workflows/docs.yml`](.github/workflows/docs.yml).

## Backend (`backend/`)

### Run

```bash
cd backend
./mvnw spring-boot:run
```

Optional dev profile (extra debug logging):

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

API listens on **http://localhost:8080**. Sample endpoint: `GET /api/hello`.

### Test (TDD)

```bash
cd backend
./mvnw test
```

Uses **JUnit 5**, **`@WebMvcTest`** (slice) via `spring-boot-starter-webmvc-test`, and **`@SpringBootTest`** + `MockMvc` for request-id filter integration.

### Logging and correlation

- **Request ID:** filter reads or generates `X-Request-Id`, stores it in **MDC** (`requestId`), echoes it on the response.
- **Profiles:** `prod` uses **JSON** console logs (`logstash-logback-encoder`); default profile uses a readable pattern including `%X{requestId}`.
- Run with `SPRING_PROFILES_ACTIVE=prod` to exercise JSON logging locally.

### Configuration

- Defaults in [`backend/src/main/resources/application.yaml`](backend/src/main/resources/application.yaml).
- **Secrets:** do not commit credentials. Copy [`backend/src/main/resources/application-secret.yaml.example`](backend/src/main/resources/application-secret.yaml.example) to `backend/src/main/resources/application-secret.yaml` (gitignored; loaded via `spring.config.import` in `application.yaml`) or set environment variables.
- **Supabase Postgres (Architecture 1):** Spring connects with JDBC; schema is applied by **Flyway** from `backend/src/main/resources/db/migration/`. Use the pooler URL for the app datasource and the direct URL for Flyway (see the example secret file). Cloud project: `pgp-key-manager` (`vwjmyednpakdcunrtyog`). PgBouncer **transaction** poolers (Supabase port **6543**) do not support JDBC server-side prepared statements — include `prepareThreshold=0` in the pooler JDBC URL (the example secret file does). `PgBouncerTransactionPoolDataSourceConfiguration` also sets this automatically when the datasource URL looks like a transaction pooler (`pgbouncer=true`, `:6543/`, or `pooler.` host); direct `:5432` connections are unchanged.
- **Auth0 (protected `/api/keys`):** set `AUTH0_ISSUER_URI` and optionally `AUTH0_AUDIENCE` to match your SPA (`VITE_AUTH0_*`).
- **CORS:** `CORS_ALLOWED_ORIGINS` (comma-separated), default `http://localhost:5173` for Vite.

Environment variables (backend):

| Variable | Purpose |
|----------|---------|
| `SPRING_DATASOURCE_URL` | JDBC URL (Supabase transaction pooler, port 6543; append `&prepareThreshold=0`) |
| `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD` | Database credentials |
| `FLYWAY_URL` / `FLYWAY_USER` / `FLYWAY_PASSWORD` | Direct connection for migrations (optional if same as datasource) |
| `AUTH0_ISSUER_URI` | Auth0 issuer for JWT validation |
| `AUTH0_AUDIENCE` | API audience (optional) |

### Docker (alternative deployment)

Run the full stack locally with **container Postgres** (no Supabase). Supabase + `application-secret.yaml` remain the default for non-Docker workflows.

**Prerequisites:** Docker Engine and Compose v2.

```bash
cp docker/.env.example docker/.env   # optional: fill Auth0 vars for key management
docker compose -f docker/compose.yml up --build
```

Open **http://localhost** — the nginx frontend proxies `/api/*` to the Spring Boot backend. The Overview page health check calls `GET /api/hello`.

| Service | Role |
|---------|------|
| `postgres` | PostgreSQL 16 with a named volume (`postgres_data`) |
| `backend` | Spring Boot API (`SPRING_PROFILES_ACTIVE=docker`) |
| `frontend` | nginx serving the Vite build; exposes port **80** |

The **`docker`** Spring profile ([`application-docker.yaml`](backend/src/main/resources/application-docker.yaml)) disables Flyway baseline-on-migrate so migrations `V1`–`V4` run on a fresh Postgres volume. Supabase databases keep using the default baseline settings.

**Auth0:** still required for `/api/keys/**`. Set `AUTH0_ISSUER_URI`, `AUTH0_AUDIENCE`, and the `VITE_AUTH0_*` build args in `docker/.env`. Add **http://localhost** to your Auth0 application's Allowed Callback URLs, Logout URLs, and Web Origins.

**Frontend API URL:** leave `VITE_API_BASE_URL` empty in `docker/.env` so the SPA uses same-origin relative `/api/...` paths through nginx.

**Tear down:**

```bash
docker compose -f docker/compose.yml down      # keep database volume
docker compose -f docker/compose.yml down -v   # wipe postgres_data
```

Production hardening (TLS, secrets management, resource limits) is not included in this compose file.

### API contract

OpenAPI 3.1: [`docs/openapi.yaml`](docs/openapi.yaml). Implemented endpoints include primary/subkey management, revoke, extend-expiry, rotate, export-public, and export-ssh-public (authenticate subkeys with ed25519, rsa, or ecdsa).

### API documentation (Redocly)

**Published docs (no local setup):** after enabling GitHub Pages (Settings → Pages → **GitHub Actions**), the latest HTML reference is deployed on every push to `main`:

**https://bbruneel.github.io/PGP-key-manager/**

(Forks use `https://<your-github-user>.github.io/PGP-key-manager/`.)

**Source of truth:** [`docs/openapi.yaml`](docs/openapi.yaml) — config in [`docs/redocly.yaml`](docs/redocly.yaml).

**Prerequisites:** Node.js 24.16.0 ([`.nvmrc`](.nvmrc)). From the **repository root**:

```bash
npm ci
npm run docs:lint      # validate spec (same check as CI)
npm run docs:build     # static HTML → docs/.build/index.html (gitignored)
npm run docs:preview   # live Redoc at http://127.0.0.1:8081 (runs from docs/ so the monorepo is not scanned)
```

**CI:** OpenAPI lint runs on every PR and push to `main`. Static docs are built and deployed to GitHub Pages only on push to `main`.

**Editing workflow:** change `docs/openapi.yaml` → run `npm run docs:lint` locally → open a PR.

**Cryptography:** server-side OpenPGP operations use [Bouncy Castle](https://www.bouncycastle.org/) (`bcprov-jdk18on` / `bcpg-jdk18on` 1.84). Supported algorithms: `ed25519`, `cv25519`, `rsa`, `ecdsa`, `ecdh` (with curve). Primary key generation accepts optional `openpgpVersion` (`4` default, `6` for RFC 9580); subkeys and lifecycle operations use the primary key’s stored version. Passphrases are wiped from memory after use and are never logged.

**Keyring storage:** armored public/private keyrings are stored on the primary key row only. Subkey rows hold fingerprints, key IDs, capabilities, and expiry metadata.

**Register/import metadata:** when registering via `POST /api/keys`, the server parses the master public key from armored material and populates fingerprint, key ID, algorithm, capabilities, expiry, and revocation state read from the keyring. Preview parsed metadata via `POST /api/keys/preview` before registering. Multi-key armored exports also register metadata-only subkey rows automatically (`registeredSubkeyCount` on the response). When both public and private blocks are pasted, the private-derived keyring is preferred. Optional client fingerprint is validated when provided. Backend logs `register_key` / `register_key_metadata_parsed` / `register_subkey_metadata_parsed`. Backfill or sync revocation via `POST /api/keys/{primaryKeyId}/subkeys/import-from-keyring` (`import_subkeys_from_keyring`).

**Revocation:** cryptographic revocation requires primary private material and a passphrase. Public-only registrations receive metadata revocation only.

**Security checks:** run `./mvnw test` (full suite; includes `ResolvedDependencyVersionsTest` for postgresql ≥ 42.7.11, logback ≥ 1.5.37, Flyway 12.9.0) and review dependencies (`./mvnw dependency:tree`). Backend uses Spring Boot **4.1.0** with Flyway **12.9.0**; monitored CVEs (CVE-2026-42198, CVE-2026-10532, CVE-2026-9828, CVE-2026-13006) are documented in `backend/pom.xml`. Startup logs `build_dependencies_audit` with resolved versions. Lifecycle logs use structured fields including `openpgpVersion` where applicable (user id, key id, operation, duration). Micrometer metrics: `pgp.key.operation.count`, `pgp.key.operation.duration`, `pgp.key.version.generated.count`. API cryptographic failures return a generic client message; details are logged server-side.

### Versioned API headers (frontend)

Protected routes should send:

- `Accept: application/json; version=1`
- `Authorization: Bearer <jwt>` when authenticated

The scaffold’s `apiFetch` helper sets these by default. The sample `GET /api/hello` does not require auth.

---

## Frontend (`frontend/`)

### Routes

| Path | Page |
|------|------|
| `/` | Overview (API health, Auth0 status, link to keys) |
| `/keys` | PGP key list (requires Auth0 sign-in) |
| `/keys/new` | Create primary key — generate Ed25519 key via `POST /api/keys` |
| `/keys/import` | Import existing key — register armored public/private blocks via `POST /api/keys` (server parses metadata from armor) |
| `/keys/:id` | Key detail — subkeys list, import subkeys from keyring, add subkey, revoke, extend, rotate, export public key |

### API client layer

The SPA uses a typed client on top of `apiFetch`:

| Module | Role |
|--------|------|
| `frontend/src/types/api.generated.ts` | OpenAPI-generated TypeScript types (`npm run generate:api-types`) |
| `frontend/src/lib/api-client.ts` | `requestJson` — versioned JSON, Bearer token, `X-Request-Id` correlation |
| `frontend/src/lib/api-error.ts` | RFC 7807 `ProblemDetail` parsing and `ApiError` for UI messages |
| `frontend/src/lib/logger.ts` | Structured `[pgp-api]` console logs with `operationId` + `requestId` |
| `frontend/src/lib/keys-api.ts` | Key endpoints (`list`, `create`, `register`, `get`, `listSubkeys`, `createSubkey`, lifecycle, `exportPublic`, `exportSshPublic`) |
| `frontend/src/lib/ui-logger.ts` | Structured `[pgp-ui]` console logs with `eventId` (e.g. `createKey.submit`, `importKey.submit`) |
| `frontend/src/lib/create-key-validation.ts` | Client-side create form validation and `CreatePgpKeyRequest` builder |
| `frontend/src/lib/key-display.ts` | Human-readable key list helpers (`formatKeyExpiry`, `formatCapabilities`) |
| `frontend/src/lib/import-key-validation.ts` | Client-side import form validation and register-only `CreatePgpKeyRequest` builder |
| `frontend/src/hooks/use-api-access-token.ts` | Auth0 `getAccessTokenSilently` wrapper |

Regenerate types after changing `docs/openapi.yaml`:

```bash
cd frontend
npm run generate:api-types
```

### Run (with backend)

Terminal 1 — API:

```bash
cd backend && ./mvnw spring-boot:run
```

Terminal 2 — SPA (Vite, **http://localhost:5173**):

```bash
cd frontend
cp .env.example .env.local   # set VITE_API_BASE_URL=http://localhost:8080 and Auth0 placeholders
npm install
npm run dev
```

### Build (static assets)

```bash
cd frontend
npm run build
```

Output: `frontend/dist/` — deploy to any static host. `VITE_*` variables are fixed at build time.

### Quality

- `npm run lint` — ESLint flat config (`eslint.config.js`)
- `npm run test` — Vitest + Testing Library (`src/**/*.test.tsx`)

End-to-end tests (e.g. Playwright against a running API) are optional and not wired in this scaffold.

