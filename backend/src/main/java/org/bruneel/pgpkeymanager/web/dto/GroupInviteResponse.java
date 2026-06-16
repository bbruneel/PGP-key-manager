package org.bruneel.pgpkeymanager.web.dto;

import java.time.Instant;

import org.bruneel.pgpkeymanager.domain.GroupInvite;

public record GroupInviteResponse(
        String id,
        String groupId,
        String token,
        String email,
        String inviteeUserId,
        String role,
        String invitedByUserId,
        Instant expiresAt,
        Instant acceptedAt,
        Instant createdAt) {

    public static GroupInviteResponse from(GroupInvite invite) {
        return new GroupInviteResponse(
                invite.id().toString(),
                invite.groupId().toString(),
                invite.token(),
                invite.email(),
                invite.inviteeUserId() == null ? null : invite.inviteeUserId().toString(),
                invite.role().toDb(),
                invite.invitedByUserId().toString(),
                invite.expiresAt(),
                invite.acceptedAt(),
                invite.createdAt());
    }
}
