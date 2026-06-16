package org.bruneel.pgpkeymanager.domain;

import java.time.Instant;
import java.util.UUID;

public record Group(
        UUID id,
        String name,
        String description,
        UUID ownerUserId,
        Instant createdAt,
        Instant updatedAt) {}
