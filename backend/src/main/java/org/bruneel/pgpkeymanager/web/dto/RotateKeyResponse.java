package org.bruneel.pgpkeymanager.web.dto;

public record RotateKeyResponse(PgpKeyResponse newKey, PgpKeyResponse previousKey) {}
