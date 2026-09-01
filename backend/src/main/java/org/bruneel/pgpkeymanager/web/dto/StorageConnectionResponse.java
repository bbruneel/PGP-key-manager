package org.bruneel.pgpkeymanager.web.dto;

import java.time.Instant;

import org.bruneel.pgpkeymanager.domain.StorageConnection;

public record StorageConnectionResponse(
        String id,
        String provider,
        String displayName,
        String region,
        String bucket,
        String prefix,
        String roleArn,
        String externalId,
        String status,
        Instant lastTestedAt,
        String lastTestStatus,
        String lastTestErrorCategory,
        Instant createdAt,
        Instant updatedAt) {

    public static StorageConnectionResponse from(StorageConnection connection) {
        return new StorageConnectionResponse(
                connection.id().toString(),
                connection.provider().toApi(),
                connection.displayName(),
                connection.region(),
                connection.bucket(),
                connection.prefix(),
                connection.roleArn(),
                connection.externalId(),
                connection.status().toApi(),
                connection.lastTestedAt(),
                connection.lastTestStatus() == null ? null : connection.lastTestStatus().toApi(),
                connection.lastTestErrorCategory(),
                connection.createdAt(),
                connection.updatedAt());
    }
}
