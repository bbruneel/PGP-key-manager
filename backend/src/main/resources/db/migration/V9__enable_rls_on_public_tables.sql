-- Harden public-schema tables exposed through PostgREST.
-- No policies are created here by design: deny-by-default is intentional
-- for tables that should only be accessed by trusted backend database roles.
--
-- flyway_schema_history is intentionally excluded: enabling RLS on that table from
-- within a Flyway migration can block on ACCESS EXCLUSIVE locks (Flyway reads/writes
-- the same table), which caused statement timeouts on Supabase (120s limit).
ALTER TABLE IF EXISTS app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pgp_keys ENABLE ROW LEVEL SECURITY;
