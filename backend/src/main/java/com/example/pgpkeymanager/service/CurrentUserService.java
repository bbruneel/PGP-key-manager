package com.example.pgpkeymanager.service;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import com.example.pgpkeymanager.domain.AppUser;
import com.example.pgpkeymanager.repo.AppUserRepository;

@Service
public class CurrentUserService {

    private final AppUserRepository appUserRepository;

    public CurrentUserService(AppUserRepository appUserRepository) {
        this.appUserRepository = appUserRepository;
    }

    public AppUser requireCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UnauthorizedException("Authentication required");
        }
        String sub = resolveSubject(authentication);
        if (sub == null || sub.isBlank()) {
            throw new UnauthorizedException("Missing subject claim");
        }
        return appUserRepository.upsertByAuth0Sub(sub);
    }

    private static String resolveSubject(Authentication authentication) {
        Object principal = authentication.getPrincipal();
        if (principal instanceof Jwt jwt) {
            return jwt.getSubject();
        }
        return authentication.getName();
    }
}
