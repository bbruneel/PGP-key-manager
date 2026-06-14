package org.bruneel.pgpkeymanager.web.dto;

import java.time.Instant;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import org.bruneel.pgpkeymanager.web.json.JsonPassphrase;

public record CreatePgpKeyRequest(
        @Size(max = 128) String label,
        @Pattern(regexp = "^[0-9A-Fa-f]{16,40}$", message = "fingerprint must be hex") String fingerprint,
        @Pattern(regexp = "^[0-9A-Fa-f]{8,16}$", message = "keyId must be hex") String keyId,
        @Pattern(regexp = "public|private", flags = Pattern.Flag.CASE_INSENSITIVE) String keyType,
        String algorithm,
        Instant expiresAt,
        String armoredPublic,
        String encryptedPrivateArmored,
        String storageProvider,
        String storageRef,
        @Pattern(regexp = "primary|subkey", flags = Pattern.Flag.CASE_INSENSITIVE) String role,
        String parentKeyId,
        List<@Pattern(regexp = "certify|sign|encrypt|authenticate", flags = Pattern.Flag.CASE_INSENSITIVE) String>
                capabilities,
        @Valid AlgorithmSpecDto algorithmSpec,
        @Valid ValiditySpecDto validity,
        List<@Valid UserIdSpecDto> userIds,
        @JsonPassphrase @Size(min = 8, max = 256) char[] passphrase,
        Integer openpgpVersion) {}
