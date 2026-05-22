package org.bruneel.pgpkeymanager.service;

import java.util.Arrays;

/** Clears passphrase material from memory after use. */
public final class PassphraseUtil {

    private PassphraseUtil() {}

    public static char[] toCharArray(String passphrase) {
        if (passphrase == null || passphrase.isBlank()) {
            return null;
        }
        return passphrase.toCharArray();
    }

    public static char[] require(String passphrase) {
        char[] chars = toCharArray(passphrase);
        if (chars == null) {
            throw new BadRequestException("passphrase is required for this operation");
        }
        return chars;
    }

    public static void wipe(char[] passphrase) {
        if (passphrase != null) {
            Arrays.fill(passphrase, '\0');
        }
    }
}
