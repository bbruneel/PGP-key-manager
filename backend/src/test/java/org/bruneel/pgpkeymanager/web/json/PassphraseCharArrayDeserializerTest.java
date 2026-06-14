package org.bruneel.pgpkeymanager.web.json;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.bruneel.pgpkeymanager.web.dto.CreateSubkeyRequest;
import org.bruneel.pgpkeymanager.web.dto.RotateKeyRequest;
import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.exc.MismatchedInputException;

class PassphraseCharArrayDeserializerTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void deserializesPassphraseStringToCharArray() throws Exception {
        CreateSubkeyRequest request =
                mapper.readValue(
                        """
                        {
                          "capabilities": ["encrypt"],
                          "algorithm": { "algorithm": "cv25519" },
                          "passphrase": "test-passphrase-123"
                        }
                        """,
                        CreateSubkeyRequest.class);

        assertThat(request.passphrase()).isEqualTo("test-passphrase-123".toCharArray());
    }

    @Test
    void deserializesNullPassphrase() throws Exception {
        CreateSubkeyRequest request =
                mapper.readValue(
                        """
                        {
                          "capabilities": ["encrypt"],
                          "algorithm": { "algorithm": "cv25519" },
                          "passphrase": null
                        }
                        """,
                        CreateSubkeyRequest.class);

        assertThat(request.passphrase()).isNull();
    }

    @Test
    void rejectsNonStringPassphraseToken() {
        assertThatThrownBy(
                        () ->
                                mapper.readValue(
                                        """
                                        {
                                          "capabilities": ["encrypt"],
                                          "algorithm": { "algorithm": "cv25519" },
                                          "passphrase": 12345
                                        }
                                        """,
                                        CreateSubkeyRequest.class))
                .isInstanceOf(MismatchedInputException.class);
    }

    @Test
    void deserializesRotateKeyRequestPassphrase() throws Exception {
        RotateKeyRequest request =
                mapper.readValue(
                        """
                        {
                          "capabilities": ["encrypt"],
                          "algorithm": { "algorithm": "cv25519" },
                          "passphrase": "rotate-passphrase-123"
                        }
                        """,
                        RotateKeyRequest.class);

        assertThat(request.passphrase()).isEqualTo("rotate-passphrase-123".toCharArray());
    }
}
