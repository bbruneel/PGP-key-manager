package org.bruneel.pgpkeymanager.storage;

import software.amazon.awssdk.core.exception.SdkClientException;

public final class AwsStorageExceptionMapper {

    private AwsStorageExceptionMapper() {}

    public static StorageConnectionProbeException map(RuntimeException ex) {
        if (ex instanceof StorageConnectionProbeException probeException) {
            return probeException;
        }
        if (ex instanceof SdkClientException) {
            return new StorageConnectionProbeException(
                    StorageConnectionTestErrorCategories.NETWORK_ERROR, ex.getMessage(), ex);
        }
        return new StorageConnectionProbeException(
                StorageConnectionTestErrorCategories.UNKNOWN, ex.getMessage(), ex);
    }
}
