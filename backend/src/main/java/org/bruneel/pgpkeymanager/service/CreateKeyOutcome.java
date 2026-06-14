package org.bruneel.pgpkeymanager.service;

import org.bruneel.pgpkeymanager.domain.PgpKey;

public record CreateKeyOutcome(PgpKey key, Integer registeredSubkeyCount, boolean reRegistered) {

    public CreateKeyOutcome(PgpKey key, Integer registeredSubkeyCount) {
        this(key, registeredSubkeyCount, false);
    }
}
