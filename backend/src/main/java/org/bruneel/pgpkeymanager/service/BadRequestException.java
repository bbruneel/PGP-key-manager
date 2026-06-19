package org.bruneel.pgpkeymanager.service;

import java.util.List;

public class BadRequestException extends RuntimeException {

    private final List<ApiFieldError> fieldErrors;

    public BadRequestException(String message) {
        this(message, List.of());
    }

    private BadRequestException(String message, List<ApiFieldError> fieldErrors) {
        super(message);
        this.fieldErrors = List.copyOf(fieldErrors);
    }

    public static BadRequestException fieldError(String field, String message) {
        return new BadRequestException(message, List.of(new ApiFieldError(field, message)));
    }

    public List<ApiFieldError> getFieldErrors() {
        return fieldErrors;
    }
}
