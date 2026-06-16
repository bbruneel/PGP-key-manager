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

import org.bruneel.pgpkeymanager.TestArmoredKeys;
import org.bruneel.pgpkeymanager.TestJwtConfiguration;
import org.bruneel.pgpkeymanager.crypto.GeneratedKeyMaterial;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestJwtConfiguration.class)
class GroupKeyAuthorizationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void groupOwnedKeysBecomeAccessibleAfterInviteAcceptance() throws Exception {
        String groupId = createGroup();
        String keyId = createGroupOwnedPublicKey(groupId);

        mockMvc.perform(get("/api/keys/{keyId}", keyId).with(jwtForSubject(SECONDARY_SUBJECT)))
                .andExpect(status().isNotFound());

        String token = inviteSecondaryUser(groupId);
        mockMvc.perform(post("/api/invites/{token}/accept", token).with(jwtForSubject(SECONDARY_SUBJECT)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/keys/{keyId}", keyId).with(jwtForSubject(SECONDARY_SUBJECT)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ownerType").value("group"))
                .andExpect(jsonPath("$.ownerGroupId").value(groupId));

        mockMvc.perform(get("/api/keys")
                        .param("scope", "group")
                        .param("groupId", groupId)
                        .with(jwtForSubject(SECONDARY_SUBJECT)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(keyId));
    }

    private String createGroup() throws Exception {
        MvcResult result =
                mockMvc.perform(post("/api/groups")
                                .with(jwtForSubject(PRIMARY_SUBJECT))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"name\":\"Shared Key Group\"}"))
                        .andExpect(status().isCreated())
                        .andReturn();
        return readJsonField(result.getResponse().getContentAsString(), "id");
    }

    private String createGroupOwnedPublicKey(String groupId) throws Exception {
        GeneratedKeyMaterial material = TestArmoredKeys.sampleEd25519PublicKey();
        String armoredPublic = jsonEscape(material.armoredPublic());
        MvcResult result =
                mockMvc.perform(post("/api/keys")
                                .with(jwtForSubject(PRIMARY_SUBJECT))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "label": "team-key",
                                          "keyType": "public",
                                          "ownerGroupId": "%s",
                                          "armoredPublic": "%s"
                                        }
                                        """
                                                .formatted(groupId, armoredPublic)))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.ownerType").value("group"))
                        .andReturn();
        return readJsonField(result.getResponse().getContentAsString(), "id");
    }

    private String inviteSecondaryUser(String groupId) throws Exception {
        String email = SECONDARY_SUBJECT + "@example.test";
        MvcResult result =
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
        return readJsonField(result.getResponse().getContentAsString(), "token");
    }

    private static String jsonEscape(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "");
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
