# AGENTS.md

Instructions for AI coding agents working in this repository.

## Project

**PGP Key Manager** — a GUI to manage PGP key storage (BYO cloud storage, expiry alerts, public key hosting, and related features).

This is a **monorepo**:

| Path | Stack |
|------|--------|
| `backend/` | Spring Boot 4.x, Java 25, Maven |
| `frontend/` | Vite, React 19, TypeScript, Tailwind v4, Auth0 SPA |

The browser calls the Spring API directly (CORS). There is **no** Next.js or other Node server for the SPA.

## Prerequisites

- **JDK 25** (enforced by Maven Enforcer in `backend/pom.xml`)
- **Node.js 24.16.0** and **npm 11.13.0** (see `.nvmrc` and `frontend/package.json` `engines`)

## Commands

### Backend

```bash
cd backend
./mvnw test                    # run all tests (required before PR)
./mvnw spring-boot:run         # API on http://localhost:8080
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev   # extra debug logging
```

### Frontend

```bash
cd frontend
npm ci                         # prefer ci over install (matches CI)
npm run lint
npm run test
npm run build
npm run dev                    # SPA on http://localhost:5173
```

Copy `frontend/.env.example` to `frontend/.env.local` for local dev (`VITE_API_BASE_URL`, Auth0 vars).

### API docs (Redocly)

From the **repository root** (not `frontend/`):

```bash
npm ci
npm run docs:lint      # required when changing docs/openapi.yaml
npm run docs:build     # docs/.build/index.html
npm run docs:preview   # http://127.0.0.1:8081 (must run via npm script; starts in docs/)
```

Published reference: **https://bbruneel.github.io/PGP-key-manager/** (updated on push to `main`).

### Full local stack

1. Start backend: `cd backend && ./mvnw spring-boot:run`
2. Start frontend: `cd frontend && npm run dev`

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push/PR to `main`:

- **Backend:** `./mvnw --batch-mode test` (Java 25)
- **Frontend:** `npm ci`, `npm run lint`, `npm run test`, `npm run build`
- **OpenAPI:** root `npm ci`, `npm run docs:lint`

[`.github/workflows/docs.yml`](.github/workflows/docs.yml) deploys API docs to GitHub Pages on push to `main` only.

Changes that break these checks should not be merged.

## Architecture and conventions

### Backend (`org.bruneel.pgpkeymanager`)

- REST controllers under `backend/src/main/java/com/example/pgpkeymanager/web/`, mapped under `/api`.
- Configuration in `backend/src/main/resources/application.yaml`; secrets via gitignored `application-secret.yaml` or environment variables — **never commit credentials**.
- **Request ID:** `RequestIdFilter` reads or generates `X-Request-Id`, stores it in MDC (`requestId`), echoes on the response. Preserve this pattern for new filters/endpoints.
- **CORS:** `CORS_ALLOWED_ORIGINS` (comma-separated); default allows `http://localhost:5173`.
- **Logging:** default profile uses readable console logs with `%X{requestId}`; `prod` profile uses JSON (`logstash-logback-encoder`).
- **Tests:** prefer TDD. Use `@WebMvcTest` for controller slices and `@SpringBootTest` + `MockMvc` for integration (e.g. filter behavior). JUnit 5.

#### API endpoint test coverage (required)

Every REST handler in a controller must have test coverage before a PR is complete. Gaps like “delete and patch are tested but GET is not” are not acceptable, even when the missing test is pre-existing.

**`@WebMvcTest` slice (required per handler):** For each controller method (each HTTP method + path), add at least one focused test in the matching `*ControllerTest` class that:

1. Mocks service dependencies and stubs the call that handler makes.
2. Performs the HTTP request with `MockMvc`.
3. Asserts the expected status code and key response fields.
4. Verifies the service method was invoked (e.g. `verify(...)`).

When you add, change, or remove an endpoint, update the controller’s slice test in the **same PR**. Do not rely on integration tests alone for this layer.

