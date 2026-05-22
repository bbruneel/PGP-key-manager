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
    void primaryMustIncludeCertify() {
        assertThatThrownBy(
                        () ->
                                PgpKeyValidator.validatePrimaryCapabilities(
                                        PgpKeyValidator.parseCapabilities(List.of("sign"))))
                .isInstanceOf(BadRequestException.class);
    }
}
