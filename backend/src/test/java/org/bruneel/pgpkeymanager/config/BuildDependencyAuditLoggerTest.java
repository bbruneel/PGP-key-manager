package org.bruneel.pgpkeymanager.config;

import static org.assertj.core.api.Assertions.assertThat;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.bruneel.pgpkeymanager.build.DependencyVersions;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

class BuildDependencyAuditLoggerTest {

    private ListAppender<ILoggingEvent> appender;

    @BeforeEach
    void attachLogAppender() {
        Logger logger = (Logger) LoggerFactory.getLogger(BuildDependencyAuditLogger.class);
        appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
    }

    @AfterEach
    void detachLogAppender() {
        Logger logger = (Logger) LoggerFactory.getLogger(BuildDependencyAuditLogger.class);
        logger.detachAppender(appender);
    }

    @Test
    void logResolvedDependencyVersionsEmitsBuildDependenciesAuditLine() {
        new BuildDependencyAuditLogger().logResolvedDependencyVersions();

        assertThat(appender.list).hasSize(1);
        String message = appender.list.getFirst().getFormattedMessage();
        assertThat(message).startsWith("build_dependencies_audit springBootVersion=");
        assertThat(message).contains("flywayVersion=" + DependencyVersions.FLYWAY_VERSION);
        assertThat(message).contains("postgresqlJdbcVersion=");
        assertThat(message).contains("logbackVersion=");
        assertThat(message).contains("monitoredCves=" + DependencyVersions.MONITORED_CVES);
    }
}
