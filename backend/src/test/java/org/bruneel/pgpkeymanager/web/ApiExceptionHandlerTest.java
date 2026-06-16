package org.bruneel.pgpkeymanager.web;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;

import org.bruneel.pgpkeymanager.service.CryptoException;
import org.bruneel.pgpkeymanager.service.ForbiddenGroupActionException;
import org.bruneel.pgpkeymanager.service.GroupNotFoundException;
import org.bruneel.pgpkeymanager.service.PlatformAdminRequiredException;

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

    @Test
    void cryptoExceptionReturnsPassphraseDetailWhenDirectMessage() {
        ApiExceptionHandler handler = new ApiExceptionHandler();
        ResponseEntity<ProblemDetail> response =
                handler.crypto(new CryptoException("Passphrase does not unlock the private key"));

        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getDetail())
                .isEqualTo("Passphrase does not unlock the private key");
    }

    @Test
    void groupNotFoundMapsTo404() {
        ApiExceptionHandler handler = new ApiExceptionHandler();
        ResponseEntity<ProblemDetail> response =
                handler.groupNotFound(new GroupNotFoundException(java.util.UUID.randomUUID()));

        assertThat(response.getStatusCode().value()).isEqualTo(404);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getTitle()).isEqualTo("Not Found");
    }

    @Test
    void forbiddenGroupActionMapsTo403() {
        ApiExceptionHandler handler = new ApiExceptionHandler();
        ResponseEntity<ProblemDetail> response = handler.forbidden(new ForbiddenGroupActionException("Denied"));

        assertThat(response.getStatusCode().value()).isEqualTo(403);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getTitle()).isEqualTo("Forbidden");
    }

    @Test
    void platformAdminRequiredMapsTo403() {
        ApiExceptionHandler handler = new ApiExceptionHandler();
        ResponseEntity<ProblemDetail> response = handler.forbidden(new PlatformAdminRequiredException());

        assertThat(response.getStatusCode().value()).isEqualTo(403);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getTitle()).isEqualTo("Forbidden");
    }
}
