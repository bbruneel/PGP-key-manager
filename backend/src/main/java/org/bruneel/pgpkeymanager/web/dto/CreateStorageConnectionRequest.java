package org.bruneel.pgpkeymanager.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateStorageConnectionRequest(
        @NotBlank @Size(max = 128) String displayName,
        @NotBlank @Size(max = 64) String region,
        @NotBlank @Size(max = 255) String bucket,
        @Size(max = 512) String prefix,
        @NotBlank @Size(max = 512) String roleArn) {}
