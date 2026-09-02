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
    void exportPublicSubkeyFromArmored() {
        GeneratedKeyMaterial primary =
                crypto.generatePrimary(
                        4,
                        List.of(new UserIdSpecDto("Subkey Export Test", null)),
                        List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                        new AlgorithmSpecDto("ed25519", null, null),
                        Instant.parse("2030-05-21T00:00:00Z"),
                        "export-test-passphrase".toCharArray());

        SubkeyMaterial sub =
                crypto.addSubkey(
                        4,
                        primary.armoredPrivate(),
                        "export-test-passphrase".toCharArray(),
                        List.of(PgpCapability.ENCRYPT),
                        new AlgorithmSpecDto("cv25519", null, null),
                        Instant.parse("2029-05-21T00:00:00Z"));

        long subKeyId = PgpCryptoSupport.parseKeyIdHex(sub.keyId());
        String exported = crypto.exportPublicKey(sub.updatedArmoredPublic(), subKeyId);

        assertThat(exported)
                .contains("BEGIN PGP PUBLIC KEY BLOCK")
                .doesNotContain("BEGIN PGP MESSAGE");
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
    void generatePrimaryEd448V6() {
        GeneratedKeyMaterial material =
                crypto.generatePrimary(
                        6,
                        List.of(new UserIdSpecDto("Ed448 User", null)),
                        List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                        new AlgorithmSpecDto("ed448", null, null),
                        Instant.parse("2030-05-21T00:00:00Z"),
                        "integration-test-passphrase".toCharArray());

        assertThat(material.armoredPublic()).contains("BEGIN PGP PUBLIC KEY BLOCK");
        assertThat(material.algorithm()).isEqualTo("ed448");
        assertThat(material.fingerprint()).isNotBlank();
        assertThat(material.keyId()).isNotBlank();
    }

    @Test
    void addX448EncryptionSubkeyV6() {
        GeneratedKeyMaterial primary =
                crypto.generatePrimary(
                        6,
                        List.of(new UserIdSpecDto("X448 Test", null)),
                        List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                        new AlgorithmSpecDto("ed25519", null, null),
                        Instant.parse("2030-05-21T00:00:00Z"),
                        "integration-test-passphrase".toCharArray());

        SubkeyMaterial sub =
                crypto.addSubkey(
                        6,
                        primary.armoredPrivate(),
                        "integration-test-passphrase".toCharArray(),
                        List.of(PgpCapability.ENCRYPT),
                        new AlgorithmSpecDto("x448", null, null),
                        Instant.parse("2029-05-21T00:00:00Z"));

        assertThat(sub.algorithm()).isEqualTo("x448");
    }

    @Test
    void rejectsEd448OnV4() {
        assertThatThrownBy(
                        () ->
                                crypto.generatePrimary(
                                        4,
                                        List.of(new UserIdSpecDto("Bad", null)),
                                        List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                                        new AlgorithmSpecDto("ed448", null, null),
                                        Instant.parse("2030-05-21T00:00:00Z"),
                                        "integration-test-passphrase".toCharArray()))
                .isInstanceOf(CryptoException.class)
                .cause()
                .isInstanceOf(CryptoException.class)
                .hasMessageContaining("OpenPGP v6");
    }

    @Test
    void rejectsX448OnV4() {
        assertThatThrownBy(
                        () ->
                                crypto.generatePrimary(
                                        4,
                                        List.of(new UserIdSpecDto("Bad", null)),
                                        List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                                        new AlgorithmSpecDto("x448", null, null),
                                        Instant.parse("2030-05-21T00:00:00Z"),
                                        "integration-test-passphrase".toCharArray()))
                .isInstanceOf(CryptoException.class)
                .cause()
                .isInstanceOf(CryptoException.class)
                .hasMessageContaining("OpenPGP v6");
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

    @Test
    void addSubkey_encryptAuthenticateRsaOnLifecycleKeyring() {
        char[] passphrase = "smoke-lifecycle-passphrase-1".toCharArray();
        GeneratedKeyMaterial primary =
                crypto.generatePrimary(
                        4,
                        List.of(new UserIdSpecDto("Lifecycle Smoke", "lifecycle@example.com")),
                        List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                        new AlgorithmSpecDto("ed25519", null, null),
                        Instant.parse("2030-06-01T00:00:00Z"),
                        passphrase);

        SubkeyMaterial encryptSub =
                crypto.addSubkey(
                        4,
                        primary.armoredPrivate(),
                        passphrase,
                        List.of(PgpCapability.ENCRYPT),
                        new AlgorithmSpecDto("cv25519", null, null),
                        Instant.parse("2029-06-01T00:00:00Z"));

        long encryptSubKeyId = PgpCryptoSupport.parseKeyIdHex(encryptSub.keyId());
        PgpCryptoService.KeyRingUpdate extended =
                crypto.extendExpiryInRing(
                        encryptSub.updatedArmoredPrivate(),
                        passphrase,
                        encryptSubKeyId,
                        Instant.parse("2031-06-01T00:00:00Z"));

        PgpCryptoService.KeyRingUpdate revoked =
                crypto.revokeKeyInRing(extended.armoredPrivate(), passphrase, encryptSubKeyId, 3);

        SubkeyMaterial secondEncrypt =
                crypto.addSubkey(
                        4,
                        revoked.armoredPrivate(),
                        passphrase,
                        List.of(PgpCapability.ENCRYPT),
                        new AlgorithmSpecDto("cv25519", null, null),
                        Instant.parse("2029-06-01T00:00:00Z"));

        long secondSubKeyId = PgpCryptoSupport.parseKeyIdHex(secondEncrypt.keyId());
        PgpCryptoService.KeyRingUpdate secondRevoked =
                crypto.revokeKeyInRing(
                        secondEncrypt.updatedArmoredPrivate(), passphrase, secondSubKeyId, 3);

        SubkeyMaterial thirdEncrypt =
                crypto.addSubkey(
                        4,
                        secondRevoked.armoredPrivate(),
                        passphrase,
                        List.of(PgpCapability.ENCRYPT),
                        new AlgorithmSpecDto("cv25519", null, null),
                        Instant.parse("2031-06-01T00:00:00Z"));

        long thirdSubKeyId = PgpCryptoSupport.parseKeyIdHex(thirdEncrypt.keyId());
        PgpCryptoService.KeyRingUpdate thirdExtended =
                crypto.extendExpiryInRing(
                        thirdEncrypt.updatedArmoredPrivate(),
                        passphrase,
                        thirdSubKeyId,
                        Instant.parse("2031-06-01T00:00:00Z"));

        SubkeyMaterial authSub =
                crypto.addSubkey(
                        4,
                        thirdExtended.armoredPrivate(),
                        passphrase,
                        List.of(PgpCapability.AUTHENTICATE),
                        new AlgorithmSpecDto("ed25519", null, null),
                        Instant.parse("2028-06-11T00:00:00Z"));

        assertThat(authSub.capabilities()).containsExactly(PgpCapability.AUTHENTICATE);
        assertThat(authSub.algorithm()).isEqualTo("ed25519");
    }

    @Test
    void addSubkey_wrongPassphraseReportsUnlockFailure() {
        GeneratedKeyMaterial primary =
                crypto.generatePrimary(
                        4,
                        List.of(new UserIdSpecDto("Passphrase Test", null)),
                        List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                        new AlgorithmSpecDto("ed25519", null, null),
                        Instant.parse("2030-06-01T00:00:00Z"),
                        "correct-passphrase".toCharArray());

        assertThatThrownBy(
                        () ->
                                crypto.addSubkey(
                                        4,
                                        primary.armoredPrivate(),
                                        "wrong-passphrase".toCharArray(),
                                        List.of(PgpCapability.AUTHENTICATE),
                                        new AlgorithmSpecDto("ed25519", null, null),
                                        Instant.parse("2029-06-01T00:00:00Z")))
                .isInstanceOf(CryptoException.class)
                .hasMessage("Passphrase does not unlock the private key");
    }

    @Test
    void exportSshPublicKey_ed25519AuthenticateSubkey() {
        GeneratedKeyMaterial primary =
                crypto.generatePrimary(
                        4,
                        List.of(new UserIdSpecDto("SSH Auth Test", null)),
                        List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                        new AlgorithmSpecDto("ed25519", null, null),
                        Instant.parse("2030-05-21T00:00:00Z"),
                        "ssh-export-passphrase".toCharArray());

        SubkeyMaterial sub =
                crypto.addSubkey(
                        4,
                        primary.armoredPrivate(),
                        "ssh-export-passphrase".toCharArray(),
                        List.of(PgpCapability.AUTHENTICATE),
                        new AlgorithmSpecDto("ed25519", null, null),
                        Instant.parse("2029-05-21T00:00:00Z"));

        long subKeyId = PgpCryptoSupport.parseKeyIdHex(sub.keyId());
        String sshLine =
                crypto.exportSshPublicKey(
                        sub.updatedArmoredPublic(), subKeyId, "openpgp:0x" + sub.keyId().toLowerCase());

        assertThat(sshLine).startsWith("ssh-ed25519 ");
        assertThat(sshLine).endsWith("openpgp:0x" + sub.keyId().toLowerCase());
        assertThat(sshLine.split(" ")).hasSize(3);
    }

    @Test
    void exportSshPublicKey_rsaAuthenticateSubkey() {
        GeneratedKeyMaterial primary =
                crypto.generatePrimary(
                        4,
                        List.of(new UserIdSpecDto("SSH RSA Test", null)),
                        List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                        new AlgorithmSpecDto("ed25519", null, null),
                        Instant.parse("2030-05-21T00:00:00Z"),
                        "ssh-export-passphrase".toCharArray());

        SubkeyMaterial sub =
                crypto.addSubkey(
                        4,
                        primary.armoredPrivate(),
                        "ssh-export-passphrase".toCharArray(),
                        List.of(PgpCapability.AUTHENTICATE),
                        new AlgorithmSpecDto("rsa", 2048, null),
                        Instant.parse("2029-05-21T00:00:00Z"));

        long subKeyId = PgpCryptoSupport.parseKeyIdHex(sub.keyId());
        String sshLine =
                crypto.exportSshPublicKey(
                        sub.updatedArmoredPublic(), subKeyId, "openpgp:0x" + sub.keyId().toLowerCase());

        assertThat(sshLine).startsWith("ssh-rsa ");
    }

    @Test
    void exportSshPublicKey_ecdsaAuthenticateSubkey() {
        GeneratedKeyMaterial primary =
                crypto.generatePrimary(
                        4,
                        List.of(new UserIdSpecDto("SSH ECDSA Test", null)),
                        List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                        new AlgorithmSpecDto("ed25519", null, null),
                        Instant.parse("2030-05-21T00:00:00Z"),
                        "ssh-export-passphrase".toCharArray());

        SubkeyMaterial sub =
                crypto.addSubkey(
                        4,
                        primary.armoredPrivate(),
                        "ssh-export-passphrase".toCharArray(),
                        List.of(PgpCapability.AUTHENTICATE),
                        new AlgorithmSpecDto("ecdsa", null, "P-256"),
                        Instant.parse("2029-05-21T00:00:00Z"));

        long subKeyId = PgpCryptoSupport.parseKeyIdHex(sub.keyId());
        String sshLine =
                crypto.exportSshPublicKey(
                        sub.updatedArmoredPublic(), subKeyId, "openpgp:0x" + sub.keyId().toLowerCase());

        assertThat(sshLine).startsWith("ecdsa-sha2-nistp");
    }

    @Test
    void exportSshPublicKey_rejectsSignOnlySubkey() {
        GeneratedKeyMaterial primary =
                crypto.generatePrimary(
                        4,
                        List.of(new UserIdSpecDto("SSH Sign Test", null)),
                        List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                        new AlgorithmSpecDto("ed25519", null, null),
                        Instant.parse("2030-05-21T00:00:00Z"),
                        "ssh-export-passphrase".toCharArray());

        SubkeyMaterial sub =
                crypto.addSubkey(
                        4,
                        primary.armoredPrivate(),
                        "ssh-export-passphrase".toCharArray(),
                        List.of(PgpCapability.SIGN),
                        new AlgorithmSpecDto("ed25519", null, null),
                        Instant.parse("2029-05-21T00:00:00Z"));

        long subKeyId = PgpCryptoSupport.parseKeyIdHex(sub.keyId());

        assertThatThrownBy(
                        () ->
                                crypto.exportSshPublicKey(
                                        sub.updatedArmoredPublic(),
                                        subKeyId,
                                        "openpgp:0x" + sub.keyId().toLowerCase()))
                .isInstanceOf(CryptoException.class)
                .hasMessageContaining("authenticate");
    }

    @Test
    void exportSshPublicKey_rejectsCv25519Subkey() {
        GeneratedKeyMaterial primary =
                crypto.generatePrimary(
                        4,
                        List.of(new UserIdSpecDto("SSH Encrypt Test", null)),
                        List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                        new AlgorithmSpecDto("ed25519", null, null),
                        Instant.parse("2030-05-21T00:00:00Z"),
                        "ssh-export-passphrase".toCharArray());

        SubkeyMaterial sub =
                crypto.addSubkey(
                        4,
                        primary.armoredPrivate(),
                        "ssh-export-passphrase".toCharArray(),
                        List.of(PgpCapability.ENCRYPT),
                        new AlgorithmSpecDto("cv25519", null, null),
                        Instant.parse("2029-05-21T00:00:00Z"));

        long subKeyId = PgpCryptoSupport.parseKeyIdHex(sub.keyId());

        assertThatThrownBy(
                        () ->
                                crypto.exportSshPublicKey(
                                        sub.updatedArmoredPublic(),
                                        subKeyId,
                                        "openpgp:0x" + sub.keyId().toLowerCase()))
                .isInstanceOf(CryptoException.class)
                .hasMessageContaining("OpenSSH");
    }

    @Test
    void exportSshPrivateKey_ed25519AuthenticateSubkeyMatchesPublic() {
        GeneratedKeyMaterial primary =
                crypto.generatePrimary(
                        4,
                        List.of(new UserIdSpecDto("SSH Auth Private Test", null)),
                        List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                        new AlgorithmSpecDto("ed25519", null, null),
                        Instant.parse("2030-05-21T00:00:00Z"),
                        "ssh-export-passphrase".toCharArray());

        SubkeyMaterial sub =
                crypto.addSubkey(
                        4,
                        primary.armoredPrivate(),
                        "ssh-export-passphrase".toCharArray(),
                        List.of(PgpCapability.AUTHENTICATE),
                        new AlgorithmSpecDto("ed25519", null, null),
                        Instant.parse("2029-05-21T00:00:00Z"));

        long subKeyId = PgpCryptoSupport.parseKeyIdHex(sub.keyId());
        String comment = "openpgp:0x" + sub.keyId().toLowerCase();
        String publicLine = crypto.exportSshPublicKey(sub.updatedArmoredPublic(), subKeyId, comment);
        String privatePem =
                crypto.exportSshPrivateKey(
                        sub.updatedArmoredPrivate(), "ssh-export-passphrase".toCharArray(), subKeyId);

        assertThat(privatePem).contains("BEGIN OPENSSH PRIVATE KEY");
        assertThat(privatePem).contains("END OPENSSH PRIVATE KEY");
        assertThat(sshPublicLineFromPrivatePem(privatePem)).isEqualTo(publicLine.split(" ", 3)[0] + " " + publicLine.split(" ", 3)[1]);
    }

    @Test
    void exportSshPrivateKey_rsaAuthenticateSubkey() {
        GeneratedKeyMaterial primary =
                crypto.generatePrimary(
                        4,
                        List.of(new UserIdSpecDto("SSH RSA Private Test", null)),
                        List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                        new AlgorithmSpecDto("ed25519", null, null),
                        Instant.parse("2030-05-21T00:00:00Z"),
                        "ssh-export-passphrase".toCharArray());

        SubkeyMaterial sub =
                crypto.addSubkey(
                        4,
                        primary.armoredPrivate(),
                        "ssh-export-passphrase".toCharArray(),
                        List.of(PgpCapability.AUTHENTICATE),
                        new AlgorithmSpecDto("rsa", 2048, null),
                        Instant.parse("2029-05-21T00:00:00Z"));

        long subKeyId = PgpCryptoSupport.parseKeyIdHex(sub.keyId());
        String privatePem =
                crypto.exportSshPrivateKey(
                        sub.updatedArmoredPrivate(), "ssh-export-passphrase".toCharArray(), subKeyId);

        assertThat(privatePem).contains("BEGIN RSA PRIVATE KEY");
        String publicLine =
                crypto.exportSshPublicKey(
                        sub.updatedArmoredPublic(),
                        subKeyId,
                        "openpgp:0x" + sub.keyId().toLowerCase());
        assertThat(sshPublicLineFromPrivatePem(privatePem))
                .isEqualTo(publicLine.split(" ", 3)[0] + " " + publicLine.split(" ", 3)[1]);
    }

    @Test
    void exportSshPrivateKey_ecdsaAuthenticateSubkey() {
        GeneratedKeyMaterial primary =
                crypto.generatePrimary(
                        4,
                        List.of(new UserIdSpecDto("SSH ECDSA Private Test", null)),
                        List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                        new AlgorithmSpecDto("ed25519", null, null),
                        Instant.parse("2030-05-21T00:00:00Z"),
                        "ssh-export-passphrase".toCharArray());

        SubkeyMaterial sub =
                crypto.addSubkey(
                        4,
                        primary.armoredPrivate(),
                        "ssh-export-passphrase".toCharArray(),
                        List.of(PgpCapability.AUTHENTICATE),
                        new AlgorithmSpecDto("ecdsa", null, "P-256"),
                        Instant.parse("2029-05-21T00:00:00Z"));

        long subKeyId = PgpCryptoSupport.parseKeyIdHex(sub.keyId());
        String privatePem =
                crypto.exportSshPrivateKey(
                        sub.updatedArmoredPrivate(), "ssh-export-passphrase".toCharArray(), subKeyId);

        assertThat(privatePem).contains("BEGIN OPENSSH PRIVATE KEY");
        String publicLine =
                crypto.exportSshPublicKey(
                        sub.updatedArmoredPublic(),
                        subKeyId,
                        "openpgp:0x" + sub.keyId().toLowerCase());
        assertThat(sshPublicLineFromPrivatePem(privatePem))
                .isEqualTo(publicLine.split(" ", 3)[0] + " " + publicLine.split(" ", 3)[1]);
    }

    @Test
    void exportSshPrivateKey_rejectsSignOnlySubkey() {
        GeneratedKeyMaterial primary =
                crypto.generatePrimary(
                        4,
                        List.of(new UserIdSpecDto("SSH Sign Private Test", null)),
                        List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                        new AlgorithmSpecDto("ed25519", null, null),
                        Instant.parse("2030-05-21T00:00:00Z"),
                        "ssh-export-passphrase".toCharArray());

        SubkeyMaterial sub =
                crypto.addSubkey(
                        4,
                        primary.armoredPrivate(),
                        "ssh-export-passphrase".toCharArray(),
                        List.of(PgpCapability.SIGN),
                        new AlgorithmSpecDto("ed25519", null, null),
                        Instant.parse("2029-05-21T00:00:00Z"));

        long subKeyId = PgpCryptoSupport.parseKeyIdHex(sub.keyId());

        assertThatThrownBy(
                        () ->
                                crypto.exportSshPrivateKey(
                                        sub.updatedArmoredPrivate(),
                                        "ssh-export-passphrase".toCharArray(),
                                        subKeyId))
                .isInstanceOf(CryptoException.class)
                .hasMessageContaining("authenticate");
    }

    @Test
    void exportSshPrivateKey_rejectsCv25519Subkey() {
        GeneratedKeyMaterial primary =
                crypto.generatePrimary(
                        4,
                        List.of(new UserIdSpecDto("SSH Encrypt Private Test", null)),
                        List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                        new AlgorithmSpecDto("ed25519", null, null),
                        Instant.parse("2030-05-21T00:00:00Z"),
                        "ssh-export-passphrase".toCharArray());

        SubkeyMaterial sub =
                crypto.addSubkey(
                        4,
                        primary.armoredPrivate(),
                        "ssh-export-passphrase".toCharArray(),
                        List.of(PgpCapability.ENCRYPT),
                        new AlgorithmSpecDto("cv25519", null, null),
                        Instant.parse("2029-05-21T00:00:00Z"));

        long subKeyId = PgpCryptoSupport.parseKeyIdHex(sub.keyId());

        assertThatThrownBy(
                        () ->
                                crypto.exportSshPrivateKey(
                                        sub.updatedArmoredPrivate(),
                                        "ssh-export-passphrase".toCharArray(),
                                        subKeyId))
                .isInstanceOf(CryptoException.class)
                .hasMessageContaining("OpenSSH");
    }

    @Test
    void exportSshPrivateKey_wrongPassphrase() {
        GeneratedKeyMaterial primary =
                crypto.generatePrimary(
                        4,
                        List.of(new UserIdSpecDto("SSH Wrong Pass Test", null)),
                        List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                        new AlgorithmSpecDto("ed25519", null, null),
                        Instant.parse("2030-05-21T00:00:00Z"),
                        "ssh-export-passphrase".toCharArray());

        SubkeyMaterial sub =
                crypto.addSubkey(
                        4,
                        primary.armoredPrivate(),
                        "ssh-export-passphrase".toCharArray(),
                        List.of(PgpCapability.AUTHENTICATE),
                        new AlgorithmSpecDto("ed25519", null, null),
                        Instant.parse("2029-05-21T00:00:00Z"));

        long subKeyId = PgpCryptoSupport.parseKeyIdHex(sub.keyId());

        assertThatThrownBy(
                        () ->
                                crypto.exportSshPrivateKey(
                                        sub.updatedArmoredPrivate(),
                                        "wrong-passphrase".toCharArray(),
                                        subKeyId))
                .isInstanceOf(CryptoException.class)
                .hasMessage("Passphrase does not unlock the private key");
    }

    /** Returns "type base64" (no comment) derived from an OpenSSH / PKCS#1 private PEM. */
    private static String sshPublicLineFromPrivatePem(String privatePem) {
        try (java.io.StringReader reader = new java.io.StringReader(privatePem);
                org.bouncycastle.util.io.pem.PemReader pemReader =
                        new org.bouncycastle.util.io.pem.PemReader(reader)) {
            org.bouncycastle.util.io.pem.PemObject pem = pemReader.readPemObject();
            org.bouncycastle.crypto.params.AsymmetricKeyParameter privateParams =
                    org.bouncycastle.crypto.util.OpenSSHPrivateKeyUtil.parsePrivateKeyBlob(pem.getContent());
            org.bouncycastle.crypto.params.AsymmetricKeyParameter publicParams =
                    toPublicParams(privateParams);
            byte[] encoded =
                    org.bouncycastle.crypto.util.OpenSSHPublicKeyUtil.encodePublicKey(publicParams);
            String type = sshType(publicParams);
            return type + " " + java.util.Base64.getEncoder().encodeToString(encoded);
        } catch (Exception e) {
            throw new AssertionError("Failed to derive SSH public key from private PEM", e);
        }
    }

    private static org.bouncycastle.crypto.params.AsymmetricKeyParameter toPublicParams(
            org.bouncycastle.crypto.params.AsymmetricKeyParameter privateParams) {
        if (privateParams instanceof org.bouncycastle.crypto.params.Ed25519PrivateKeyParameters ed) {
            return ed.generatePublicKey();
        }
        if (privateParams instanceof org.bouncycastle.crypto.params.RSAPrivateCrtKeyParameters rsa) {
            return new org.bouncycastle.crypto.params.RSAKeyParameters(false, rsa.getModulus(), rsa.getPublicExponent());
        }
        if (privateParams instanceof org.bouncycastle.crypto.params.ECPrivateKeyParameters ec) {
            org.bouncycastle.math.ec.ECPoint q =
                    new org.bouncycastle.math.ec.FixedPointCombMultiplier()
                            .multiply(ec.getParameters().getG(), ec.getD())
                            .normalize();
            return new org.bouncycastle.crypto.params.ECPublicKeyParameters(q, ec.getParameters());
        }
        throw new AssertionError("Unsupported private key type: " + privateParams.getClass());
    }

    private static String sshType(org.bouncycastle.crypto.params.AsymmetricKeyParameter params) {
        if (params instanceof org.bouncycastle.crypto.params.Ed25519PublicKeyParameters) {
            return "ssh-ed25519";
        }
        if (params instanceof org.bouncycastle.crypto.params.RSAKeyParameters) {
            return "ssh-rsa";
        }
        if (params instanceof org.bouncycastle.crypto.params.ECPublicKeyParameters ec
                && ec.getParameters() instanceof org.bouncycastle.crypto.params.ECNamedDomainParameters named) {
            return switch (named.getName().getId()) {
                case "1.2.840.10045.3.1.7" -> "ecdsa-sha2-nistp256";
                case "1.3.132.0.34" -> "ecdsa-sha2-nistp384";
                case "1.3.132.0.35" -> "ecdsa-sha2-nistp521";
                default -> throw new AssertionError("Unsupported ECDSA curve");
            };
        }
        throw new AssertionError("Unsupported public key type: " + params.getClass());
    }
}
