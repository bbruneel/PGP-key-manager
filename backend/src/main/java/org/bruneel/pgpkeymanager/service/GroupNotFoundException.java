package org.bruneel.pgpkeymanager.service;

import java.util.UUID;

public class GroupNotFoundException extends RuntimeException {

    public GroupNotFoundException(UUID groupId) {
        super("Group not found: " + groupId);
    }
}
