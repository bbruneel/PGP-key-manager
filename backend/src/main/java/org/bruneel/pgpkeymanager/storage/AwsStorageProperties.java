package org.bruneel.pgpkeymanager.storage;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.storage.aws")
public record AwsStorageProperties(boolean enabled, String probeObjectSuffix) {

    public AwsStorageProperties {
        if (probeObjectSuffix == null || probeObjectSuffix.isBlank()) {
            probeObjectSuffix = ".pgp-key-manager-probe/";
        }
    }
}
