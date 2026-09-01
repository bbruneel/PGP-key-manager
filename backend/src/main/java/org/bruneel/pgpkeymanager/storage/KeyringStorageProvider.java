package org.bruneel.pgpkeymanager.storage;

import org.bruneel.pgpkeymanager.domain.StorageConnection;

public interface KeyringStorageProvider {

    StorageConnectionTestResult testConnection(StorageConnection connection);
}
