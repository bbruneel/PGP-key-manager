ALTER TABLE pgp_keys
    ADD COLUMN owner_type TEXT NOT NULL DEFAULT 'user'
        CHECK (owner_type IN ('user', 'group')),
    ADD COLUMN owner_group_id UUID REFERENCES groups (id) ON DELETE CASCADE,
    ADD COLUMN created_by_user_id UUID REFERENCES app_users (id) ON DELETE RESTRICT;

UPDATE pgp_keys
SET owner_type = 'user',
    owner_group_id = NULL,
    created_by_user_id = user_id;

ALTER TABLE pgp_keys
    ALTER COLUMN created_by_user_id SET NOT NULL,
    ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE pgp_keys
    DROP CONSTRAINT pgp_keys_user_fingerprint_unique;

ALTER TABLE pgp_keys
    ADD CONSTRAINT pgp_keys_owner_reference_check CHECK (
        (owner_type = 'user' AND user_id IS NOT NULL AND owner_group_id IS NULL)
        OR (owner_type = 'group' AND owner_group_id IS NOT NULL AND user_id IS NULL)
    );

CREATE UNIQUE INDEX pgp_keys_user_owner_fingerprint_unique
    ON pgp_keys (user_id, UPPER(fingerprint))
    WHERE owner_type = 'user' AND user_id IS NOT NULL;

CREATE UNIQUE INDEX pgp_keys_group_owner_fingerprint_unique
    ON pgp_keys (owner_group_id, UPPER(fingerprint))
    WHERE owner_type = 'group' AND owner_group_id IS NOT NULL;

CREATE INDEX pgp_keys_owner_group_id_idx ON pgp_keys (owner_group_id)
    WHERE owner_group_id IS NOT NULL;

CREATE INDEX pgp_keys_created_by_user_id_idx ON pgp_keys (created_by_user_id);
