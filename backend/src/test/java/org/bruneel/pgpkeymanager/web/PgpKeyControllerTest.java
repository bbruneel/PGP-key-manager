package org.bruneel.pgpkeymanager.web;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import org.bruneel.pgpkeymanager.TestPgpKeys;
import org.bruneel.pgpkeymanager.domain.AppUser;
import org.bruneel.pgpkeymanager.domain.KeyRole;
import org.bruneel.pgpkeymanager.domain.PgpKey;
import org.bruneel.pgpkeymanager.service.CurrentUserService;
import org.bruneel.pgpkeymanager.service.PgpKeyService;
import org.bruneel.pgpkeymanager.service.PgpKeyService.RotateResult;
import org.bruneel.pgpkeymanager.web.dto.CreatePgpKeyRequest;
import org.bruneel.pgpkeymanager.web.dto.CreateSubkeyRequest;
import org.bruneel.pgpkeymanager.web.dto.ExtendExpiryRequest;
import org.bruneel.pgpkeymanager.web.dto.RevokeKeyRequest;
import org.bruneel.pgpkeymanager.web.dto.UpdatePgpKeyRequest;

@WebMvcTest(controllers = {PgpKeyController.class})
@AutoConfigureMockMvc(addFilters = false)
@Import(ApiExceptionHandler.class)
class PgpKeyControllerTest {

    private static final AppUser USER =
            new AppUser(UUID.fromString("00000000-0000-0000-0000-000000000001"), "auth0|test", Instant.EPOCH);

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CurrentUserService currentUserService;

    @MockitoBean
    private PgpKeyService pgpKeyService;

    @Test
    void getReturnsKey() throws Exception {
        UUID keyId = UUID.fromString("00000000-0000-0000-0000-000000000002");
        PgpKey key = TestPgpKeys.samplePublic(USER.id());
        when(currentUserService.requireCurrentUser(any())).thenReturn(USER);
        when(pgpKeyService.getForUser(USER, keyId)).thenReturn(key);

        mockMvc.perform(get("/api/keys/{keyId}", keyId).accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(keyId.toString()))
                .andExpect(jsonPath("$.fingerprint").value("A1B2C3D4E5F6789012345678ABCDEF0123456789"))
                .andExpect(jsonPath("$.role").value("primary"));

        verify(pgpKeyService).getForUser(USER, keyId);
    }

    @Test
    void listReturnsKeys() throws Exception {
        PgpKey key = TestPgpKeys.samplePublic(USER.id());
        when(currentUserService.requireCurrentUser(any())).thenReturn(USER);
        when(pgpKeyService.listForUser(eq(USER), isNull(), isNull(), isNull())).thenReturn(List.of(key));

        mockMvc.perform(get("/api/keys").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].fingerprint").value("A1B2C3D4E5F6789012345678ABCDEF0123456789"))
                .andExpect(jsonPath("$[0].role").value("primary"))
                .andExpect(jsonPath("$[0].encryptedPrivateArmored").doesNotExist());

        verify(pgpKeyService).listForUser(USER, null, null, null);
    }

    @Test
    void createReturns201() throws Exception {
        PgpKey key = TestPgpKeys.samplePublic(USER.id());
        when(currentUserService.requireCurrentUser(any())).thenReturn(USER);
        when(pgpKeyService.create(eq(USER), any(CreatePgpKeyRequest.class))).thenReturn(key);

        mockMvc.perform(post("/api/keys")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "fingerprint": "A1B2C3D4E5F6789012345678ABCDEF0123456789",
                                  "keyType": "public",
                                  "armoredPublic": "-----BEGIN PGP PUBLIC KEY BLOCK-----"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(key.id().toString()));

        verify(pgpKeyService).create(eq(USER), any(CreatePgpKeyRequest.class));
    }

    @Test
    void listSubkeysReturnsKeys() throws Exception {
        UUID primaryId = UUID.fromString("00000000-0000-0000-0000-000000000003");
        PgpKey subkey = TestPgpKeys.samplePublic(USER.id());
        when(currentUserService.requireCurrentUser(any())).thenReturn(USER);
        when(pgpKeyService.listSubkeys(USER, primaryId)).thenReturn(List.of(subkey));

        mockMvc.perform(get("/api/keys/{primaryKeyId}/subkeys", primaryId).accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].role").value("primary"));

        verify(pgpKeyService).listSubkeys(USER, primaryId);
    }

