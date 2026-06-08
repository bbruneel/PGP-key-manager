package org.bruneel.pgpkeymanager;

import java.time.Instant;
import java.util.List;

import org.bruneel.pgpkeymanager.crypto.GeneratedKeyMaterial;
import org.bruneel.pgpkeymanager.crypto.PgpCryptoService;
import org.bruneel.pgpkeymanager.domain.PgpCapability;
import org.bruneel.pgpkeymanager.web.dto.AlgorithmSpecDto;
import org.bruneel.pgpkeymanager.web.dto.UserIdSpecDto;

/** Generates armored key fixtures for integration tests. */
public final class TestArmoredKeys {

    private static final PgpCryptoService CRYPTO = new PgpCryptoService();

    private TestArmoredKeys() {}

    public static GeneratedKeyMaterial sampleEd25519PublicKey() {
        return CRYPTO.generatePrimary(
                4,
                List.of(new UserIdSpecDto("Integration Test", "integration@example.com")),
                List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                new AlgorithmSpecDto("ed25519", null, null),
                Instant.parse("2030-06-01T00:00:00Z"),
                "integration-test-passphrase".toCharArray());
    }
}
