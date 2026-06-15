package org.bruneel.pgpkeymanager.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.bruneel.pgpkeymanager.domain.AppUser;
import org.bruneel.pgpkeymanager.domain.Group;
import org.bruneel.pgpkeymanager.domain.GroupInvite;
import org.bruneel.pgpkeymanager.domain.GroupMember;
import org.bruneel.pgpkeymanager.domain.GroupMembershipRole;
import org.bruneel.pgpkeymanager.repo.GroupInviteRepository;
import org.bruneel.pgpkeymanager.repo.GroupMemberRepository;
import org.bruneel.pgpkeymanager.repo.GroupRepository;
import org.bruneel.pgpkeymanager.repo.PgpKeyRepository;

@Service
@Transactional
public class GroupService {

    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final GroupInviteRepository groupInviteRepository;
    private final PgpKeyRepository pgpKeyRepository;
    private final GroupAuthorizationService groupAuthorizationService;
    private final GroupOperationLogger operationLogger;

    public GroupService(
            GroupRepository groupRepository,
            GroupMemberRepository groupMemberRepository,
            GroupInviteRepository groupInviteRepository,
            PgpKeyRepository pgpKeyRepository,
            GroupAuthorizationService groupAuthorizationService,
            GroupOperationLogger operationLogger) {
        this.groupRepository = groupRepository;
        this.groupMemberRepository = groupMemberRepository;
        this.groupInviteRepository = groupInviteRepository;
        this.pgpKeyRepository = pgpKeyRepository;
        this.groupAuthorizationService = groupAuthorizationService;
        this.operationLogger = operationLogger;
    }

    public List<Group> listGroups(AppUser user) {
        return groupRepository.findAllByMemberUserId(user.id());
    }

    public Group createGroup(AppUser user, String name, String description) {
        long start = System.currentTimeMillis();
        operationLogger.started("create_group", user.id(), null);
        try {
            String normalizedName = requireName(name);
            Group group = groupRepository.insert(normalizedName, normalizeDescription(description), user.id());
            groupMemberRepository.insert(group.id(), user.id(), GroupMembershipRole.OWNER, user.id());
            operationLogger.succeeded("create_group", user.id(), group.id(), duration(start));
            return group;
        } catch (RuntimeException ex) {
            operationLogger.failed("create_group", user.id(), null, ex);
            throw ex;
        }
    }

    public Group getGroup(AppUser user, UUID groupId) {
        groupAuthorizationService.requireGroupMember(user, groupId);
        return groupRepository.findById(groupId).orElseThrow(() -> new GroupNotFoundException(groupId));
    }

    public Group updateGroup(AppUser user, UUID groupId, String name, String description) {
        long start = System.currentTimeMillis();
        operationLogger.started("update_group", user.id(), groupId);
        try {
            groupAuthorizationService.requireGroupOwner(user, groupId);
            Group updated =
                    groupRepository
                            .update(groupId, name == null ? null : requireName(name), normalizeDescription(description))
                            .orElseThrow(() -> new GroupNotFoundException(groupId));
            operationLogger.succeeded("update_group", user.id(), groupId, duration(start));
            return updated;
        } catch (RuntimeException ex) {
            operationLogger.failed("update_group", user.id(), groupId, ex);
            throw ex;
        }
    }

    public void deleteGroup(AppUser user, UUID groupId) {
        long start = System.currentTimeMillis();
        operationLogger.started("delete_group", user.id(), groupId);
        try {
            groupAuthorizationService.requireGroupOwner(user, groupId);
            int keyCount = pgpKeyRepository.countByOwnerGroupId(groupId);
            if (keyCount > 0) {
                throw new ConflictException("Cannot delete group while it owns keys");
            }
            if (!groupRepository.deleteById(groupId)) {
                throw new GroupNotFoundException(groupId);
            }
            operationLogger.succeeded("delete_group", user.id(), groupId, duration(start));
        } catch (RuntimeException ex) {
            operationLogger.failed("delete_group", user.id(), groupId, ex);
            throw ex;
        }
    }

    public List<GroupMember> listMembers(AppUser user, UUID groupId) {
        groupAuthorizationService.requireGroupMember(user, groupId);
        return groupMemberRepository.findAllByGroupId(groupId);
    }

    public GroupInvite invite(
            AppUser user,
            UUID groupId,
            String email,
            UUID inviteeUserId,
            GroupMembershipRole role,
            Instant expiresAt) {
        long start = System.currentTimeMillis();
        operationLogger.started("invite_group_member", user.id(), groupId);
        try {
            groupAuthorizationService.requireGroupOwner(user, groupId);
            String normalizedEmail = normalizeEmail(email);
            if (normalizedEmail == null && inviteeUserId == null) {
                throw new BadRequestException("Either email or inviteeUserId is required");
            }
            GroupMembershipRole inviteRole = role == null ? GroupMembershipRole.MEMBER : role;
            Instant expiry = expiresAt == null ? Instant.now().plus(7, ChronoUnit.DAYS) : expiresAt;
            if (expiry.isBefore(Instant.now())) {
                throw new BadRequestException("Invite expiry must be in the future");
            }
            if (inviteeUserId != null && groupMemberRepository.existsByGroupIdAndUserId(groupId, inviteeUserId)) {
                throw new ConflictException("User is already a group member");
            }
            GroupInvite invite =
                    groupInviteRepository.insert(
                            groupId,
                            UUID.randomUUID().toString().replace("-", ""),
                            normalizedEmail,
                            inviteeUserId,
                            inviteRole,
                            user.id(),
                            expiry);
            operationLogger.succeeded("invite_group_member", user.id(), groupId, duration(start));
            return invite;
        } catch (RuntimeException ex) {
            operationLogger.failed("invite_group_member", user.id(), groupId, ex);
            throw ex;
        }
    }

