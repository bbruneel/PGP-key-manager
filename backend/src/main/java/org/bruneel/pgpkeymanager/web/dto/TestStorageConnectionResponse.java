package org.bruneel.pgpkeymanager.web.dto;

import java.time.Instant;

import org.bruneel.pgpkeymanager.domain.StorageConnection;
import org.bruneel.pgpkeymanager.storage.StorageConnectionTestResult;

public record TestStorageConnectionResponse(
        String lastTestStatus,
        Instant lastTestedAt,
        String lastTestErrorCategory,
        String message,
        long durationMs,
        StorageConnectionResponse connection) {

    public static TestStorageConnectionResponse from(
            StorageConnection connection, StorageConnectionTestResult result) {
        return new TestStorageConnectionResponse(
                result.succeeded() ? "succeeded" : "failed",
                connection.lastTestedAt(),
                connection.lastTestErrorCategory(),
                result.message(),
                result.durationMs(),
                StorageConnectionResponse.from(connection));
    }
}
