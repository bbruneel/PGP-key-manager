package org.bruneel.pgpkeymanager.web.dto;

import java.time.Instant;

import jakarta.validation.constraints.NotNull;

import org.bruneel.pgpkeymanager.web.json.JsonPassphrase;

public record ExtendExpiryRequest(@NotNull Instant expiresAt, @JsonPassphrase char[] passphrase) {}
