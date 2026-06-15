package org.bruneel.pgpkeymanager;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;

import org.springframework.test.web.servlet.request.RequestPostProcessor;

public final class TestJwtSupport {

    public static final String PRIMARY_SUBJECT = "auth0|primary-user";
    public static final String SECONDARY_SUBJECT = "auth0|secondary-user";

    private TestJwtSupport() {}

    public static RequestPostProcessor jwtForSubject(String subject) {
        return jwt().jwt(jwt -> jwt.subject(subject).claim("sub", subject).claim("email", subject + "@example.test"));
    }
}
