package org.bruneel.pgpkeymanager.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class PassphraseUtilTest {

    @Test
    void wipesPassphraseAfterUse() {
        char[] passphrase = "secret-passphrase".toCharArray();
        PassphraseUtil.wipe(passphrase);
        assertThat(passphrase).containsOnly('\0');
    }

    @Test
    void requireRejectsBlank() {
        assertThatThrownBy(() -> PassphraseUtil.require("   ")).isInstanceOf(BadRequestException.class);
    }
}
