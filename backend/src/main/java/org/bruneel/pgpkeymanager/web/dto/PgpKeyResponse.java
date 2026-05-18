package org.bruneel.pgpkeymanager.web.dto;

import java.time.Instant;

import org.bruneel.pgpkeymanager.domain.PgpKey;
import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record PgpKeyResponse(
        String id,
        String label,
        String fingerprint,
        String keyId,
        String keyType,
        String algorithm,
        Instant expiresAt,
        Instant revokedAt,
        String armoredPublic,
        String encryptedPrivateArmored,
        String storageProvider,
        String storageRef,
        Instant createdAt,
        Instant updatedAt) {

    public static PgpKeyResponse from(PgpKey key, boolean includePrivateCiphertext) {
        return new PgpKeyResponse(
                key.id().toString(),
                key.label(),
                key.fingerprint(),
                key.keyId(),
                key.keyType().toDb(),
                key.algorithm(),
                key.expiresAt(),
                key.revokedAt(),
                key.armoredPublic(),
                includePrivateCiphertext ? key.encryptedPrivateArmored() : null,
                key.storageProvider(),
                key.storageRef(),
                key.createdAt(),
                key.updatedAt());
    }
}
