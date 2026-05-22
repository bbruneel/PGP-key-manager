package org.bruneel.pgpkeymanager.domain;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PgpKey(
        UUID id,
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
        Instant createdAt,
        Instant updatedAt) {

    public KeyStatus status() {
        return KeyStatus.derive(expiresAt, revokedAt, Instant.now());
    }

    public boolean isPrimary() {
        return role == KeyRole.PRIMARY;
    }

    public enum KeyType {
        PUBLIC,
        PRIVATE;

        public static KeyType fromDb(String value) {
            return KeyType.valueOf(value.toUpperCase());
        }

        public String toDb() {
            return name().toLowerCase();
        }
    }
}
