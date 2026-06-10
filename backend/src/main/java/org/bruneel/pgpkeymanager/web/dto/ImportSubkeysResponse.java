package org.bruneel.pgpkeymanager.web.dto;

import java.util.List;

import org.bruneel.pgpkeymanager.domain.PgpKey;
import org.bruneel.pgpkeymanager.service.ImportSubkeysResult;

public record ImportSubkeysResponse(List<PgpKeyResponse> registered, int skippedCount) {

    public static ImportSubkeysResponse from(ImportSubkeysResult result) {
        return new ImportSubkeysResponse(
                result.registered().stream().map(key -> PgpKeyResponse.from(key, false)).toList(),
                result.skippedCount());
    }
}
