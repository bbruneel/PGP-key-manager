package org.bruneel.pgpkeymanager.build;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ResolvedDependencyVersionsTest {

    @Test
    void postgresqlJdbcVersionMeetsSecurityFloor() {
        assertThat(DependencyVersions.postgresqlJdbcVersion()).isNotBlank();
        assertThat(DependencyVersions.isAtLeast(
                        DependencyVersions.postgresqlJdbcVersion(),
                        DependencyVersions.POSTGRESQL_JDBC_MIN_VERSION))
                .isTrue();
    }

    @Test
    void logbackVersionMeetsSecurityFloor() {
        assertThat(DependencyVersions.logbackVersion()).isNotBlank();
        assertThat(DependencyVersions.isAtLeast(
                        DependencyVersions.logbackVersion(), DependencyVersions.LOGBACK_MIN_VERSION))
                .isTrue();
    }

    @Test
    void flywayVersionMatchesPinnedRelease() {
        assertThat(DependencyVersions.flywayVersion()).isEqualTo(DependencyVersions.FLYWAY_VERSION);
    }

    @Test
    void isAtLeastComparesNumericSegments() {
        assertThat(DependencyVersions.isAtLeast("1.5.34", "1.5.34")).isTrue();
        assertThat(DependencyVersions.isAtLeast("1.5.35", "1.5.34")).isTrue();
        assertThat(DependencyVersions.isAtLeast("1.5.33", "1.5.34")).isFalse();
        assertThat(DependencyVersions.isAtLeast("42.7.11", "42.7.11")).isTrue();
    }
}
