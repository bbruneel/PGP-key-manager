package org.bruneel.pgpkeymanager.service;

import org.springframework.stereotype.Service;

import org.bruneel.pgpkeymanager.domain.AppUser;

@Service
public class PlatformAdminService {

    public void requirePlatformAdmin(AppUser user) {
        if (!user.isPlatformAdmin()) {
            throw new PlatformAdminRequiredException();
        }
    }
}
