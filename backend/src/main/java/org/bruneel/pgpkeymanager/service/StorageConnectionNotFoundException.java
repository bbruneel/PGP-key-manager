package org.bruneel.pgpkeymanager.service;

import java.util.UUID;

public class StorageConnectionNotFoundException extends RuntimeException {

    public StorageConnectionNotFoundException(UUID connectionId) {
        super("Storage connection not found: " + connectionId);
    }
}
