package org.bruneel.pgpkeymanager.domain;

import java.time.Instant;
import java.util.UUID;

public record PgpKey(
        UUID id,
        UUID userId,
        String label,
        String fingerprint,
        String keyId,
        KeyType keyType,
        String algorithm,
        Instant expiresAt,
        Instant revokedAt,
        String armoredPublic,
        String encryptedPrivateArmored,
        String storageProvider,
        String storageRef,
        Instant createdAt,
        Instant updatedAt) {

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
