package org.bruneel.pgpkeymanager.web;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
class PgpKeySubkeyImportIntegrationTest {

    private static final String PASSPHRASE = "subkey-import-passphrase";

    private final PgpCryptoService crypto = new PgpCryptoService();

    @Autowired
    private MockMvc mockMvc;

    @Test
    void registerMultiKeyArmorAutoImportsSubkeyRows() throws Exception {
        SubkeyMaterial keyring = buildKeyringWithEncryptSubkey();
        String armoredPublic = jsonEscape(keyring.updatedArmoredPublic());

        MvcResult register =
                mockMvc.perform(post("/api/keys")
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "label": "multi-key-import",
                                          "keyType": "public",
                                          "armoredPublic": "%s"
                                        }
                                        """
                                                .formatted(armoredPublic)))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.role").value("primary"))
                        .andReturn();

        String primaryId = readJsonField(register.getResponse().getContentAsString(), "id");

        mockMvc.perform(get("/api/keys/{primaryKeyId}/subkeys", primaryId).with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].fingerprint").value(keyring.fingerprint()))
                .andExpect(jsonPath("$[0].algorithm").value("cv25519"))
                .andExpect(jsonPath("$[0].capabilities", containsInAnyOrder("encrypt")))
                .andExpect(jsonPath("$[0].parentKeyId").value(primaryId))
                .andExpect(jsonPath("$[0].armoredPublic").doesNotExist());
    }

    @Test
    void importFromKeyringIsIdempotent() throws Exception {
        SubkeyMaterial keyring = buildKeyringWithEncryptSubkey();
        String armoredPrivate = jsonEscape(keyring.updatedArmoredPrivate());

        MvcResult register =
                mockMvc.perform(post("/api/keys")
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "label": "idempotent-import",
                                          "keyType": "private",
                                          "encryptedPrivateArmored": "%s"
                                        }
                                        """
                                                .formatted(armoredPrivate)))
                        .andExpect(status().isCreated())
                        .andReturn();

        String primaryId = readJsonField(register.getResponse().getContentAsString(), "id");

        mockMvc.perform(
                        post("/api/keys/{primaryKeyId}/subkeys/import-from-keyring", primaryId)
                                .with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.registered", hasSize(0)))
                .andExpect(jsonPath("$.skippedCount").value(1));

        mockMvc.perform(get("/api/keys/{primaryKeyId}/subkeys", primaryId).with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    void importFromKeyringBackfillsMissingSubkeyRows() throws Exception {
        SubkeyMaterial keyring = buildKeyringWithEncryptSubkey();
        String armoredPublic = jsonEscape(keyring.updatedArmoredPublic());

        MvcResult register =
                mockMvc.perform(post("/api/keys")
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "label": "backfill-primary",
                                          "keyType": "public",
                                          "armoredPublic": "%s"
                                        }
                                        """
                                                .formatted(armoredPublic)))
                        .andExpect(status().isCreated())
                        .andReturn();

        String primaryId = readJsonField(register.getResponse().getContentAsString(), "id");
        String subkeyId =
                readJsonField(
                        mockMvc.perform(get("/api/keys/{primaryKeyId}/subkeys", primaryId).with(jwt()))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$", hasSize(1)))
                                .andReturn()
                                .getResponse()
                                .getContentAsString(),
                        "id");

        mockMvc.perform(delete("/api/keys/{keyId}", subkeyId).with(jwt())).andExpect(status().isNoContent());

        mockMvc.perform(get("/api/keys/{primaryKeyId}/subkeys", primaryId).with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        mockMvc.perform(
                        post("/api/keys/{primaryKeyId}/subkeys/import-from-keyring", primaryId)
                                .with(jwt()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.registered", hasSize(1)))
                .andExpect(jsonPath("$.registered[0].fingerprint").value(keyring.fingerprint()))
                .andExpect(jsonPath("$.skippedCount").value(0));
    }

    private SubkeyMaterial buildKeyringWithEncryptSubkey() {
        GeneratedKeyMaterial primary =
                crypto.generatePrimary(
                        4,
                        List.of(new UserIdSpecDto("Import Test", null)),
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
