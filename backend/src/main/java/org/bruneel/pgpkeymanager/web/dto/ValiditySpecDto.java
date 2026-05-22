package org.bruneel.pgpkeymanager.web.dto;

import java.time.Instant;

import jakarta.validation.constraints.NotNull;

public record ValiditySpecDto(Instant createdAt, @NotNull Instant expiresAt) {}
