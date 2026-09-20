package org.bruneel.pgpkeymanager.web.dto;

import jakarta.validation.constraints.Size;

import org.bruneel.pgpkeymanager.web.json.JsonPassphrase;

/**
 * Mode A (ciphertext download): omit both fields.
 * Mode B (rewrap): vault {@code passphrase} plus transfer {@code newPassphrase} (both required together).
 */
public record ExportPrivateRequest(
        @JsonPassphrase @Size(min = 8, max = 256) char[] passphrase,
        @JsonPassphrase @Size(min = 8, max = 256) char[] newPassphrase) {}
