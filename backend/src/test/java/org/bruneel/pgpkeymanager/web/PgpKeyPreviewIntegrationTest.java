package org.bruneel.pgpkeymanager.web;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import org.bruneel.pgpkeymanager.TestJwtConfiguration;
import org.bruneel.pgpkeymanager.crypto.GeneratedKeyMaterial;
import org.bruneel.pgpkeymanager.crypto.PgpCryptoService;
import org.bruneel.pgpkeymanager.crypto.PgpCryptoSupport;
import org.bruneel.pgpkeymanager.crypto.SubkeyMaterial;
import org.bruneel.pgpkeymanager.domain.PgpCapability;
import org.bruneel.pgpkeymanager.web.dto.AlgorithmSpecDto;
import org.bruneel.pgpkeymanager.web.dto.UserIdSpecDto;

import java.time.Instant;
import java.util.List;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestJwtConfiguration.class)
class PgpKeyPreviewIntegrationTest {

    private static final String PASSPHRASE = "preview-integration-passphrase";

    private final PgpCryptoService crypto = new PgpCryptoService();

    @Autowired
    private MockMvc mockMvc;

    @Test
    void previewKeyringShowsRevokedSubkey() throws Exception {
        SubkeyMaterial keyring = buildKeyringWithEncryptSubkey();
        long subKeyId = PgpCryptoSupport.parseKeyIdHex(keyring.keyId());
        PgpCryptoService.KeyRingUpdate revoked =
                crypto.revokeKeyInRing(
                        keyring.updatedArmoredPrivate(),
                        PASSPHRASE.toCharArray(),
                        subKeyId,
                        3);

        mockMvc.perform(post("/api/keys/preview")
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "keyType": "public",
                                  "armoredPublic": "%s"
                                }
                                """
                                        .formatted(jsonEscape(revoked.armoredPublic()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subkeys", hasSize(1)))
                .andExpect(jsonPath("$.subkeys[0].status").value("revoked"))
                .andExpect(jsonPath("$.subkeys[0].revocationReason").value("key_retired"))
                .andExpect(jsonPath("$.source").value("public"));
    }

    @Test
    void previewImportSubkeysFromKeyringShowsWouldRegister() throws Exception {
        SubkeyMaterial keyring = buildKeyringWithEncryptSubkey();
        String armoredPublic = jsonEscape(keyring.updatedArmoredPublic());

        MvcResult register =
                mockMvc.perform(post("/api/keys")
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "label": "preview-primary-only",
                                          "keyType": "public",
                                          "armoredPublic": "%s"
                                        }
                                        """
                                                .formatted(armoredPublic)))
                        .andExpect(status().isCreated())
                        .andReturn();

        String primaryId = readJsonField(register.getResponse().getContentAsString(), "id");

        mockMvc.perform(
                        post("/api/keys/{primaryKeyId}/subkeys/import-from-keyring/preview", primaryId)
                                .with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.wouldRegister", hasSize(0)))
                .andExpect(jsonPath("$.wouldSkipCount").value(1));
    }

    private SubkeyMaterial buildKeyringWithEncryptSubkey() {
        GeneratedKeyMaterial primary =
                crypto.generatePrimary(
                        4,
                        List.of(new UserIdSpecDto("Preview Test", null)),
                        List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                        new AlgorithmSpecDto("ed25519", null, null),
                        Instant.parse("2030-06-01T00:00:00Z"),
                        PASSPHRASE.toCharArray());

        return crypto.addSubkey(
                4,
                primary.armoredPrivate(),
                PASSPHRASE.toCharArray(),
                List.of(PgpCapability.ENCRYPT),
                new AlgorithmSpecDto("cv25519", null, null),
                Instant.parse("2029-06-01T00:00:00Z"));
    }

    private static String readJsonField(String json, String field) {
        String marker = "\"" + field + "\":\"";
        int start = json.indexOf(marker);
        if (start < 0) {
            throw new IllegalArgumentException("Field not found: " + field);
        }
        start += marker.length();
        int end = json.indexOf('"', start);
        return json.substring(start, end);
    }

    private static String jsonEscape(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "");
    }
}
