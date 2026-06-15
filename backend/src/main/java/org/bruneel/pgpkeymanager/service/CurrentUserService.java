package org.bruneel.pgpkeymanager.service;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import org.bruneel.pgpkeymanager.domain.AppUser;
import org.bruneel.pgpkeymanager.repo.AppUserRepository;

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
        Object principal = authentication.getPrincipal();
        if (principal instanceof Jwt jwt) {
            return syncProfileFromJwt(jwt);
        }
        String sub = resolveSubject(authentication);
        if (sub == null || sub.isBlank()) {
            throw new UnauthorizedException("Missing subject claim");
        }
        return appUserRepository.upsertByAuth0Sub(sub);
    }

    public AppUser syncProfileFromJwt(Jwt jwt) {
        String sub = jwt.getSubject();
        if (sub == null || sub.isBlank()) {
            throw new UnauthorizedException("Missing subject claim");
        }
        AppUser user = appUserRepository.upsertByAuth0Sub(sub);
        String email = trimToNull(jwt.getClaimAsString("email"));
        String displayName = resolveDisplayName(jwt);
        if (equalsNullable(user.email(), email) && equalsNullable(user.displayName(), displayName)) {
            return user;
        }
        return appUserRepository.updateProfile(user.id(), email, displayName);
    }

    private static String resolveSubject(Authentication authentication) {
        Object principal = authentication.getPrincipal();
        if (principal instanceof Jwt jwt) {
            return jwt.getSubject();
        }
        return authentication.getName();
    }

    private static String resolveDisplayName(Jwt jwt) {
        String name = trimToNull(jwt.getClaimAsString("name"));
        if (name != null) {
            return name;
        }
        return trimToNull(jwt.getClaimAsString("nickname"));
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static boolean equalsNullable(String left, String right) {
        return left == null ? right == null : left.equals(right);
    }
}
