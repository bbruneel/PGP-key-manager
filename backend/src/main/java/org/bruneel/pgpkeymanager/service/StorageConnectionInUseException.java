package org.bruneel.pgpkeymanager.service;

import java.util.UUID;

public class StorageConnectionInUseException extends ConflictException {

    public StorageConnectionInUseException(UUID connectionId) {
        super("Storage connection is referenced by one or more keys: " + connectionId);
    }
}
