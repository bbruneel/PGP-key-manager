package org.bruneel.pgpkeymanager.domain;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

public final class CapabilityJson {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final TypeReference<List<String>> STRING_LIST = new TypeReference<>() {};

    private CapabilityJson() {}

    public static String toJson(List<PgpCapability> capabilities) {
        if (capabilities == null || capabilities.isEmpty()) {
            return null;
        }
        try {
            return MAPPER.writeValueAsString(
                    capabilities.stream().map(PgpCapability::toApi).toList());
        } catch (JacksonException exception) {
            throw new IllegalArgumentException("Failed to serialize capabilities", exception);
        }
    }

    public static List<PgpCapability> fromJson(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            List<String> raw = MAPPER.readValue(json, STRING_LIST);
            return raw.stream().map(PgpCapability::fromApi).toList();
        } catch (JacksonException exception) {
            throw new IllegalArgumentException("Failed to parse capabilities", exception);
        }
    }

    public static List<PgpCapability> parseCsv(String csv) {
        if (csv == null || csv.isBlank()) {
            return List.of();
        }
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(PgpCapability::fromApi)
                .collect(Collectors.toList());
    }
}
