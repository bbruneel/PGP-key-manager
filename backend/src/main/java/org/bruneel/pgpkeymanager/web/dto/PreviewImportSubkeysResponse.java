package org.bruneel.pgpkeymanager.web.dto;

import java.util.List;

public record PreviewImportSubkeysResponse(
        List<PreviewKeyEntry> wouldRegister,
        List<PreviewKeyEntry> wouldUpdate,
        int wouldSkipCount,
        List<String> warnings,
        String source) {}
