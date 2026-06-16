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
import org.bruneel.pgpkeymanager.domain.KeyOwnerType;
import org.bruneel.pgpkeymanager.domain.KeyRole;
import org.bruneel.pgpkeymanager.domain.PgpCapability;
import org.bruneel.pgpkeymanager.domain.PgpKey;
import org.bruneel.pgpkeymanager.domain.PgpKey.KeyType;
import org.bruneel.pgpkeymanager.domain.RevocationReason;

@Repository
public class PgpKeyRepository {

    private static final String SELECT_COLUMNS =
            """
            k.id, k.user_id, k.label, k.fingerprint, k.key_id, k.key_type, k.role, k.parent_key_id,
            k.capabilities, k.algorithm, k.algorithm_spec, k.expires_at, k.revoked_at, k.revocation_reason,
            k.armored_public, k.encrypted_private_armored, k.storage_provider, k.storage_ref, k.openpgp_version,
            k.owner_type, k.owner_group_id, k.created_by_user_id, k.created_at, k.updated_at
            """;

    private final JdbcClient jdbc;

    public PgpKeyRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<PgpKey> findById(UUID id) {
        return jdbc.sql("SELECT " + SELECT_COLUMNS + " FROM pgp_keys k WHERE k.id = :id")
                .param("id", id)
                .query((rs, rowNum) -> mapRow(rs))
                .optional();
    }

    public List<PgpKey> findAllPersonalByUserId(UUID userId, KeyRole role, String status, PgpCapability capability) {
        return queryOwned(
                "k.owner_type = 'user' AND k.user_id = :userId", userId, null, null, role, status, capability);
    }

    public List<PgpKey> findAllByGroupId(UUID groupId, KeyRole role, String status, PgpCapability capability) {
        return queryOwned(
                "k.owner_type = 'group' AND k.owner_group_id = :groupId",
                null,
                null,
                groupId,
                role,
                status,
                capability);
    }

    public List<PgpKey> findAllAccessibleByUserId(
            UUID userId, UUID groupId, String scope, KeyRole role, String status, PgpCapability capability) {
        String normalizedScope = scope == null ? "all" : scope.toLowerCase();
        String ownershipPredicate =
                switch (normalizedScope) {
                    case "personal" -> "k.owner_type = 'user' AND k.user_id = :userId";
                    case "group" -> "k.owner_type = 'group' AND gm.user_id IS NOT NULL";
                    default ->
                            """
                            (
                              (k.owner_type = 'user' AND k.user_id = :userId)
                              OR
                              (k.owner_type = 'group' AND gm.user_id IS NOT NULL)
                            )
                            """;
                };
        StringBuilder sql =
                new StringBuilder("SELECT DISTINCT ")
                        .append(SELECT_COLUMNS)
                        .append(
                                """
                                 FROM pgp_keys k
                                 LEFT JOIN group_members gm
                                   ON gm.group_id = k.owner_group_id
                                  AND gm.user_id = :userId
                                 WHERE
                                """)
                        .append(ownershipPredicate);
        List<String> clauses = new ArrayList<>();
        if (groupId != null) {
            clauses.add("k.owner_group_id = :groupId");
        }
        if (role != null) {
            clauses.add("k.role = :role");
        }
        if (status != null) {
            clauses.add(statusClause(status));
        }
        if (!clauses.isEmpty()) {
            sql.append(" AND ").append(String.join(" AND ", clauses));
        }
        sql.append(" ORDER BY k.created_at DESC");
        var query = jdbc.sql(sql.toString()).param("userId", userId);
        if (groupId != null) {
            query = query.param("groupId", groupId);
        }
        if (role != null) {
            query = query.param("role", role.toDb());
        }
        List<PgpKey> keys = query.query((rs, rowNum) -> mapRow(rs)).list();
        if (capability == null) {
            return keys;
        }
        return keys.stream().filter(key -> key.capabilities().contains(capability)).toList();
    }

    public List<PgpKey> findSubkeysByParentId(UUID parentKeyId) {
        return jdbc.sql("SELECT " + SELECT_COLUMNS + " FROM pgp_keys k WHERE k.parent_key_id = :parentKeyId ORDER BY k.created_at DESC")
                .param("parentKeyId", parentKeyId)
                .query((rs, rowNum) -> mapRow(rs))
                .list();
    }

