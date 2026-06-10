package org.bruneel.pgpkeymanager.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;

import org.junit.jupiter.api.Test;

import org.bruneel.pgpkeymanager.web.dto.AlgorithmSpecDto;
import org.bruneel.pgpkeymanager.web.dto.CreateSubkeyRequest;
import org.bruneel.pgpkeymanager.web.dto.ValiditySpecDto;

class PgpKeyValidatorTest {

    @Test
    void subkeyMustNotCertify() {
        assertThatThrownBy(
                        () ->
                                PgpKeyValidator.validateSubkeyRequest(
                                        new CreateSubkeyRequest(
                                                List.of("certify", "encrypt"),
                                                new AlgorithmSpecDto("cv25519", null, null),
                                                new ValiditySpecDto(null, java.time.Instant.parse("2030-01-01T00:00:00Z")),
                                                "passphrase-12345678")))
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
                                                "passphrase-12345678")))
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
                                                "passphrase-12345678"),
                                        4))
                .isInstanceOf(BadRequestException.class);
    }
}
