package org.bruneel.pgpkeymanager.web.dto;

import java.util.List;

import org.bruneel.pgpkeymanager.crypto.ImportedKeyringMetadata;
import org.bruneel.pgpkeymanager.domain.KeyRole;

public record PreviewKeyringResponse(
        PreviewKeyEntry primary,
        List<PreviewKeyEntry> subkeys,
        List<String> warnings,
        String source) {

    public static PreviewKeyringResponse from(ImportedKeyringMetadata keyring) {
        return new PreviewKeyringResponse(
                PreviewKeyEntry.from(keyring.primary(), KeyRole.PRIMARY),
                keyring.subkeys().stream()
                        .map(subkey -> PreviewKeyEntry.from(subkey, KeyRole.SUBKEY))
                        .toList(),
                keyring.warnings(),
                keyring.source());
    }
}
