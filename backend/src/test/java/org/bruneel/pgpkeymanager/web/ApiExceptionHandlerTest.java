package org.bruneel.pgpkeymanager.web;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;

import org.bruneel.pgpkeymanager.service.CryptoException;

class ApiExceptionHandlerTest {

    @Test
    void cryptoExceptionReturnsGenericClientMessage() {
        ApiExceptionHandler handler = new ApiExceptionHandler();
        ResponseEntity<ProblemDetail> response =
                handler.crypto(new CryptoException("internal BC error detail"));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getDetail())
                .isEqualTo("Cryptographic operation failed. Check request parameters.");
        assertThat(response.getBody().getDetail()).doesNotContain("internal BC");
    }
}
