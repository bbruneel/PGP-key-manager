package org.bruneel.pgpkeymanager.web.json;

import tools.jackson.core.JacksonException;
import tools.jackson.core.JsonParser;
import tools.jackson.core.JsonToken;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.ValueDeserializer;

/** Deserializes JSON string passphrases into wipeable {@code char[]} arrays. */
public class PassphraseCharArrayDeserializer extends ValueDeserializer<char[]> {

    @Override
    public char[] deserialize(JsonParser parser, DeserializationContext context) throws JacksonException {
        JsonToken token = parser.currentToken();
        if (token == JsonToken.VALUE_NULL) {
            return null;
        }
        if (token != JsonToken.VALUE_STRING) {
            throw context.wrongTokenException(
                    parser, char[].class, JsonToken.VALUE_STRING, "Expected JSON string for passphrase");
        }
        String text = parser.getText();
        if (text == null || text.isEmpty()) {
            return null;
        }
        return text.toCharArray();
    }
}
