package org.bruneel.pgpkeymanager.service;

public class StorageConnectionTestFailedException extends RuntimeException {

    private final String errorCategory;

    public StorageConnectionTestFailedException(String errorCategory, String message) {
        super(message);
        this.errorCategory = errorCategory;
    }

    public String errorCategory() {
        return errorCategory;
    }
}
