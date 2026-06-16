package org.bruneel.pgpkeymanager.service;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import org.bruneel.pgpkeymanager.domain.AppUser;

class PlatformAdminServiceTest {

    private final PlatformAdminService platformAdminService = new PlatformAdminService();

    @Test
    void requirePlatformAdminAllowsAdminRole() {
        AppUser admin = new AppUser(UUID.randomUUID(), "auth0|admin", null, null, "admin", Instant.now());

        assertThatCode(() -> platformAdminService.requirePlatformAdmin(admin)).doesNotThrowAnyException();
    }

    @Test
    void requirePlatformAdminRejectsUserRole() {
        AppUser user = new AppUser(UUID.randomUUID(), "auth0|user", null, null, "user", Instant.now());

        assertThatThrownBy(() -> platformAdminService.requirePlatformAdmin(user))
                .isInstanceOf(PlatformAdminRequiredException.class)
                .hasMessageContaining("Platform admin role is required");
    }
}
