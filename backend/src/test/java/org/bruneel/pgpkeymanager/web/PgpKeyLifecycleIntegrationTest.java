package org.bruneel.pgpkeymanager.web;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
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

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestJwtConfiguration.class)
class PgpKeyLifecycleIntegrationTest {

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
                                          "passphrase": "lifecycle-passphrase-1"
                                        }
                                        """))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.role").value("primary"))
                        .andExpect(jsonPath("$.fingerprint").exists())
                        .andReturn();

        String primaryId = readJsonField(createPrimary.getResponse().getContentAsString(), "id");

        mockMvc.perform(post("/api/keys/{id}/subkeys", primaryId)
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "capabilities": ["encrypt"],
                                  "algorithm": { "algorithm": "cv25519" },
                                  "validity": { "expiresAt": "2029-06-01T00:00:00Z" },
                                  "passphrase": "lifecycle-passphrase-1"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("subkey"))
                .andExpect(jsonPath("$.parentKeyId").value(primaryId));

        mockMvc.perform(get("/api/keys/{id}/subkeys", primaryId).with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].role").value("subkey"));

        mockMvc.perform(get("/api/keys/{id}/export-public", primaryId).with(jwt()))
                .andExpect(status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content()
                        .string(org.hamcrest.Matchers.containsString("BEGIN PGP PUBLIC KEY BLOCK")));
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
