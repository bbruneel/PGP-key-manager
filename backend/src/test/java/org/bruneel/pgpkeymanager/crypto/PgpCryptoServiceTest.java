package org.bruneel.pgpkeymanager.crypto;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.Test;

import org.bruneel.pgpkeymanager.domain.PgpCapability;
import org.bruneel.pgpkeymanager.service.CryptoException;
import org.bruneel.pgpkeymanager.web.dto.AlgorithmSpecDto;
import org.bruneel.pgpkeymanager.web.dto.UserIdSpecDto;

class PgpCryptoServiceTest {

    private final PgpCryptoService crypto = new PgpCryptoService();

    @Test
    void generatePrimaryEd25519() {
        GeneratedKeyMaterial material =
                crypto.generatePrimary(
                        4,
                        List.of(new UserIdSpecDto("Test User", "test@example.com")),
                        List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                        new AlgorithmSpecDto("ed25519", null, null),
                        Instant.parse("2030-05-21T00:00:00Z"),
                        "integration-test-passphrase".toCharArray());

        assertThat(material.fingerprint()).isNotBlank();
        assertThat(material.keyId()).isNotBlank();
        assertThat(material.armoredPublic()).contains("BEGIN PGP PUBLIC KEY BLOCK");
        assertThat(material.armoredPrivate()).contains("BEGIN PGP PRIVATE KEY BLOCK");
    }

    @Test
    void addSubkeyToGeneratedPrimary() {
        GeneratedKeyMaterial primary =
                crypto.generatePrimary(
                        4,
                        List.of(new UserIdSpecDto("Test User", null)),
                        List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                        new AlgorithmSpecDto("ed25519", null, null),
                        Instant.parse("2030-05-21T00:00:00Z"),
                        "integration-test-passphrase".toCharArray());

        SubkeyMaterial sub =
                crypto.addSubkey(
                        4,
                        primary.armoredPrivate(),
                        "integration-test-passphrase".toCharArray(),
                        List.of(PgpCapability.ENCRYPT),
                        new AlgorithmSpecDto("cv25519", null, null),
                        Instant.parse("2029-05-21T00:00:00Z"));

        assertThat(sub.fingerprint()).isNotEqualTo(primary.fingerprint());
        assertThat(sub.updatedArmoredPrivate()).contains("BEGIN PGP PRIVATE KEY BLOCK");
    }

    @Test
    void exportPublicFromArmored() {
        GeneratedKeyMaterial primary =
                crypto.generatePrimary(
                        4,
                        List.of(new UserIdSpecDto("Export Test", null)),
                        List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                        new AlgorithmSpecDto("ed25519", null, null),
                        Instant.parse("2030-05-21T00:00:00Z"),
                        "export-test-passphrase".toCharArray());

        String exported = crypto.exportPublicKey(primary.armoredPublic(), 0);
        assertThat(exported).contains("BEGIN PGP PUBLIC KEY BLOCK");
    }

    @Test
    void addEcdsaSigningSubkey() {
        GeneratedKeyMaterial primary =
                crypto.generatePrimary(
                        4,
                        List.of(new UserIdSpecDto("ECDSA Test", null)),
                        List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                        new AlgorithmSpecDto("ed25519", null, null),
                        Instant.parse("2030-05-21T00:00:00Z"),
                        "integration-test-passphrase".toCharArray());

        SubkeyMaterial sub =
                crypto.addSubkey(
                        4,
                        primary.armoredPrivate(),
                        "integration-test-passphrase".toCharArray(),
                        List.of(PgpCapability.SIGN),
                        new AlgorithmSpecDto("ecdsa", null, "P-256"),
                        Instant.parse("2029-05-21T00:00:00Z"));

        assertThat(sub.algorithm()).isEqualTo("ecdsa");
        assertThat(sub.keyId()).hasSize(16);
    }

    @Test
    void addEcdhEncryptionSubkey() {
        GeneratedKeyMaterial primary =
                crypto.generatePrimary(
                        4,
                        List.of(new UserIdSpecDto("ECDH Test", null)),
                        List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                        new AlgorithmSpecDto("ed25519", null, null),
                        Instant.parse("2030-05-21T00:00:00Z"),
                        "integration-test-passphrase".toCharArray());

        SubkeyMaterial sub =
                crypto.addSubkey(
                        4,
                        primary.armoredPrivate(),
                        "integration-test-passphrase".toCharArray(),
                        List.of(PgpCapability.ENCRYPT),
                        new AlgorithmSpecDto("ecdh", null, "P-256"),
                        Instant.parse("2029-05-21T00:00:00Z"));

        assertThat(sub.algorithm()).isEqualTo("ecdh");
    }

