# API overview

The HTTP API is defined in [`docs/openapi.yaml`](https://github.com/bbruneel/PGP-key-manager/blob/main/docs/openapi.yaml) and published as Redoc at **[OpenAPI reference](/api/)**.

## Conventions

| Concern | Contract |
|---------|----------|
| Versioning | Clients send `Accept: application/json; version=1` |
| Auth | `Authorization: Bearer <Auth0 JWT>` on protected routes |
| Correlation | `X-Request-Id` (client or server generated); echoed on responses |
| Errors | RFC 7807 Problem+JSON (`application/problem+json`) |
| Sample public route | `GET /api/hello` → `{ "message": "ok" }` |

## Major tags

- Health
- Keys / Subkeys / Key lifecycle (revoke, certs, export, rotate, transfer, …)
- Groups (team vaults, members, invites, audit CSV)
- Storage connections
- Admin

## Local tooling

```bash
npm run docs:lint           # validate OpenAPI (CI)
npm run docs:build          # VitePress site + Redoc under dist/api/
npm run docs:api-preview    # Redoc-only preview on :8081
```

Frontend TypeScript types:

```bash
cd frontend && npm run generate:api-types
```

## Related contracts

- [`storage_ref` URI](../develop/storage-ref)
- [Architecture](../develop/architecture)
