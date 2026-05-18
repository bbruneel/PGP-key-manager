package org.bruneel.pgpkeymanager.config;

import java.util.List;

import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtDecoders;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

@Configuration
@EnableConfigurationProperties(Auth0Properties.class)
@org.springframework.context.annotation.Profile("!test")
@ConditionalOnExpression("!'${app.auth0.issuer-uri:}'.isBlank()")
public class Auth0ResourceServerConfig {

    @Bean
    JwtDecoder jwtDecoder(Auth0Properties auth0) {
        NimbusJwtDecoder decoder = JwtDecoders.fromIssuerLocation(auth0.issuerUri());
        OAuth2TokenValidator<Jwt> validator = JwtValidators.createDefaultWithIssuer(auth0.issuerUri());
        if (auth0.audience() != null && !auth0.audience().isBlank()) {
            OAuth2TokenValidator<Jwt> audienceValidator = new JwtClaimValidator<List<String>>(
                    "aud", aud -> aud != null && aud.contains(auth0.audience()));
            validator = new DelegatingOAuth2TokenValidator<>(validator, audienceValidator);
        }
        decoder.setJwtValidator(validator);
        return decoder;
    }
}
