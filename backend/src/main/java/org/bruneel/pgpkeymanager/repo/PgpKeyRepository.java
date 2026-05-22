package org.bruneel.pgpkeymanager.repo;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import org.bruneel.pgpkeymanager.domain.CapabilityJson;
import org.bruneel.pgpkeymanager.domain.KeyRole;
import org.bruneel.pgpkeymanager.domain.PgpCapability;
import org.bruneel.pgpkeymanager.domain.PgpKey;
import org.bruneel.pgpkeymanager.domain.PgpKey.KeyType;
import org.bruneel.pgpkeymanager.domain.RevocationReason;

@Repository
public class PgpKeyRepository {

    private static final String SELECT_COLUMNS =
            """
            id, user_id, label, fingerprint, key_id, key_type, role, parent_key_id,
            capabilities, algorithm, algorithm_spec, expires_at, revoked_at, revocation_reason,
            armored_public, encrypted_private_armored, storage_provider, storage_ref, openpgp_version,
            created_at, updated_at
            """;

    private final JdbcClient jdbc;

    public PgpKeyRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<PgpKey> findAllByUserId(UUID userId, KeyRole role, String status, PgpCapability capability) {
        StringBuilder sql =
                new StringBuilder("SELECT ").append(SELECT_COLUMNS).append(" FROM pgp_keys WHERE user_id = :userId");
        List<String> clauses = new ArrayList<>();
        if (role != null) {
            clauses.add("role = :role");
        }
        if (status != null) {
            clauses.add(statusClause(status));
        }
        if (!clauses.isEmpty()) {
            sql.append(" AND ").append(String.join(" AND ", clauses));
        }
        sql.append(" ORDER BY created_at DESC");

        var query = jdbc.sql(sql.toString()).param("userId", userId);
        if (role != null) {
            query = query.param("role", role.toDb());
        }
        List<PgpKey> keys = query.query((rs, rowNum) -> mapRow(rs)).list();
        if (capability == null) {
            return keys;
        }
        return keys.stream().filter(k -> k.capabilities().contains(capability)).toList();
    }

    public List<PgpKey> findSubkeysByParentId(UUID parentKeyId, UUID userId) {
        return jdbc.sql(
                        "SELECT "
                                + SELECT_COLUMNS
                                + " FROM pgp_keys WHERE parent_key_id = :parentKeyId AND user_id = :userId ORDER BY created_at DESC")
                .param("parentKeyId", parentKeyId)
                .param("userId", userId)
                .query((rs, rowNum) -> mapRow(rs))
                .list();
    }

    public Optional<PgpKey> findByIdAndUserId(UUID id, UUID userId) {
        return jdbc.sql(
                        "SELECT "
                                + SELECT_COLUMNS
                                + " FROM pgp_keys WHERE id = :id AND user_id = :userId")
                .param("id", id)
                .param("userId", userId)
                .query((rs, rowNum) -> mapRow(rs))
                .optional();
    }

    public Optional<PgpKey> findSubkeyByIdAndParentId(UUID subkeyId, UUID parentKeyId, UUID userId) {
        return jdbc.sql(
                        "SELECT "
                                + SELECT_COLUMNS
                                + """
                                 FROM pgp_keys
                                 WHERE id = :subkeyId AND parent_key_id = :parentKeyId AND user_id = :userId
                                """)
                .param("subkeyId", subkeyId)
                .param("parentKeyId", parentKeyId)
                .param("userId", userId)
                .query((rs, rowNum) -> mapRow(rs))
                .optional();
    }

    public PgpKey insert(PgpKeyInsert insert) {
        UUID id = UUID.randomUUID();
        jdbc.sql(
                        """
                        INSERT INTO pgp_keys (
                            id, user_id, label, fingerprint, key_id, key_type, role, parent_key_id,
                            capabilities, algorithm, algorithm_spec, expires_at, revoked_at, revocation_reason,
                            armored_public, encrypted_private_armored, storage_provider, storage_ref, openpgp_version
                        )
                        VALUES (
                            :id, :userId, :label, :fingerprint, :keyId, :keyType, :role, :parentKeyId,
                            :capabilities, :algorithm, :algorithmSpec, :expiresAt, :revokedAt, :revocationReason,
                            :armoredPublic, :encryptedPrivateArmored, :storageProvider, :storageRef, :openpgpVersion
                        )
                        """)
                .param("id", id)
                .param("userId", insert.userId())
                .param("label", insert.label())
                .param("fingerprint", insert.fingerprint())
                .param("keyId", insert.keyId())
                .param("keyType", insert.keyType().toDb())
                .param("role", insert.role().toDb())
                .param("parentKeyId", insert.parentKeyId())
                .param("capabilities", CapabilityJson.toJson(insert.capabilities()))
                .param("algorithm", insert.algorithm())
                .param("algorithmSpec", insert.algorithmSpecJson())
                .param("expiresAt", toTimestamp(insert.expiresAt()))
                .param("revokedAt", toTimestamp(insert.revokedAt()))
                .param("revocationReason", insert.revocationReason() == null ? null : insert.revocationReason().toDb())
                .param("armoredPublic", insert.armoredPublic())
                .param("encryptedPrivateArmored", insert.encryptedPrivateArmored())
                .param("storageProvider", insert.storageProvider())
                .param("storageRef", insert.storageRef())
                .param("openpgpVersion", insert.openpgpVersion())
                .update();
        return findByIdAndUserId(id, insert.userId()).orElseThrow();
    }

