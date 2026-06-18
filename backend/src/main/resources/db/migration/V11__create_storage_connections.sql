CREATE TABLE storage_connections (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('aws-s3')),
    display_name TEXT NOT NULL,
    display_name_lower TEXT GENERATED ALWAYS AS (LOWER(display_name)) STORED,
    region TEXT NOT NULL,
    bucket TEXT NOT NULL,
    prefix TEXT NOT NULL DEFAULT 'pgp-key-manager/',
    role_arn TEXT NOT NULL,
    external_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'registered'
        CHECK (status IN ('registered')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX storage_connections_user_display_name_idx
    ON storage_connections (user_id, display_name_lower);

CREATE INDEX storage_connections_user_id_idx ON storage_connections (user_id);

ALTER TABLE storage_connections ENABLE ROW LEVEL SECURITY;
