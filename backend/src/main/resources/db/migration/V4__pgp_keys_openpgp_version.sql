ALTER TABLE pgp_keys
    ADD COLUMN openpgp_version INTEGER NOT NULL DEFAULT 4
        CHECK (openpgp_version IN (4, 6));

UPDATE pgp_keys SET openpgp_version = 4 WHERE openpgp_version IS NULL;