    public List<GroupInvite> listInvites(AppUser user, UUID groupId) {
        groupAuthorizationService.requireGroupOwner(user, groupId);
        return groupInviteRepository.findPendingByGroupId(groupId);
    }

    public GroupInvite acceptInvite(AppUser user, String token) {
        long start = System.currentTimeMillis();
        operationLogger.started("accept_group_invite", user.id(), null);
        try {
            GroupInvite invite =
                    groupInviteRepository.findByToken(token).orElseThrow(() -> new BadRequestException("Invalid invite token"));
            if (invite.isAccepted()) {
                throw new ConflictException("Invite has already been accepted");
            }
            if (invite.expiresAt().isBefore(Instant.now())) {
                throw new ConflictException("Invite has expired");
            }
            if (invite.inviteeUserId() != null && !invite.inviteeUserId().equals(user.id())) {
                throw new ForbiddenGroupActionException("Invite is for a different user");
            }
            if (invite.email() != null && !invite.email().equalsIgnoreCase(normalizeEmail(user.email()))) {
                throw new ForbiddenGroupActionException("Invite email does not match current user");
            }
            groupRepository.findById(invite.groupId()).orElseThrow(() -> new GroupNotFoundException(invite.groupId()));
            groupMemberRepository.upsert(invite.groupId(), user.id(), invite.role(), invite.invitedByUserId());
            GroupInvite accepted =
                    groupInviteRepository
                            .markAccepted(invite.id(), Instant.now())
                            .orElseThrow(() -> new ConflictException("Invite has already been accepted"));
            operationLogger.succeeded("accept_group_invite", user.id(), invite.groupId(), duration(start));
            return accepted;
        } catch (RuntimeException ex) {
            operationLogger.failed("accept_group_invite", user.id(), null, ex);
            throw ex;
        }
    }

    public void removeMember(AppUser user, UUID groupId, UUID memberUserId) {
        groupAuthorizationService.requireGroupOwner(user, groupId);
        GroupMember member =
                groupMemberRepository
                        .findByGroupIdAndUserId(groupId, memberUserId)
                        .orElseThrow(() -> new BadRequestException("Member does not belong to this group"));
        if (member.role() == GroupMembershipRole.OWNER && groupMemberRepository.countOwnersByGroupId(groupId) <= 1) {
            throw new ConflictException("Group must keep at least one owner");
        }
        groupMemberRepository.deleteByGroupIdAndUserId(groupId, memberUserId);
    }

    public GroupSummary getSummary(AppUser user, UUID groupId) {
        Group group = getGroup(user, groupId);
        return new GroupSummary(
                group,
                groupMemberRepository.countByGroupId(groupId),
                groupInviteRepository.countPendingByGroupId(groupId),
                pgpKeyRepository.countByOwnerGroupId(groupId));
    }

    public String exportMembersAuditCsv(AppUser user, UUID groupId) {
        groupAuthorizationService.requireGroupOwner(user, groupId);
        List<GroupMemberRepository.GroupMemberAuditRow> rows = groupMemberRepository.findAuditRowsByGroupId(groupId);
        StringBuilder csv = new StringBuilder("groupId,userId,role,email,displayName,auth0Sub,joinedAt,invitedByUserId\n");
        for (GroupMemberRepository.GroupMemberAuditRow row : rows) {
            csv.append(csvCell(row.groupId()))
                    .append(',')
                    .append(csvCell(row.userId()))
                    .append(',')
                    .append(csvCell(row.role().toDb()))
                    .append(',')
                    .append(csvCell(row.email()))
                    .append(',')
                    .append(csvCell(row.displayName()))
                    .append(',')
                    .append(csvCell(row.auth0Sub()))
                    .append(',')
                    .append(csvCell(row.joinedAt()))
                    .append(',')
                    .append(csvCell(row.invitedByUserId()))
                    .append('\n');
        }
        return csv.toString();
    }

    public record GroupSummary(Group group, int memberCount, int pendingInviteCount, int keyCount) {}

    private static long duration(long startMs) {
        return System.currentTimeMillis() - startMs;
    }

    private static String requireName(String name) {
        if (name == null || name.trim().isEmpty()) {
            throw new BadRequestException("Group name is required");
        }
        return name.trim();
    }

    private static String normalizeDescription(String description) {
        if (description == null) {
            return null;
        }
        String trimmed = description.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }
        String trimmed = email.trim().toLowerCase();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static String csvCell(Object value) {
        if (value == null) {
            return "";
        }
        String raw = value.toString();
        String escaped = raw.replace("\"", "\"\"");
        return "\"" + escaped + "\"";
    }
}
