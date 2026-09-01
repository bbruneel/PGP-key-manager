package org.bruneel.pgpkeymanager.repo;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import org.bruneel.pgpkeymanager.domain.StorageConnection;
import org.bruneel.pgpkeymanager.domain.StorageConnectionStatus;
import org.bruneel.pgpkeymanager.domain.StorageConnectionTestStatus;
import org.bruneel.pgpkeymanager.domain.StorageProvider;

@Repository
public class StorageConnectionRepository {

    private final JdbcClient jdbc;

    public StorageConnectionRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public StorageConnection insert(
            UUID userId,
            StorageProvider provider,
            String displayName,
            String region,
            String bucket,
            String prefix,
            String roleArn,
            String externalId) {
        UUID id = UUID.randomUUID();
        jdbc.sql(
                        """
                        INSERT INTO storage_connections (
                            id, user_id, provider, display_name, region, bucket, prefix, role_arn, external_id
                        ) VALUES (
                            :id, :userId, :provider, :displayName, :region, :bucket, :prefix, :roleArn, :externalId
                        )
                        """)
                .param("id", id)
                .param("userId", userId)
                .param("provider", provider.toDb())
                .param("displayName", displayName)
                .param("region", region)
                .param("bucket", bucket)
                .param("prefix", prefix)
                .param("roleArn", roleArn)
                .param("externalId", externalId)
                .update();
        return findById(id).orElseThrow();
    }

    public Optional<StorageConnection> findById(UUID connectionId) {
        return jdbc.sql(
                        """
                        SELECT id, user_id, provider, display_name, region, bucket, prefix, role_arn, external_id,
                               status, last_tested_at, last_test_status, last_test_error_category,
                               created_at, updated_at
                        FROM storage_connections
                        WHERE id = :connectionId
                        """)
                .param("connectionId", connectionId)
                .query((rs, rowNum) -> mapRow(rs))
                .optional();
    }

    public Optional<StorageConnection> findByIdAndUserId(UUID connectionId, UUID userId) {
        return jdbc.sql(
                        """
                        SELECT id, user_id, provider, display_name, region, bucket, prefix, role_arn, external_id,
                               status, last_tested_at, last_test_status, last_test_error_category,
                               created_at, updated_at
                        FROM storage_connections
                        WHERE id = :connectionId AND user_id = :userId
                        """)
                .param("connectionId", connectionId)
                .param("userId", userId)
                .query((rs, rowNum) -> mapRow(rs))
                .optional();
    }

    public List<StorageConnection> findAllByUserId(UUID userId) {
        return jdbc.sql(
                        """
                        SELECT id, user_id, provider, display_name, region, bucket, prefix, role_arn, external_id,
                               status, last_tested_at, last_test_status, last_test_error_category,
                               created_at, updated_at
                        FROM storage_connections
                        WHERE user_id = :userId
                        ORDER BY created_at DESC
                        """)
                .param("userId", userId)
                .query((rs, rowNum) -> mapRow(rs))
                .list();
    }

    public Optional<StorageConnection> update(
            UUID connectionId,
            UUID userId,
            String displayName,
            String region,
            String bucket,
            String prefix,
            String roleArn) {
        int rows =
                jdbc.sql(
                                """
                                UPDATE storage_connections
                                SET display_name = COALESCE(:displayName, display_name),
                                    region = COALESCE(:region, region),
                                    bucket = COALESCE(:bucket, bucket),
                                    prefix = COALESCE(:prefix, prefix),
                                    role_arn = COALESCE(:roleArn, role_arn),
                                    updated_at = CURRENT_TIMESTAMP
                                WHERE id = :connectionId AND user_id = :userId
                                """)
                        .param("connectionId", connectionId)
                        .param("userId", userId)
                        .param("displayName", displayName)
                        .param("region", region)
                        .param("bucket", bucket)
                        .param("prefix", prefix)
                        .param("roleArn", roleArn)
                        .update();
        if (rows == 0) {
            return Optional.empty();
        }
        return findById(connectionId);
    }

