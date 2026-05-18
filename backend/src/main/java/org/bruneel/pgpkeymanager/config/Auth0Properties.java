package org.bruneel.pgpkeymanager.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.auth0")
public record Auth0Properties(String issuerUri, String audience) {

    public boolean isConfigured() {
        return issuerUri != null && !issuerUri.isBlank();
    }
}
