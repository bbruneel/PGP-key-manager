ALTER TABLE pgp_keys
    ADD COLUMN role TEXT NOT NULL DEFAULT 'primary'
        CHECK (role IN ('primary', 'subkey')),
    ADD COLUMN parent_key_id UUID REFERENCES pgp_keys (id) ON DELETE CASCADE,
    ADD COLUMN capabilities TEXT,
    ADD COLUMN algorithm_spec TEXT,
    ADD COLUMN revocation_reason TEXT;

UPDATE pgp_keys SET role = 'primary' WHERE parent_key_id IS NULL;

CREATE INDEX pgp_keys_parent_key_id_idx ON pgp_keys (parent_key_id)
    WHERE parent_key_id IS NOT NULL;

CREATE INDEX pgp_keys_role_idx ON pgp_keys (user_id, role);

CREATE INDEX pgp_keys_revoked_at_idx ON pgp_keys (revoked_at)
    WHERE revoked_at IS NOT NULL;
