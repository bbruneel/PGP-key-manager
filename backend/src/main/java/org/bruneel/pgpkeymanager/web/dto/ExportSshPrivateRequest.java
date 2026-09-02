package org.bruneel.pgpkeymanager.web.dto;

import jakarta.validation.constraints.Size;

import org.bruneel.pgpkeymanager.web.json.JsonPassphrase;

public record ExportSshPrivateRequest(
        @JsonPassphrase @Size(min = 8, max = 256) char[] passphrase) {}
