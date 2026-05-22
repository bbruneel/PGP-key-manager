# PGP Key Manager

GUI to manage PGP keys storage. BYO cloud storage, set alerts for expiry, host public keys and more.

This repository is a **monorepo**: a Spring Boot API (`backend/`) and a static-hosted Vite + React SPA (`frontend/`). The browser talks to the API directly (CORS enabled for local Vite); there is no Next.js server.

For system diagrams, request flows, and component layout, see **[ARCHITECTURE.md](ARCHITECTURE.md)**.

## Prerequisites

- **JDK 25** (enforced by Maven Enforcer in `backend/pom.xml`). Example: `export JAVA_HOME=/usr/lib/jvm/java-25-openjdk-amd64` on Linux.
- **Maven** (optional if you use `./mvnw` from `backend/`)
- **Node.js 24.15.0** and **npm 11.12.1** (pinned for CI; see [`.nvmrc`](.nvmrc) and `frontend/package.json` `engines` / `packageManager`)

Tailwind for the SPA uses the official **`@tailwindcss/vite`** plugin (Tailwind v4).

**CI:** [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs `backend` Maven tests and `frontend` `npm ci`, lint, test, and build on every push/PR to `main`.

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
- **Secrets:** do not commit credentials. Copy [`backend/src/main/resources/application-secret.yaml.example`](backend/src/main/resources/application-secret.yaml.example) to `backend/application-secret.yaml` (gitignored) or set environment variables.
- **Supabase Postgres (Architecture 1):** Spring connects with JDBC; schema is applied by **Flyway** from `backend/src/main/resources/db/migration/`. Use the pooler URL for the app datasource and the direct URL for Flyway (see the example secret file). Cloud project: `pgp-key-manager` (`vwjmyednpakdcunrtyog`).
- **Auth0 (protected `/api/keys`):** set `AUTH0_ISSUER_URI` and optionally `AUTH0_AUDIENCE` to match your SPA (`VITE_AUTH0_*`).
- **CORS:** `CORS_ALLOWED_ORIGINS` (comma-separated), default `http://localhost:5173` for Vite.

Environment variables (backend):

| Variable | Purpose |
|----------|---------|
| `SPRING_DATASOURCE_URL` | JDBC URL (Supabase transaction pooler, port 6543) |
| `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD` | Database credentials |
| `FLYWAY_URL` / `FLYWAY_USER` / `FLYWAY_PASSWORD` | Direct connection for migrations (optional if same as datasource) |
| `AUTH0_ISSUER_URI` | Auth0 issuer for JWT validation |
| `AUTH0_AUDIENCE` | API audience (optional) |

### API contract

OpenAPI 3.1: [`docs/openapi.yaml`](docs/openapi.yaml). Implemented endpoints include primary/subkey management, revoke, extend-expiry, rotate, and export-public.

**Cryptography:** server-side OpenPGP operations use [Bouncy Castle](https://www.bouncycastle.org/) (`bcprov-jdk18on` / `bcpg-jdk18on` 1.84). Supported algorithms: `ed25519`, `cv25519`, `rsa`, `ecdsa`, `ecdh` (with curve). Primary key generation accepts optional `openpgpVersion` (`4` default, `6` for RFC 9580); subkeys and lifecycle operations use the primary key’s stored version. Passphrases are wiped from memory after use and are never logged.

**Keyring storage:** armored public/private keyrings are stored on the primary key row only. Subkey rows hold fingerprints, key IDs, capabilities, and expiry metadata.

**Revocation:** cryptographic revocation requires primary private material and a passphrase. Public-only registrations receive metadata revocation only.

**Security checks:** run `./mvnw test` (38 tests) and review dependencies (`./mvnw dependency:tree`). Lifecycle logs use structured fields including `openpgpVersion` where applicable (user id, key id, operation, duration). Micrometer metrics: `pgp.key.operation.count`, `pgp.key.operation.duration`, `pgp.key.version.generated.count`. API cryptographic failures return a generic client message; details are logged server-side.

### Versioned API headers (frontend)

Protected routes should send:

- `Accept: application/json; version=1`
- `Authorization: Bearer <jwt>` when authenticated

The scaffold’s `apiFetch` helper sets these by default. The sample `GET /api/hello` does not require auth.

---

## Frontend (`frontend/`)

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

