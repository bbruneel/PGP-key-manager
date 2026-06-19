package org.bruneel.pgpkeymanager.service;

import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

import org.bruneel.pgpkeymanager.domain.StorageRef;

@Component
public class StorageRefParser {

    public static final String PROVIDER_SCHEME = "aws-s3";

    private static final Pattern STORAGE_REF_PATTERN = Pattern.compile(
            "^aws-s3://([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/([^?]+)(?:\\?versionId=([^&]+))?$");

    public StorageRef parse(String storageRef) {
        if (storageRef == null || storageRef.isBlank()) {
            throw new BadRequestException("storage_ref is required");
        }
        Matcher matcher = STORAGE_REF_PATTERN.matcher(storageRef.trim());
        if (!matcher.matches()) {
            throw new BadRequestException("Invalid storage_ref format");
        }
        String objectKey = matcher.group(2).trim();
        if (objectKey.isEmpty()) {
            throw new BadRequestException("storage_ref object key must not be empty");
        }
        UUID connectionId = UUID.fromString(matcher.group(1));
        String versionId = matcher.group(3);
        return new StorageRef(connectionId, objectKey, Optional.ofNullable(versionId).filter(v -> !v.isBlank()));
    }

    public String format(StorageRef ref) {
        String base = PROVIDER_SCHEME + "://" + ref.connectionId() + "/" + ref.objectKey();
        return ref.versionId()
                .filter(v -> !v.isBlank())
                .map(v -> base + "?versionId=" + v)
                .orElse(base);
    }

    public UUID extractConnectionId(String storageRef) {
        return parse(storageRef).connectionId();
    }

    public String connectionRefPrefix(UUID connectionId) {
        return PROVIDER_SCHEME + "://" + connectionId + "/";
    }
}
