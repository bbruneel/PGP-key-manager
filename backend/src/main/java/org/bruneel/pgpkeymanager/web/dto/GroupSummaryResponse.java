package org.bruneel.pgpkeymanager.web.dto;

import org.bruneel.pgpkeymanager.service.GroupService.GroupSummary;

public record GroupSummaryResponse(GroupResponse group, int memberCount, int pendingInviteCount, int keyCount) {

    public static GroupSummaryResponse from(GroupSummary summary) {
        return new GroupSummaryResponse(
                GroupResponse.from(summary.group()),
                summary.memberCount(),
                summary.pendingInviteCount(),
                summary.keyCount());
    }
}
