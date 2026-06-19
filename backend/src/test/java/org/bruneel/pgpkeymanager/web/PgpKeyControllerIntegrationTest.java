package org.bruneel.pgpkeymanager.web;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import org.bruneel.pgpkeymanager.TestArmoredKeys;
import org.bruneel.pgpkeymanager.TestJwtConfiguration;
import org.bruneel.pgpkeymanager.crypto.GeneratedKeyMaterial;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestJwtConfiguration.class)
class PgpKeyControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void createAndListKeys() throws Exception {
        GeneratedKeyMaterial material = TestArmoredKeys.sampleEd25519PublicKey();
        String armoredPublic = jsonEscape(material.armoredPublic());

        mockMvc.perform(post("/api/keys")
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "keyType": "public",
                                  "label": "test",
                                  "armoredPublic": "%s"
                                }
                                """
                                        .formatted(armoredPublic)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.fingerprint").value(material.fingerprint()));

        mockMvc.perform(get("/api/keys").with(jwt()).accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].fingerprint").value(material.fingerprint()));
    }

    @Test
    void getPatchAndDeleteKey() throws Exception {
        GeneratedKeyMaterial material = TestArmoredKeys.sampleEd25519PublicKey();
        String armoredPublic = jsonEscape(material.armoredPublic());

        MvcResult created =
                mockMvc.perform(post("/api/keys")
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "keyType": "public",
                                          "label": "before-patch",
                                          "armoredPublic": "%s"
                                        }
                                        """
                                                .formatted(armoredPublic)))
                        .andExpect(status().isCreated())
                        .andReturn();

        String keyId = readJsonField(created.getResponse().getContentAsString(), "id");

        mockMvc.perform(get("/api/keys/{keyId}", keyId).with(jwt()).accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(keyId))
                .andExpect(jsonPath("$.label").value("before-patch"));

        mockMvc.perform(patch("/api/keys/{keyId}", keyId)
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"label\":\"after-patch\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.label").value("after-patch"));

        mockMvc.perform(delete("/api/keys/{keyId}", keyId).with(jwt())).andExpect(status().isNoContent());

        mockMvc.perform(get("/api/keys/{keyId}", keyId).with(jwt()).accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    void patchRejectsInvalidStorageRef() throws Exception {
        GeneratedKeyMaterial material = TestArmoredKeys.sampleEd25519PublicKey();
        String armoredPublic = jsonEscape(material.armoredPublic());
        MvcResult created =
                mockMvc.perform(post("/api/keys")
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "label": "storage-ref-validation",
                                          "keyType": "public",
                                          "armoredPublic": "%s",
                                          "fingerprint": "%s"
                                        }
                                        """
                                                .formatted(armoredPublic, material.fingerprint())))
                        .andExpect(status().isCreated())
                        .andReturn();

        String keyId = readJsonField(created.getResponse().getContentAsString(), "id");

        mockMvc.perform(patch("/api/keys/{keyId}", keyId)
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "storageProvider": "aws-s3",
                                  "storageRef": "not-a-valid-storage-ref"
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void keysRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/keys").accept(MediaType.APPLICATION_JSON)).andExpect(status().isUnauthorized());
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

    private static String jsonEscape(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "");
    }
}
