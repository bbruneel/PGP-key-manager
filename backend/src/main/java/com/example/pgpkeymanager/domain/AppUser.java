package com.example.pgpkeymanager.domain;

import java.time.Instant;
import java.util.UUID;

public record AppUser(UUID id, String auth0Sub, Instant createdAt) {}
