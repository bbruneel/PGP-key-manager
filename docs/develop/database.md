# Database

Persistence is **PostgreSQL** with **Flyway** migrations under `backend/src/main/resources/db/migration/` (**V1–V11**).

## Deployment options

| Aspect | Supabase (default native) | Docker Compose |
|--------|---------------------------|----------------|
| Database | Hosted Postgres + pooler | Container Postgres 16 |
| Config | `application-secret.yaml` or env | `docker/.env` + compose |
| Flyway | `baseline-on-migrate: true` | `docker` profile: baseline off (fresh DB) |
| App URL | Pooler `:6543` + `prepareThreshold=0` | Direct `:5432` |

## Environment variables

| Variable | Purpose |
|----------|---------|
| `SPRING_DATASOURCE_URL` | JDBC URL |
| `SPRING_DATASOURCE_USERNAME` / `PASSWORD` | Credentials |
| `FLYWAY_URL` / `FLYWAY_USER` / `FLYWAY_PASSWORD` | Direct connection for migrations (optional if same as datasource) |

## PgBouncer / Supabase transaction poolers

Transaction poolers (Supabase port **6543**) do not support server-side prepared statements. Include `prepareThreshold=0` on the pooler JDBC URL. `PgBouncerTransactionPoolDataSourceConfiguration` also auto-sets this when the URL looks like a pooler (`pgbouncer=true`, `:6543/`, or `pooler.` host). Direct `:5432` is unaffected.

Without it, parallel API calls can fail with `prepared statement "S_1" already exists`.

## Tests

Backend tests use **in-memory H2** and do not need Postgres.

## Storage connections

Phase 17a adds `storage_connections` (V11). Keyring bytes remain on `pgp_keys` until later phases. See [storage-ref](./storage-ref).

## See also

- [Local setup](./local-setup)
- [Architecture](./architecture)
