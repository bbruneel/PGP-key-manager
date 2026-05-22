package org.bruneel.pgpkeymanager.web.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UserIdSpecDto(
        @NotBlank @Size(min = 1, max = 256) String name,
        @Email @Size(max = 254) String email) {}