    public Optional<PgpKey> updateMetadata(
            UUID id, UUID userId, String label, Instant expiresAt, String storageProvider, String storageRef) {
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
                        .param("expiresAt", toTimestamp(expiresAt))
                        .param("storageProvider", storageProvider)
                        .param("storageRef", storageRef)
                        .update();
        if (updated == 0) {
            return Optional.empty();
        }
        return findByIdAndUserId(id, userId);
    }

    public Optional<PgpKey> updateKeyringMaterial(
            UUID id,
            UUID userId,
            String armoredPublic,
            String encryptedPrivateArmored,
            Instant expiresAt,
            Instant revokedAt,
            RevocationReason revocationReason) {
        int updated =
                jdbc.sql(
                                """
                                UPDATE pgp_keys
                                SET armored_public = COALESCE(:armoredPublic, armored_public),
                                    encrypted_private_armored = COALESCE(:encryptedPrivateArmored, encrypted_private_armored),
                                    expires_at = COALESCE(:expiresAt, expires_at),
                                    revoked_at = COALESCE(:revokedAt, revoked_at),
                                    revocation_reason = COALESCE(:revocationReason, revocation_reason),
                                    updated_at = CURRENT_TIMESTAMP
                                WHERE id = :id AND user_id = :userId
                                """)
                        .param("id", id)
                        .param("userId", userId)
                        .param("armoredPublic", armoredPublic)
                        .param("encryptedPrivateArmored", encryptedPrivateArmored)
                        .param("expiresAt", toTimestamp(expiresAt))
                        .param("revokedAt", toTimestamp(revokedAt))
                        .param("revocationReason", revocationReason == null ? null : revocationReason.toDb())
                        .update();
        if (updated == 0) {
            return Optional.empty();
        }
        return findByIdAndUserId(id, userId);
    }

    public Optional<PgpKey> markRevoked(UUID id, UUID userId, Instant revokedAt, RevocationReason reason) {
        int updated =
                jdbc.sql(
                                """
                                UPDATE pgp_keys
                                SET revoked_at = :revokedAt,
                                    revocation_reason = :reason,
                                    updated_at = CURRENT_TIMESTAMP
                                WHERE id = :id AND user_id = :userId
                                """)
                        .param("id", id)
                        .param("userId", userId)
                        .param("revokedAt", Timestamp.from(revokedAt))
                        .param("reason", reason.toDb())
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

    public record PgpKeyInsert(
            UUID userId,
            String label,
            String fingerprint,
            String keyId,
            KeyType keyType,
            KeyRole role,
            UUID parentKeyId,
            List<PgpCapability> capabilities,
            String algorithm,
            String algorithmSpecJson,
            Instant expiresAt,
            Instant revokedAt,
            RevocationReason revocationReason,
            String armoredPublic,
            String encryptedPrivateArmored,
            String storageProvider,
            String storageRef,
            int openpgpVersion) {}

    private static String statusClause(String status) {
        return switch (status.toLowerCase()) {
            case "revoked" -> "revoked_at IS NOT NULL";
            case "expired" -> "revoked_at IS NULL AND expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP";
            case "active" -> "revoked_at IS NULL AND (expires_at IS NULL OR expires_at >= CURRENT_TIMESTAMP)";
            default -> "1=1";
        };
    }

    private static Timestamp toTimestamp(Instant instant) {
        return instant == null ? null : Timestamp.from(instant);
    }

    private static UUID toUuid(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof UUID uuid) {
            return uuid;
        }
        return UUID.fromString(value.toString());
    }

    private static PgpKey mapRow(ResultSet rs) throws SQLException {
        Timestamp expiresAt = rs.getTimestamp("expires_at");
        Timestamp revokedAt = rs.getTimestamp("revoked_at");
        String revocationReason = rs.getString("revocation_reason");
        return new PgpKey(
                toUuid(rs.getObject("id")),
                toUuid(rs.getObject("user_id")),
                rs.getString("label"),
                rs.getString("fingerprint"),
                rs.getString("key_id"),
                KeyType.fromDb(rs.getString("key_type")),
                KeyRole.fromDb(rs.getString("role")),
                toUuid(rs.getObject("parent_key_id")),
                CapabilityJson.fromJson(rs.getString("capabilities")),
                rs.getString("algorithm"),
                rs.getString("algorithm_spec"),
                expiresAt == null ? null : expiresAt.toInstant(),
                revokedAt == null ? null : revokedAt.toInstant(),
                revocationReason == null ? null : RevocationReason.fromDb(revocationReason),
                rs.getString("armored_public"),
                rs.getString("encrypted_private_armored"),
                rs.getString("storage_provider"),
                rs.getString("storage_ref"),
                rs.getInt("openpgp_version"),
                rs.getTimestamp("created_at").toInstant(),
                rs.getTimestamp("updated_at").toInstant());
    }
}
