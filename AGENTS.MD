# AGENTS.MD

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
- **Node.js 22.22.2** and **npm 10.9.7** (see `.nvmrc` and `frontend/package.json` `engines`)

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

### Full local stack

1. Start backend: `cd backend && ./mvnw spring-boot:run`
2. Start frontend: `cd frontend && npm run dev`

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push/PR to `main`:

- **Backend:** `./mvnw --batch-mode test` (Java 25)
- **Frontend:** `npm ci`, `npm run lint`, `npm run test`, `npm run build`

Changes that break these checks should not be merged.

## Architecture and conventions

### Backend (`com.example.pgpkeymanager`)

- REST controllers under `backend/src/main/java/com/example/pgpkeymanager/web/`, mapped under `/api`.
- Configuration in `backend/src/main/resources/application.yaml`; secrets via gitignored `application-secret.yaml` or environment variables — **never commit credentials**.
- **Request ID:** `RequestIdFilter` reads or generates `X-Request-Id`, stores it in MDC (`requestId`), echoes on the response. Preserve this pattern for new filters/endpoints.
- **CORS:** `CORS_ALLOWED_ORIGINS` (comma-separated); default allows `http://localhost:5173`.
- **Logging:** default profile uses readable console logs with `%X{requestId}`; `prod` profile uses JSON (`logstash-logback-encoder`).
- **Tests:** prefer TDD. Use `@WebMvcTest` for controller slices and `@SpringBootTest` + `MockMvc` for integration (e.g. filter behavior). JUnit 5.

### Frontend

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
- **Node.js 22.22.2** and **npm 10.9.7** are pre-installed (system-level, no nvm needed).
- Frontend dependencies are refreshed by the update script (`npm ci` in `frontend/`).
- `frontend/.env.local` must exist (copy from `.env.example`); the update script does **not** create it. If missing, run: `cp frontend/.env.example frontend/.env.local`.

### Running the stack

1. **Backend:** `cd backend && ./mvnw spring-boot:run` — listens on `:8080`.
2. **Frontend:** `cd frontend && npm run dev` — Vite dev server on `:5173`.

The frontend health-check indicator ("API Connected") confirms the backend is reachable.

### Gotchas

- The Maven Enforcer plugin **hard-fails** if `JAVA_HOME` does not point at JDK 25+. Always verify with `java -version` before running `./mvnw`.
- `npm ci` (not `npm install`) should be used to match CI lockfile behaviour.
- Auth0 variables in `.env.local` can remain blank; the app loads without authentication.
- Sidebar navigation items (Keys, Policies, Settings) are scaffold placeholders — they do not have implemented page content yet.

## Further reading

Human-oriented setup and layout: [`README.md`](README.md).
