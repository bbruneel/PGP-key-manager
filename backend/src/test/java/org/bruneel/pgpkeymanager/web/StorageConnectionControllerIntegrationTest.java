package org.bruneel.pgpkeymanager.web;

import static org.bruneel.pgpkeymanager.TestJwtSupport.PRIMARY_SUBJECT;
import static org.bruneel.pgpkeymanager.TestJwtSupport.SECONDARY_SUBJECT;
import static org.bruneel.pgpkeymanager.TestJwtSupport.jwtForSubject;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
class StorageConnectionControllerIntegrationTest {

    private static final String PASSPHRASE = "storage-connection-passphrase";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void ownerCanCrudStorageConnection() throws Exception {
        String connectionId = createConnection("Personal vault");

        mockMvc.perform(get("/api/storage-connections/{connectionId}", connectionId)
                        .with(jwtForSubject(PRIMARY_SUBJECT)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Personal vault"))
                .andExpect(jsonPath("$.externalId").exists());

        mockMvc.perform(patch("/api/storage-connections/{connectionId}", connectionId)
                        .with(jwtForSubject(PRIMARY_SUBJECT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"displayName\":\"Updated vault\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Updated vault"));

        mockMvc.perform(delete("/api/storage-connections/{connectionId}", connectionId)
                        .with(jwtForSubject(PRIMARY_SUBJECT)))
                .andExpect(status().isNoContent());
    }

    @Test
    void otherUserCannotAccessConnection() throws Exception {
        String connectionId = createConnection("Private vault");

        mockMvc.perform(get("/api/storage-connections/{connectionId}", connectionId)
                        .with(jwtForSubject(SECONDARY_SUBJECT)))
                .andExpect(status().isNotFound());
    }

    @Test
    void duplicateDisplayNameReturnsConflict() throws Exception {
        createConnection("Duplicate name");

        mockMvc.perform(post("/api/storage-connections")
                        .with(jwtForSubject(PRIMARY_SUBJECT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "displayName": "duplicate name",
                                  "region": "eu-west-1",
                                  "bucket": "acme-pgp-vault-2",
                                  "roleArn": "arn:aws:iam::123456789012:role/PgpKeyManager"
                                }
                                """))
                .andExpect(status().isConflict());
    }

    @Test
    void deleteBlockedWhenKeysReferenceConnection() throws Exception {
        String connectionId = createConnection("Referenced vault");
        String keyId = createPrimaryKey();
        String storageRef = "aws-s3://" + connectionId + "/user/keys/" + keyId + "/keyring.json";

        mockMvc.perform(patch("/api/keys/{keyId}", keyId)
                        .with(jwtForSubject(PRIMARY_SUBJECT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "storageProvider": "aws-s3",
                                  "storageRef": "%s"
                                }
                                """
                                        .formatted(storageRef)))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/storage-connections/{connectionId}", connectionId)
                        .with(jwtForSubject(PRIMARY_SUBJECT)))
                .andExpect(status().isConflict());
    }

    private String createConnection(String displayName) throws Exception {
        MvcResult created =
                mockMvc.perform(post("/api/storage-connections")
                                .with(jwtForSubject(PRIMARY_SUBJECT))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "displayName": "%s",
                                          "region": "eu-west-1",
                                          "bucket": "acme-pgp-vault",
                                          "roleArn": "arn:aws:iam::123456789012:role/PgpKeyManager"
                                        }
                                        """
                                                .formatted(displayName)))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.prefix").value("pgp-key-manager/"))
                        .andReturn();
        return readJsonField(created.getResponse().getContentAsString(), "id");
    }

    private String createPrimaryKey() throws Exception {
        MvcResult created =
                mockMvc.perform(post("/api/keys")
                                .with(jwtForSubject(PRIMARY_SUBJECT))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "label": "storage-ref-key",
                                          "keyType": "private",
                                          "capabilities": ["certify", "sign"],
                                          "algorithmSpec": { "algorithm": "ed25519" },
                                          "validity": { "expiresAt": "2030-06-01T00:00:00Z" },
                                          "userIds": [{ "name": "Storage Test", "email": "storage@example.com" }],
                                          "passphrase": "%s"
                                        }
                                        """
                                                .formatted(PASSPHRASE)))
                        .andExpect(status().isCreated())
                        .andReturn();
        return readJsonField(created.getResponse().getContentAsString(), "id");
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
