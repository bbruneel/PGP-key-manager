ALTER TABLE app_users
    ADD COLUMN platform_role TEXT NOT NULL DEFAULT 'user'
        CHECK (platform_role IN ('user', 'admin'));
