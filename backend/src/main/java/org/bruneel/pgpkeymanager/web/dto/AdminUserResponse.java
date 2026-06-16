package org.bruneel.pgpkeymanager.web.dto;

import java.time.Instant;

import org.bruneel.pgpkeymanager.domain.AppUser;

public record AdminUserResponse(
        String id, String auth0Sub, String email, String displayName, String platformRole, Instant createdAt) {

    public static AdminUserResponse from(AppUser user) {
        return new AdminUserResponse(
                user.id().toString(),
                user.auth0Sub(),
                user.email(),
                user.displayName(),
                user.platformRole(),
                user.createdAt());
    }
}
