DROP TABLE IF EXISTS pgp_keys;
DROP TABLE IF EXISTS app_users;

CREATE TABLE app_users (
    id CHAR(36) PRIMARY KEY,
    auth0_sub VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pgp_keys (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
    label VARCHAR(255),
    fingerprint VARCHAR(255) NOT NULL,
    key_id VARCHAR(64),
    key_type VARCHAR(16) NOT NULL,
    algorithm VARCHAR(64),
    expires_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    armored_public CLOB,
    encrypted_private_armored CLOB,
    storage_provider VARCHAR(64),
    storage_ref VARCHAR(512),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pgp_keys_user_fingerprint_unique UNIQUE (user_id, fingerprint),
    CONSTRAINT pgp_keys_key_type_check CHECK (key_type IN ('public', 'private'))
);

CREATE INDEX pgp_keys_user_id_idx ON pgp_keys (user_id);

CREATE INDEX pgp_keys_expires_at_idx ON pgp_keys (expires_at);
