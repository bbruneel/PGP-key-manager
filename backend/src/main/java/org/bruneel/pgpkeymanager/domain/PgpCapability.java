package org.bruneel.pgpkeymanager.domain;

public enum PgpCapability {
    CERTIFY,
    SIGN,
    ENCRYPT,
    AUTHENTICATE;

    public static PgpCapability fromApi(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("capability is required");
        }
        try {
            return PgpCapability.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid capability: " + value);
        }
    }

    public String toApi() {
        return name().toLowerCase();
    }

    public static PgpCapability fromDb(String value) {
        return fromApi(value);
    }

    public String toDb() {
        return toApi();
    }
}
