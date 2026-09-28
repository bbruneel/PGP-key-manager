# AGENTS.md

Instructions for AI coding agents working in this repository.

## Project

**PGP Key Manager** — GUI for OpenPGP key storage (personal/team vaults, lifecycle, SSH setup, BYO storage registry).

| Path | Stack |
|------|--------|
| `backend/` | Spring Boot 4.x, Java 25, Maven |
| `frontend/` | Vite, React 19, TypeScript, Tailwind v4, Auth0 SPA |

The browser calls the Spring API directly (CORS). There is **no** Next.js or other Node server for the SPA.

Human docs: [`docs/`](docs/) (VitePress) → https://bbruneel.github.io/PGP-key-manager/  
Architecture: [`docs/develop/architecture.md`](docs/develop/architecture.md) · Phase history: [`docs/changelog/phases.md`](docs/changelog/phases.md)

## Prerequisites

- **JDK 25** (Maven Enforcer)
- **Node.js 24.16.0** / **npm 11.13.0** (`.nvmrc`, `frontend/package.json` `engines`)

Canonical setup: [`docs/develop/local-setup.md`](docs/develop/local-setup.md).

## Commands

```bash
# Backend
cd backend && ./mvnw test
cd backend && ./mvnw spring-boot:run

# Frontend (prefer npm ci)
cd frontend && npm ci && npm run lint && npm run test && npm run build && npm run dev

# Docs (repo root)
npm ci
npm run docs:lint
npm run docs:dev
npm run docs:build

# Docker
cp docker/.env.example docker/.env
docker compose -f docker/compose.yml up --build
```

Copy `frontend/.env.example` → `frontend/.env.local` for Vite Auth0 / API URL.

## CI

