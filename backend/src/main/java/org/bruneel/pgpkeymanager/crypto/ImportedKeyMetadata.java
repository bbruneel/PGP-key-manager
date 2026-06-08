package org.bruneel.pgpkeymanager.crypto;

import java.time.Instant;
import java.util.List;

import org.bruneel.pgpkeymanager.domain.PgpCapability;

public record ImportedKeyMetadata(
        String fingerprint,
        String keyId,
        String algorithm,
        String algorithmSpecJson,
        List<PgpCapability> capabilities,
        Instant expiresAt,
        int openpgpVersion) {}
