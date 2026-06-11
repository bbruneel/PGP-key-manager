package org.bruneel.pgpkeymanager.crypto;

import java.util.List;

public record ImportedKeyringMetadata(
        ImportedKeyMetadata primary,
        List<ImportedKeyMetadata> subkeys,
        List<String> warnings,
        String source) {

    public ImportedKeyringMetadata(ImportedKeyMetadata primary, List<ImportedKeyMetadata> subkeys) {
        this(primary, subkeys, List.of(), "private");
    }
}
