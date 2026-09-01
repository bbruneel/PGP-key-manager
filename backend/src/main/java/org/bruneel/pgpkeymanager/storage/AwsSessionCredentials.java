package org.bruneel.pgpkeymanager.storage;

public record AwsSessionCredentials(String accessKeyId, String secretAccessKey, String sessionToken) {}
