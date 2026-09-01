package org.bruneel.pgpkeymanager.domain;

public enum StorageConnectionTestStatus {
    SUCCEEDED("succeeded"),
    FAILED("failed");

    private final String dbValue;

    StorageConnectionTestStatus(String dbValue) {
        this.dbValue = dbValue;
    }

    public static StorageConnectionTestStatus fromDb(String value) {
        for (StorageConnectionTestStatus status : values()) {
            if (status.dbValue.equals(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unsupported storage connection test status: " + value);
    }

    public String toDb() {
        return dbValue;
    }

    public String toApi() {
        return dbValue;
    }
}