**Integration tests (required for new/changed behavior):** Add or extend `@SpringBootTest` + `MockMvc` tests when an endpoint has non-trivial behavior (auth, validation, persistence, crypto). `PgpKeyLifecycleIntegrationTest` covers multi-step key flows; `*ControllerIntegrationTest` covers simpler CRUD/auth paths.

**Checklist before finishing controller work:**

| Controller | Slice test class | Integration test class |
|------------|------------------|------------------------|
| `HelloController` | `HelloControllerTest` | `HelloControllerIntegrationTest` |
| `PgpKeyController` | `PgpKeyControllerTest` | `PgpKeyControllerIntegrationTest`, `PgpKeyLifecycleIntegrationTest` |

For `PgpKeyController`, every path under `/api/keys` must appear in `PgpKeyControllerTest`:

- `GET /api/keys`
- `GET /api/keys/{keyId}`
- `POST /api/keys`
- `PATCH /api/keys/{keyId}`
- `DELETE /api/keys/{keyId}`
- `GET /api/keys/{primaryKeyId}/subkeys`
- `POST /api/keys/{primaryKeyId}/subkeys`
- `POST /api/keys/preview`
- `POST /api/keys/{primaryKeyId}/subkeys/import-from-keyring`
- `POST /api/keys/{primaryKeyId}/subkeys/import-from-keyring/preview`
- `GET /api/keys/{primaryKeyId}/subkeys/{subkeyId}`
- `POST /api/keys/{keyId}/revoke`
- `POST /api/keys/{keyId}/extend-expiry`
- `POST /api/keys/{keyId}/rotate`
- `GET /api/keys/{keyId}/export-public`
- `GET /api/keys/{keyId}/export-ssh-public`

If OpenAPI (`docs/openapi.yaml`) documents a new operation, add the matching slice test (and integration test when behavior warrants it) in the same change.

### Frontend

#### Product decisions

