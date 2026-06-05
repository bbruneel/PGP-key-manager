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

import org.bruneel.pgpkeymanager.TestJwtConfiguration;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestJwtConfiguration.class)
class PgpKeyControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void createAndListKeys() throws Exception {
        mockMvc.perform(post("/api/keys")
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "fingerprint": "DEADBEEF0123456789ABCDEF0123456789ABCD",
                                  "keyType": "public",
                                  "label": "test"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.fingerprint").value("DEADBEEF0123456789ABCDEF0123456789ABCD"));

        mockMvc.perform(get("/api/keys").with(jwt()).accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].fingerprint").value("DEADBEEF0123456789ABCDEF0123456789ABCD"));
    }

    @Test
    void getPatchAndDeleteKey() throws Exception {
        MvcResult created =
                mockMvc.perform(post("/api/keys")
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "fingerprint": "CAFEBABE0123456789ABCDEF0123456789ABCD",
                                          "keyType": "public",
                                          "label": "before-patch"
                                        }
                                        """))
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
}
