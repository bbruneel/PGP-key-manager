package org.bruneel.pgpkeymanager.web;

import static org.bruneel.pgpkeymanager.TestJwtSupport.PRIMARY_SUBJECT;
import static org.bruneel.pgpkeymanager.TestJwtSupport.SECONDARY_SUBJECT;
import static org.bruneel.pgpkeymanager.TestJwtSupport.jwtForSubject;
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
class GroupControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void inviteAcceptanceGrantsSecondUserGroupAccess() throws Exception {
        MvcResult created =
                mockMvc.perform(post("/api/groups")
                                .with(jwtForSubject(PRIMARY_SUBJECT))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"name\":\"Team Vault\",\"description\":\"Shared keys\"}"))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.id").exists())
                        .andReturn();
        String groupId = readJsonField(created.getResponse().getContentAsString(), "id");

        mockMvc.perform(get("/api/groups/{groupId}", groupId).with(jwtForSubject(SECONDARY_SUBJECT)))
                .andExpect(status().isForbidden());

        String secondaryEmail = SECONDARY_SUBJECT + "@example.test";
        MvcResult inviteResult =
                mockMvc.perform(post("/api/groups/{groupId}/invites", groupId)
                                .with(jwtForSubject(PRIMARY_SUBJECT))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "email": "%s",
                                          "role": "member",
                                          "expiresAt": "2030-01-01T00:00:00Z"
                                        }
                                        """
                                                .formatted(secondaryEmail)))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.token").exists())
                        .andReturn();
        String token = readJsonField(inviteResult.getResponse().getContentAsString(), "token");

        mockMvc.perform(post("/api/invites/{token}/accept", token).with(jwtForSubject(SECONDARY_SUBJECT)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.groupId").value(groupId));

        mockMvc.perform(get("/api/groups/{groupId}", groupId).with(jwtForSubject(SECONDARY_SUBJECT)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(groupId));
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