    public Optional<PgpKey> findPrimaryByOwnerAndFingerprint(UUID userId, UUID ownerGroupId, String fingerprint) {
        if (ownerGroupId != null) {
            return jdbc.sql(
                            "SELECT "
                                    + SELECT_COLUMNS
                                    + """
                                     FROM pgp_keys k
                                     WHERE k.owner_type = 'group'
                                       AND k.owner_group_id = :ownerGroupId
                                       AND UPPER(k.fingerprint) = UPPER(:fingerprint)
                                       AND k.role = 'primary'
                                    """)
                    .param("ownerGroupId", ownerGroupId)
                    .param("fingerprint", fingerprint)
                    .query((rs, rowNum) -> mapRow(rs))
                    .optional();
        }
        return jdbc.sql(
                        "SELECT "
                                + SELECT_COLUMNS
                                + """
                                 FROM pgp_keys k
                                 WHERE k.owner_type = 'user'
                                   AND k.user_id = :userId
                                   AND UPPER(k.fingerprint) = UPPER(:fingerprint)
                                   AND k.role = 'primary'
                                """)
                .param("userId", userId)
                .param("fingerprint", fingerprint)
                .query((rs, rowNum) -> mapRow(rs))
                .optional();
    }

    public Optional<PgpKey> findSubkeyByIdAndParentId(UUID subkeyId, UUID parentKeyId) {
        return jdbc.sql(
                        "SELECT "
                                + SELECT_COLUMNS
                                + """
                                 FROM pgp_keys k
                                 WHERE k.id = :subkeyId
                                   AND k.parent_key_id = :parentKeyId
                                """)
                .param("subkeyId", subkeyId)
                .param("parentKeyId", parentKeyId)
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
                            armored_public, encrypted_private_armored, storage_provider, storage_ref, openpgp_version,
                            owner_type, owner_group_id, created_by_user_id
                        )
                        VALUES (
                            :id, :userId, :label, :fingerprint, :keyId, :keyType, :role, :parentKeyId,
                            :capabilities, :algorithm, :algorithmSpec, :expiresAt, :revokedAt, :revocationReason,
                            :armoredPublic, :encryptedPrivateArmored, :storageProvider, :storageRef, :openpgpVersion,
                            :ownerType, :ownerGroupId, :createdByUserId
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
                .param("ownerType", insert.ownerType().toDb())
                .param("ownerGroupId", insert.ownerGroupId())
                .param("createdByUserId", insert.createdByUserId())
                .update();
        return findById(id).orElseThrow();
    }

    public Optional<PgpKey> updateMetadata(UUID id, String label, Instant expiresAt, String storageProvider, String storageRef) {
        int updated =
                jdbc.sql(
                                """
                                UPDATE pgp_keys
                                SET label = COALESCE(:label, label),
                                    expires_at = COALESCE(:expiresAt, expires_at),
                                    storage_provider = COALESCE(:storageProvider, storage_provider),
                                    storage_ref = COALESCE(:storageRef, storage_ref),
                                    updated_at = CURRENT_TIMESTAMP
                                WHERE id = :id
                                """)
                        .param("id", id)
                        .param("label", label)
                        .param("expiresAt", toTimestamp(expiresAt))
                        .param("storageProvider", storageProvider)
                        .param("storageRef", storageRef)
                        .update();
        if (updated == 0) {
            return Optional.empty();
        }
        return findById(id);
    }

