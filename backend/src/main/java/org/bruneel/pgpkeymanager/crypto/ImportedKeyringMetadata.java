package org.bruneel.pgpkeymanager.crypto;

import java.util.List;

public record ImportedKeyringMetadata(ImportedKeyMetadata primary, List<ImportedKeyMetadata> subkeys) {}
