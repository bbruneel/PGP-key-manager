package org.bruneel.pgpkeymanager.crypto;

import java.time.Instant;
import java.util.List;

import org.bruneel.pgpkeymanager.domain.PgpCapability;
import org.bruneel.pgpkeymanager.domain.RevocationReason;

public record ImportedKeyMetadata(
        String fingerprint,
        String keyId,
        String algorithm,
        String algorithmSpecJson,
        List<PgpCapability> capabilities,
        Instant expiresAt,
        int openpgpVersion,
        Instant revokedAt,
        RevocationReason revocationReason) {

    public ImportedKeyMetadata(
            String fingerprint,
            String keyId,
            String algorithm,
            String algorithmSpecJson,
            List<PgpCapability> capabilities,
            Instant expiresAt,
            int openpgpVersion) {
        this(fingerprint, keyId, algorithm, algorithmSpecJson, capabilities, expiresAt, openpgpVersion, null, null);
    }
}
