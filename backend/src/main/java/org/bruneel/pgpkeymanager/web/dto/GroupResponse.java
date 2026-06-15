package org.bruneel.pgpkeymanager.web.dto;

import java.time.Instant;

import org.bruneel.pgpkeymanager.domain.Group;

public record GroupResponse(
        String id, String name, String description, String ownerUserId, Instant createdAt, Instant updatedAt) {

    public static GroupResponse from(Group group) {
        return new GroupResponse(
                group.id().toString(),
                group.name(),
                group.description(),
                group.ownerUserId().toString(),
                group.createdAt(),
                group.updatedAt());
    }
}
