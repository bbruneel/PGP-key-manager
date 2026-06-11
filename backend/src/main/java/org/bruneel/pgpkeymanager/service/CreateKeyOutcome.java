package org.bruneel.pgpkeymanager.service;

import org.bruneel.pgpkeymanager.domain.PgpKey;

public record CreateKeyOutcome(PgpKey key, Integer registeredSubkeyCount) {}
