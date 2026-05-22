package org.bruneel.pgpkeymanager.service;

import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class KeyOperationLogger {

    private static final Logger log = LoggerFactory.getLogger(KeyOperationLogger.class);

    public void started(String operation, UUID userId, UUID keyId) {
        log.info(
                "key_operation_started operation={} userId={} keyId={}",
                operation,
                userId,
                keyId);
    }

    public void started(String operation, UUID userId, UUID primaryKeyId, UUID subkeyId) {
        log.info(
                "key_operation_started operation={} userId={} primaryKeyId={} subkeyId={}",
                operation,
                userId,
                primaryKeyId,
                subkeyId);
    }

    public void succeeded(String operation, UUID userId, UUID keyId, long durationMs) {
        log.info(
                "key_operation_succeeded operation={} userId={} keyId={} durationMs={}",
                operation,
                userId,
                keyId,
                durationMs);
    }

    public void failed(String operation, UUID userId, UUID keyId, String errorCategory, String message) {
        log.warn(
                "key_operation_failed operation={} userId={} keyId={} errorCategory={} message={}",
                operation,
                userId,
                keyId,
                errorCategory,
                message);
    }
}
