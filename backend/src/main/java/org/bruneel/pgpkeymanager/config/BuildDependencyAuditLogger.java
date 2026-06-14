package org.bruneel.pgpkeymanager.config;

import org.bruneel.pgpkeymanager.build.DependencyVersions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringBootVersion;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class BuildDependencyAuditLogger {

    private static final Logger log = LoggerFactory.getLogger(BuildDependencyAuditLogger.class);

    @EventListener(ApplicationReadyEvent.class)
    public void logResolvedDependencyVersions() {
        log.info(
                "build_dependencies_audit springBootVersion={} flywayVersion={} postgresqlJdbcVersion={} logbackVersion={} monitoredCves={}",
                SpringBootVersion.getVersion(),
                DependencyVersions.flywayVersion(),
                DependencyVersions.postgresqlJdbcVersion(),
                DependencyVersions.logbackVersion(),
                DependencyVersions.MONITORED_CVES);
    }
}
