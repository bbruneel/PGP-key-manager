package org.bruneel.pgpkeymanager.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ApplyRevocationCertRequest(
        @NotBlank @Size(max = 524_288) String armoredCertificate) {}
