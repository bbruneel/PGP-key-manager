package org.bruneel.pgpkeymanager.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;

import org.junit.jupiter.api.Test;

import org.bruneel.pgpkeymanager.domain.KeyRole;
import org.bruneel.pgpkeymanager.domain.PgpCapability;
import org.bruneel.pgpkeymanager.domain.PgpKey;
import org.bruneel.pgpkeymanager.domain.PgpKey.KeyType;
import org.bruneel.pgpkeymanager.web.dto.AlgorithmSpecDto;
import org.bruneel.pgpkeymanager.web.dto.CreateSubkeyRequest;
import org.bruneel.pgpkeymanager.web.dto.ValiditySpecDto;

import java.time.Instant;
import java.util.UUID;

class PgpKeyValidatorTest {

    @Test
    void subkeyRejectsEncryptAndAuthenticateTogether() {
        assertThatThrownBy(
                        () ->
                                PgpKeyValidator.validateSubkeyRequest(
                                        new CreateSubkeyRequest(
                                                List.of("encrypt", "authenticate"),
                                                new AlgorithmSpecDto("rsa", 4096, null),
                                                null,
                                                "passphrase".toCharArray()),
                                        4))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("separate subkeys");
    }

    @Test
    void subkeyMustNotCertify() {
        assertThatThrownBy(
                        () ->
                                PgpKeyValidator.validateSubkeyRequest(
                                        new CreateSubkeyRequest(
                                                List.of("certify", "encrypt"),
                                                new AlgorithmSpecDto("cv25519", null, null),
                                                new ValiditySpecDto(null, java.time.Instant.parse("2030-01-01T00:00:00Z")),
                                                "passphrase-12345678".toCharArray()),
                                        4))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void ecdsaRequiresCurve() {
        assertThatThrownBy(
                        () ->
                                PgpKeyValidator.validateSubkeyRequest(
                                        new CreateSubkeyRequest(
                                                List.of("sign"),
                                                new AlgorithmSpecDto("ecdsa", null, null),
                                                new ValiditySpecDto(null, java.time.Instant.parse("2030-01-01T00:00:00Z")),
                                                "passphrase-12345678".toCharArray()),
                                        4))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void invalidCapabilityQueryParam() {
        assertThatThrownBy(() -> PgpKeyValidator.parseCapabilityParam("not-a-capability"))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void normalizeOpenpgpVersionDefaultsToV4() {
        org.assertj.core.api.Assertions.assertThat(PgpKeyValidator.normalizeOpenpgpVersion(null)).isEqualTo(4);
        org.assertj.core.api.Assertions.assertThat(PgpKeyValidator.normalizeOpenpgpVersion(4)).isEqualTo(4);
        org.assertj.core.api.Assertions.assertThat(PgpKeyValidator.normalizeOpenpgpVersion(6)).isEqualTo(6);
    }

    @Test
    void normalizeOpenpgpVersionRejectsInvalid() {
        assertThatThrownBy(() -> PgpKeyValidator.normalizeOpenpgpVersion(5))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void rejectOpenpgpVersionOnRegister() {
        assertThatThrownBy(() -> PgpKeyValidator.rejectOpenpgpVersionOnRegister(6))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void validateDetectedOpenpgpVersionRejectsUnknown() {
        assertThatThrownBy(() -> PgpKeyValidator.validateDetectedOpenpgpVersion(5))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void primaryMustIncludeCertify() {
        assertThatThrownBy(
                        () ->
                                PgpKeyValidator.validatePrimaryCapabilities(
                                        PgpKeyValidator.parseCapabilities(List.of("sign"))))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void primaryRejectsEncryptionOnlyAlgorithm() {
        assertThatThrownBy(
                        () ->
                                PgpKeyValidator.validatePrimaryAlgorithm(
                                        new AlgorithmSpecDto("cv25519", null, null), 4))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void primaryRejectsRsaWithoutKeySize() {
        assertThatThrownBy(
                        () ->
                                PgpKeyValidator.validatePrimaryAlgorithm(
                                        new AlgorithmSpecDto("rsa", null, null), 4))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void primaryRejectsEcdsaWithoutCurve() {
        assertThatThrownBy(
                        () ->
                                PgpKeyValidator.validatePrimaryAlgorithm(
                                        new AlgorithmSpecDto("ecdsa", null, null), 4))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void primaryAcceptsEd25519Rsa4096AndEcdsaP256() {
        PgpKeyValidator.validatePrimaryAlgorithm(new AlgorithmSpecDto("ed25519", null, null), 4);
        PgpKeyValidator.validatePrimaryAlgorithm(new AlgorithmSpecDto("rsa", 4096, null), 4);
        PgpKeyValidator.validatePrimaryAlgorithm(new AlgorithmSpecDto("ecdsa", null, "P-256"), 4);
    }

    @Test
    void primaryRejectsEd448OnV4() {
        assertThatThrownBy(
                        () ->
                                PgpKeyValidator.validatePrimaryAlgorithm(
                                        new AlgorithmSpecDto("ed448", null, null), 4))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void subkeyRejectsX448OnV4() {
        assertThatThrownBy(
                        () ->
                                PgpKeyValidator.validateSubkeyRequest(
                                        new CreateSubkeyRequest(
                                                List.of("encrypt"),
                                                new AlgorithmSpecDto("x448", null, null),
                                                new ValiditySpecDto(null, java.time.Instant.parse("2030-01-01T00:00:00Z")),
                                                "passphrase-12345678".toCharArray()),
                                        4))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void primaryAcceptsEd448OnV6() {
        PgpKeyValidator.validatePrimaryAlgorithm(new AlgorithmSpecDto("ed448", null, null), 6);
    }

    @Test
    void primaryRejectsX448AsEncryptionOnly() {
        assertThatThrownBy(
                        () ->
                                PgpKeyValidator.validatePrimaryAlgorithm(
                                        new AlgorithmSpecDto("x448", null, null), 6))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("encryption-only");
    }

    @Test
    void subkeyRejectsEd448OnV4() {
        assertThatThrownBy(
                        () ->
                                PgpKeyValidator.validateSubkeyRequest(
                                        new CreateSubkeyRequest(
                                                List.of("sign"),
                                                new AlgorithmSpecDto("ed448", null, null),
                                                new ValiditySpecDto(null, java.time.Instant.parse("2030-01-01T00:00:00Z")),
                                                "passphrase-12345678".toCharArray()),
                                        4))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void subkeyAcceptsEd448SignOnV6() {
        PgpKeyValidator.validateSubkeyRequest(
                new CreateSubkeyRequest(
                        List.of("sign"),
                        new AlgorithmSpecDto("ed448", null, null),
                        new ValiditySpecDto(null, java.time.Instant.parse("2030-01-01T00:00:00Z")),
                        "passphrase-12345678".toCharArray()),
                6);
    }

    @Test
    void primaryInvalidAlgorithmUsesSigningKeysMessage() {
        assertThatThrownBy(
                        () ->
                                PgpKeyValidator.validatePrimaryAlgorithm(
                                        new AlgorithmSpecDto("bogus", null, null), 4))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Signing keys require");
    }

    @Test
    void validateSshExportableRequiresAuthenticateCapability() {
        PgpKey signOnly = authenticateSubkey("ed25519", List.of(PgpCapability.SIGN));

        assertThatThrownBy(() -> PgpKeyValidator.validateSshExportable(signOnly))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("authenticate");
    }

    @Test
    void validateSshExportableRejectsSignOnlyRsa() {
        PgpKey signOnlyRsa = authenticateSubkey("rsa", List.of(PgpCapability.SIGN));

        assertThatThrownBy(() -> PgpKeyValidator.validateSshExportable(signOnlyRsa))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("authenticate");
    }

    @Test
    void validateSshExportableRejectsEd448() {
        PgpKey ed448Auth = authenticateSubkey("ed448");

        assertThatThrownBy(() -> PgpKeyValidator.validateSshExportable(ed448Auth))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("ed25519, rsa, or ecdsa");
    }

    @Test
    void validateSshExportableAcceptsEd25519Authenticate() {
        PgpKey ed25519Auth = authenticateSubkey("ed25519");

        PgpKeyValidator.validateSshExportable(ed25519Auth);
    }

    private static PgpKey authenticateSubkey(String algorithm) {
        return authenticateSubkey(algorithm, List.of(PgpCapability.AUTHENTICATE));
    }

    private static PgpKey authenticateSubkey(String algorithm, List<PgpCapability> capabilities) {
        return new PgpKey(
                UUID.randomUUID(),
                UUID.randomUUID(),
                "auth-subkey",
                "A1B2C3D4E5F6789012345678ABCDEF0123456789",
                "ABCDEF01",
                KeyType.PUBLIC,
                KeyRole.SUBKEY,
                UUID.randomUUID(),
                capabilities,
                algorithm,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                4,
                Instant.parse("2026-01-01T00:00:00Z"),
                Instant.parse("2026-01-01T00:00:00Z"));
    }
}