- [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — backend tests, frontend lint/test/build, OpenAPI lint
- [`.github/workflows/docs.yml`](.github/workflows/docs.yml) — VitePress + Redoc → GitHub Pages on `main`

## Non-negotiable conventions

- **Request ID:** `RequestIdFilter` → MDC `requestId` → echo `X-Request-Id`. Preserve for new filters/endpoints.
- **CORS:** `CORS_ALLOWED_ORIGINS`; default `http://localhost:5173`.
- **API Accept:** `application/json; version=1`. Bearer JWT when Auth0 configured.
- **Secrets:** never commit `.env`, `.env.local`, or `application-secret.yaml`.
- **No Next.js** server for the SPA; static output is `frontend/dist/`.
- **Do not** change pinned Node/npm/Java without updating `.nvmrc`, `engines`, `pom.xml`, and CI together.
- **Do not** edit `frontend/README.md` (Vite boilerplate) unless asked.
- Prefer TDD. Spring Boot **4.1.0**, Flyway **12.11.0**; see `backend/pom.xml` and `ResolvedDependencyVersionsTest`.

## API endpoint test coverage (required)

Every REST handler needs a focused `@WebMvcTest` slice test: mock service → MockMvc → status/fields → `verify(...)`. Add/extend `@SpringBootTest` integration tests for non-trivial auth/validation/persistence/crypto. Update slice tests in the **same PR** as endpoint changes.

| Controller | Slice test | Integration |
|------------|------------|-------------|
| `HelloController` | `HelloControllerTest` | `HelloControllerIntegrationTest` |
| `PgpKeyController` | `PgpKeyControllerTest` | `PgpKeyControllerIntegrationTest`, `PgpKeyLifecycleIntegrationTest` |
| `GroupController` | `GroupControllerTest` | `GroupControllerIntegrationTest` |
| `InviteController` | `InviteControllerTest` | `InviteControllerIntegrationTest` |
| `AdminController` | `AdminControllerTest` | `AdminControllerIntegrationTest` |
| `StorageConnectionController` | `StorageConnectionControllerTest` | `StorageConnectionControllerIntegrationTest` |

**Storage** — every path under `/api/storage-connections` in `StorageConnectionControllerTest`:

- `GET/POST /api/storage-connections`
- `GET/PATCH/DELETE /api/storage-connections/{connectionId}`

**Keys** — every path under `/api/keys` in `PgpKeyControllerTest`:

- `GET/POST /api/keys`, `GET/PATCH/DELETE /api/keys/{keyId}`
- `GET/POST /api/keys/{primaryKeyId}/subkeys`, `GET .../subkeys/{subkeyId}`
- `POST /api/keys/preview`
- `POST .../subkeys/import-from-keyring` (+ `/preview`)
- `POST .../revoke`, `export-revocation-cert`, `apply-revocation-cert`
- `POST .../extend-expiry`, `rotate`, `transfer-ownership`
- `GET .../export-public`, `export-ssh-public`
- `POST .../export-ssh-private`, `export-ssh-setup-pack`, `export-private`

**Groups** — every documented `/api/groups` path in `GroupControllerTest` (CRUD, members, me, invites, summary, audit.csv).

**Invites / Admin:** `POST /api/invites/{token}/accept`; `GET /api/admin/groups`, `GET /api/admin/users`.

If OpenAPI documents a new operation, add the matching slice test (and integration when warranted) in the same change.

## Product UX (short)

- Create primary at **`/keys/new`**; import at **`/keys/import`** — not modals.
- Key detail at **`/keys/:id`** — tabs Overview / Subkeys / Actions; remount on `:id` change.
- Team context: sidebar **`TeamVaultsNav`** (top-bar vault switcher removed). Personal vault clears `activeGroupId`.
- **Settings** (`/settings`): storage connection registry (17a — no S3 I/O yet). URI contract: [`docs/develop/storage-ref.md`](docs/develop/storage-ref.md).
- **Policies** (`/policies`): placeholder only.
- Register/import: never send generate `passphrase` / `algorithmSpec` on register path.
- SSH setup pack: AES zip + one-time password in JSON body (not a header); open with 7-Zip-compatible tools.
- Private export: primary only; Mode A ciphertext / Mode B rewrap; owner or group OWNER.
- Revocation certs: generate (download-only) vs apply vs revoke-now; primary revoke cascades subkey **DB** rows (21a).
- Frontend: `apiFetch` / `requestJson`; pages in `frontend/src/pages/`; `[pgp-ui]` / `[pgp-api]` structured logs.
- Full phase archive: [`docs/changelog/phases.md`](docs/changelog/phases.md).

## What to do / not to do

- Match existing naming and test style; keep PRs focused.
- Run backend tests and frontend lint/test/build for areas you touch.
- Update user/develop docs under `docs/` when behavior or setup changes; keep root README slim.
- New `VITE_*` vars: document in `frontend/.env.example` (and docs if user-facing).
- Prefer current maintained dependency releases; check high/critical advisories before merging bumps.

## Git and PRs

- Descriptive commits; CI must pass.
- Cloud agents: branch prefix `cursor/`.

## Cursor Cloud specific instructions

### Environment

- **JDK 25 (Temurin)** at `/usr/lib/jvm/java-25-temurin` — set `JAVA_HOME` and prepend to `PATH` before Maven.
- **Node** via nvm; before npm, load nvm and **prepend** `$NVM_DIR/versions/node/v24.16.0/bin` (VM `/exec-daemon/node` can shadow nvm).
- Create `frontend/.env.local` from `.env.example`; copy Cursor secrets into `VITE_AUTH0_*` (Vite does not read process env).
- Postgres on `localhost:5432` for `spring-boot:run`; tests use H2. Local password often `postgres` → `SPRING_DATASOURCE_PASSWORD=postgres`.

### Running the stack

1. Start PostgreSQL.
2. Backend: `SPRING_DATASOURCE_PASSWORD=postgres`; for signed-in SPA also `AUTH0_AUDIENCE` + `AUTH0_ISSUER_URI` (`https://${AUTH0_DOMAIN}/` if needed). Without issuer, protected routes return **403**.
3. Frontend: `npm run dev -- --host 0.0.0.0` on `:5173`.
4. UI login: Cursor secrets `AUTH0_E2E_EMAIL` / `AUTH0_E2E_PASSWORD` (email/password, not Google SSO).

Overview health (`GET /api/hello`) and footer **API Connected** confirm reachability.

### Gotchas

- Maven Enforcer hard-fails if `JAVA_HOME` is not JDK 25+.
- Use `npm ci`, not `npm install`.
- Auth0 blanks in `.env.local` still allow the app to load (unauthenticated).
- PgBouncer transaction poolers need `prepareThreshold=0` (or auto-config detection).
- **Keys** and **Settings** are implemented; **Policies** remains a placeholder.

## Further reading

- [`README.md`](README.md) — short entry point
- [`docs/develop/manual-qa.md`](docs/develop/manual-qa.md) — human UI QA
- [`docs/openapi.yaml`](docs/openapi.yaml) — API contract
