package org.bruneel.pgpkeymanager.service;

import java.util.List;

import org.bruneel.pgpkeymanager.domain.PgpKey;

public record ImportSubkeysResult(List<PgpKey> registered, int skippedCount, List<PgpKey> updated) {

    public ImportSubkeysResult(List<PgpKey> registered, int skippedCount) {
        this(registered, skippedCount, List.of());
    }
}
