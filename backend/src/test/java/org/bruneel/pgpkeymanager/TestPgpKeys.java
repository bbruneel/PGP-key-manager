package org.bruneel.pgpkeymanager;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.bruneel.pgpkeymanager.domain.KeyRole;
import org.bruneel.pgpkeymanager.domain.PgpCapability;
import org.bruneel.pgpkeymanager.domain.PgpKey;
import org.bruneel.pgpkeymanager.domain.PgpKey.KeyType;

public final class TestPgpKeys {

    private TestPgpKeys() {}

    public static PgpKey samplePublic(UUID userId) {
        UUID id = UUID.fromString("00000000-0000-0000-0000-000000000002");
        return new PgpKey(
                id,
                userId,
                "personal",
                "A1B2C3D4E5F6789012345678ABCDEF0123456789",
                "ABCDEF01",
                KeyType.PUBLIC,
                KeyRole.PRIMARY,
                null,
                List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                "ed25519",
                null,
                null,
                null,
                null,
                "-----BEGIN PGP PUBLIC KEY BLOCK-----",
                null,
                null,
                null,
                Instant.parse("2026-01-01T00:00:00Z"),
                Instant.parse("2026-01-01T00:00:00Z"));
    }
}
