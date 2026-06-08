# Architecture

The application splits responsibilities between a browser-hosted UI and a JSON API. Authentication is delegated to Auth0; protected key routes require a Bearer JWT. The backend implements OpenPGP key management (primary/subkey model, lifecycle actions) using Bouncy Castle for cryptographic operations.

This repository is a **monorepo**: a Spring Boot API (`backend/`) and a static-hosted Vite + React SPA (`frontend/`). The browser talks to the API directly (CORS enabled for local Vite); there is no Next.js server.

## System overview

```mermaid
flowchart TB
  subgraph User["User browser"]
    SPA["Vite + React SPA<br/>localhost:5173 · static dist/"]
  end

  subgraph Auth["Identity (optional)"]
    Auth0["Auth0 tenant<br/>login · refresh tokens · JWT"]
  end

  subgraph Repo["Monorepo"]
    subgraph FE["frontend/"]
      UI["AppShell · OverviewPage · KeysPage"]
      APIClient["requestJson · keysApi<br/>Accept: application/json; version=1<br/>X-Request-Id · Authorization"]
      Types["api.generated.ts<br/>OpenAPI types"]
    end

    subgraph BE["backend/"]
      API["Spring Boot REST<br/>localhost:8080"]
      Filters["RequestIdFilter · CORS"]
      Controllers["PgpKeyController<br/>CRUD + subkeys + lifecycle"]
      Crypto["PgpCryptoService<br/>Bouncy Castle OpenPGP"]
    end
  end

  subgraph Future["Planned enhancements"]
    Storage["BYO cloud storage sync"]
    Alerts["Expiry alert jobs"]
  end

  SPA --> UI
  UI --> APIClient
  APIClient -->|"HTTPS + CORS"| API
  SPA <-->|"OAuth redirect · silent token"| Auth0
  APIClient -.->|"Bearer JWT on protected routes"| API
  API --> Filters --> Controllers
  Controllers --> Crypto
  UI -.-> Future
  API -.-> Future

  subgraph CI["GitHub Actions · main"]
    BEJob["backend: mvn test"]
    FEJob["frontend: lint · test · build"]
  end

  Repo --> CI
```

## Request flow (health check)

On load, the Overview page calls the scaffold endpoint to confirm API reachability. The same client helper will attach an access token when Auth0 is configured and routes require auth.

```mermaid
sequenceDiagram
  autonumber
  participant U as User
  participant SPA as React SPA
  participant A0 as Auth0
  participant API as Spring Boot API

  U->>SPA: Open app
  SPA->>API: GET /api/hello<br/>Accept: application/json; version=1<br/>X-Request-Id: UUID
  API->>API: RequestIdFilter → MDC · echo header
  API-->>SPA: 200 { "message": "ok" }<br/>X-Request-Id
  SPA-->>U: Footer: Connected

  opt Auth0 configured
    U->>SPA: Log in
    SPA->>A0: loginWithRedirect
    A0-->>SPA: Session + refresh token (localStorage)
    Note over SPA,API: Protected calls use apiFetch(..., { accessToken })
    SPA->>API: Future protected routes<br/>Authorization: Bearer JWT
  end
```

## Key lifecycle (API)

```mermaid
sequenceDiagram
  participant Client
  participant API as PgpKeyController
  participant Svc as PgpKeyService
  participant Crypto as PgpCryptoService
  participant DB as pgp_keys

  Client->>API: POST /api/keys (generate primary)
  API->>Svc: create
  Svc->>Crypto: generatePrimary
  Crypto-->>Svc: armored keyring
  Svc->>DB: insert primary row

  Client->>API: POST /api/keys/{primaryKeyId}/subkeys
  Svc->>Crypto: addSubkey
  Crypto-->>Svc: updated keyring + subkey metadata
  Svc->>DB: update primary armored material + insert subkey metadata row

  Client->>API: POST /api/keys/{keyId}/revoke
  alt primary has private material
    Svc->>Crypto: revokeKeyInRing (SUBKEY_REVOCATION / KEY_REVOCATION)
    Svc->>DB: update primary keyring + mark revoked_at
  else metadata only
    Svc->>DB: mark revoked_at
  end
```

**Transactional boundaries:** `PgpKeyService` mutations run in a single database transaction so keyring updates and row inserts succeed or roll back together.

**Passphrase handling:** passphrases are converted to `char[]`, used for Bouncy Castle decrypt/sign operations, then zeroed via `PassphraseUtil`.

## Frontend navigation and UX

Key management flows use dedicated routes (not modals) so multi-field PGP forms stay deep-linkable and usable on small screens.

| Route | Purpose | Phase |
|-------|---------|-------|
| `/` | Overview (health, auth status) | Current |
| `/keys` | List keys for the signed-in user | Current |
| `/keys/new` | Create primary key (label, user IDs, expiry, passphrase, Ed25519, OpenPGP v4/v6) | Phase 1 (implemented) |

**Recorded decision:** create primary key at **`/keys/new`**, not a modal on `/keys`.

When Auth0 is configured, `requireAuth` wraps the routed app so unauthenticated visitors are redirected to login before protected pages load.

## Frontend API client

Browser calls use `requestJson` (`frontend/src/lib/api-client.ts`) on top of `apiFetch`. Each request carries:

- **`operationId`** — matches OpenAPI operation names (e.g. `listKeys`, `getHello`) for `[pgp-api]` structured logs.
- **`X-Request-Id`** — client-generated UUID; echoed by the backend `RequestIdFilter` for correlation in logs and error UI.
- **RFC 7807 errors** — non-2xx responses parse `application/problem+json` into `ApiError` with human-readable `detail`.

Types are generated from `docs/openapi.yaml` via `npm run generate:api-types` in `frontend/`. Phase 1 exposes `keysApi.list()` and `keysApi.create()` (`operationId: createKey`); import/lifecycle clients will follow in later PRs.

## Create primary key flow (Phase 1)

1. User opens `/keys/new` and completes identity, passphrase, expiry, and optional advanced OpenPGP version.
2. Client validates input (`create-key-validation.ts`) and logs `[pgp-ui]` events (`createKey.pageView`, `createKey.submit`, `createKey.validationFailed`, `createKey.apiSuccess`, `createKey.apiError`).
3. `keysApi.create()` sends `POST /api/keys` with `operationId: createKey` and `X-Request-Id` correlation.
4. On success: sonner toast with fingerprint, redirect to `/keys` (list reloads). Passphrase fields are cleared locally; the server never stores the passphrase.
5. On failure: RFC 7807 `detail` and optional request ID shown in the form (mirrors key list error UX).

## Repository layout

```mermaid
flowchart LR
  Root["pgp-key-manager"] --> BE["backend/<br/>Java 25 · Spring Boot 4"]
  Root --> FE["frontend/<br/>React 19 · Vite · Tailwind v4"]
  Root --> GH[".github/workflows/ci.yml"]
  BE --> Maven["Maven · JUnit 5"]
  FE --> NPM["npm · Vitest · ESLint"]
```

Quick reference:

```text
backend/          Maven, Spring Boot 4.0.x, Java 25 (org.bruneel.pgpkeymanager)
frontend/         Vite, React 19, TypeScript, Tailwind v4, shadcn-style UI, Auth0 SPA
```
