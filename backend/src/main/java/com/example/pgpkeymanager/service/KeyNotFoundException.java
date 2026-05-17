package com.example.pgpkeymanager.service;

import java.util.UUID;

public class KeyNotFoundException extends RuntimeException {

    public KeyNotFoundException(UUID id) {
        super("PGP key not found: " + id);
    }
}
