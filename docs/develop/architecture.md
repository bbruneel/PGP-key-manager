# Architecture

Conceptual model of PGP Key Manager. Phase-by-phase history lives in [Phase history](/changelog/phases).

## System overview

```mermaid
flowchart TB
  subgraph User["User browser"]
    SPA["Vite + React SPA<br/>localhost:5173 · static dist/"]
  end

  subgraph Auth["Identity"]
    Auth0["Auth0 tenant<br/>login · refresh tokens · JWT"]
  end

  subgraph Repo["Monorepo"]
    subgraph FE["frontend/"]
      UI["AppShell · pages · TeamVaultsNav"]
      APIClient["requestJson · keysApi · groupsApi<br/>Accept version=1 · X-Request-Id · Bearer"]
    end

    subgraph BE["backend/"]
      API["Spring Boot REST :8080"]
      Filters["RequestIdFilter · CORS"]
      Controllers["Keys · Groups · Storage · Admin"]
      Crypto["PgpCryptoService · Bouncy Castle"]
    end
  end

  subgraph Data["Persistence"]
    PG["PostgreSQL + Flyway V1–V11"]
    StorageReg["storage_connections registry<br/>keyring bytes still inline"]
  end

  subgraph Future["Later"]
    S3IO["S3/STS keyring I/O"]
    Alerts["Expiry alert jobs"]
    Policies["Policies UI"]
  end

  SPA --> UI --> APIClient
  APIClient -->|"HTTPS + CORS"| API
  SPA <-->|"OAuth"| Auth0
  API --> Filters --> Controllers --> Crypto
  Controllers --> PG
  Controllers --> StorageReg
  StorageReg -.-> S3IO
  UI -.-> Policies
  API -.-> Alerts
```

## Request flow (health + auth)

```mermaid
sequenceDiagram
  autonumber
  participant U as User
  participant SPA as React SPA
  participant A0 as Auth0
  participant API as Spring Boot API

  U->>SPA: Open app
  SPA->>API: GET /api/hello
  API->>API: RequestIdFilter → MDC · echo header
  API-->>SPA: 200 message ok
  SPA-->>U: Footer Connected

  opt Auth0 configured
    U->>SPA: Log in
    SPA->>A0: loginWithRedirect
    A0-->>SPA: Session + refresh token
    SPA->>API: Protected routes Authorization Bearer JWT
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

  Client->>API: POST /api/keys generate primary
  API->>Svc: create
  Svc->>Crypto: generatePrimary
  Crypto-->>Svc: armored keyring
  Svc->>DB: insert primary row

  Client->>API: POST /api/keys/{primaryKeyId}/subkeys
  Svc->>Crypto: addSubkey
  Svc->>DB: update primary armor + insert subkey metadata

  Client->>API: POST /api/keys/{keyId}/revoke
  alt primary has private material
    Svc->>Crypto: revoke in keyring
    Svc->>DB: update armor + mark revoked + cascade subkey rows
  else metadata only
    Svc->>DB: mark revoked_at + cascade subkey rows
  end
```

**Transactional boundaries:** `PgpKeyService` mutations run in one DB transaction.

**Passphrase handling:** DTOs use wipeable `char[]`; memory cleared after crypto.

## Team vaults and navigation

- `GroupProvider` loads `/api/groups` and holds active group context.
- Sidebar **`TeamVaultsNav`** lists teams with Public / Private / Subkeys / Members. Last expanded team id is stored in `localStorage`. Top-bar vault switcher was removed.
- Keys listing supports `groupId` and `scope=personal|group|all`.
- Create/import may set `ownerGroupId`. Transfer ownership moves primary + subkeys between vaults (owner ACL).

Group membership authorization is app-DB source of truth (`group_members`), not Auth0 Organization roles.

## BYO storage registry

Connection registry only: `storage_connections` + `/settings` CRUD + [`storage_ref` URI](./storage-ref). Keyring bytes remain inline in Postgres until S3/STS I/O lands.

## Deployment

```mermaid
flowchart TB
  Browser --> Nginx["frontend nginx :80"]
  Nginx -->|"static /"| Dist["frontend/dist"]
  Nginx -->|"/api/* proxy"| API["backend :8080"]
  API --> PG["postgres :5432"]
  Browser -.->|"OAuth"| Auth0["Auth0 external"]
  API -.->|"JWT"| Auth0
```

| Aspect | Native (Vite + CORS) | Docker |
|--------|----------------------|--------|
| Frontend | `:5173` → API `:8080` | nginx `:80` same-origin |
| Database | Supabase or local Postgres | Compose Postgres 16 |
| Flyway | baseline-on-migrate as configured | fresh V1–V11 |

## Repository layout

```text
backend/     Maven, Spring Boot 4.1.x, Java 25
frontend/    Vite, React 19, TypeScript, Tailwind v4, Auth0 SPA
docs/        VitePress site + openapi.yaml (this documentation)
docker/      Compose full stack
```

## See also

- [Local setup](./local-setup)
- [Frontend](./frontend) · [Backend](./backend)
- [Phase history](/changelog/phases)
- [User concepts](/user/concepts/primary-vs-subkey)
