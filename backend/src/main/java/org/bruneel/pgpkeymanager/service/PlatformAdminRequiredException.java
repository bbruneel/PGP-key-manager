package org.bruneel.pgpkeymanager.service;

public class PlatformAdminRequiredException extends RuntimeException {

    public PlatformAdminRequiredException() {
        super("Platform admin role is required");
    }
}