    @Test
    void getSubkeyReturnsKey() throws Exception {
        UUID primaryId = UUID.fromString("00000000-0000-0000-0000-000000000003");
        UUID subkeyId = UUID.fromString("00000000-0000-0000-0000-000000000004");
        PgpKey subkey = TestPgpKeys.samplePublic(USER.id());
        when(currentUserService.requireCurrentUser(any())).thenReturn(USER);
        when(pgpKeyService.getSubkey(USER, primaryId, subkeyId)).thenReturn(subkey);

        mockMvc.perform(get("/api/keys/{primaryKeyId}/subkeys/{subkeyId}", primaryId, subkeyId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fingerprint").value("A1B2C3D4E5F6789012345678ABCDEF0123456789"));

        verify(pgpKeyService).getSubkey(USER, primaryId, subkeyId);
    }

    @Test
    void importSubkeysFromKeyringReturns201WhenNewSubkeysRegistered() throws Exception {
        UUID primaryId = UUID.fromString("00000000-0000-0000-0000-000000000003");
        PgpKey subkey = TestPgpKeys.samplePublic(USER.id());
        when(currentUserService.requireCurrentUser(any())).thenReturn(USER);
        when(pgpKeyService.importSubkeysFromKeyring(USER, primaryId))
                .thenReturn(new org.bruneel.pgpkeymanager.service.ImportSubkeysResult(List.of(subkey), 1));

        mockMvc.perform(post("/api/keys/{primaryKeyId}/subkeys/import-from-keyring", primaryId))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.registered", org.hamcrest.Matchers.hasSize(1)))
                .andExpect(jsonPath("$.skippedCount").value(1));

        verify(pgpKeyService).importSubkeysFromKeyring(USER, primaryId);
    }

    @Test
    void importSubkeysFromKeyringReturns200WhenNoNewSubkeysRegistered() throws Exception {
        UUID primaryId = UUID.fromString("00000000-0000-0000-0000-000000000003");
        when(currentUserService.requireCurrentUser(any())).thenReturn(USER);
        when(pgpKeyService.importSubkeysFromKeyring(USER, primaryId))
                .thenReturn(new org.bruneel.pgpkeymanager.service.ImportSubkeysResult(List.of(), 2));

        mockMvc.perform(post("/api/keys/{primaryKeyId}/subkeys/import-from-keyring", primaryId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.registered", org.hamcrest.Matchers.hasSize(0)))
                .andExpect(jsonPath("$.skippedCount").value(2));

        verify(pgpKeyService).importSubkeysFromKeyring(USER, primaryId);
    }

    @Test
    void createSubkeyReturns201() throws Exception {
        UUID primaryId = UUID.fromString("00000000-0000-0000-0000-000000000003");
        PgpKey subkey = TestPgpKeys.samplePublic(USER.id());
        when(currentUserService.requireCurrentUser(any())).thenReturn(USER);
        when(pgpKeyService.createSubkey(eq(USER), eq(primaryId), any(CreateSubkeyRequest.class)))
                .thenReturn(subkey);

        mockMvc.perform(post("/api/keys/{primaryKeyId}/subkeys", primaryId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "capabilities": ["encrypt"],
                                  "algorithm": { "algorithm": "cv25519" },
                                  "validity": { "expiresAt": "2030-01-01T00:00:00Z" },
                                  "passphrase": "test-passphrase-123"
                                }
                                """))
                .andExpect(status().isCreated());

        verify(pgpKeyService).createSubkey(eq(USER), eq(primaryId), any(CreateSubkeyRequest.class));
    }

    @Test
    void deleteReturns204() throws Exception {
        UUID keyId = UUID.fromString("00000000-0000-0000-0000-000000000002");
        when(currentUserService.requireCurrentUser(any())).thenReturn(USER);

        mockMvc.perform(delete("/api/keys/{keyId}", keyId)).andExpect(status().isNoContent());

        verify(pgpKeyService).delete(USER, keyId);
    }

    @Test
    void patchUpdatesKey() throws Exception {
        UUID keyId = UUID.fromString("00000000-0000-0000-0000-000000000002");
        PgpKey key = TestPgpKeys.samplePublic(USER.id());
        when(currentUserService.requireCurrentUser(any())).thenReturn(USER);
        when(pgpKeyService.update(eq(USER), eq(keyId), any(UpdatePgpKeyRequest.class))).thenReturn(key);

        mockMvc.perform(patch("/api/keys/{keyId}", keyId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"label\":\"work\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.label").value("personal"));

        verify(pgpKeyService).update(eq(USER), eq(keyId), any(UpdatePgpKeyRequest.class));
    }

    @Test
    void revokeReturnsKey() throws Exception {
        UUID keyId = UUID.fromString("00000000-0000-0000-0000-000000000002");
        PgpKey key = TestPgpKeys.samplePublic(USER.id());
        when(currentUserService.requireCurrentUser(any())).thenReturn(USER);
        when(pgpKeyService.revoke(eq(USER), eq(keyId), any(RevokeKeyRequest.class))).thenReturn(key);

        mockMvc.perform(post("/api/keys/{keyId}/revoke", keyId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"key_retired\",\"passphrase\":\"test-passphrase-123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fingerprint").value("A1B2C3D4E5F6789012345678ABCDEF0123456789"));

        verify(pgpKeyService).revoke(eq(USER), eq(keyId), any(RevokeKeyRequest.class));
    }

    @Test
    void extendExpiryReturnsKey() throws Exception {
        UUID keyId = UUID.fromString("00000000-0000-0000-0000-000000000002");
        PgpKey key = TestPgpKeys.samplePublic(USER.id());
        when(currentUserService.requireCurrentUser(any())).thenReturn(USER);
        when(pgpKeyService.extendExpiry(eq(USER), eq(keyId), any(ExtendExpiryRequest.class)))
                .thenReturn(key);

        mockMvc.perform(post("/api/keys/{keyId}/extend-expiry", keyId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"expiresAt\":\"2031-06-01T00:00:00Z\",\"passphrase\":\"test-passphrase-123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fingerprint").value("A1B2C3D4E5F6789012345678ABCDEF0123456789"));

        verify(pgpKeyService).extendExpiry(eq(USER), eq(keyId), any(ExtendExpiryRequest.class));
    }

    @Test
    void exportPublicReturnsArmoredKey() throws Exception {
        UUID keyId = UUID.fromString("00000000-0000-0000-0000-000000000002");
        when(currentUserService.requireCurrentUser(any())).thenReturn(USER);
        when(pgpKeyService.exportPublic(USER, keyId))
                .thenReturn("-----BEGIN PGP PUBLIC KEY BLOCK-----\nVersion: BCPG v1.84\n");

        mockMvc.perform(get("/api/keys/{keyId}/export-public", keyId))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("BEGIN PGP PUBLIC KEY BLOCK")));

        verify(pgpKeyService).exportPublic(USER, keyId);
    }

    @Test
    void rotateReturns201() throws Exception {
        UUID subkeyId = UUID.fromString("00000000-0000-0000-0000-000000000004");
        PgpKey previous = TestPgpKeys.samplePublic(USER.id());
        PgpKey newKey = TestPgpKeys.samplePublic(USER.id());
        when(currentUserService.requireCurrentUser(any())).thenReturn(USER);
        when(pgpKeyService.rotate(eq(USER), eq(subkeyId), any())).thenReturn(new RotateResult(newKey, previous));

        mockMvc.perform(post("/api/keys/{keyId}/rotate", subkeyId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "capabilities": ["encrypt"],
                                  "algorithm": { "algorithm": "cv25519" },
                                  "validity": { "expiresAt": "2030-01-01T00:00:00Z" },
                                  "passphrase": "test-passphrase-123"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.newKey").exists())
                .andExpect(jsonPath("$.previousKey").exists());

        verify(pgpKeyService).rotate(eq(USER), eq(subkeyId), any());
    }
}
