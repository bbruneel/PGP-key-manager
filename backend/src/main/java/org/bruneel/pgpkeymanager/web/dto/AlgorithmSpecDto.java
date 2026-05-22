package org.bruneel.pgpkeymanager.web.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record AlgorithmSpecDto(String algorithm, Integer keySize, String curve) {}
