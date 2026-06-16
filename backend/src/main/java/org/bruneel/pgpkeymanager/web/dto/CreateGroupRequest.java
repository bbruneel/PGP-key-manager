package org.bruneel.pgpkeymanager.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateGroupRequest(@NotBlank @Size(max = 255) String name, @Size(max = 1024) String description) {}
