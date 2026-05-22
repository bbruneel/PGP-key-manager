package org.bruneel.pgpkeymanager.domain;

public enum KeyRole {
    PRIMARY,
    SUBKEY;

    public static KeyRole fromDb(String value) {
        return KeyRole.valueOf(value.toUpperCase());
    }

    public String toDb() {
        return name().toLowerCase();
    }
}
