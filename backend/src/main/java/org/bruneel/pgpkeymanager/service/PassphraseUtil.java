package org.bruneel.pgpkeymanager.service;

import java.util.Arrays;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Clears passphrase material from memory after use. */
public final class PassphraseUtil {

    private static final Logger log = LoggerFactory.getLogger(PassphraseUtil.class);

    private PassphraseUtil() {}

    public static boolean isBlank(char[] passphrase) {
        if (passphrase == null || passphrase.length == 0) {
            return true;
        }
        for (char c : passphrase) {
            if (!Character.isWhitespace(c)) {
                return false;
            }
        }
        return true;
    }

    public static boolean isPresent(char[] passphrase) {
        return !isBlank(passphrase);
    }

    public static char[] require(char[] passphrase) {
        if (isBlank(passphrase)) {
            throw new BadRequestException("passphrase is required for this operation");
        }
        return passphrase;
    }

    public static char[] clone(char[] passphrase) {
        if (passphrase == null) {
            return null;
        }
        return Arrays.copyOf(passphrase, passphrase.length);
    }

    public static void wipe(char[] passphrase) {
        if (passphrase != null) {
            Arrays.fill(passphrase, '\0');
        }
    }

    public static void wipe(char[] passphrase, String operation) {
        wipe(passphrase);
        if (operation != null && !operation.isBlank()) {
            log.debug("passphrase_memory_cleared operation={}", operation);
        }
    }
}
