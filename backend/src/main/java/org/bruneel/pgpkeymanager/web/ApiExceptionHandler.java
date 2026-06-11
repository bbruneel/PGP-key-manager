package org.bruneel.pgpkeymanager.web;

import java.util.Map;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import org.bruneel.pgpkeymanager.service.BadRequestException;
import org.bruneel.pgpkeymanager.service.ConflictException;
import org.bruneel.pgpkeymanager.service.CryptoException;
import org.bruneel.pgpkeymanager.service.KeyNotFoundException;
import org.bruneel.pgpkeymanager.service.UnauthorizedException;

@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(KeyNotFoundException.class)
    public ResponseEntity<ProblemDetail> notFound(KeyNotFoundException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        problem.setTitle("Not Found");
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(problem);
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ProblemDetail> unauthorized(UnauthorizedException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, ex.getMessage());
        problem.setTitle("Unauthorized");
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(problem);
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ProblemDetail> conflict(ConflictException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
        problem.setTitle("Conflict");
        return ResponseEntity.status(HttpStatus.CONFLICT).body(problem);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ProblemDetail> dataIntegrity(DataIntegrityViolationException ex) {
        ProblemDetail problem =
                ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, "Resource conflict or duplicate value");
        problem.setTitle("Conflict");
        return ResponseEntity.status(HttpStatus.CONFLICT).body(problem);
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ProblemDetail> badRequest(BadRequestException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
        problem.setTitle("Bad Request");
        return ResponseEntity.badRequest().body(problem);
    }

    @ExceptionHandler(CryptoException.class)
    public ResponseEntity<ProblemDetail> crypto(CryptoException ex) {
        log.warn("Cryptographic operation failed: {}", ex.getMessage(), ex);
        String detail = userFacingCryptoDetail(ex);
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, detail);
        problem.setTitle("Cryptographic Error");
        return ResponseEntity.badRequest().body(problem);
    }

    private static String userFacingCryptoDetail(CryptoException ex) {
        String message = ex.getMessage();
        if (message == null || message.isBlank() || ex.getCause() != null) {
            return genericCryptoDetail();
        }
        if ("Passphrase does not unlock the private key".equals(message)) {
            return message;
        }
        if (message.startsWith("Expiry must")
                || message.startsWith("OpenSSH export requires")
                || message.startsWith("Algorithm cannot be exported")
                || message.startsWith("Unsupported ")
                || message.startsWith("Keyring OpenPGP version")
                || message.startsWith("ed448 and x448 require")) {
            return message;
        }
        return genericCryptoDetail();
    }

    private static String genericCryptoDetail() {
        return "Cryptographic operation failed. Check request parameters.";
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> validation(MethodArgumentNotValidException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Validation failed");
        problem.setTitle("Bad Request");
        problem.setProperty(
                "errors",
                ex.getBindingResult().getFieldErrors().stream()
                        .map(err -> Map.of("field", err.getField(), "message", err.getDefaultMessage()))
                        .toList());
        return ResponseEntity.badRequest().body(problem);
    }
}
