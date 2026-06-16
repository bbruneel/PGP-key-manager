package org.bruneel.pgpkeymanager.domain;

public enum GroupMembershipRole {
    OWNER,
    MEMBER;

    public static GroupMembershipRole fromDb(String value) {
        return GroupMembershipRole.valueOf(value.toUpperCase());
    }

    public String toDb() {
        return name().toLowerCase();
    }
}
