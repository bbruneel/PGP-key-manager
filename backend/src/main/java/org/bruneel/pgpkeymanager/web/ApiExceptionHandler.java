package org.bruneel.pgpkeymanager.web;

import java.util.Map;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import org.bruneel.pgpkeymanager.service.ConflictException;
import org.bruneel.pgpkeymanager.service.KeyNotFoundException;
import org.bruneel.pgpkeymanager.service.UnauthorizedException;

@RestControllerAdvice
public class ApiExceptionHandler {

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
