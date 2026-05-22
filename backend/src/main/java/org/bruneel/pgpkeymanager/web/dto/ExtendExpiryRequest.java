package org.bruneel.pgpkeymanager.web.dto;

import java.time.Instant;

import jakarta.validation.constraints.NotNull;

public record ExtendExpiryRequest(@NotNull Instant expiresAt, String passphrase) {}
