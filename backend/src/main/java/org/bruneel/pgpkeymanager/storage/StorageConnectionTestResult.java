package org.bruneel.pgpkeymanager.storage;

public record StorageConnectionTestResult(
        boolean succeeded, String errorCategory, String message, long durationMs) {

    public static StorageConnectionTestResult success(long durationMs) {
        return new StorageConnectionTestResult(true, null, null, durationMs);
    }

    public static StorageConnectionTestResult failure(String errorCategory, String message, long durationMs) {
        return new StorageConnectionTestResult(false, errorCategory, message, durationMs);
    }
}
