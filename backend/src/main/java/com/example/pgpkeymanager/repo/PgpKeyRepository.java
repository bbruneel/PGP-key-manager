package com.example.pgpkeymanager.repo;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import com.example.pgpkeymanager.domain.PgpKey;
import com.example.pgpkeymanager.domain.PgpKey.KeyType;

@Repository
public class PgpKeyRepository {

    private final JdbcClient jdbc;

    public PgpKeyRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<PgpKey> findAllByUserId(UUID userId) {
        return jdbc.sql(
                        """
                        SELECT id, user_id, label, fingerprint, key_id, key_type, algorithm,
                               expires_at, revoked_at, armored_public, encrypted_private_armored,
                               storage_provider, storage_ref, created_at, updated_at
                        FROM pgp_keys
                        WHERE user_id = :userId
                        ORDER BY created_at DESC
                        """)
                .param("userId", userId)
                .query((rs, rowNum) -> mapRow(rs))
                .list();
    }

    public Optional<PgpKey> findByIdAndUserId(UUID id, UUID userId) {
        return jdbc.sql(
                        """
                        SELECT id, user_id, label, fingerprint, key_id, key_type, algorithm,
                               expires_at, revoked_at, armored_public, encrypted_private_armored,
                               storage_provider, storage_ref, created_at, updated_at
                        FROM pgp_keys
                        WHERE id = :id AND user_id = :userId
                        """)
                .param("id", id)
                .param("userId", userId)
                .query((rs, rowNum) -> mapRow(rs))
                .optional();
    }

    public PgpKey insert(
            UUID userId,
            String label,
            String fingerprint,
            String keyId,
            KeyType keyType,
            String algorithm,
            Instant expiresAt,
            String armoredPublic,
            String encryptedPrivateArmored,
            String storageProvider,
            String storageRef) {
        UUID id = UUID.randomUUID();
        jdbc.sql(
                        """
                        INSERT INTO pgp_keys (
                            id, user_id, label, fingerprint, key_id, key_type, algorithm, expires_at,
                            armored_public, encrypted_private_armored, storage_provider, storage_ref
                        )
                        VALUES (
                            :id, :userId, :label, :fingerprint, :keyId, :keyType, :algorithm, :expiresAt,
                            :armoredPublic, :encryptedPrivateArmored, :storageProvider, :storageRef
                        )
                        """)
                .param("id", id)
                .param("userId", userId)
                .param("label", label)
                .param("fingerprint", fingerprint)
                .param("keyId", keyId)
                .param("keyType", keyType.toDb())
                .param("algorithm", algorithm)
                .param("expiresAt", expiresAt == null ? null : Timestamp.from(expiresAt))
                .param("armoredPublic", armoredPublic)
                .param("encryptedPrivateArmored", encryptedPrivateArmored)
                .param("storageProvider", storageProvider)
                .param("storageRef", storageRef)
                .update();
        return findByIdAndUserId(id, userId).orElseThrow();
    }

    public Optional<PgpKey> update(
            UUID id,
            UUID userId,
            String label,
            Instant expiresAt,
            String storageProvider,
            String storageRef) {
        int updated =
                jdbc.sql(
                                """
                                UPDATE pgp_keys
                                SET label = COALESCE(:label, label),
                                    expires_at = COALESCE(:expiresAt, expires_at),
                                    storage_provider = COALESCE(:storageProvider, storage_provider),
                                    storage_ref = COALESCE(:storageRef, storage_ref),
                                    updated_at = CURRENT_TIMESTAMP
                                WHERE id = :id AND user_id = :userId
                                """)
                        .param("id", id)
                        .param("userId", userId)
                        .param("label", label)
                        .param("expiresAt", expiresAt == null ? null : Timestamp.from(expiresAt))
                        .param("storageProvider", storageProvider)
                        .param("storageRef", storageRef)
                        .update();
        if (updated == 0) {
            return Optional.empty();
        }
        return findByIdAndUserId(id, userId);
    }

    public boolean deleteByIdAndUserId(UUID id, UUID userId) {
        int rows =
                jdbc.sql("DELETE FROM pgp_keys WHERE id = :id AND user_id = :userId")
                        .param("id", id)
                        .param("userId", userId)
                        .update();
        return rows > 0;
    }

    private static PgpKey mapRow(ResultSet rs) throws SQLException {
        Timestamp expiresAt = rs.getTimestamp("expires_at");
        Timestamp revokedAt = rs.getTimestamp("revoked_at");
        return new PgpKey(
                rs.getObject("id", UUID.class),
                rs.getObject("user_id", UUID.class),
                rs.getString("label"),
                rs.getString("fingerprint"),
                rs.getString("key_id"),
                KeyType.fromDb(rs.getString("key_type")),
                rs.getString("algorithm"),
                expiresAt == null ? null : expiresAt.toInstant(),
                revokedAt == null ? null : revokedAt.toInstant(),
                rs.getString("armored_public"),
                rs.getString("encrypted_private_armored"),
                rs.getString("storage_provider"),
                rs.getString("storage_ref"),
                rs.getTimestamp("created_at").toInstant(),
                rs.getTimestamp("updated_at").toInstant());
    }
}
