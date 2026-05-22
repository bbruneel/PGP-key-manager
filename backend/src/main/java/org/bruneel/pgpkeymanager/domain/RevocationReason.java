package org.bruneel.pgpkeymanager.domain;

public enum RevocationReason {
    NO_REASON,
    KEY_SUPERSEDED,
    KEY_COMPROMISED,
    KEY_RETIRED,
    USER_ID_INVALID;

    public static RevocationReason fromApi(String value) {
        return RevocationReason.valueOf(value.toUpperCase());
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