    @Test
    void keyIdIsZeroPadded() {
        GeneratedKeyMaterial material =
                crypto.generatePrimary(
                        4,
                        List.of(new UserIdSpecDto("Pad Test", null)),
                        List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                        new AlgorithmSpecDto("ed25519", null, null),
                        Instant.parse("2030-05-21T00:00:00Z"),
                        "integration-test-passphrase".toCharArray());

        assertThat(material.keyId()).matches("[0-9A-F]{16}");
    }

    @Test
    void extendSubkeyExpiryInRing() {
        GeneratedKeyMaterial primary =
                crypto.generatePrimary(
                        4,
                        List.of(new UserIdSpecDto("Extend Test", null)),
                        List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                        new AlgorithmSpecDto("ed25519", null, null),
                        Instant.parse("2030-05-21T00:00:00Z"),
                        "integration-test-passphrase".toCharArray());

        SubkeyMaterial sub =
                crypto.addSubkey(
                        4,
                        primary.armoredPrivate(),
                        "integration-test-passphrase".toCharArray(),
                        List.of(PgpCapability.ENCRYPT),
                        new AlgorithmSpecDto("cv25519", null, null),
                        Instant.parse("2029-05-21T00:00:00Z"));

        long subKeyId = PgpCryptoSupport.parseKeyIdHex(sub.keyId());
        PgpCryptoService.KeyRingUpdate updated =
                crypto.extendExpiryInRing(
                        sub.updatedArmoredPrivate(),
                        "integration-test-passphrase".toCharArray(),
                        subKeyId,
                        Instant.parse("2031-05-21T00:00:00Z"));

        assertThat(updated.armoredPrivate()).contains("BEGIN PGP PRIVATE KEY BLOCK");
    }

    @Test
    void revokeSubkeyInRing() {
        GeneratedKeyMaterial primary =
                crypto.generatePrimary(
                        4,
                        List.of(new UserIdSpecDto("Revoke Test", null)),
                        List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                        new AlgorithmSpecDto("ed25519", null, null),
                        Instant.parse("2030-05-21T00:00:00Z"),
                        "integration-test-passphrase".toCharArray());

        SubkeyMaterial sub =
                crypto.addSubkey(
                        4,
                        primary.armoredPrivate(),
                        "integration-test-passphrase".toCharArray(),
                        List.of(PgpCapability.ENCRYPT),
                        new AlgorithmSpecDto("cv25519", null, null),
                        Instant.parse("2029-05-21T00:00:00Z"));

        long subKeyId = PgpCryptoSupport.parseKeyIdHex(sub.keyId());
        PgpCryptoService.KeyRingUpdate updated =
                crypto.revokeKeyInRing(
                        sub.updatedArmoredPrivate(),
                        "integration-test-passphrase".toCharArray(),
                        subKeyId,
                        3);

        assertThat(updated.armoredPublic()).contains("BEGIN PGP PUBLIC KEY BLOCK");
    }

    @Test
    void generatePrimaryV6ProducesArmoredKeyring() {
        GeneratedKeyMaterial material =
                crypto.generatePrimary(
                        6,
                        List.of(new UserIdSpecDto("V6 User", "v6@example.com")),
                        List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                        new AlgorithmSpecDto("ed25519", null, null),
                        Instant.parse("2030-05-21T00:00:00Z"),
                        "integration-test-passphrase".toCharArray());

        assertThat(material.armoredPublic()).contains("BEGIN PGP PUBLIC KEY BLOCK");
        assertThat(material.armoredPrivate()).contains("BEGIN PGP PRIVATE KEY BLOCK");
    }

    @Test
    void rejectsPastExpiry() {
        assertThatThrownBy(
                        () ->
                                crypto.generatePrimary(
                                        4,
                                        List.of(new UserIdSpecDto("Bad", null)),
                                        List.of(PgpCapability.CERTIFY),
                                        new AlgorithmSpecDto("ed25519", null, null),
                                        Instant.parse("2020-01-01T00:00:00Z"),
                                        "passphrase-12345678".toCharArray()))
                .isInstanceOf(CryptoException.class);
    }
}
