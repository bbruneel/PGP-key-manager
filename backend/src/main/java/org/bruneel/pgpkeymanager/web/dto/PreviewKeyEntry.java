package org.bruneel.pgpkeymanager.web.dto;

import java.time.Instant;
import java.util.List;

import org.bruneel.pgpkeymanager.crypto.ImportedKeyMetadata;
import org.bruneel.pgpkeymanager.domain.KeyRole;
import org.bruneel.pgpkeymanager.domain.KeyStatus;

public record PreviewKeyEntry(
        String role,
        String fingerprint,
        String keyId,
        String algorithm,
        List<String> capabilities,
        Instant expiresAt,
        String status,
        Instant revokedAt,
        String revocationReason,
        int openpgpVersion) {

    public static PreviewKeyEntry from(ImportedKeyMetadata metadata, KeyRole role) {
        Instant now = Instant.now();
        KeyStatus status = KeyStatus.derive(metadata.expiresAt(), metadata.revokedAt(), now);
        return new PreviewKeyEntry(
                role.toDb(),
                metadata.fingerprint(),
                metadata.keyId(),
                metadata.algorithm(),
                metadata.capabilities().stream().map(c -> c.toApi()).toList(),
                metadata.expiresAt(),
                status.toApi(),
                metadata.revokedAt(),
                metadata.revocationReason() == null ? null : metadata.revocationReason().toApi(),
                metadata.openpgpVersion());
    }
}
