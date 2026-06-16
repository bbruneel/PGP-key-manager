package org.bruneel.pgpkeymanager.web;

import static org.bruneel.pgpkeymanager.TestJwtSupport.PRIMARY_SUBJECT;
import static org.bruneel.pgpkeymanager.TestJwtSupport.SECONDARY_SUBJECT;
import static org.bruneel.pgpkeymanager.TestJwtSupport.jwtForSubject;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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
                .andExpect(status().isNotFound());

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

    @Test
    void ownerCanRevokePendingInvite() throws Exception {
        String groupId = createGroup("Revoke Invite Group");
        String token = createInvite(groupId, SECONDARY_SUBJECT + "@example.test");

        String inviteId = readInviteIdByToken(groupId, token);
        mockMvc.perform(delete("/api/groups/{groupId}/invites/{inviteId}", groupId, inviteId)
                        .with(jwtForSubject(PRIMARY_SUBJECT)))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/invites/{token}/accept", token).with(jwtForSubject(SECONDARY_SUBJECT)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void memberCanLeaveGroupAndLoseAccess() throws Exception {
        String groupId = createGroup("Leave Group");
        String token = createInvite(groupId, SECONDARY_SUBJECT + "@example.test");
        mockMvc.perform(post("/api/invites/{token}/accept", token).with(jwtForSubject(SECONDARY_SUBJECT)))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/groups/{groupId}/members/me", groupId).with(jwtForSubject(SECONDARY_SUBJECT)))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/groups/{groupId}", groupId).with(jwtForSubject(SECONDARY_SUBJECT)))
                .andExpect(status().isNotFound());
    }

    private String createGroup(String name) throws Exception {
        MvcResult created =
                mockMvc.perform(post("/api/groups")
                                .with(jwtForSubject(PRIMARY_SUBJECT))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"name\":\"" + name + "\",\"description\":\"Shared keys\"}"))
                        .andExpect(status().isCreated())
                        .andReturn();
        return readJsonField(created.getResponse().getContentAsString(), "id");
    }

    private String createInvite(String groupId, String email) throws Exception {
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
                                                .formatted(email)))
                        .andExpect(status().isCreated())
                        .andReturn();
        return readJsonField(inviteResult.getResponse().getContentAsString(), "token");
    }

    private String readInviteIdByToken(String groupId, String token) throws Exception {
        MvcResult listInvites =
                mockMvc.perform(get("/api/groups/{groupId}/invites", groupId).with(jwtForSubject(PRIMARY_SUBJECT)))
                        .andExpect(status().isOk())
                        .andReturn();
        String response = listInvites.getResponse().getContentAsString();
        String tokenMarker = "\"token\":\"" + token + "\"";
        int tokenIndex = response.indexOf(tokenMarker);
        if (tokenIndex < 0) {
            throw new IllegalStateException("Token not found in invites response");
        }
        String idMarker = "\"id\":\"";
        int idStart = response.lastIndexOf(idMarker, tokenIndex);
        if (idStart < 0) {
            throw new IllegalStateException("Invite id not found for token");
        }
        idStart += idMarker.length();
        int idEnd = response.indexOf('"', idStart);
        return response.substring(idStart, idEnd);
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
