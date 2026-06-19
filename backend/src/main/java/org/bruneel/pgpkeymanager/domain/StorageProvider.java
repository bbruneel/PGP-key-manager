package org.bruneel.pgpkeymanager.domain;

public enum StorageProvider {
    AWS_S3("aws-s3");

    private final String apiValue;

    StorageProvider(String apiValue) {
        this.apiValue = apiValue;
    }

    public String toApi() {
        return apiValue;
    }

    public static StorageProvider fromApi(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Storage provider is required");
        }
        for (StorageProvider provider : values()) {
            if (provider.apiValue.equalsIgnoreCase(value)) {
                return provider;
            }
        }
        throw new IllegalArgumentException("Unsupported storage provider: " + value);
    }

    public static StorageProvider fromDb(String value) {
        return fromApi(value);
    }

    public String toDb() {
        return apiValue;
    }
}
