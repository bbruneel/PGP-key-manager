package org.bruneel.pgpkeymanager.domain;

public enum PgpCapability {
    CERTIFY,
    SIGN,
    ENCRYPT,
    AUTHENTICATE;

    public static PgpCapability fromApi(String value) {
        return PgpCapability.valueOf(value.toUpperCase());
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
