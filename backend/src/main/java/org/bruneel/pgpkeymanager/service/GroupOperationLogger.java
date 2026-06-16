package org.bruneel.pgpkeymanager.service;

import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class GroupOperationLogger {

    private static final Logger log = LoggerFactory.getLogger(GroupOperationLogger.class);

    public void started(String operation, UUID userId, UUID groupId) {
        log.info("group_operation_started operation={} userId={} groupId={}", operation, userId, groupId);
    }

    public void succeeded(String operation, UUID userId, UUID groupId, long durationMs) {
        log.info(
                "group_operation_succeeded operation={} userId={} groupId={} durationMs={}",
                operation,
                userId,
                groupId,
                durationMs);
    }

    public void failed(String operation, UUID userId, UUID groupId, RuntimeException ex) {
        log.warn(
                "group_operation_failed operation={} userId={} groupId={} errorCategory={} message={}",
                operation,
                userId,
                groupId,
                ex.getClass().getSimpleName(),
                ex.getMessage());
    }
}
