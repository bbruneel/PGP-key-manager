package org.bruneel.pgpkeymanager.web.dto;

/**
 * SSH setup pack download. {@code content} is the AES-encrypted zip (Jackson serializes {@code byte[]}
 * as base64). The one-time archive password is in the JSON body — never a response header — so
 * proxies and access logs that record headers do not persist the secret.
 */
public record SshSetupPackResponse(String filename, String archivePassword, byte[] content) {}
