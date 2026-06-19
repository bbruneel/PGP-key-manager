package org.bruneel.pgpkeymanager.storage;

public class StorageConnectionProbeException extends RuntimeException {

    private final String errorCategory;

    public StorageConnectionProbeException(String errorCategory, String message) {
        super(message);
        this.errorCategory = errorCategory;
    }

    public StorageConnectionProbeException(String errorCategory, String message, Throwable cause) {
        super(message, cause);
        this.errorCategory = errorCategory;
    }

    public String errorCategory() {
        return errorCategory;
    }
}
