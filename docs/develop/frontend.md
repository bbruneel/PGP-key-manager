# Frontend

Vite + React 19 + TypeScript + Tailwind v4 SPA. Static build output: `frontend/dist/`. There is **no** Next.js or Node server for the SPA — the browser calls Spring directly (CORS) or via nginx in Docker.

## Routes

| Path | Page |
|------|------|
| `/` | Overview (API health, Auth0 status) |
| `/keys` | Key list (filters via query params) |
| `/keys/new` | Create primary |
| `/keys/import` | Import / preview |
| `/keys/:id` | Key detail (Overview / Subkeys / Actions tabs) |
| `/groups/new` | Create team vault |
| `/groups/:groupId/keys` | Team-scoped keys |
| `/groups/:groupId/members` | Members and summary |
| `/settings` | Storage connection registry |
| `/policies` | Placeholder (not implemented) |

## API client

| Module | Role |
|--------|------|
| `frontend/src/types/api.generated.ts` | OpenAPI types (`npm run generate:api-types`) |
| `frontend/src/lib/api.ts` / `api-client.ts` | `apiFetch` / `requestJson` — versioned Accept, Bearer, `X-Request-Id` |
| `frontend/src/lib/api-error.ts` | RFC 7807 → `ApiError` |
| `frontend/src/lib/keys-api.ts` | Key endpoints |
| `frontend/src/lib/groups-api.ts` | Groups / membership |
| `frontend/src/lib/storage-connections-api.ts` | Settings CRUD |
| `frontend/src/lib/ui-logger.ts` | `[pgp-ui]` events |

Regenerate types after changing `docs/openapi.yaml`:

```bash
cd frontend
npm run generate:api-types
```

## Quality

```bash
cd frontend
npm ci
npm run lint
npm run test
npm run build
npm run dev
```

## Product UX conventions

- Create and import use **dedicated routes**, not modals on `/keys`.
- Team context: sidebar `TeamVaultsNav` (not a top-bar vault switcher).
- Key detail remounts on `:id` change so passphrase fields cannot leak across keys.
- Structured UI events use `[pgp-ui]` `eventId`s (see archived [phase history](/changelog/phases)).

## See also

- [User guide](/user/getting-started)
- [Backend](./backend)
- [API overview](/api/overview)
