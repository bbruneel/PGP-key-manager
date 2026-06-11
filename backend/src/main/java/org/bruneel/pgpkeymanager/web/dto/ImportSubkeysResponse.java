package org.bruneel.pgpkeymanager.web.dto;

import java.util.List;

import org.bruneel.pgpkeymanager.service.ImportSubkeysResult;

public record ImportSubkeysResponse(
        List<PgpKeyResponse> registered, int skippedCount, List<PgpKeyResponse> updated, int updatedCount) {

    public static ImportSubkeysResponse from(ImportSubkeysResult result) {
        return new ImportSubkeysResponse(
                result.registered().stream().map(key -> PgpKeyResponse.from(key, false)).toList(),
                result.skippedCount(),
                result.updated().stream().map(key -> PgpKeyResponse.from(key, false)).toList(),
                result.updated().size());
    }
}
