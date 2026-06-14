package org.bruneel.pgpkeymanager.build;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

import ch.qos.logback.core.CoreConstants;
import org.flywaydb.core.Flyway;

public final class DependencyVersions {

    public static final String MONITORED_CVES = "CVE-2026-42198,CVE-2026-10532,CVE-2026-9828";

    public static final String POSTGRESQL_JDBC_MIN_VERSION = "42.7.11";
    public static final String LOGBACK_MIN_VERSION = "1.5.34";
    public static final String FLYWAY_VERSION = "12.8.1";

    private DependencyVersions() {}

    public static String postgresqlJdbcVersion() {
        try {
            Class<?> driver = Class.forName("org.postgresql.Driver");
            return implementationVersion(driver);
        } catch (ClassNotFoundException exception) {
            return null;
        }
    }

    public static String logbackVersion() {
        return implementationVersion(CoreConstants.class);
    }

    public static String flywayVersion() {
        try (InputStream stream =
                Flyway.class.getClassLoader().getResourceAsStream("org/flywaydb/core/internal/version.txt")) {
            if (stream == null) {
                return null;
            }
            return new String(stream.readAllBytes(), StandardCharsets.UTF_8).trim();
        } catch (IOException exception) {
            return null;
        }
    }

    public static boolean isAtLeast(String actual, String minimum) {
        if (actual == null || actual.isBlank()) {
            return false;
        }
        int[] actualParts = parseVersion(actual);
        int[] minimumParts = parseVersion(minimum);
        int length = Math.max(actualParts.length, minimumParts.length);
        for (int index = 0; index < length; index++) {
            int actualPart = index < actualParts.length ? actualParts[index] : 0;
            int minimumPart = index < minimumParts.length ? minimumParts[index] : 0;
            if (actualPart > minimumPart) {
                return true;
            }
            if (actualPart < minimumPart) {
                return false;
            }
        }
        return true;
    }

    static String implementationVersion(Class<?> type) {
        Package pkg = type.getPackage();
        return pkg != null ? pkg.getImplementationVersion() : null;
    }

    static int[] parseVersion(String version) {
        String numeric = version.split("-")[0];
        String[] parts = numeric.split("\\.");
        int[] parsed = new int[parts.length];
        for (int index = 0; index < parts.length; index++) {
            parsed[index] = Integer.parseInt(parts[index]);
        }
        return parsed;
    }
}
