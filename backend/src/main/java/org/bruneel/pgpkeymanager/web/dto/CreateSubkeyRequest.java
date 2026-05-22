package org.bruneel.pgpkeymanager.web.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateSubkeyRequest(
        @NotEmpty List<@NotNull String> capabilities,
        @NotNull @Valid AlgorithmSpecDto algorithm,
        @Valid ValiditySpecDto validity,
        @Size(min = 8, max = 256) String passphrase) {}
