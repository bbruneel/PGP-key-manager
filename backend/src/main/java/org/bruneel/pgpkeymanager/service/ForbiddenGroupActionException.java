package org.bruneel.pgpkeymanager.service;

public class ForbiddenGroupActionException extends RuntimeException {

    public ForbiddenGroupActionException(String message) {
        super(message);
    }
}
