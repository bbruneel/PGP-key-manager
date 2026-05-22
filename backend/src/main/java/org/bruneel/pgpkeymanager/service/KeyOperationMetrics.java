package org.bruneel.pgpkeymanager.service;

import java.time.Duration;

import org.springframework.stereotype.Component;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;

@Component
public class KeyOperationMetrics {

    private final MeterRegistry registry;

    public KeyOperationMetrics(MeterRegistry registry) {
        this.registry = registry;
    }

    public void recordSuccess(String operation, int openpgpVersion, long durationMs) {
        registry.counter(
                        "pgp.key.operation.count",
                        "operation",
                        operation,
                        "outcome",
                        "success",
                        "openpgp_version",
                        versionTag(openpgpVersion))
                .increment();
        timer(operation, openpgpVersion, "success").record(Duration.ofMillis(durationMs));
    }

    public void recordFailure(String operation, int openpgpVersion, long durationMs) {
        registry.counter(
                        "pgp.key.operation.count",
                        "operation",
                        operation,
                        "outcome",
                        "failure",
                        "openpgp_version",
                        versionTag(openpgpVersion))
                .increment();
        timer(operation, openpgpVersion, "failure").record(Duration.ofMillis(durationMs));
    }

    public void recordVersionGenerated(int openpgpVersion) {
        registry.counter(
                        "pgp.key.version.generated.count",
                        "openpgp_version",
                        versionTag(openpgpVersion))
                .increment();
    }

    private Timer timer(String operation, int openpgpVersion, String outcome) {
        return registry.timer(
                "pgp.key.operation.duration",
                "operation",
                operation,
                "outcome",
                outcome,
                "openpgp_version",
                versionTag(openpgpVersion));
    }

    private static String versionTag(int openpgpVersion) {
        return String.valueOf(openpgpVersion);
    }
}
