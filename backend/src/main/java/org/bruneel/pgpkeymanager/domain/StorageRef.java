package org.bruneel.pgpkeymanager.domain;

import java.util.Optional;
import java.util.UUID;

public record StorageRef(UUID connectionId, String objectKey, Optional<String> versionId) {}
