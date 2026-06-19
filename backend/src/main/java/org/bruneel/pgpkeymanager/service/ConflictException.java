package org.bruneel.pgpkeymanager.service;

import java.util.List;

public class ConflictException extends RuntimeException {

    private final List<ApiFieldError> fieldErrors;

    public ConflictException(String message) {
        this(message, List.of());
    }

    private ConflictException(String message, List<ApiFieldError> fieldErrors) {
        super(message);
        this.fieldErrors = List.copyOf(fieldErrors);
    }

    public static ConflictException fieldConflict(String field, String message) {
        return new ConflictException(message, List.of(new ApiFieldError(field, message)));
    }

    public List<ApiFieldError> getFieldErrors() {
        return fieldErrors;
    }
}