- **Create primary key UX:** dedicated page at `/keys/new` (not a modal on `/keys`). Phase 1 (implemented): form + `keysApi.create()` + `[pgp-ui]` event IDs.
- **Import key UX:** dedicated page at `/keys/import`. Phase 2 (implemented): public/private armored paste + `keysApi.register()` + `buildImportKeyRequest()` (register-only payload — never send `passphrase` or `algorithmSpec`). Server parses metadata from armor (`PgpKeyMetadataParser`, operation log `register_key`); fingerprint optional on the form.
- **Key detail UX:** dedicated page at `/keys/:id`. Phase 3 (implemented): `keysApi.get()`, `listSubkeys()`, `revoke()`, `extendExpiry()`, `rotate()`, `exportPublic()` + lifecycle validation modules + `[pgp-ui]` `keyDetail.*` events. List page links to detail (`role=primary` filter). Phase 4 (implemented): inline **Add subkey** form on primary detail (`keysApi.createSubkey()`, `create-subkey-validation.ts`, `[pgp-ui]` `keyDetail.createSubkey.*`). Phase 5 (implemented): parse non-master keys from multi-key armored exports — auto-register subkey rows on primary import (`PgpKeyMetadataParser.parseKeyring`, operation `import_subkeys_from_keyring`); inline **Import subkeys from keyring** on primary detail (`keysApi.importSubkeysFromKeyring()`, `[pgp-ui]` `keyDetail.importSubkeys.*`); import page redirects to `/keys/:id` with subkey count toast (`importKey.subkeysRegistered`). Phase 6 (implemented): extended algorithms — shared `algorithm-spec.ts` for capability filtering; subkey create/rotate expose RSA/ECDSA/ECDH (+ Ed448/X448 on v6 primaries); primary create advanced RSA/ECDSA/Ed448 options; backend validates primary algorithm on generate. Phase 7 (implemented): `keysApi.update()` / `delete()` on detail; **Edit label** (`update-key-label-validation.ts`, `[pgp-ui]` `keyDetail.updateLabel.*`); **Delete key** with confirm (`[pgp-ui]` `keyDetail.delete.*`); detail **Refresh** (`keyDetail.refresh`); export **cache** on detail (single `exportPublic` fetch for copy + download); keys list URL filters (`/keys?view=public|private|subkeys&status=&capability=`, `keys-list-params.ts`, `[pgp-ui]` `keysList.*`); status badges; **bulk public export** (`bulk-export-keys.ts`); sidebar Keys submenu + `/policies` / `/settings` placeholders (Phase 9/10). Phase 8 (implemented): import **preview** (`keysApi.previewKeyring`, `keysApi.previewImportSubkeysFromKeyring`, `import-key-preview.tsx`); revocation detection from armor on register/import; private-preferred keyring when both blocks pasted; `registeredSubkeyCount` on register; import-from-keyring revocation sync (`ImportSubkeysResponse.updated`); `[pgp-ui]` `importKey.preview.*`, `keyDetail.importSubkeys.preview.*`. Phase 9 (implemented): **SSH public key export** for authenticate subkeys (`keysApi.exportSshPublic()`, `export-ssh-public` backend, `PgpSshPublicKeyFormatter`, `isSshExportableKey()`, `KeySshExportAction`, `[pgp-ui]` `keyDetail.exportSsh.*`; backend operation `export_ssh_public`). **Key detail redesign (PR #33, implemented):** tabbed layout on `/keys/:id` — Overview / Subkeys (primary only) / Actions & Lifecycle with ARIA `tablist`/`tab`/`tabpanel` semantics and focus-visible rings. **Phase 10a (implemented):** roving `tabIndex` keyboard navigation on the tab bar (`use-roving-tablist.ts`, ArrowLeft/ArrowRight with automatic activation, `[pgp-ui]` `keyDetail.tabs.keyboardNav`). **Phase 11 (implemented):** prevent form/passphrase leakage on key navigation — `KeyDetailPageContent` remounts via `key={id}` on route param change; `[pgp-ui]` `keyDetail.unmount`. **Phase 12 (implemented):** tab panel extraction — `OverviewTab`, `SubkeysTab`, `ActionsTab` in `components/keys/` with shared `KeyDetailTabPanel`; inactive panels remain DOM-mounted with `hidden` for test compatibility; `data-pgp-ui` `keyDetail.tab.*` on each panel. **Phase 13 (implemented):** primary revocation sync on re-import — `import-from-keyring` and register fingerprint upsert (`POST /api/keys` returns `200`) update stored armor and sync primary/subkey revocation (`ImportSubkeysResponse.updated` may include `role: primary`); logs `import_subkeys_from_keyring_primary_revocation_synced`, `register_key_reimport_sync`; `[pgp-ui]` toast mentions primary revocation sync on detail. **Bulk export partial success:** `bulk-export-keys.ts` continues per-key export on failure; partial download + `toast.success` description with failed labels; `[pgp-ui]` `keysList.bulkExport.partial`.

- Pages in `frontend/src/pages/`, shared UI in `frontend/src/components/`, utilities in `frontend/src/lib/`.
- Use `apiFetch` from `frontend/src/lib/api.ts` for API calls. It sets:
  - `Accept: application/json; version=1`
  - `Authorization: Bearer <token>` when `accessToken` is passed
  - `X-Request-Id` (UUID) when not provided
- Auth0 via `@auth0/auth0-react`; env helpers in `frontend/src/lib/auth0-env.ts`.
- UI: shadcn-style components (`frontend/components.json`), Tailwind v4 via `@tailwindcss/vite`, `cn()` in `frontend/src/lib/utils.ts`.
- Tests: Vitest + Testing Library; colocate as `*.test.tsx` next to source.

### API contract

- Versioned JSON: clients send `Accept: application/json; version=1`.
- Protected routes expect `Authorization: Bearer <jwt>` (Auth0).
- Sample public endpoint: `GET /api/hello` → `{ "message": "ok" }`.

## What to do

- Match existing naming, package layout, and test style in each area you touch.
- Keep changes focused; avoid drive-by refactors or unrelated file edits.
- Run backend tests and frontend lint/test/build for any change that affects those areas.
- Update `README.md` only when user-facing setup or behavior changes; do not add extra markdown docs unless asked.
- Use `frontend/.env.example` as the template for new `VITE_*` variables (document in README if user-facing).
- When adding or upgrading dependencies (Maven in `backend/`, npm in `frontend/`), prefer a current maintained release compatible with this repo’s pinned Java/Node stack. Before merging, check for known high/critical vulnerabilities (e.g. `npm audit`, Maven/OWASP dependency checks or advisory databases). Do not bump pinned runtime or toolchain versions unless you update `.nvmrc`, `frontend/package.json` `engines`, `backend/pom.xml`, and CI together (see “What not to do”).

## What not to do

- Do not commit secrets, `.env`, `.env.local`, or `application-secret.yaml`.
- Do not change pinned Node/npm/Java versions without updating `.nvmrc`, `frontend/package.json` `engines`, `backend/pom.xml`, and CI together.
- Do not introduce a Node/Next server for the SPA; static build output goes to `frontend/dist/`.
- Do not remove or bypass request-id / CORS / versioned-`Accept` conventions without an explicit product decision.
- Do not edit `frontend/README.md` (Vite template boilerplate) unless specifically requested.

## Git and PRs

- Use descriptive commit messages.
- Ensure CI passes before considering work complete.
- For cloud agents: use branch prefix `cursor/` and follow repository PR workflow.

## Cursor Cloud specific instructions

### Environment

- **JDK 25 (Temurin)** is installed at `/usr/lib/jvm/java-25-temurin`. Set `JAVA_HOME` and prepend to `PATH` before running Maven commands:
  ```bash
  export JAVA_HOME=/usr/lib/jvm/java-25-temurin
  export PATH=$JAVA_HOME/bin:$PATH
  ```
  These exports are already in `~/.bashrc` so new interactive shells pick them up automatically.
- **Node.js 24.16.0** and **npm 11.13.0** are managed via **nvm**. The update script runs `nvm install` from `.nvmrc` automatically. Before running any `npm` command in a new shell, load nvm and **prepend** the pinned Node bin directory to `PATH` (the VM also has `/exec-daemon/node`, which shadows nvm if it comes first):
  ```bash
  export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use
  export PATH="$NVM_DIR/versions/node/v24.16.0/bin:$PATH"
  ```
- Root and frontend dependencies are refreshed by the update script (`npm ci` at repo root and in `frontend/`).
- `frontend/.env.local` must exist (copy from `.env.example`); the update script does **not** create it. If missing, run: `cp frontend/.env.example frontend/.env.local` and fill `VITE_AUTH0_*` from secrets when available.
- **PostgreSQL** must be running on `localhost:5432` for `spring-boot:run` (Flyway migrations on startup). Tests use in-memory H2 and do not need Postgres. For local Postgres with password `postgres`, export `SPRING_DATASOURCE_PASSWORD=postgres` when starting the backend.

### Running the stack

1. Ensure PostgreSQL is up (`pg_ctlcluster 16 main start` or `sudo service postgresql start` on Ubuntu).
2. **Backend:** `cd backend && export SPRING_DATASOURCE_PASSWORD=postgres && ./mvnw spring-boot:run` — listens on `:8080`.
3. **Frontend:** `cd frontend && npm run dev -- --host 0.0.0.0` — Vite dev server on `:5173`.

The Overview page health check (`GET /api/hello` → `ok`) and footer **API Connected** indicator confirm the backend is reachable.

### Gotchas

- The Maven Enforcer plugin **hard-fails** if `JAVA_HOME` does not point at JDK 25+. Always verify with `java -version` before running `./mvnw`.
- `npm ci` (not `npm install`) should be used to match CI lockfile behaviour.
- Auth0 variables in `.env.local` can remain blank; the app loads without authentication.
- PgBouncer transaction poolers (e.g. Supabase `:6543`) require `prepareThreshold=0` on the JDBC URL (or the auto-config in `PgBouncerTransactionPoolDataSourceConfiguration`, which detects pooler-style URLs). Without it, parallel API calls can fail with `prepared statement "S_1" already exists`. Direct Postgres on `:5432` is unaffected.
- Sidebar navigation items (Keys, Policies, Settings) are scaffold placeholders — they do not have implemented page content yet.

## Further reading

Human-oriented setup and layout: [`README.md`](README.md).
