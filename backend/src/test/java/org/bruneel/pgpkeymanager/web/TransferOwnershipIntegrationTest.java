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
class TransferOwnershipIntegrationTest {

    private static final String PASSPHRASE = "transfer-ownership-pass-1";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void personalToTeamCascadesSubkeysAndMemberCannotTransfer() throws Exception {
        String groupId = createGroup("Transfer Group A");
        String primaryId = createPersonalPrivateKey("transfer-primary-a");
        String subkeyId = createEncryptSubkey(primaryId);

        mockMvc.perform(post("/api/keys/{keyId}/transfer-ownership", primaryId)
                        .with(jwtForSubject(PRIMARY_SUBJECT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ownerGroupId\":\"" + groupId + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ownerType").value("group"))
                .andExpect(jsonPath("$.ownerGroupId").value(groupId));

        mockMvc.perform(get("/api/keys/{keyId}", subkeyId).with(jwtForSubject(PRIMARY_SUBJECT)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ownerType").value("group"))
                .andExpect(jsonPath("$.ownerGroupId").value(groupId));

        String token = inviteSecondaryAsMember(groupId);
        mockMvc.perform(post("/api/invites/{token}/accept", token).with(jwtForSubject(SECONDARY_SUBJECT)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/keys/{keyId}/transfer-ownership", primaryId)
                        .with(jwtForSubject(SECONDARY_SUBJECT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ownerGroupId\":\"" + groupId + "\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void teamToPersonalRequiresRecipientAndBlocksRevoked() throws Exception {
        String groupId = createGroup("Transfer Group B");
        String primaryId = createGroupOwnedPublicKey(groupId, "team-key-b");
        String ownerUserId = readOwnerUserId(groupId);

        String token = inviteSecondaryAsMember(groupId);
        mockMvc.perform(post("/api/invites/{token}/accept", token).with(jwtForSubject(SECONDARY_SUBJECT)))
                .andExpect(status().isOk());
        String memberUserId = readMemberUserId(groupId, SECONDARY_SUBJECT);

        mockMvc.perform(post("/api/keys/{keyId}/transfer-ownership", primaryId)
                        .with(jwtForSubject(PRIMARY_SUBJECT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/keys/{keyId}/transfer-ownership", primaryId)
                        .with(jwtForSubject(PRIMARY_SUBJECT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"targetUserId\":\"" + memberUserId + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ownerType").value("user"))
                .andExpect(jsonPath("$.ownerGroupId").doesNotExist());

        mockMvc.perform(get("/api/keys/{keyId}", primaryId).with(jwtForSubject(SECONDARY_SUBJECT)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ownerType").value("user"));

        mockMvc.perform(get("/api/keys/{keyId}", primaryId).with(jwtForSubject(PRIMARY_SUBJECT)))
                .andExpect(status().isNotFound());

        // Create another group-owned key, revoke it, then transfer should fail
        String revokedId = createGroupOwnedPublicKey(groupId, "team-key-revoked");
        mockMvc.perform(post("/api/keys/{keyId}/revoke", revokedId)
                        .with(jwtForSubject(PRIMARY_SUBJECT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"key_retired\",\"description\":\"phase19\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/keys/{keyId}/transfer-ownership", revokedId)
                        .with(jwtForSubject(PRIMARY_SUBJECT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"targetUserId\":\"" + ownerUserId + "\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void teamToTeamTransfer() throws Exception {
        String sourceGroupId = createGroup("Transfer Source");
        String destGroupId = createGroup("Transfer Dest");
        String primaryId = createGroupOwnedPublicKey(sourceGroupId, "team-key-move");

        mockMvc.perform(post("/api/keys/{keyId}/transfer-ownership", primaryId)
                        .with(jwtForSubject(PRIMARY_SUBJECT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ownerGroupId\":\"" + destGroupId + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ownerType").value("group"))
                .andExpect(jsonPath("$.ownerGroupId").value(destGroupId));
    }

    @Test
    void rejectsSubkeyOnlyTransfer() throws Exception {
        String groupId = createGroup("Transfer Subkey Guard");
        String primaryId = createPersonalPrivateKey("transfer-primary-sub");
        String subkeyId = createEncryptSubkey(primaryId);

        mockMvc.perform(post("/api/keys/{keyId}/transfer-ownership", subkeyId)
                        .with(jwtForSubject(PRIMARY_SUBJECT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ownerGroupId\":\"" + groupId + "\"}"))
                .andExpect(status().isBadRequest());
    }

    private String createGroup(String name) throws Exception {
        MvcResult result =
                mockMvc.perform(post("/api/groups")
                                .with(jwtForSubject(PRIMARY_SUBJECT))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"name\":\"" + name + "\"}"))
                        .andExpect(status().isCreated())
                        .andReturn();
        return readJsonField(result.getResponse().getContentAsString(), "id");
    }

    private String createPersonalPrivateKey(String label) throws Exception {
        MvcResult result =
                mockMvc.perform(post("/api/keys")
                                .with(jwtForSubject(PRIMARY_SUBJECT))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "label": "%s",
                                          "keyType": "private",
                                          "capabilities": ["certify", "sign"],
                                          "algorithmSpec": { "algorithm": "ed25519" },
                                          "userIds": [{ "name": "Transfer Test", "email": "transfer@example.com" }],
                                          "passphrase": "%s"
                                        }
                                        """
                                                .formatted(label, PASSPHRASE)))
                        .andExpect(status().isCreated())
                        .andReturn();
        return readJsonField(result.getResponse().getContentAsString(), "id");
    }

    private String createEncryptSubkey(String primaryId) throws Exception {
        MvcResult result =
                mockMvc.perform(post("/api/keys/{primaryKeyId}/subkeys", primaryId)
                                .with(jwtForSubject(PRIMARY_SUBJECT))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "capabilities": ["encrypt"],
                                          "algorithm": { "algorithm": "cv25519" },
                                          "passphrase": "%s"
                                        }
                                        """
                                                .formatted(PASSPHRASE)))
                        .andExpect(status().isCreated())
                        .andReturn();
        return readJsonField(result.getResponse().getContentAsString(), "id");
    }

    private String createGroupOwnedPublicKey(String groupId, String label) throws Exception {
        GeneratedKeyMaterial material = TestArmoredKeys.sampleEd25519PublicKey();
        String armoredPublic = jsonEscape(material.armoredPublic());
        MvcResult result =
                mockMvc.perform(post("/api/keys")
                                .with(jwtForSubject(PRIMARY_SUBJECT))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "label": "%s",
                                          "keyType": "public",
                                          "ownerGroupId": "%s",
                                          "armoredPublic": "%s"
                                        }
                                        """
                                                .formatted(label, groupId, armoredPublic)))
                        .andExpect(status().isCreated())
                        .andReturn();
        return readJsonField(result.getResponse().getContentAsString(), "id");
    }

    private String inviteSecondaryAsMember(String groupId) throws Exception {
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

    private String readOwnerUserId(String groupId) throws Exception {
        MvcResult result =
                mockMvc.perform(get("/api/groups/{groupId}/members", groupId).with(jwtForSubject(PRIMARY_SUBJECT)))
                        .andExpect(status().isOk())
                        .andReturn();
        String body = result.getResponse().getContentAsString();
        // First member is the creator (owner)
        return readJsonField(body, "userId");
    }

    private String readMemberUserId(String groupId, String subjectHint) throws Exception {
        MvcResult result =
                mockMvc.perform(get("/api/groups/{groupId}/members", groupId).with(jwtForSubject(PRIMARY_SUBJECT)))
                        .andExpect(status().isOk())
                        .andReturn();
        String body = result.getResponse().getContentAsString();
        // Find the non-owner userId by scanning all userId fields — take the last for secondary
        String marker = "\"userId\":\"";
        int first = body.indexOf(marker);
        int second = body.indexOf(marker, first + marker.length());
        if (second < 0) {
            throw new IllegalStateException("Expected a second member in group " + groupId + " for " + subjectHint);
        }
        int start = second + marker.length();
        int end = body.indexOf('"', start);
        return body.substring(start, end);
    }

    private static String jsonEscape(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "");
    }

    private static String readJsonField(String json, String field) {
        String marker = "\"" + field + "\":\"";
        int start = json.indexOf(marker);
        if (start < 0) {
            throw new IllegalStateException("Field " + field + " not found in: " + json);
        }
        start += marker.length();
        int end = json.indexOf('"', start);
        return json.substring(start, end);
    }
}
