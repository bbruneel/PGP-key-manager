package org.bruneel.pgpkeymanager.service;

import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class KeyOperationLogger {

    private static final Logger log = LoggerFactory.getLogger(KeyOperationLogger.class);

    public void started(String operation, UUID userId, UUID keyId) {
        started(operation, userId, keyId, (Integer) null);
    }

    public void started(String operation, UUID userId, UUID keyId, Integer openpgpVersion) {
        if (openpgpVersion != null) {
            log.info(
                    "key_operation_started operation={} userId={} keyId={} openpgpVersion={}",
                    operation,
                    userId,
                    keyId,
                    openpgpVersion);
        } else {
            log.info(
                    "key_operation_started operation={} userId={} keyId={}",
                    operation,
                    userId,
                    keyId);
        }
    }

    public void started(String operation, UUID userId, UUID primaryKeyId, UUID subkeyId) {
        started(operation, userId, primaryKeyId, subkeyId, (Integer) null);
    }

    public void started(
            String operation, UUID userId, UUID primaryKeyId, UUID subkeyId, Integer openpgpVersion) {
        if (openpgpVersion != null) {
            log.info(
                    "key_operation_started operation={} userId={} primaryKeyId={} subkeyId={} openpgpVersion={}",
                    operation,
                    userId,
                    primaryKeyId,
                    subkeyId,
                    openpgpVersion);
        } else {
            log.info(
                    "key_operation_started operation={} userId={} primaryKeyId={} subkeyId={}",
                    operation,
                    userId,
                    primaryKeyId,
                    subkeyId);
        }
    }

    public void succeeded(String operation, UUID userId, UUID keyId, long durationMs) {
        succeeded(operation, userId, keyId, null, durationMs);
    }

    public void succeeded(String operation, UUID userId, UUID keyId, Integer openpgpVersion, long durationMs) {
        if (openpgpVersion != null) {
            log.info(
                    "key_operation_succeeded operation={} userId={} keyId={} openpgpVersion={} durationMs={}",
                    operation,
                    userId,
                    keyId,
                    openpgpVersion,
                    durationMs);
        } else {
            log.info(
                    "key_operation_succeeded operation={} userId={} keyId={} durationMs={}",
                    operation,
                    userId,
                    keyId,
                    durationMs);
        }
    }

    public void failed(String operation, UUID userId, UUID keyId, String errorCategory, String message) {
        failed(operation, userId, keyId, null, errorCategory, message);
    }

    public void failed(
            String operation,
            UUID userId,
            UUID keyId,
            Integer openpgpVersion,
            String errorCategory,
            String message) {
        if (openpgpVersion != null) {
            log.warn(
                    "key_operation_failed operation={} userId={} keyId={} openpgpVersion={} errorCategory={} message={}",
                    operation,
                    userId,
                    keyId,
                    openpgpVersion,
                    errorCategory,
                    message);
        } else {
            log.warn(
                    "key_operation_failed operation={} userId={} keyId={} errorCategory={} message={}",
                    operation,
                    userId,
                    keyId,
                    errorCategory,
                    message);
        }
    }
}
