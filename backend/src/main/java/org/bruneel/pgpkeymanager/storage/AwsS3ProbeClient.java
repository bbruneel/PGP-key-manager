package org.bruneel.pgpkeymanager.storage;

public interface AwsS3ProbeClient {

    void putGetDeleteProbe(String region, String bucket, String objectKey, AwsSessionCredentials credentials, byte[] payload);
}
