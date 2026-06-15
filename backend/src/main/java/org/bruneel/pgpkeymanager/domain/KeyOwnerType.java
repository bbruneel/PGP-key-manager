package org.bruneel.pgpkeymanager.domain;

public enum KeyOwnerType {
    USER,
    GROUP;

    public static KeyOwnerType fromDb(String value) {
        return KeyOwnerType.valueOf(value.toUpperCase());
    }

    public String toDb() {
        return name().toLowerCase();
    }
}
