package org.bruneel.pgpkeymanager.domain;

import java.time.Instant;

public enum KeyStatus {
    ACTIVE,
    EXPIRED,
    REVOKED;

    public static KeyStatus derive(Instant expiresAt, Instant revokedAt, Instant now) {
        if (revokedAt != null) {
            return REVOKED;
        }
        if (expiresAt != null && expiresAt.isBefore(now)) {
            return EXPIRED;
        }
        return ACTIVE;
    }

    public String toApi() {
        return name().toLowerCase();
    }
}
