package org.bruneel.pgpkeymanager;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;

@TestConfiguration
@Profile("test")
public class TestJwtConfiguration {

    public static final String TEST_SUBJECT = TestJwtSupport.PRIMARY_SUBJECT;

    @Bean
    @Primary
    JwtDecoder testJwtDecoder() {
        return token ->
                Jwt.withTokenValue(token == null || token.isBlank() ? "test-token" : token)
                        .header("alg", "none")
                        .subject(TEST_SUBJECT)
                        .claim("sub", TEST_SUBJECT)
                        .build();
    }
}
