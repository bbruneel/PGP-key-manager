package org.bruneel.pgpkeymanager.web.dto;

import java.time.Instant;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record CreatePgpKeyRequest(
        String label,
        @NotBlank String fingerprint,
        String keyId,
        @NotNull @Pattern(regexp = "public|private", flags = Pattern.Flag.CASE_INSENSITIVE) String keyType,
        String algorithm,
        Instant expiresAt,
        String armoredPublic,
        String encryptedPrivateArmored,
        String storageProvider,
        String storageRef) {}
