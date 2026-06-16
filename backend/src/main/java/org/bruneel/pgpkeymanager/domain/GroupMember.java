package org.bruneel.pgpkeymanager.domain;

import java.time.Instant;
import java.util.UUID;

public record GroupMember(
        UUID groupId,
        UUID userId,
        GroupMembershipRole role,
        UUID invitedByUserId,
        Instant joinedAt) {}
