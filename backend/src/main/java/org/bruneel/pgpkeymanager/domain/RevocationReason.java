package org.bruneel.pgpkeymanager.domain;

public enum RevocationReason {
    NO_REASON,
    KEY_SUPERSEDED,
    KEY_COMPROMISED,
    KEY_RETIRED,
    USER_ID_INVALID;

    public static RevocationReason fromApi(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("reason is required");
        }
        try {
            return RevocationReason.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid revocation reason: " + value);
        }
    }

    public String toApi() {
        return name().toLowerCase();
    }

    public String toDb() {
        return toApi();
    }

    public static RevocationReason fromDb(String value) {
        return fromApi(value);
    }
}
