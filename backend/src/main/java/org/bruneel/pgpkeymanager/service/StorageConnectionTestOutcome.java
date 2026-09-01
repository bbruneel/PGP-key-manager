package org.bruneel.pgpkeymanager.service;

import org.bruneel.pgpkeymanager.domain.StorageConnection;
import org.bruneel.pgpkeymanager.storage.StorageConnectionTestResult;

public record StorageConnectionTestOutcome(
        StorageConnection connection, StorageConnectionTestResult result) {}
