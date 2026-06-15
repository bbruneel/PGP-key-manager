package org.bruneel.pgpkeymanager.service;

import java.util.UUID;

import org.springframework.stereotype.Service;

import org.bruneel.pgpkeymanager.domain.AppUser;
import org.bruneel.pgpkeymanager.domain.GroupMember;
import org.bruneel.pgpkeymanager.domain.GroupMembershipRole;
import org.bruneel.pgpkeymanager.domain.KeyOwnerType;
import org.bruneel.pgpkeymanager.domain.PgpKey;
import org.bruneel.pgpkeymanager.repo.GroupMemberRepository;
import org.bruneel.pgpkeymanager.repo.GroupRepository;

@Service
public class GroupAuthorizationService {

    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;

    public GroupAuthorizationService(GroupRepository groupRepository, GroupMemberRepository groupMemberRepository) {
        this.groupRepository = groupRepository;
        this.groupMemberRepository = groupMemberRepository;
    }

    public GroupMember requireGroupMember(AppUser user, UUID groupId) {
        ensureGroupExists(groupId);
        return groupMemberRepository
                .findByGroupIdAndUserId(groupId, user.id())
                .orElseThrow(() -> new ForbiddenGroupActionException("Group membership required"));
    }

    public GroupMember requireGroupOwner(AppUser user, UUID groupId) {
        GroupMember member = requireGroupMember(user, groupId);
        if (member.role() != GroupMembershipRole.OWNER) {
            throw new ForbiddenGroupActionException("Group owner role required");
        }
        return member;
    }

    public boolean isMember(AppUser user, UUID groupId) {
        if (groupRepository.findById(groupId).isEmpty()) {
            return false;
        }
        return groupMemberRepository.existsByGroupIdAndUserId(groupId, user.id());
    }

    public void requireKeyAccess(AppUser user, PgpKey key) {
        if (key.ownerType() == KeyOwnerType.USER) {
            if (key.userId() == null || !key.userId().equals(user.id())) {
                throw new ForbiddenGroupActionException("No access to this key");
            }
            return;
        }
        UUID groupId = key.ownerGroupId();
        if (groupId == null) {
            throw new ForbiddenGroupActionException("Invalid key ownership metadata");
        }
        requireGroupMember(user, groupId);
    }

    private void ensureGroupExists(UUID groupId) {
        if (groupRepository.findById(groupId).isEmpty()) {
            throw new GroupNotFoundException(groupId);
        }
    }
}
