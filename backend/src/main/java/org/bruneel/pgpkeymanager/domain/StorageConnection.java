package org.bruneel.pgpkeymanager.domain;

import java.time.Instant;
import java.util.UUID;

public record StorageConnection(
        UUID id,
        UUID userId,
        StorageProvider provider,
        String displayName,
        String region,
        String bucket,
        String prefix,
        String roleArn,
        String externalId,
        StorageConnectionStatus status,
        Instant lastTestedAt,
        StorageConnectionTestStatus lastTestStatus,
        String lastTestErrorCategory,
        Instant createdAt,
        Instant updatedAt) {}
