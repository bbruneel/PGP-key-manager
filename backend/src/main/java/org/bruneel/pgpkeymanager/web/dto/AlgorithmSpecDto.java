package org.bruneel.pgpkeymanager.web.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import jakarta.validation.constraints.NotBlank;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record AlgorithmSpecDto(@NotBlank String algorithm, Integer keySize, String curve) {}
