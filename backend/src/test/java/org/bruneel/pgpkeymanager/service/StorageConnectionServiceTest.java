package org.bruneel.pgpkeymanager.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
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
import org.bruneel.pgpkeymanager.domain.StorageConnection;
import org.bruneel.pgpkeymanager.domain.StorageConnectionStatus;
import org.bruneel.pgpkeymanager.domain.StorageProvider;
import org.bruneel.pgpkeymanager.repo.StorageConnectionRepository;

@ExtendWith(MockitoExtension.class)
class StorageConnectionServiceTest {

    @Mock
    private StorageConnectionRepository storageConnectionRepository;

    @Mock
    private StorageConnectionOperationLogger operationLogger;

    @InjectMocks
    private StorageConnectionService storageConnectionService;

    @Test
    void createConnectionGeneratesExternalIdAndDefaultPrefix() {
        AppUser user = user();
        when(storageConnectionRepository.existsByUserIdAndDisplayNameIgnoreCase(user.id(), "Personal vault", null))
                .thenReturn(false);
        when(storageConnectionRepository.insert(
                        eq(user.id()),
                        eq(StorageProvider.AWS_S3),
                        eq("Personal vault"),
                        eq("eu-west-1"),
                        eq("acme-pgp-vault"),
                        eq("pgp-key-manager/"),
                        eq("arn:aws:iam::123456789012:role/PgpKeyManager"),
                        any()))
                .thenAnswer(invocation -> connection(user.id(), invocation.getArgument(7)));

        StorageConnection created =
                storageConnectionService.createConnection(
                        user,
                        "Personal vault",
                        "eu-west-1",
                        "acme-pgp-vault",
                        null,
                        "arn:aws:iam::123456789012:role/PgpKeyManager");

        assertThat(created.externalId()).isNotBlank();
        assertThat(created.prefix()).isEqualTo("pgp-key-manager/");
    }

    @Test
    void normalizePrefixAddsTrailingSlash() {
        assertThat(StorageConnectionService.normalizePrefix("custom")).isEqualTo("custom/");
    }

    @Test
    void getConnectionRejectsOtherUsersConnection() {
        AppUser user = user();
        UUID connectionId = UUID.randomUUID();
        when(storageConnectionRepository.findByIdAndUserId(connectionId, user.id())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> storageConnectionService.getConnection(user, connectionId))
                .isInstanceOf(StorageConnectionNotFoundException.class);
    }

    @Test
    void deleteConnectionRejectsWhenKeysReferenceConnection() {
        AppUser user = user();
        UUID connectionId = UUID.randomUUID();
        when(storageConnectionRepository.findByIdAndUserId(connectionId, user.id()))
                .thenReturn(Optional.of(connection(user.id(), "ext-1")));
        when(storageConnectionRepository.existsKeysReferencingConnection(connectionId)).thenReturn(true);

        assertThatThrownBy(() -> storageConnectionService.deleteConnection(user, connectionId))
                .isInstanceOf(StorageConnectionInUseException.class);
    }

    @Test
    void listConnectionsReturnsUserConnections() {
        AppUser user = user();
        StorageConnection connection = connection(user.id(), "ext-1");
        when(storageConnectionRepository.findAllByUserId(user.id())).thenReturn(List.of(connection));

        assertThat(storageConnectionService.listConnections(user)).containsExactly(connection);
        verify(operationLogger).started("list_storage_connections", user.id(), null);
    }

    @Test
    void createConnectionRejectsInvalidRoleArn() {
        AppUser user = user();

        assertThatThrownBy(() -> storageConnectionService.createConnection(
                        user, "Vault", "eu-west-1", "bucket", null, "not-an-arn"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("roleArn");
    }

    private static AppUser user() {
        return new AppUser(
                UUID.fromString("00000000-0000-0000-0000-000000000001"),
                "auth0|test",
                "test@example.test",
                "Test User",
                "user",
                Instant.EPOCH);
    }

    private static StorageConnection connection(UUID userId, String externalId) {
        UUID id = UUID.fromString("00000000-0000-0000-0000-000000000020");
        return new StorageConnection(
                id,
                userId,
                StorageProvider.AWS_S3,
                "Personal vault",
                "eu-west-1",
                "acme-pgp-vault",
                "pgp-key-manager/",
                "arn:aws:iam::123456789012:role/PgpKeyManager",
                externalId,
                StorageConnectionStatus.REGISTERED,
                Instant.EPOCH,
                Instant.EPOCH);
    }
}
