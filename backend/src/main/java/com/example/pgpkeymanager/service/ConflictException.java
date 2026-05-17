package com.example.pgpkeymanager.service;

public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}
