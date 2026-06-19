package org.bruneel.pgpkeymanager.service;

import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;
import java.time.Instant;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import org.bruneel.pgpkeymanager.domain.AppUser;
import org.bruneel.pgpkeymanager.domain.StorageConnection;
import org.bruneel.pgpkeymanager.domain.StorageConnectionTestStatus;
import org.bruneel.pgpkeymanager.domain.StorageProvider;
import org.bruneel.pgpkeymanager.repo.StorageConnectionRepository;
import org.bruneel.pgpkeymanager.storage.KeyringStorageProvider;
import org.bruneel.pgpkeymanager.storage.StorageConnectionTestResult;

@Service
@Transactional
public class StorageConnectionService {

    public static final String DEFAULT_PREFIX = "pgp-key-manager/";

    private static final Pattern ROLE_ARN_PATTERN =
            Pattern.compile("^arn:aws:iam::[0-9]{12}:role/.+$");

    private final StorageConnectionRepository storageConnectionRepository;
    private final StorageConnectionOperationLogger operationLogger;
    private final KeyringStorageProvider keyringStorageProvider;
    private final TransactionTemplate transactionTemplate;

    public StorageConnectionService(
            StorageConnectionRepository storageConnectionRepository,
            StorageConnectionOperationLogger operationLogger,
            KeyringStorageProvider keyringStorageProvider,
            org.springframework.transaction.PlatformTransactionManager transactionManager) {
        this.storageConnectionRepository = storageConnectionRepository;
        this.operationLogger = operationLogger;
        this.keyringStorageProvider = keyringStorageProvider;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    public List<StorageConnection> listConnections(AppUser user) {
        long start = System.currentTimeMillis();
        operationLogger.started("list_storage_connections", user.id(), null);
        try {
            List<StorageConnection> connections = storageConnectionRepository.findAllByUserId(user.id());
            operationLogger.succeeded("list_storage_connections", user.id(), null, duration(start));
            return connections;
        } catch (RuntimeException ex) {
            operationLogger.failed("list_storage_connections", user.id(), null, ex);
            throw ex;
        }
    }

    public StorageConnection createConnection(
            AppUser user,
            String displayName,
            String region,
            String bucket,
            String prefix,
            String roleArn) {
        long start = System.currentTimeMillis();
        operationLogger.started("create_storage_connection", user.id(), null);
        try {
            String normalizedDisplayName = requireDisplayName(displayName);
            String normalizedRegion = requireNonBlank(region, "region", 64);
            String normalizedBucket = requireNonBlank(bucket, "bucket", 255);
            String normalizedPrefix = normalizePrefix(prefix);
            String normalizedRoleArn = requireRoleArn(roleArn);
            if (storageConnectionRepository.existsByUserIdAndDisplayNameIgnoreCase(
                    user.id(), normalizedDisplayName, null)) {
                throw ConflictException.fieldConflict(
                        "displayName", "A storage connection with this display name already exists");
            }
            StorageConnection created =
                    storageConnectionRepository.insert(
                            user.id(),
                            StorageProvider.AWS_S3,
                            normalizedDisplayName,
                            normalizedRegion,
                            normalizedBucket,
                            normalizedPrefix,
                            normalizedRoleArn,
                            UUID.randomUUID().toString());
            operationLogger.succeeded("create_storage_connection", user.id(), created.id(), duration(start));
            return created;
        } catch (RuntimeException ex) {
            operationLogger.failed("create_storage_connection", user.id(), null, ex);
            throw ex;
        }
    }

    public StorageConnection getConnection(AppUser user, UUID connectionId) {
        return requireOwnedConnection(user, connectionId);
    }

    public StorageConnection updateConnection(
            AppUser user,
            UUID connectionId,
            String displayName,
            String region,
            String bucket,
            String prefix,
            String roleArn) {
        long start = System.currentTimeMillis();
        operationLogger.started("update_storage_connection", user.id(), connectionId);
        try {
            requireOwnedConnection(user, connectionId);
            if (displayName != null
                    && storageConnectionRepository.existsByUserIdAndDisplayNameIgnoreCase(
                            user.id(), requireDisplayName(displayName), connectionId)) {
                throw ConflictException.fieldConflict(
                        "displayName", "A storage connection with this display name already exists");
            }
            StorageConnection updated =
                    storageConnectionRepository
                            .update(
                                    connectionId,
                                    user.id(),
                                    displayName == null ? null : requireDisplayName(displayName),
                                    region == null ? null : requireNonBlank(region, "region", 64),
                                    bucket == null ? null : requireNonBlank(bucket, "bucket", 255),
                                    prefix == null ? null : normalizePrefix(prefix),
                                    roleArn == null ? null : requireRoleArn(roleArn))
                            .orElseThrow(() -> new StorageConnectionNotFoundException(connectionId));
            operationLogger.succeeded("update_storage_connection", user.id(), connectionId, duration(start));
            return updated;
        } catch (RuntimeException ex) {
            operationLogger.failed("update_storage_connection", user.id(), connectionId, ex);
            throw ex;
        }
    }

    public void deleteConnection(AppUser user, UUID connectionId) {
        long start = System.currentTimeMillis();
        operationLogger.started("delete_storage_connection", user.id(), connectionId);
        try {
            requireOwnedConnection(user, connectionId);
            if (storageConnectionRepository.existsKeysReferencingConnection(connectionId)) {
                throw new StorageConnectionInUseException(connectionId);
            }
            if (!storageConnectionRepository.deleteByIdAndUserId(connectionId, user.id())) {
                throw new StorageConnectionNotFoundException(connectionId);
            }
            operationLogger.succeeded("delete_storage_connection", user.id(), connectionId, duration(start));
        } catch (RuntimeException ex) {
            operationLogger.failed("delete_storage_connection", user.id(), connectionId, ex);
            throw ex;
        }
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public StorageConnectionTestOutcome testConnection(AppUser user, UUID connectionId) {
        long start = System.currentTimeMillis();
        operationLogger.started("test_storage_connection", user.id(), connectionId);
        StorageConnection owned = requireOwnedConnection(user, connectionId);
        try {
            StorageConnectionTestResult result = keyringStorageProvider.testConnection(owned);
            Instant testedAt = Instant.now();
            StorageConnectionTestStatus testStatus =
                    result.succeeded() ? StorageConnectionTestStatus.SUCCEEDED : StorageConnectionTestStatus.FAILED;
            StorageConnection updated =
                    transactionTemplate.execute(
                            status ->
                                    storageConnectionRepository
                                            .updateTestResult(
                                                    connectionId,
                                                    user.id(),
                                                    testedAt,
                                                    testStatus,
                                                    result.errorCategory())
                                            .orElseThrow(
                                                    () -> new StorageConnectionNotFoundException(connectionId)));
            if (result.succeeded()) {
                operationLogger.succeeded("test_storage_connection", user.id(), connectionId, duration(start));
            } else {
                operationLogger.failed(
                        "test_storage_connection",
                        user.id(),
                        connectionId,
                        new StorageConnectionTestFailedException(
                                result.errorCategory(), result.message()));
            }
            return new StorageConnectionTestOutcome(updated, result);
        } catch (RuntimeException ex) {
            operationLogger.failed("test_storage_connection", user.id(), connectionId, ex);
            throw ex;
        }
    }

    private StorageConnection requireOwnedConnection(AppUser user, UUID connectionId) {
        return storageConnectionRepository
                .findByIdAndUserId(connectionId, user.id())
                .orElseThrow(() -> new StorageConnectionNotFoundException(connectionId));
    }

    static String normalizePrefix(String prefix) {
        String value = prefix == null || prefix.isBlank() ? DEFAULT_PREFIX : prefix.trim();
        return value.endsWith("/") ? value : value + "/";
    }

    private static String requireDisplayName(String displayName) {
        if (displayName == null || displayName.isBlank()) {
            throw BadRequestException.fieldError("displayName", "displayName is required");
        }
        String trimmed = displayName.trim();
        if (trimmed.length() > 128) {
            throw BadRequestException.fieldError("displayName", "displayName must be at most 128 characters");
        }
        return trimmed;
    }

    private static String requireNonBlank(String value, String field, int maxLength) {
        if (value == null || value.isBlank()) {
            throw BadRequestException.fieldError(field, field + " is required");
        }
        String trimmed = value.trim();
        if (trimmed.length() > maxLength) {
            throw BadRequestException.fieldError(field, field + " must be at most " + maxLength + " characters");
        }
        return trimmed;
    }

    private static String requireRoleArn(String roleArn) {
        String trimmed = requireNonBlank(roleArn, "roleArn", 512);
        if (!ROLE_ARN_PATTERN.matcher(trimmed).matches()) {
            throw BadRequestException.fieldError("roleArn", "roleArn must be a valid AWS IAM role ARN");
        }
        return trimmed;
    }

    private static long duration(long start) {
        return System.currentTimeMillis() - start;
    }
}