    public Optional<PgpKey> updateKeyringMaterial(
            UUID id,
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
                                WHERE id = :id
                                """)
                        .param("id", id)
                        .param("armoredPublic", armoredPublic)
                        .param("encryptedPrivateArmored", encryptedPrivateArmored)
                        .param("expiresAt", toTimestamp(expiresAt))
                        .param("revokedAt", toTimestamp(revokedAt))
                        .param("revocationReason", revocationReason == null ? null : revocationReason.toDb())
                        .update();
        if (updated == 0) {
            return Optional.empty();
        }
        return findById(id);
    }

    public Optional<PgpKey> markRevoked(UUID id, Instant revokedAt, RevocationReason reason) {
        int updated =
                jdbc.sql(
                                """
                                UPDATE pgp_keys
                                SET revoked_at = :revokedAt,
                                    revocation_reason = :reason,
                                    updated_at = CURRENT_TIMESTAMP
                                WHERE id = :id
                                """)
                        .param("id", id)
                        .param("revokedAt", Timestamp.from(revokedAt))
                        .param("reason", reason.toDb())
                        .update();
        if (updated == 0) {
            return Optional.empty();
        }
        return findById(id);
    }

    public boolean deleteById(UUID id) {
        int rows = jdbc.sql("DELETE FROM pgp_keys WHERE id = :id").param("id", id).update();
        return rows > 0;
    }

    public int countByOwnerGroupId(UUID ownerGroupId) {
        Integer count =
                jdbc.sql(
                                """
                                SELECT COUNT(*) FROM pgp_keys
                                WHERE owner_type = 'group'
                                  AND owner_group_id = :ownerGroupId
                                """)
                        .param("ownerGroupId", ownerGroupId)
                        .query(Integer.class)
                        .single();
        return count == null ? 0 : count;
    }

    public Optional<PgpKey> updateOwnership(UUID keyId, KeyOwnerType ownerType, UUID ownerGroupId, UUID userId) {
        int updated =
                jdbc.sql(
                                """
                                UPDATE pgp_keys
                                SET owner_type = :ownerType,
                                    owner_group_id = :ownerGroupId,
                                    user_id = :userId,
                                    updated_at = CURRENT_TIMESTAMP
                                WHERE id = :keyId
                                """)
                        .param("keyId", keyId)
                        .param("ownerType", ownerType.toDb())
                        .param("ownerGroupId", ownerGroupId)
                        .param("userId", userId)
                        .update();
        if (updated == 0) {
            return Optional.empty();
        }
        return findById(keyId);
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
            int openpgpVersion,
            KeyOwnerType ownerType,
            UUID ownerGroupId,
            UUID createdByUserId) {}

    private List<PgpKey> queryOwned(
            String ownershipPredicate,
            UUID userId,
            UUID memberUserId,
            UUID groupId,
            KeyRole role,
            String status,
            PgpCapability capability) {
        StringBuilder sql = new StringBuilder("SELECT ").append(SELECT_COLUMNS).append(" FROM pgp_keys k WHERE ").append(ownershipPredicate);
        List<String> clauses = new ArrayList<>();
        if (groupId != null) {
            clauses.add("k.owner_group_id = :groupId");
        }
        if (role != null) {
            clauses.add("k.role = :role");
        }
        if (status != null) {
            clauses.add(statusClause(status));
        }
        if (!clauses.isEmpty()) {
            sql.append(" AND ").append(String.join(" AND ", clauses));
        }
        sql.append(" ORDER BY k.created_at DESC");
        var query = jdbc.sql(sql.toString());
        if (userId != null) {
            query = query.param("userId", userId);
        }
        if (memberUserId != null) {
            query = query.param("memberUserId", memberUserId);
        }
        if (groupId != null) {
            query = query.param("groupId", groupId);
        }
        if (role != null) {
            query = query.param("role", role.toDb());
        }
        List<PgpKey> keys = query.query((rs, rowNum) -> mapRow(rs)).list();
        if (capability == null) {
            return keys;
        }
        return keys.stream().filter(k -> k.capabilities().contains(capability)).toList();
    }

    private static String statusClause(String status) {
        return switch (status.toLowerCase()) {
            case "revoked" -> "k.revoked_at IS NOT NULL";
            case "expired" -> "k.revoked_at IS NULL AND k.expires_at IS NOT NULL AND k.expires_at < CURRENT_TIMESTAMP";
            case "active" -> "k.revoked_at IS NULL AND (k.expires_at IS NULL OR k.expires_at >= CURRENT_TIMESTAMP)";
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
                KeyOwnerType.fromDb(rs.getString("owner_type")),
                toUuid(rs.getObject("owner_group_id")),
                toUuid(rs.getObject("created_by_user_id")),
                rs.getTimestamp("created_at").toInstant(),
                rs.getTimestamp("updated_at").toInstant());
    }
}
