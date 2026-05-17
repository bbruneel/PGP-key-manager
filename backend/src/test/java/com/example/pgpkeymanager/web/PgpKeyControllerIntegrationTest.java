package com.example.pgpkeymanager.web;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;

import com.example.pgpkeymanager.TestJwtConfiguration;

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
                                  "fingerprint": "DEADBEEF",
                                  "keyType": "public",
                                  "label": "test"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.fingerprint").value("DEADBEEF"));

        mockMvc.perform(get("/api/keys").with(jwt()).accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].fingerprint").value("DEADBEEF"));
    }

    @Test
    void keysRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/keys").accept(MediaType.APPLICATION_JSON)).andExpect(status().isUnauthorized());
    }
}
