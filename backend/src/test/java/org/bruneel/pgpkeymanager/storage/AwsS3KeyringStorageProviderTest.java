package org.bruneel.pgpkeymanager.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.bruneel.pgpkeymanager.domain.StorageConnection;
import org.bruneel.pgpkeymanager.domain.StorageConnectionStatus;
import org.bruneel.pgpkeymanager.domain.StorageProvider;
import org.bruneel.pgpkeymanager.service.StorageConnectionOperationLogger;

@ExtendWith(MockitoExtension.class)
class AwsS3KeyringStorageProviderTest {

    @Mock
    private AwsAssumeRoleClient assumeRoleClient;

    @Mock
    private AwsS3ProbeClient s3ProbeClient;

    @Mock
    private StorageConnectionOperationLogger operationLogger;

    private final AwsStorageProperties properties = new AwsStorageProperties(true, ".pgp-key-manager-probe/");

    private AwsS3KeyringStorageProvider provider;

    @BeforeEach
    void setUp() {
        provider = new AwsS3KeyringStorageProvider(assumeRoleClient, s3ProbeClient, properties, operationLogger);
    }

    @Test
    void probeObjectKeyUsesPrefixAndConnectionId() {
        StorageConnection connection = connection();

        assertThat(provider.probeObjectKey(connection))
                .isEqualTo("pgp-key-manager/.pgp-key-manager-probe/" + connection.id() + "/probe.json");
    }

    @Test
    void testConnectionReturnsSuccessWhenProbeSucceeds() {
        StorageConnection connection = connection();
        AwsSessionCredentials credentials = new AwsSessionCredentials("key", "secret", "token");
        when(assumeRoleClient.assumeRole(
                        eq(connection.roleArn()), eq(connection.externalId()), any()))
                .thenReturn(credentials);

        StorageConnectionTestResult result = provider.testConnection(connection);

        assertThat(result.succeeded()).isTrue();
        verify(s3ProbeClient)
                .putGetDeleteProbe(
                        eq("eu-west-1"),
                        eq("acme-pgp-vault"),
                        eq("pgp-key-manager/.pgp-key-manager-probe/" + connection.id() + "/probe.json"),
                        eq(credentials),
                        any());
        verify(operationLogger).testSucceeded(eq(connection.userId()), eq(connection.id()), any(Long.class));
    }

    @Test
    void testConnectionMapsAssumeRoleFailure() {
        StorageConnection connection = connection();
        doThrow(new StorageConnectionProbeException(
                        StorageConnectionTestErrorCategories.ASSUME_ROLE_DENIED, "not authorized"))
                .when(assumeRoleClient)
                .assumeRole(eq(connection.roleArn()), eq(connection.externalId()), any());

        StorageConnectionTestResult result = provider.testConnection(connection);

        assertThat(result.succeeded()).isFalse();
        assertThat(result.errorCategory()).isEqualTo(StorageConnectionTestErrorCategories.ASSUME_ROLE_DENIED);
        verify(operationLogger)
                .testFailed(
                        eq(connection.userId()),
                        eq(connection.id()),
                        eq(StorageConnectionTestErrorCategories.ASSUME_ROLE_DENIED),
                        eq("not authorized"),
                        any(Long.class));
    }

    private static StorageConnection connection() {
        UUID id = UUID.fromString("00000000-0000-0000-0000-000000000020");
        return new StorageConnection(
                id,
                UUID.fromString("00000000-0000-0000-0000-000000000001"),
                StorageProvider.AWS_S3,
                "Personal vault",
                "eu-west-1",
                "acme-pgp-vault",
                "pgp-key-manager/",
                "arn:aws:iam::123456789012:role/PgpKeyManager",
                "ext-1",
                StorageConnectionStatus.REGISTERED,
                null,
                null,
                null,
                Instant.EPOCH,
                Instant.EPOCH);
    }
}
