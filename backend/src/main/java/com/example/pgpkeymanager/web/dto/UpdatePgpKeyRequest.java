package com.example.pgpkeymanager.web.dto;

import java.time.Instant;

public record UpdatePgpKeyRequest(
        String label, Instant expiresAt, String storageProvider, String storageRef) {}
