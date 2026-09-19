package org.bruneel.pgpkeymanager.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import org.bruneel.pgpkeymanager.crypto.PgpCryptoService;
import org.bruneel.pgpkeymanager.crypto.PgpKeyMetadataParser;
import org.bruneel.pgpkeymanager.domain.AppUser;
import org.bruneel.pgpkeymanager.domain.GroupMember;
import org.bruneel.pgpkeymanager.domain.GroupMembershipRole;
import org.bruneel.pgpkeymanager.domain.KeyOwnerType;
import org.bruneel.pgpkeymanager.domain.KeyRole;
import org.bruneel.pgpkeymanager.domain.PgpCapability;
import org.bruneel.pgpkeymanager.domain.PgpKey;
import org.bruneel.pgpkeymanager.domain.PgpKey.KeyType;
import org.bruneel.pgpkeymanager.repo.PgpKeyRepository;

@ExtendWith(MockitoExtension.class)
class PgpKeyServiceTransferOwnershipTest {

    private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID MEMBER_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID GROUP_ID = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    private static final UUID OTHER_GROUP_ID = UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
    private static final UUID KEY_ID = UUID.fromString("cccccccc-cccc-cccc-cccc-cccccccccccc");
    private static final UUID SUBKEY_ID = UUID.fromString("dddddddd-dddd-dddd-dddd-dddddddddddd");

    @Mock
    private PgpKeyRepository pgpKeyRepository;

    @Mock
    private PgpCryptoService pgpCryptoService;

    @Mock
    private PgpKeyMetadataParser metadataParser;

    @Mock
    private GroupAuthorizationService groupAuthorizationService;

    @Mock
    private KeyOperationLogger operationLogger;

    @Mock
    private KeyOperationMetrics operationMetrics;

    @Mock
    private StorageRefParser storageRefParser;

    @Mock
    private SshSetupPackBuilder sshSetupPackBuilder;

    private PgpKeyService pgpKeyService;
    private AppUser owner;

    @BeforeEach
    void setUp() {
        pgpKeyService =
                new PgpKeyService(
                        pgpKeyRepository,
                        pgpCryptoService,
                        metadataParser,
                        groupAuthorizationService,
                        operationLogger,
                        operationMetrics,
                        storageRefParser,
                        sshSetupPackBuilder);
        owner = new AppUser(USER_ID, "auth0|owner", "owner@example.test", "Owner", "user", Instant.now());
    }

    @Test
    void transfersPersonalPrimaryToTeamAndCascadesSubkeys() {
        PgpKey primary = personalPrimary();
        PgpKey subkey = personalSubkey();
        PgpKey updated = groupPrimary(GROUP_ID);

        when(pgpKeyRepository.findById(KEY_ID)).thenReturn(Optional.of(primary), Optional.of(updated));
        when(pgpKeyRepository.findSubkeysByParentId(KEY_ID)).thenReturn(List.of(subkey));
        when(pgpKeyRepository.updateOwnership(KEY_ID, KeyOwnerType.GROUP, GROUP_ID, null))
                .thenReturn(Optional.of(updated));
        when(pgpKeyRepository.updateOwnership(SUBKEY_ID, KeyOwnerType.GROUP, GROUP_ID, null))
                .thenReturn(Optional.of(subkey));

        PgpKey result = pgpKeyService.transferOwnership(owner, KEY_ID, GROUP_ID, null);

        assertThat(result.ownerType()).isEqualTo(KeyOwnerType.GROUP);
        assertThat(result.ownerGroupId()).isEqualTo(GROUP_ID);
        verify(groupAuthorizationService).requireKeyAccess(owner, primary);
        verify(groupAuthorizationService).requireGroupMember(owner, GROUP_ID);
        verify(operationLogger).started("transfer_ownership", USER_ID, KEY_ID);
        verify(operationLogger).succeeded(eq("transfer_ownership"), eq(USER_ID), eq(KEY_ID), eq(4), anyLong());
    }

    @Test
    void transfersTeamPrimaryToPersonalRecipient() {
        PgpKey primary = groupPrimary(GROUP_ID);
        PgpKey updated = personalPrimaryFor(MEMBER_ID);
        when(pgpKeyRepository.findById(KEY_ID)).thenReturn(Optional.of(primary), Optional.of(updated));
        when(pgpKeyRepository.findSubkeysByParentId(KEY_ID)).thenReturn(List.of());
        when(groupAuthorizationService.requireGroupOwner(owner, GROUP_ID))
                .thenReturn(new GroupMember(GROUP_ID, USER_ID, GroupMembershipRole.OWNER, null, Instant.now()));
        when(groupAuthorizationService.isUserMember(GROUP_ID, MEMBER_ID)).thenReturn(true);
        when(pgpKeyRepository.updateOwnership(KEY_ID, KeyOwnerType.USER, null, MEMBER_ID))
                .thenReturn(Optional.of(updated));

        PgpKey result = pgpKeyService.transferOwnership(owner, KEY_ID, null, MEMBER_ID);

        assertThat(result.ownerType()).isEqualTo(KeyOwnerType.USER);
        assertThat(result.userId()).isEqualTo(MEMBER_ID);
        verify(groupAuthorizationService).requireGroupOwner(owner, GROUP_ID);
    }

