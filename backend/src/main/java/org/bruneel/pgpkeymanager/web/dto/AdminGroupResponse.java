package org.bruneel.pgpkeymanager.web.dto;

import java.time.Instant;

import org.bruneel.pgpkeymanager.domain.Group;

public record AdminGroupResponse(
        String id,
        String name,
        String description,
        String ownerUserId,
        int memberCount,
        int keyCount,
        Instant createdAt,
        Instant updatedAt) {

    public static AdminGroupResponse from(Group group, int memberCount, int keyCount) {
        return new AdminGroupResponse(
                group.id().toString(),
                group.name(),
                group.description(),
                group.ownerUserId().toString(),
                memberCount,
                keyCount,
                group.createdAt(),
                group.updatedAt());
    }
}
