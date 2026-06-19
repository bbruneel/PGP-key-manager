package org.bruneel.pgpkeymanager.storage;

import java.util.UUID;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import org.bruneel.pgpkeymanager.domain.StorageConnection;
import org.bruneel.pgpkeymanager.service.StorageConnectionOperationLogger;

@Component
@ConditionalOnProperty(prefix = "app.storage.aws", name = "enabled", havingValue = "true", matchIfMissing = true)
public class AwsS3KeyringStorageProvider implements KeyringStorageProvider {

    private final AwsAssumeRoleClient assumeRoleClient;
    private final AwsS3ProbeClient s3ProbeClient;
    private final AwsStorageProperties properties;
    private final StorageConnectionOperationLogger operationLogger;

    public AwsS3KeyringStorageProvider(
            AwsAssumeRoleClient assumeRoleClient,
            AwsS3ProbeClient s3ProbeClient,
            AwsStorageProperties properties,
            StorageConnectionOperationLogger operationLogger) {
        this.assumeRoleClient = assumeRoleClient;
        this.s3ProbeClient = s3ProbeClient;
        this.properties = properties;
        this.operationLogger = operationLogger;
    }

    @Override
    public StorageConnectionTestResult testConnection(StorageConnection connection) {
        long start = System.currentTimeMillis();
        operationLogger.testStarted(connection.userId(), connection.id());
        try {
            String sessionName = "pgp-key-manager-test-" + connection.id();
            AwsSessionCredentials credentials =
                    assumeRoleClient.assumeRole(connection.roleArn(), connection.externalId(), sessionName);
            String objectKey = probeObjectKey(connection);
            s3ProbeClient.putGetDeleteProbe(
                    connection.region(),
                    connection.bucket(),
                    objectKey,
                    credentials,
                    SdkAwsS3ProbeClient.probePayload());
            long durationMs = duration(start);
            operationLogger.testSucceeded(connection.userId(), connection.id(), durationMs);
            return StorageConnectionTestResult.success(durationMs);
        } catch (StorageConnectionProbeException ex) {
            long durationMs = duration(start);
            operationLogger.testFailed(connection.userId(), connection.id(), ex.errorCategory(), ex.getMessage(), durationMs);
            return StorageConnectionTestResult.failure(ex.errorCategory(), ex.getMessage(), durationMs);
        } catch (RuntimeException ex) {
            StorageConnectionProbeException mapped = AwsStorageExceptionMapper.map(ex);
            long durationMs = duration(start);
            operationLogger.testFailed(
                    connection.userId(), connection.id(), mapped.errorCategory(), mapped.getMessage(), durationMs);
            return StorageConnectionTestResult.failure(mapped.errorCategory(), mapped.getMessage(), durationMs);
        }
    }

    String probeObjectKey(StorageConnection connection) {
        return connection.prefix() + properties.probeObjectSuffix() + connection.id() + "/probe.json";
    }

    private static long duration(long start) {
        return System.currentTimeMillis() - start;
    }
}
