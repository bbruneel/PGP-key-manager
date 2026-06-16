package org.bruneel.pgpkeymanager.web.dto;

import java.time.Instant;
import java.util.UUID;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateGroupInviteRequest(
        @Size(max = 255) String email,
        UUID inviteeUserId,
        @Pattern(regexp = "owner|member", flags = Pattern.Flag.CASE_INSENSITIVE) String role,
        Instant expiresAt) {}
