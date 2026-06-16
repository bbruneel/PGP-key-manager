package org.bruneel.pgpkeymanager.web.dto;

import java.time.Instant;

import org.bruneel.pgpkeymanager.domain.GroupInvite;

public record AcceptInviteResponse(String inviteId, String groupId, String role, Instant acceptedAt) {

    public static AcceptInviteResponse from(GroupInvite invite) {
        return new AcceptInviteResponse(
                invite.id().toString(), invite.groupId().toString(), invite.role().toDb(), invite.acceptedAt());
    }
}
