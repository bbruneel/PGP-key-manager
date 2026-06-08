package org.bruneel.pgpkeymanager.crypto;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.bruneel.pgpkeymanager.domain.PgpCapability;
import org.bruneel.pgpkeymanager.service.BadRequestException;
import org.bruneel.pgpkeymanager.web.dto.AlgorithmSpecDto;
import org.bruneel.pgpkeymanager.web.dto.UserIdSpecDto;

class PgpKeyMetadataParserTest {

    private final PgpCryptoService crypto = new PgpCryptoService();
    private PgpKeyMetadataParser parser;

    @BeforeEach
    void setUp() {
        parser = new PgpKeyMetadataParser();
    }

    @Test
    void parseEd25519PrimaryWithExpiryAndCapabilities() {
        GeneratedKeyMaterial material =
                crypto.generatePrimary(
                        4,
                        List.of(new UserIdSpecDto("Parser Test", "parser@example.com")),
                        List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                        new AlgorithmSpecDto("ed25519", null, null),
                        Instant.parse("2030-05-21T00:00:00Z"),
                        "parser-test-passphrase".toCharArray());

        ImportedKeyMetadata metadata = parser.parse(material.armoredPublic(), null);

        assertThat(metadata.fingerprint()).isEqualTo(material.fingerprint());
        assertThat(metadata.keyId()).isEqualTo(material.keyId());
        assertThat(metadata.algorithm()).isEqualTo("ed25519");
        assertThat(metadata.algorithmSpecJson()).contains("ed25519");
        assertThat(metadata.capabilities())
                .containsExactlyInAnyOrder(PgpCapability.CERTIFY, PgpCapability.SIGN);
        assertThat(metadata.expiresAt()).isEqualTo(Instant.parse("2030-05-21T00:00:00Z"));
        assertThat(metadata.openpgpVersion()).isEqualTo(4);
    }

    @Test
    void parsePrimaryWithoutExpiry() {
        GeneratedKeyMaterial material =
                crypto.generatePrimary(
                        4,
                        List.of(new UserIdSpecDto("No Expiry", null)),
                        List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                        new AlgorithmSpecDto("ed25519", null, null),
                        null,
                        "no-expiry-passphrase".toCharArray());

        ImportedKeyMetadata metadata = parser.parse(material.armoredPublic(), null);

        assertThat(metadata.expiresAt()).isNull();
        assertThat(metadata.fingerprint()).isEqualTo(material.fingerprint());
    }

    @Test
    void parseFromPrivateArmoredWhenPublicMissing() {
        GeneratedKeyMaterial material =
                crypto.generatePrimary(
                        4,
                        List.of(new UserIdSpecDto("Private Only", null)),
                        List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                        new AlgorithmSpecDto("ed25519", null, null),
                        null,
                        "private-only-passphrase".toCharArray());

        ImportedKeyMetadata metadata = parser.parse(null, material.armoredPrivate());

        assertThat(metadata.fingerprint()).isEqualTo(material.fingerprint());
        assertThat(metadata.algorithm()).isEqualTo("ed25519");
    }

    @Test
    void parseRsaPrimary() {
        GeneratedKeyMaterial material =
                crypto.generatePrimary(
                        4,
                        List.of(new UserIdSpecDto("RSA Test", null)),
                        List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                        new AlgorithmSpecDto("rsa", 4096, null),
                        null,
                        "rsa-test-passphrase".toCharArray());

        ImportedKeyMetadata metadata = parser.parse(material.armoredPublic(), null);

        assertThat(metadata.algorithm()).isEqualTo("rsa");
        assertThat(metadata.algorithmSpecJson()).contains("\"keySize\":4096");
        assertThat(metadata.fingerprint()).isEqualTo(material.fingerprint());
    }

    @Test
    void parseEcdsaPrimary() {
        GeneratedKeyMaterial material =
                crypto.generatePrimary(
                        4,
                        List.of(new UserIdSpecDto("ECDSA Test", null)),
                        List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                        new AlgorithmSpecDto("ecdsa", null, "P-256"),
                        null,
                        "ecdsa-test-passphrase".toCharArray());

        ImportedKeyMetadata metadata = parser.parse(material.armoredPublic(), null);

        assertThat(metadata.algorithm()).isEqualTo("ecdsa");
        assertThat(metadata.algorithmSpecJson()).contains("P-256");
        assertThat(metadata.fingerprint()).isEqualTo(material.fingerprint());
    }

    @Test
    void mismatchedPublicAndPrivateThrowsBadRequest() {
        GeneratedKeyMaterial first =
                crypto.generatePrimary(
                        4,
                        List.of(new UserIdSpecDto("First", null)),
                        List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                        new AlgorithmSpecDto("ed25519", null, null),
                        null,
                        "first-passphrase".toCharArray());
        GeneratedKeyMaterial second =
                crypto.generatePrimary(
                        4,
                        List.of(new UserIdSpecDto("Second", null)),
                        List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                        new AlgorithmSpecDto("ed25519", null, null),
                        null,
                        "second-passphrase".toCharArray());

        assertThatThrownBy(() -> parser.parse(first.armoredPublic(), second.armoredPrivate()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("do not match");
    }

    @Test
    void invalidArmorThrowsBadRequest() {
        assertThatThrownBy(() -> parser.parse("not armored data", null))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Invalid or unreadable armored key material");
    }

    @Test
    void missingArmorThrowsBadRequest() {
        assertThatThrownBy(() -> parser.parse(null, null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("armored");
    }

    @Test
    void validateFingerprintMatchWhenProvided() {
        GeneratedKeyMaterial material =
                crypto.generatePrimary(
                        4,
                        List.of(new UserIdSpecDto("Match Test", null)),
                        List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                        new AlgorithmSpecDto("ed25519", null, null),
                        null,
                        "match-test-passphrase".toCharArray());

        ImportedKeyMetadata metadata = parser.parse(material.armoredPublic(), null);

        parser.validateFingerprintMatch(metadata, material.fingerprint());
        parser.validateFingerprintMatch(metadata, " " + material.fingerprint().substring(0, 8) + " "
                + material.fingerprint().substring(8));
    }

    @Test
    void validateFingerprintMismatchThrowsBadRequest() {
        GeneratedKeyMaterial material =
                crypto.generatePrimary(
                        4,
                        List.of(new UserIdSpecDto("Mismatch Test", null)),
                        List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                        new AlgorithmSpecDto("ed25519", null, null),
                        null,
                        "mismatch-test-passphrase".toCharArray());

        ImportedKeyMetadata metadata = parser.parse(material.armoredPublic(), null);

        assertThatThrownBy(() -> parser.validateFingerprintMatch(metadata, "DEADBEEF0123456789ABCDEF0123456789ABCD"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("fingerprint");
    }
}
