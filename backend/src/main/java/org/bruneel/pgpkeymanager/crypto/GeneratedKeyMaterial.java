package org.bruneel.pgpkeymanager.crypto;

import java.time.Instant;
import java.util.List;

import org.bruneel.pgpkeymanager.domain.PgpCapability;

public record GeneratedKeyMaterial(
        String fingerprint,
        String keyId,
        String algorithm,
        String algorithmSpecJson,
        List<PgpCapability> capabilities,
        Instant expiresAt,
        String armoredPublic,
        String armoredPrivate) {}
