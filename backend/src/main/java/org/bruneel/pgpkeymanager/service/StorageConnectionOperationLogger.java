package org.bruneel.pgpkeymanager.service;

import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class StorageConnectionOperationLogger {

    private static final Logger log = LoggerFactory.getLogger(StorageConnectionOperationLogger.class);

    public void started(String operation, UUID userId, UUID connectionId) {
        log.info(
                "storage_connection_operation_started operation={} userId={} connectionId={}",
                operation,
                userId,
                connectionId);
    }

    public void succeeded(String operation, UUID userId, UUID connectionId, long durationMs) {
        log.info(
                "storage_connection_operation_succeeded operation={} userId={} connectionId={} durationMs={}",
                operation,
                userId,
                connectionId,
                durationMs);
    }

    public void failed(String operation, UUID userId, UUID connectionId, RuntimeException ex) {
        log.warn(
                "storage_connection_operation_failed operation={} userId={} connectionId={} errorCategory={} message={}",
                operation,
                userId,
                connectionId,
                ex.getClass().getSimpleName(),
                ex.getMessage());
    }
}
