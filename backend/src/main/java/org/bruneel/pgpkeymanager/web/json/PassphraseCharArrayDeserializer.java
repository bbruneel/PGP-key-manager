package org.bruneel.pgpkeymanager.web.json;

import java.io.IOException;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonToken;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;

/** Deserializes JSON string passphrases into wipeable {@code char[]} arrays. */
public class PassphraseCharArrayDeserializer extends JsonDeserializer<char[]> {

    @Override
    public char[] deserialize(JsonParser parser, DeserializationContext context) throws IOException {
        JsonToken token = parser.currentToken();
        if (token == JsonToken.VALUE_NULL) {
            return null;
        }
        if (token != JsonToken.VALUE_STRING) {
            throw context.wrongTokenException(parser, char[].class, JsonToken.VALUE_STRING, null);
        }
        String text = parser.getText();
        if (text == null || text.isEmpty()) {
            return null;
        }
        return text.toCharArray();
    }
}
