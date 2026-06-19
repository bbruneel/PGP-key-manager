package org.bruneel.pgpkeymanager.web.dto;

import jakarta.validation.constraints.Size;

public record UpdateStorageConnectionRequest(
        @Size(max = 128) String displayName,
        @Size(max = 64) String region,
        @Size(max = 255) String bucket,
        @Size(max = 512) String prefix,
        @Size(max = 512) String roleArn) {}
