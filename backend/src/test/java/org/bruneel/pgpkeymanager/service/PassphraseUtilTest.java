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
    void isBlankTreatsNullAndWhitespaceAsBlank() {
        assertThat(PassphraseUtil.isBlank(null)).isTrue();
        assertThat(PassphraseUtil.isBlank("   ".toCharArray())).isTrue();
        assertThat(PassphraseUtil.isBlank(new char[0])).isTrue();
        assertThat(PassphraseUtil.isBlank("secret".toCharArray())).isFalse();
    }

    @Test
    void isPresentIsInverseOfIsBlank() {
        assertThat(PassphraseUtil.isPresent(null)).isFalse();
        assertThat(PassphraseUtil.isPresent("secret".toCharArray())).isTrue();
    }

    @Test
    void requireCharArrayRejectsNullAndBlank() {
        assertThatThrownBy(() -> PassphraseUtil.require((char[]) null))
                .isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> PassphraseUtil.require("   ".toCharArray()))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void requireCharArrayReturnsSameReferenceWhenPresent() {
        char[] passphrase = "secret-passphrase".toCharArray();
        assertThat(PassphraseUtil.require(passphrase)).isSameAs(passphrase);
    }

    @Test
    void cloneReturnsIndependentCopy() {
        char[] original = "secret-passphrase".toCharArray();
        char[] cloned = PassphraseUtil.clone(original);
        assertThat(cloned).isNotSameAs(original);
        assertThat(cloned).isEqualTo(original);

        PassphraseUtil.wipe(original);
        assertThat(cloned).isEqualTo("secret-passphrase".toCharArray());
    }

    @Test
    void cloneReturnsNullForNullInput() {
        assertThat(PassphraseUtil.clone(null)).isNull();
    }

    @Test
    void wipeWithOperationClearsChars() {
        char[] passphrase = "secret-passphrase".toCharArray();
        PassphraseUtil.wipe(passphrase, "create_subkey");
        assertThat(passphrase).containsOnly('\0');
    }
}
