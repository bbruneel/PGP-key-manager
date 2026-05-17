CREATE TABLE pgp_keys (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
    label TEXT,
    fingerprint TEXT NOT NULL,
    key_id TEXT,
    key_type TEXT NOT NULL CHECK (key_type IN ('public', 'private')),
    algorithm TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    armored_public TEXT,
    encrypted_private_armored TEXT,
    storage_provider TEXT,
    storage_ref TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pgp_keys_user_fingerprint_unique UNIQUE (user_id, fingerprint)
);

CREATE INDEX pgp_keys_user_id_idx ON pgp_keys (user_id);

CREATE INDEX pgp_keys_expires_at_idx ON pgp_keys (expires_at)
    WHERE expires_at IS NOT NULL;