    public Optional<StorageConnection> updateTestResult(
            UUID connectionId,
            UUID userId,
            Instant testedAt,
            StorageConnectionTestStatus testStatus,
            String errorCategory) {
        int rows =
                jdbc.sql(
                                """
                                UPDATE storage_connections
                                SET last_tested_at = :testedAt,
                                    last_test_status = :testStatus,
                                    last_test_error_category = :errorCategory,
                                    updated_at = CURRENT_TIMESTAMP
                                WHERE id = :connectionId AND user_id = :userId
                                """)
                        .param("connectionId", connectionId)
                        .param("userId", userId)
                        .param("testedAt", java.sql.Timestamp.from(testedAt))
                        .param("testStatus", testStatus.toDb())
                        .param("errorCategory", errorCategory)
                        .update();
        if (rows == 0) {
            return Optional.empty();
        }
        return findById(connectionId);
    }

    public boolean deleteByIdAndUserId(UUID connectionId, UUID userId) {
        int rows =
                jdbc.sql(
                                """
                                DELETE FROM storage_connections
                                WHERE id = :connectionId AND user_id = :userId
                                """)
                        .param("connectionId", connectionId)
                        .param("userId", userId)
                        .update();
        return rows > 0;
    }

    public boolean existsByUserIdAndDisplayNameIgnoreCase(UUID userId, String displayName, UUID excludeConnectionId) {
        Boolean exists;
        if (excludeConnectionId == null) {
            exists =
                    jdbc.sql(
                                    """
                                    SELECT EXISTS (
                                        SELECT 1 FROM storage_connections
                                        WHERE user_id = :userId
                                          AND LOWER(display_name) = LOWER(:displayName)
                                    )
                                    """)
                            .param("userId", userId)
                            .param("displayName", displayName)
                            .query(Boolean.class)
                            .single();
        } else {
            exists =
                    jdbc.sql(
                                    """
                                    SELECT EXISTS (
                                        SELECT 1 FROM storage_connections
                                        WHERE user_id = :userId
                                          AND LOWER(display_name) = LOWER(:displayName)
                                          AND id <> :excludeConnectionId
                                    )
                                    """)
                            .param("userId", userId)
                            .param("displayName", displayName)
                            .param("excludeConnectionId", excludeConnectionId)
                            .query(Boolean.class)
                            .single();
        }
        return Boolean.TRUE.equals(exists);
    }

    public boolean existsKeysReferencingConnection(UUID connectionId) {
        String prefix = "aws-s3://" + connectionId + "/";
        Boolean exists =
                jdbc.sql(
                                """
                                SELECT EXISTS (
                                    SELECT 1 FROM pgp_keys
                                    WHERE storage_provider = 'aws-s3'
                                      AND storage_ref LIKE :refPrefix || '%'
                                )
                                """)
                        .param("refPrefix", prefix)
                        .query(Boolean.class)
                        .single();
        return Boolean.TRUE.equals(exists);
    }

    private static StorageConnection mapRow(ResultSet rs) throws SQLException {
        return new StorageConnection(
                UUID.fromString(rs.getString("id")),
                UUID.fromString(rs.getString("user_id")),
                StorageProvider.fromDb(rs.getString("provider")),
                rs.getString("display_name"),
                rs.getString("region"),
                rs.getString("bucket"),
                rs.getString("prefix"),
                rs.getString("role_arn"),
                rs.getString("external_id"),
                StorageConnectionStatus.fromDb(rs.getString("status")),
                toInstant(rs.getTimestamp("last_tested_at")),
                toTestStatus(rs.getString("last_test_status")),
                rs.getString("last_test_error_category"),
                rs.getTimestamp("created_at").toInstant(),
                rs.getTimestamp("updated_at").toInstant());
    }

    private static Instant toInstant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }

    private static StorageConnectionTestStatus toTestStatus(String value) {
        return value == null ? null : StorageConnectionTestStatus.fromDb(value);
    }
}
