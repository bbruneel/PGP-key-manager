package org.bruneel.pgpkeymanager.web;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
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

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestJwtConfiguration.class)
class PgpKeyLifecycleIntegrationTest {

    private static final String PASSPHRASE = "lifecycle-passphrase-1";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void generatePrimaryAddSubkeyAndExport() throws Exception {
        MvcResult createPrimary =
                mockMvc.perform(post("/api/keys")
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "label": "lifecycle-primary",
                                          "keyType": "private",
                                          "capabilities": ["certify", "sign"],
                                          "algorithmSpec": { "algorithm": "ed25519" },
                                          "validity": { "expiresAt": "2030-06-01T00:00:00Z" },
                                          "userIds": [{ "name": "Lifecycle Test", "email": "life@example.com" }],
                                          "passphrase": "%s"
                                        }
                                        """
                                        .formatted(PASSPHRASE)))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.role").value("primary"))
                        .andExpect(jsonPath("$.openpgpVersion").value(4))
                        .andExpect(jsonPath("$.fingerprint").exists())
                        .andExpect(jsonPath("$.keyId").value(org.hamcrest.Matchers.matchesRegex("[0-9A-F]{16}")))
                        .andReturn();

        String primaryId = readJsonField(createPrimary.getResponse().getContentAsString(), "id");

        MvcResult createSubkey =
                mockMvc.perform(post("/api/keys/{primaryKeyId}/subkeys", primaryId)
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "capabilities": ["encrypt"],
                                          "algorithm": { "algorithm": "cv25519" },
                                          "validity": { "expiresAt": "2029-06-01T00:00:00Z" },
                                          "passphrase": "%s"
                                        }
                                        """
                                        .formatted(PASSPHRASE)))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.role").value("subkey"))
                        .andExpect(jsonPath("$.parentKeyId").value(primaryId))
                        .andExpect(jsonPath("$.armoredPublic").doesNotExist())
                        .andExpect(jsonPath("$.encryptedPrivateArmored").doesNotExist())
                        .andReturn();

        String subkeyId = readJsonField(createSubkey.getResponse().getContentAsString(), "id");

        mockMvc.perform(get("/api/keys/{keyId}", primaryId).with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(primaryId))
                .andExpect(jsonPath("$.role").value("primary"));

        mockMvc.perform(get("/api/keys/{primaryKeyId}/subkeys/{subkeyId}", primaryId, subkeyId).with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(subkeyId))
                .andExpect(jsonPath("$.role").value("subkey"));

        mockMvc.perform(get("/api/keys/{primaryKeyId}/subkeys", primaryId).with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].role").value("subkey"));

        mockMvc.perform(get("/api/keys/{keyId}/export-public", primaryId).with(jwt()))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("BEGIN PGP PUBLIC KEY BLOCK")));

        mockMvc.perform(post("/api/keys/{keyId}/extend-expiry", subkeyId)
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "expiresAt": "2031-06-01T00:00:00Z",
                                  "passphrase": "%s"
                                }
                                """
                                .formatted(PASSPHRASE)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.expiresAt").exists());

        mockMvc.perform(post("/api/keys/{keyId}/revoke", subkeyId)
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "reason": "key_retired",
                                  "passphrase": "%s"
                                }
                                """
                                .formatted(PASSPHRASE)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("revoked"));
    }

    @Test
    void rotateSubkeyRevokesPreviousInKeyring() throws Exception {
        String primaryId = createPrimaryForRotate();
        String subkeyId = createEncryptSubkey(primaryId);

        mockMvc.perform(post("/api/keys/{keyId}/rotate", subkeyId)
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "capabilities": ["encrypt"],
                                  "algorithm": { "algorithm": "cv25519" },
                                  "validity": { "expiresAt": "2032-06-01T00:00:00Z" },
                                  "passphrase": "%s",
                                  "revokePrevious": true
                                }
                                """
                                .formatted(PASSPHRASE)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.newKey.role").value("subkey"))
                .andExpect(jsonPath("$.previousKey.status").value("revoked"));
    }

    @Test
    void rotateRequiresPassphraseWhenRevokePrevious() throws Exception {
        String primaryId = createPrimaryForRotate();
        String subkeyId = createEncryptSubkey(primaryId);

        mockMvc.perform(post("/api/keys/{keyId}/rotate", subkeyId)
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "capabilities": ["encrypt"],
                                  "algorithm": { "algorithm": "cv25519" },
                                  "revokePrevious": true
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void listFiltersByCapability() throws Exception {
        String primaryId = createPrimaryForRotate();
        createEncryptSubkey(primaryId);

        mockMvc.perform(
                        get("/api/keys")
                                .param("capability", "encrypt")
                                .param("role", "subkey")
                                .with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].role").value("subkey"))
                .andExpect(jsonPath("$[0].capabilities[0]").value("encrypt"));

        mockMvc.perform(get("/api/keys").param("capability", "not-a-capability").with(jwt()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createPrimaryWithExplicitV6() throws Exception {
        mockMvc.perform(post("/api/keys")
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "label": "v6-primary",
                                  "keyType": "private",
                                  "capabilities": ["certify", "sign"],
                                  "algorithmSpec": { "algorithm": "ed25519" },
                                  "openpgpVersion": 6,
                                  "validity": { "expiresAt": "2030-06-01T00:00:00Z" },
                                  "passphrase": "%s"
                                }
                                """
                                .formatted(PASSPHRASE)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.openpgpVersion").value(6));
    }

    @Test
    void createPrimaryEd448OnV6() throws Exception {
        mockMvc.perform(post("/api/keys")
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "label": "ed448-v6-primary",
                                  "keyType": "private",
                                  "capabilities": ["certify", "sign"],
                                  "algorithmSpec": { "algorithm": "ed448" },
                                  "openpgpVersion": 6,
                                  "validity": { "expiresAt": "2030-06-01T00:00:00Z" },
                                  "passphrase": "%s"
                                }
                                """
                                .formatted(PASSPHRASE)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.openpgpVersion").value(6))
                .andExpect(jsonPath("$.algorithm").value("ed448"));
    }

    @Test
    void createPrimaryEd448OnV4Rejects() throws Exception {
        mockMvc.perform(post("/api/keys")
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "label": "ed448-v4-primary",
                                  "capabilities": ["certify", "sign"],
                                  "algorithmSpec": { "algorithm": "ed448" },
                                  "openpgpVersion": 4,
                                  "validity": { "expiresAt": "2030-06-01T00:00:00Z" },
                                  "passphrase": "%s"
                                }
                                """
                                .formatted(PASSPHRASE)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createV6PrimaryWithX448EncryptSubkey() throws Exception {
        MvcResult createPrimary =
                mockMvc.perform(post("/api/keys")
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "label": "x448-subkey-primary",
                                          "keyType": "private",
                                          "capabilities": ["certify", "sign"],
                                          "algorithmSpec": { "algorithm": "ed25519" },
                                          "openpgpVersion": 6,
                                          "validity": { "expiresAt": "2030-06-01T00:00:00Z" },
                                          "passphrase": "%s"
                                        }
                                        """
                                        .formatted(PASSPHRASE)))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.openpgpVersion").value(6))
                        .andReturn();

        String primaryId = readJsonField(createPrimary.getResponse().getContentAsString(), "id");

        mockMvc.perform(post("/api/keys/{primaryKeyId}/subkeys", primaryId)
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "capabilities": ["encrypt"],
                                  "algorithm": { "algorithm": "x448" },
                                  "validity": { "expiresAt": "2029-06-01T00:00:00Z" },
                                  "passphrase": "%s"
                                }
                                """
                                .formatted(PASSPHRASE)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("subkey"))
                .andExpect(jsonPath("$.algorithm").value("x448"))
                .andExpect(jsonPath("$.parentKeyId").value(primaryId));
    }

    @Test
    void invalidOpenpgpVersionReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/keys")
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "label": "bad-version",
                                  "capabilities": ["certify", "sign"],
                                  "algorithmSpec": { "algorithm": "ed25519" },
                                  "openpgpVersion": 5,
                                  "passphrase": "%s"
                                }
                                """
                                .formatted(PASSPHRASE)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void invalidRevocationReasonReturnsBadRequest() throws Exception {
        String primaryId = createPrimaryForRotate();

        mockMvc.perform(post("/api/keys/{keyId}/revoke", primaryId)
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"not_valid\",\"passphrase\":\"%s\"}".formatted(PASSPHRASE)))
                .andExpect(status().isBadRequest());
    }

    private String createPrimaryForRotate() throws Exception {
        MvcResult result =
                mockMvc.perform(post("/api/keys")
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "label": "rotate-primary",
                                          "keyType": "private",
                                          "capabilities": ["certify", "sign"],
                                          "algorithmSpec": { "algorithm": "ed25519" },
                                          "validity": { "expiresAt": "2030-06-01T00:00:00Z" },
                                          "passphrase": "%s"
                                        }
                                        """
                                        .formatted(PASSPHRASE)))
                        .andExpect(status().isCreated())
                        .andReturn();
        return readJsonField(result.getResponse().getContentAsString(), "id");
    }

    private String createEncryptSubkey(String primaryId) throws Exception {
        MvcResult result =
                mockMvc.perform(post("/api/keys/{primaryKeyId}/subkeys", primaryId)
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "capabilities": ["encrypt"],
                                          "algorithm": { "algorithm": "cv25519" },
                                          "validity": { "expiresAt": "2029-06-01T00:00:00Z" },
                                          "passphrase": "%s"
                                        }
                                        """
                                        .formatted(PASSPHRASE)))
                        .andExpect(status().isCreated())
                        .andReturn();
        return readJsonField(result.getResponse().getContentAsString(), "id");
    }

    @Test
    void lifecycleEndpointsRequireAuth() throws Exception {
        mockMvc.perform(post("/api/keys/00000000-0000-0000-0000-000000000099/revoke")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"key_retired\"}"))
                .andExpect(status().isUnauthorized());
    }

    private static String readJsonField(String json, String field) {
        String marker = "\"" + field + "\":\"";
        int start = json.indexOf(marker);
        if (start < 0) {
            throw new IllegalStateException("Field not found: " + field);
        }
        start += marker.length();
        int end = json.indexOf('"', start);
        return json.substring(start, end);
    }
}
