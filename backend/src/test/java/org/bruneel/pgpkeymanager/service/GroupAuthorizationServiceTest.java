package org.bruneel.pgpkeymanager.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.bruneel.pgpkeymanager.domain.AppUser;
import org.bruneel.pgpkeymanager.domain.Group;
import org.bruneel.pgpkeymanager.domain.GroupMember;
import org.bruneel.pgpkeymanager.domain.GroupMembershipRole;
import org.bruneel.pgpkeymanager.domain.KeyOwnerType;
import org.bruneel.pgpkeymanager.domain.KeyRole;
import org.bruneel.pgpkeymanager.domain.PgpCapability;
import org.bruneel.pgpkeymanager.domain.PgpKey;
import org.bruneel.pgpkeymanager.domain.PgpKey.KeyType;
import org.bruneel.pgpkeymanager.repo.GroupMemberRepository;
import org.bruneel.pgpkeymanager.repo.GroupRepository;

@ExtendWith(MockitoExtension.class)
class GroupAuthorizationServiceTest {

    @Mock
    private GroupRepository groupRepository;

    @Mock
    private GroupMemberRepository groupMemberRepository;

    @InjectMocks
    private GroupAuthorizationService service;

    @Test
    void requireGroupMemberThrowsWhenGroupMissing() {
        AppUser user = appUser();
        UUID groupId = UUID.randomUUID();
        when(groupRepository.findById(groupId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.requireGroupMember(user, groupId)).isInstanceOf(GroupNotFoundException.class);
    }

    @Test
    void requireGroupOwnerThrowsWhenRoleIsNotOwner() {
        AppUser user = appUser();
        UUID groupId = UUID.randomUUID();
        when(groupRepository.findById(groupId)).thenReturn(Optional.of(group(groupId, user.id())));
        when(groupMemberRepository.findByGroupIdAndUserId(groupId, user.id()))
                .thenReturn(Optional.of(new GroupMember(groupId, user.id(), GroupMembershipRole.MEMBER, null, Instant.now())));

        assertThatThrownBy(() -> service.requireGroupOwner(user, groupId))
                .isInstanceOf(ForbiddenGroupActionException.class)
                .hasMessageContaining("owner");
    }

    @Test
    void isMemberReturnsFalseWhenGroupMissing() {
        AppUser user = appUser();
        UUID groupId = UUID.randomUUID();
        when(groupRepository.findById(groupId)).thenReturn(Optional.empty());

        assertThat(service.isMember(user, groupId)).isFalse();
    }

    @Test
    void requireKeyAccessAllowsGroupMember() {
        AppUser user = appUser();
        UUID groupId = UUID.randomUUID();
        PgpKey key = groupOwnedKey(groupId);
        when(groupRepository.findById(groupId)).thenReturn(Optional.of(group(groupId, user.id())));
        when(groupMemberRepository.findByGroupIdAndUserId(groupId, user.id()))
                .thenReturn(Optional.of(new GroupMember(groupId, user.id(), GroupMembershipRole.MEMBER, null, Instant.now())));

        assertThatCode(() -> service.requireKeyAccess(user, key)).doesNotThrowAnyException();
    }

    @Test
    void requireKeyAccessRejectsForeignPersonalKey() {
        AppUser user = appUser();
        PgpKey foreignKey =
                new PgpKey(
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        "key",
                        "A1B2C3D4E5F6789012345678ABCDEF0123456789",
                        "ABCDEF01",
                        KeyType.PUBLIC,
                        KeyRole.PRIMARY,
                        null,
                        List.of(PgpCapability.SIGN),
                        "ed25519",
                        null,
                        null,
                        null,
                        null,
                        "public",
                        null,
                        null,
                        null,
                        4,
                        KeyOwnerType.USER,
                        null,
                        UUID.randomUUID(),
                        Instant.now(),
                        Instant.now());

        assertThatThrownBy(() -> service.requireKeyAccess(user, foreignKey))
                .isInstanceOf(ForbiddenGroupActionException.class);
    }

    private static AppUser appUser() {
        return new AppUser(UUID.randomUUID(), "auth0|u", "u@example.test", "User", "user", Instant.now());
    }

    private static Group group(UUID groupId, UUID ownerUserId) {
        return new Group(groupId, "Team", null, ownerUserId, Instant.now(), Instant.now());
    }

    private static PgpKey groupOwnedKey(UUID groupId) {
        return new PgpKey(
                UUID.randomUUID(),
                null,
                "team-key",
                "A1B2C3D4E5F6789012345678ABCDEF0123456789",
                "ABCDEF01",
                KeyType.PUBLIC,
                KeyRole.PRIMARY,
                null,
                List.of(PgpCapability.SIGN),
                "ed25519",
                null,
                null,
                null,
                null,
                "public",
                null,
                null,
                null,
                4,
                KeyOwnerType.GROUP,
                groupId,
                UUID.randomUUID(),
                Instant.now(),
                Instant.now());
    }
}