    @Test
    void transfersTeamToTeam() {
        PgpKey primary = groupPrimary(GROUP_ID);
        PgpKey updated = groupPrimary(OTHER_GROUP_ID);
        when(pgpKeyRepository.findById(KEY_ID)).thenReturn(Optional.of(primary), Optional.of(updated));
        when(pgpKeyRepository.findSubkeysByParentId(KEY_ID)).thenReturn(List.of());
        when(groupAuthorizationService.requireGroupOwner(owner, GROUP_ID))
                .thenReturn(new GroupMember(GROUP_ID, USER_ID, GroupMembershipRole.OWNER, null, Instant.now()));
        when(pgpKeyRepository.updateOwnership(KEY_ID, KeyOwnerType.GROUP, OTHER_GROUP_ID, null))
                .thenReturn(Optional.of(updated));

        PgpKey result = pgpKeyService.transferOwnership(owner, KEY_ID, OTHER_GROUP_ID, MEMBER_ID);

        assertThat(result.ownerGroupId()).isEqualTo(OTHER_GROUP_ID);
        verify(groupAuthorizationService).requireGroupMember(owner, OTHER_GROUP_ID);
        verify(groupAuthorizationService, never()).isUserMember(any(), any());
    }

    @Test
    void rejectsSubkeyTransfer() {
        PgpKey subkey = personalSubkey();
        when(pgpKeyRepository.findById(SUBKEY_ID)).thenReturn(Optional.of(subkey));

        assertThatThrownBy(() -> pgpKeyService.transferOwnership(owner, SUBKEY_ID, GROUP_ID, null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Only primary keys");
        verify(pgpKeyRepository, never()).updateOwnership(any(), any(), any(), any());
    }

    @Test
    void rejectsRevokedKeyTransfer() {
        PgpKey revoked =
                new PgpKey(
                        KEY_ID,
                        USER_ID,
                        "revoked",
                        "AAAA",
                        "BBBB",
                        KeyType.PUBLIC,
                        KeyRole.PRIMARY,
                        null,
                        List.of(PgpCapability.CERTIFY),
                        "ed25519",
                        null,
                        null,
                        Instant.parse("2026-01-02T00:00:00Z"),
                        null,
                        "-----BEGIN PGP PUBLIC KEY BLOCK-----",
                        null,
                        null,
                        null,
                        4,
                        KeyOwnerType.USER,
                        null,
                        USER_ID,
                        Instant.parse("2026-01-01T00:00:00Z"),
                        Instant.parse("2026-01-01T00:00:00Z"));
        when(pgpKeyRepository.findById(KEY_ID)).thenReturn(Optional.of(revoked));

        assertThatThrownBy(() -> pgpKeyService.transferOwnership(owner, KEY_ID, GROUP_ID, null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Revoked");
    }

    @Test
    void rejectsPersonalToPersonal() {
        PgpKey primary = personalPrimary();
        when(pgpKeyRepository.findById(KEY_ID)).thenReturn(Optional.of(primary));

        assertThatThrownBy(() -> pgpKeyService.transferOwnership(owner, KEY_ID, null, MEMBER_ID))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("only allowed from a team vault");
    }

    @Test
    void requiresTargetUserIdForPersonalDestination() {
        PgpKey primary = groupPrimary(GROUP_ID);
        when(pgpKeyRepository.findById(KEY_ID)).thenReturn(Optional.of(primary));
        when(groupAuthorizationService.requireGroupOwner(owner, GROUP_ID))
                .thenReturn(new GroupMember(GROUP_ID, USER_ID, GroupMembershipRole.OWNER, null, Instant.now()));

        assertThatThrownBy(() -> pgpKeyService.transferOwnership(owner, KEY_ID, null, null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("targetUserId is required");
    }

    @Test
    void rejectsRecipientOutsideSourceGroup() {
        PgpKey primary = groupPrimary(GROUP_ID);
        when(pgpKeyRepository.findById(KEY_ID)).thenReturn(Optional.of(primary));
        when(groupAuthorizationService.requireGroupOwner(owner, GROUP_ID))
                .thenReturn(new GroupMember(GROUP_ID, USER_ID, GroupMembershipRole.OWNER, null, Instant.now()));
        when(groupAuthorizationService.isUserMember(GROUP_ID, MEMBER_ID)).thenReturn(false);

        assertThatThrownBy(() -> pgpKeyService.transferOwnership(owner, KEY_ID, null, MEMBER_ID))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("member of the source team");
    }

    @Test
    void rejectsGroupMemberWithoutOwnerRole() {
        PgpKey primary = groupPrimary(GROUP_ID);
        AppUser member = new AppUser(MEMBER_ID, "auth0|member", "member@example.test", "Member", "user", Instant.now());
        when(pgpKeyRepository.findById(KEY_ID)).thenReturn(Optional.of(primary));
        when(groupAuthorizationService.requireGroupOwner(member, GROUP_ID))
                .thenThrow(new ForbiddenGroupActionException("Group owner role required"));

        assertThatThrownBy(() -> pgpKeyService.transferOwnership(member, KEY_ID, OTHER_GROUP_ID, null))
                .isInstanceOf(ForbiddenGroupActionException.class);
        verify(pgpKeyRepository, never()).updateOwnership(any(), any(), any(), any());
    }

    @Test
    void returnsNoOpWhenAlreadyAtTarget() {
        PgpKey primary = groupPrimary(GROUP_ID);
        when(pgpKeyRepository.findById(KEY_ID)).thenReturn(Optional.of(primary));
        when(groupAuthorizationService.requireGroupOwner(owner, GROUP_ID))
                .thenReturn(new GroupMember(GROUP_ID, USER_ID, GroupMembershipRole.OWNER, null, Instant.now()));

        PgpKey result = pgpKeyService.transferOwnership(owner, KEY_ID, GROUP_ID, null);

        assertThat(result).isSameAs(primary);
        verify(pgpKeyRepository, never()).updateOwnership(any(), any(), any(), any());
        verify(pgpKeyRepository, never()).findSubkeysByParentId(any());
    }

    @Test
    void mapsFingerprintConflictToConflictException() {
        PgpKey primary = personalPrimary();
        when(pgpKeyRepository.findById(KEY_ID)).thenReturn(Optional.of(primary));
        when(pgpKeyRepository.findSubkeysByParentId(KEY_ID)).thenReturn(List.of());
        when(pgpKeyRepository.updateOwnership(KEY_ID, KeyOwnerType.GROUP, GROUP_ID, null))
                .thenThrow(new DataIntegrityViolationException("unique"));

        assertThatThrownBy(() -> pgpKeyService.transferOwnership(owner, KEY_ID, GROUP_ID, null))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("fingerprint");
    }

    private static PgpKey personalPrimary() {
        return personalPrimaryFor(USER_ID);
    }

    private static PgpKey personalPrimaryFor(UUID userId) {
        return new PgpKey(
                KEY_ID,
                userId,
                "personal",
                "A1B2C3D4E5F6789012345678ABCDEF0123456789",
                "ABCDEF01",
                KeyType.PUBLIC,
                KeyRole.PRIMARY,
                null,
                List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                "ed25519",
                null,
                null,
                null,
                null,
                "-----BEGIN PGP PUBLIC KEY BLOCK-----",
                null,
                null,
                null,
                4,
                KeyOwnerType.USER,
                null,
                userId,
                Instant.parse("2026-01-01T00:00:00Z"),
                Instant.parse("2026-01-01T00:00:00Z"));
    }

    private static PgpKey personalSubkey() {
        return new PgpKey(
                SUBKEY_ID,
                USER_ID,
                "sub",
                "B2C3D4E5F6789012345678ABCDEF0123456789A1",
                "ABCDEF02",
                KeyType.PUBLIC,
                KeyRole.SUBKEY,
                KEY_ID,
                List.of(PgpCapability.ENCRYPT),
                "cv25519",
                null,
                null,
                null,
                null,
                "-----BEGIN PGP PUBLIC KEY BLOCK-----",
                null,
                null,
                null,
                4,
                KeyOwnerType.USER,
                null,
                USER_ID,
                Instant.parse("2026-01-01T00:00:00Z"),
                Instant.parse("2026-01-01T00:00:00Z"));
    }

    private static PgpKey groupPrimary(UUID groupId) {
        return new PgpKey(
                KEY_ID,
                null,
                "team",
                "A1B2C3D4E5F6789012345678ABCDEF0123456789",
                "ABCDEF01",
                KeyType.PUBLIC,
                KeyRole.PRIMARY,
                null,
                List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                "ed25519",
                null,
                null,
                null,
                null,
                "-----BEGIN PGP PUBLIC KEY BLOCK-----",
                null,
                null,
                null,
                4,
                KeyOwnerType.GROUP,
                groupId,
                USER_ID,
                Instant.parse("2026-01-01T00:00:00Z"),
                Instant.parse("2026-01-01T00:00:00Z"));
    }
}
