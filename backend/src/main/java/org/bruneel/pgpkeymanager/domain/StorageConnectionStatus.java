package org.bruneel.pgpkeymanager.domain;

public enum StorageConnectionStatus {
    REGISTERED("registered");

    private final String dbValue;

    StorageConnectionStatus(String dbValue) {
        this.dbValue = dbValue;
    }

    public static StorageConnectionStatus fromDb(String value) {
        for (StorageConnectionStatus status : values()) {
            if (status.dbValue.equals(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unsupported storage connection status: " + value);
    }

    public String toDb() {
        return dbValue;
    }

    public String toApi() {
        return dbValue;
    }
}
