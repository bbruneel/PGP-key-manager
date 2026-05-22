package org.bruneel.pgpkeymanager.crypto;

import java.time.Instant;
import java.util.List;

import org.bruneel.pgpkeymanager.domain.PgpCapability;

public record SubkeyMaterial(
        String fingerprint,
        String keyId,
        String algorithm,
        String algorithmSpecJson,
        List<PgpCapability> capabilities,
        Instant expiresAt,
        String updatedArmoredPublic,
        String updatedArmoredPrivate) {}
