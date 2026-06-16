package org.bruneel.pgpkeymanager.web.dto;

import java.time.Instant;

import org.bruneel.pgpkeymanager.domain.GroupMember;

public record GroupMemberResponse(
        String groupId, String userId, String role, String invitedByUserId, Instant joinedAt) {

    public static GroupMemberResponse from(GroupMember member) {
        return new GroupMemberResponse(
                member.groupId().toString(),
                member.userId().toString(),
                member.role().toDb(),
                member.invitedByUserId() == null ? null : member.invitedByUserId().toString(),
                member.joinedAt());
    }
}
