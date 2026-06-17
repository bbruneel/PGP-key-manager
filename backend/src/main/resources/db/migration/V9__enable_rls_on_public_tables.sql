-- Harden public-schema tables exposed through PostgREST.
-- No policies are created here by design: deny-by-default is intentional
-- for tables that should only be accessed by trusted backend database roles.
ALTER TABLE IF EXISTS app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pgp_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS flyway_schema_history ENABLE ROW LEVEL SECURITY;
