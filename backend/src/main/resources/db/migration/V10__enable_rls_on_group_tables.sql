-- Preemptively harden group-related tables that exist from V5 onward.
-- This keeps security posture consistent once environments apply V5-V8.
ALTER TABLE IF EXISTS groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS group_invites ENABLE ROW LEVEL SECURITY;
