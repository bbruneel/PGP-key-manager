package org.bruneel.pgpkeymanager.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import org.bruneel.pgpkeymanager.web.json.JsonPassphrase;

public record RevokeKeyRequest(
        @NotBlank String reason,
        @Size(max = 512) String description,
        @JsonPassphrase char[] passphrase) {}
