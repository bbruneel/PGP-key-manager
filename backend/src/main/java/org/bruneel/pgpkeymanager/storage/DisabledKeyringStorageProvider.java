package org.bruneel.pgpkeymanager.storage;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import org.bruneel.pgpkeymanager.domain.StorageConnection;

@Component
@ConditionalOnProperty(prefix = "app.storage.aws", name = "enabled", havingValue = "false")
public class DisabledKeyringStorageProvider implements KeyringStorageProvider {

    @Override
    public StorageConnectionTestResult testConnection(StorageConnection connection) {
        return StorageConnectionTestResult.failure(
                StorageConnectionTestErrorCategories.AWS_DISABLED,
                "AWS storage integration is disabled",
                0L);
    }
}
