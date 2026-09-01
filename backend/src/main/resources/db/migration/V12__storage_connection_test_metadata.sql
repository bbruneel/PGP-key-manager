ALTER TABLE storage_connections
    ADD COLUMN last_tested_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN last_test_status TEXT CHECK (last_test_status IN ('succeeded', 'failed')),
    ADD COLUMN last_test_error_category TEXT;
