DROP TABLE IF EXISTS group_invites;
DROP TABLE IF EXISTS group_members;
DROP TABLE IF EXISTS groups;
DROP TABLE IF EXISTS pgp_keys;
DROP TABLE IF EXISTS app_users;

CREATE TABLE app_users (
    id CHAR(36) PRIMARY KEY,
    auth0_sub VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255),
    display_name VARCHAR(255),
    platform_role VARCHAR(32) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT app_users_platform_role_check CHECK (platform_role IN ('user', 'admin'))
);

CREATE TABLE groups (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(1024),
    owner_user_id CHAR(36) NOT NULL REFERENCES app_users (id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX groups_name_unique_idx ON groups (name);
CREATE INDEX groups_owner_user_id_idx ON groups (owner_user_id);

CREATE TABLE group_members (
    group_id CHAR(36) NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
    user_id CHAR(36) NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL,
    invited_by_user_id CHAR(36) REFERENCES app_users (id) ON DELETE SET NULL,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, user_id),
    CONSTRAINT group_members_role_check CHECK (role IN ('owner', 'member'))
);

CREATE INDEX group_members_user_id_idx ON group_members (user_id);

CREATE TABLE group_invites (
    id CHAR(36) PRIMARY KEY,
    group_id CHAR(36) NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255),
    invitee_user_id CHAR(36) REFERENCES app_users (id) ON DELETE SET NULL,
    role VARCHAR(32) NOT NULL,
    invited_by_user_id CHAR(36) NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT group_invites_role_check CHECK (role IN ('owner', 'member')),
    CONSTRAINT group_invites_target_check CHECK (email IS NOT NULL OR invitee_user_id IS NOT NULL)
);

CREATE INDEX group_invites_group_id_idx ON group_invites (group_id);
CREATE INDEX group_invites_active_token_idx ON group_invites (token);
CREATE INDEX group_invites_invitee_user_id_idx ON group_invites (invitee_user_id);

CREATE TABLE pgp_keys (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) REFERENCES app_users (id) ON DELETE CASCADE,
    label VARCHAR(255),
    fingerprint VARCHAR(255) NOT NULL,
    key_id VARCHAR(64),
    key_type VARCHAR(16) NOT NULL,
    role VARCHAR(16) NOT NULL DEFAULT 'primary',
    parent_key_id CHAR(36),
    capabilities VARCHAR(512),
    algorithm VARCHAR(64),
    algorithm_spec VARCHAR(512),
    expires_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revocation_reason VARCHAR(64),
    armored_public CLOB,
    encrypted_private_armored CLOB,
    storage_provider VARCHAR(64),
    storage_ref VARCHAR(512),
    openpgp_version INTEGER NOT NULL DEFAULT 4,
    owner_type VARCHAR(32) NOT NULL DEFAULT 'user',
    owner_group_id CHAR(36) REFERENCES groups (id) ON DELETE CASCADE,
    created_by_user_id CHAR(36) NOT NULL REFERENCES app_users (id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pgp_keys_key_type_check CHECK (key_type IN ('public', 'private')),
    CONSTRAINT pgp_keys_role_check CHECK (role IN ('primary', 'subkey')),
    CONSTRAINT pgp_keys_openpgp_version_check CHECK (openpgp_version IN (4, 6)),
    CONSTRAINT pgp_keys_owner_type_check CHECK (owner_type IN ('user', 'group')),
    CONSTRAINT pgp_keys_owner_reference_check CHECK (
        (owner_type = 'user' AND user_id IS NOT NULL AND owner_group_id IS NULL)
        OR (owner_type = 'group' AND owner_group_id IS NOT NULL AND user_id IS NULL)
    )
);

CREATE UNIQUE INDEX pgp_keys_user_owner_fingerprint_unique
    ON pgp_keys (owner_type, user_id, fingerprint);
CREATE UNIQUE INDEX pgp_keys_group_owner_fingerprint_unique
    ON pgp_keys (owner_type, owner_group_id, fingerprint);

CREATE INDEX pgp_keys_user_id_idx ON pgp_keys (user_id);
CREATE INDEX pgp_keys_parent_key_id_idx ON pgp_keys (parent_key_id);
CREATE INDEX pgp_keys_role_idx ON pgp_keys (user_id, role);
CREATE INDEX pgp_keys_expires_at_idx ON pgp_keys (expires_at);
CREATE INDEX pgp_keys_owner_group_id_idx ON pgp_keys (owner_group_id);
CREATE INDEX pgp_keys_created_by_user_id_idx ON pgp_keys (created_by_user_id);

CREATE TABLE storage_connections (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
    provider VARCHAR(32) NOT NULL,
    display_name VARCHAR(128) NOT NULL,
    display_name_lower VARCHAR(128) AS LOWER(display_name),
    region VARCHAR(64) NOT NULL,
    bucket VARCHAR(255) NOT NULL,
    prefix VARCHAR(512) NOT NULL DEFAULT 'pgp-key-manager/',
    role_arn VARCHAR(512) NOT NULL,
    external_id VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'registered',
    last_tested_at TIMESTAMP WITH TIME ZONE,
    last_test_status VARCHAR(32),
    last_test_error_category VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT storage_connections_provider_check CHECK (provider IN ('aws-s3')),
    CONSTRAINT storage_connections_status_check CHECK (status IN ('registered')),
    CONSTRAINT storage_connections_last_test_status_check CHECK (last_test_status IN ('succeeded', 'failed'))
);

CREATE UNIQUE INDEX storage_connections_user_display_name_idx
    ON storage_connections (user_id, display_name_lower);

CREATE INDEX storage_connections_user_id_idx ON storage_connections (user_id);
