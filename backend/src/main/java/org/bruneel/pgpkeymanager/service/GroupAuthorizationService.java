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
                .orElseThrow(() -> new GroupNotFoundException(groupId));
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

    public boolean isUserMember(UUID groupId, UUID userId) {
        if (groupId == null || userId == null) {
            return false;
        }
        if (groupRepository.findById(groupId).isEmpty()) {
            return false;
        }
        return groupMemberRepository.existsByGroupIdAndUserId(groupId, userId);
    }

    public void requireKeyAccess(AppUser user, PgpKey key) {
        if (key.ownerType() == KeyOwnerType.USER) {
            if (key.userId() == null || !key.userId().equals(user.id())) {
                throw new KeyNotFoundException(key.id());
            }
            return;
        }
        UUID groupId = key.ownerGroupId();
        if (groupId == null) {
            throw new KeyNotFoundException(key.id());
        }
        if (groupMemberRepository.findByGroupIdAndUserId(groupId, user.id()).isEmpty()) {
            throw new KeyNotFoundException(key.id());
        }
    }

    private void ensureGroupExists(UUID groupId) {
        if (groupRepository.findById(groupId).isEmpty()) {
            throw new GroupNotFoundException(groupId);
        }
    }
}
