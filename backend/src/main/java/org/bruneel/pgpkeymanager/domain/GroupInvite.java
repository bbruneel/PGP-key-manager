package org.bruneel.pgpkeymanager.domain;

import java.time.Instant;
import java.util.UUID;

public record GroupInvite(
        UUID id,
        UUID groupId,
        String token,
        String email,
        UUID inviteeUserId,
        GroupMembershipRole role,
        UUID invitedByUserId,
        Instant expiresAt,
        Instant acceptedAt,
        Instant createdAt) {

    public boolean isAccepted() {
        return acceptedAt != null;
    }
}
