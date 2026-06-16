package org.bruneel.pgpkeymanager.domain;

import java.time.Instant;
import java.util.UUID;

public record AppUser(
        UUID id, String auth0Sub, String email, String displayName, String platformRole, Instant createdAt) {

    public boolean isPlatformAdmin() {
        return "admin".equalsIgnoreCase(platformRole);
    }
}
