package org.bruneel.pgpkeymanager.web.dto;

import java.time.Instant;
import java.util.List;

import org.bruneel.pgpkeymanager.domain.PgpKey;
import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record PgpKeyResponse(
        String id,
        String label,
        String fingerprint,
        String keyId,
        String keyType,
        String role,
        String parentKeyId,
        List<String> capabilities,
        String algorithm,
        AlgorithmSpecDto algorithmSpec,
        String status,
        Instant expiresAt,
        Instant revokedAt,
        String armoredPublic,
        String encryptedPrivateArmored,
        String storageProvider,
        String storageRef,
        Instant createdAt,
        Instant updatedAt) {

    public static PgpKeyResponse from(PgpKey key, boolean includePrivateCiphertext) {
        AlgorithmSpecDto spec = null;
        if (key.algorithmSpecJson() != null && !key.algorithmSpecJson().isBlank()) {
            try {
                spec = new com.fasterxml.jackson.databind.ObjectMapper()
                        .readValue(key.algorithmSpecJson(), AlgorithmSpecDto.class);
            } catch (Exception ignored) {
                // omit malformed spec
            }
        }
        return new PgpKeyResponse(
                key.id().toString(),
                key.label(),
                key.fingerprint(),
                key.keyId(),
                key.keyType().toDb(),
                key.role().toDb(),
                key.parentKeyId() == null ? null : key.parentKeyId().toString(),
                key.capabilities().stream().map(c -> c.toApi()).toList(),
                key.algorithm(),
                spec,
                key.status().toApi(),
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
