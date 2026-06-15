package org.bruneel.pgpkeymanager.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.bruneel.pgpkeymanager.domain.AppUser;
import org.bruneel.pgpkeymanager.domain.Group;
import org.bruneel.pgpkeymanager.domain.GroupInvite;
import org.bruneel.pgpkeymanager.domain.GroupMember;
import org.bruneel.pgpkeymanager.domain.GroupMembershipRole;
import org.bruneel.pgpkeymanager.repo.GroupInviteRepository;
import org.bruneel.pgpkeymanager.repo.GroupMemberRepository;
import org.bruneel.pgpkeymanager.repo.GroupRepository;
import org.bruneel.pgpkeymanager.repo.PgpKeyRepository;

@ExtendWith(MockitoExtension.class)
class GroupServiceTest {

    @Mock
    private GroupRepository groupRepository;

    @Mock
    private GroupMemberRepository groupMemberRepository;

    @Mock
    private GroupInviteRepository groupInviteRepository;

    @Mock
    private PgpKeyRepository pgpKeyRepository;

    @Mock
    private GroupAuthorizationService groupAuthorizationService;

    @Mock
    private GroupOperationLogger groupOperationLogger;

    @InjectMocks
    private GroupService groupService;

    @Test
    void createGroupCreatesOwnerMembership() {
        AppUser user = user();
        Group group = group(UUID.randomUUID(), user.id());
        when(groupRepository.insert("Team", "Vault", user.id())).thenReturn(group);

        Group created = groupService.createGroup(user, "Team", "Vault");

        assertThat(created.id()).isEqualTo(group.id());
        verify(groupMemberRepository).insert(group.id(), user.id(), GroupMembershipRole.OWNER, user.id());
    }

    @Test
    void deleteGroupRejectsWhenGroupOwnsKeys() {
        AppUser user = user();
        UUID groupId = UUID.randomUUID();
        when(pgpKeyRepository.countByOwnerGroupId(groupId)).thenReturn(1);

        assertThatThrownBy(() -> groupService.deleteGroup(user, groupId))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("owns keys");
    }

    @Test
    void acceptInviteAddsMembership() {
        AppUser user = user();
        UUID groupId = UUID.randomUUID();
        UUID inviteId = UUID.randomUUID();
        Instant now = Instant.now();
        GroupInvite invite =
                new GroupInvite(
                        inviteId,
                        groupId,
                        "token",
                        user.email(),
                        null,
                        GroupMembershipRole.MEMBER,
                        UUID.randomUUID(),
                        now.plusSeconds(3600),
                        null,
                        now);
        GroupInvite accepted =
                new GroupInvite(
                        inviteId,
                        groupId,
                        "token",
                        user.email(),
                        null,
                        GroupMembershipRole.MEMBER,
                        invite.invitedByUserId(),
                        invite.expiresAt(),
                        now.plusSeconds(5),
                        invite.createdAt());
        when(groupInviteRepository.findByToken("token")).thenReturn(Optional.of(invite));
        when(groupRepository.findById(groupId)).thenReturn(Optional.of(group(groupId, UUID.randomUUID())));
        when(groupInviteRepository.markAccepted(eq(inviteId), any())).thenReturn(Optional.of(accepted));

        GroupInvite result = groupService.acceptInvite(user, "token");

        assertThat(result.acceptedAt()).isNotNull();
        verify(groupMemberRepository).upsert(groupId, user.id(), GroupMembershipRole.MEMBER, invite.invitedByUserId());
    }

    @Test
    void getSummaryIncludesMemberInviteAndKeyCounts() {
        AppUser user = user();
        UUID groupId = UUID.randomUUID();
        Group group = group(groupId, user.id());
        when(groupRepository.findById(groupId)).thenReturn(Optional.of(group));
        when(groupMemberRepository.countByGroupId(groupId)).thenReturn(3);
        when(groupInviteRepository.countPendingByGroupId(groupId)).thenReturn(2);
        when(pgpKeyRepository.countByOwnerGroupId(groupId)).thenReturn(4);

        GroupService.GroupSummary summary = groupService.getSummary(user, groupId);

        assertThat(summary.memberCount()).isEqualTo(3);
        assertThat(summary.pendingInviteCount()).isEqualTo(2);
        assertThat(summary.keyCount()).isEqualTo(4);
    }

    @Test
    void exportMembersAuditCsvIncludesHeaderAndRows() {
        AppUser user = user();
        UUID groupId = UUID.randomUUID();
        when(groupMemberRepository.findAuditRowsByGroupId(groupId))
                .thenReturn(java.util.List.of(
                        new GroupMemberRepository.GroupMemberAuditRow(
                                groupId,
                                user.id(),
                                GroupMembershipRole.OWNER,
                                null,
                                Instant.now(),
                                user.email(),
                                user.displayName(),
                                user.auth0Sub())));

        String csv = groupService.exportMembersAuditCsv(user, groupId);

        assertThat(csv).contains("groupId,userId,role,email,displayName,auth0Sub,joinedAt,invitedByUserId");
        assertThat(csv).contains("owner");
    }

    private static AppUser user() {
        return new AppUser(UUID.randomUUID(), "auth0|primary", "primary@example.test", "Primary", "user", Instant.now());
    }

    private static Group group(UUID groupId, UUID ownerUserId) {
        return new Group(groupId, "Team", "Vault", ownerUserId, Instant.now(), Instant.now());
    }
}
