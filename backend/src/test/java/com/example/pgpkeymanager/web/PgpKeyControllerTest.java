package com.example.pgpkeymanager.web;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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

import com.example.pgpkeymanager.domain.AppUser;
import com.example.pgpkeymanager.domain.PgpKey;
import com.example.pgpkeymanager.domain.PgpKey.KeyType;
import com.example.pgpkeymanager.service.CurrentUserService;
import com.example.pgpkeymanager.service.PgpKeyService;
import com.example.pgpkeymanager.web.dto.CreatePgpKeyRequest;
import com.example.pgpkeymanager.web.dto.UpdatePgpKeyRequest;

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
    void listReturnsKeys() throws Exception {
        PgpKey key = sampleKey();
        when(currentUserService.requireCurrentUser(any())).thenReturn(USER);
        when(pgpKeyService.listForUser(USER)).thenReturn(List.of(key));

        mockMvc.perform(get("/api/keys").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].fingerprint").value("ABCD1234"))
                .andExpect(jsonPath("$[0].encryptedPrivateArmored").doesNotExist());
    }

    @Test
    void createReturns201() throws Exception {
        PgpKey key = sampleKey();
        when(currentUserService.requireCurrentUser(any())).thenReturn(USER);
        when(pgpKeyService.create(eq(USER), any(CreatePgpKeyRequest.class))).thenReturn(key);

        mockMvc.perform(post("/api/keys")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "fingerprint": "ABCD1234",
                                  "keyType": "public",
                                  "armoredPublic": "-----BEGIN PGP PUBLIC KEY BLOCK-----"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(key.id().toString()));

        verify(pgpKeyService).create(eq(USER), any(CreatePgpKeyRequest.class));
    }

    @Test
    void deleteReturns204() throws Exception {
        UUID id = UUID.fromString("00000000-0000-0000-0000-000000000002");
        when(currentUserService.requireCurrentUser(any())).thenReturn(USER);

        mockMvc.perform(delete("/api/keys/{id}", id)).andExpect(status().isNoContent());

        verify(pgpKeyService).delete(USER, id);
    }

    @Test
    void patchUpdatesKey() throws Exception {
        UUID id = UUID.fromString("00000000-0000-0000-0000-000000000002");
        PgpKey key = new PgpKey(
                id,
                USER.id(),
                "work",
                "ABCD1234",
                "1234ABCD",
                KeyType.PUBLIC,
                "ed25519",
                null,
                null,
                "-----BEGIN PGP PUBLIC KEY BLOCK-----",
                null,
                null,
                null,
                Instant.parse("2026-01-01T00:00:00Z"),
                Instant.parse("2026-01-02T00:00:00Z"));
        when(currentUserService.requireCurrentUser(any())).thenReturn(USER);
        when(pgpKeyService.update(eq(USER), eq(id), any(UpdatePgpKeyRequest.class))).thenReturn(key);

        mockMvc.perform(patch("/api/keys/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"label\":\"work\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.label").value("work"));
    }

    private static PgpKey sampleKey() {
        UUID id = UUID.fromString("00000000-0000-0000-0000-000000000002");
        return new PgpKey(
                id,
                USER.id(),
                "personal",
                "ABCD1234",
                "1234ABCD",
                KeyType.PUBLIC,
                "ed25519",
                null,
                null,
                "-----BEGIN PGP PUBLIC KEY BLOCK-----",
                null,
                null,
                null,
                Instant.parse("2026-01-01T00:00:00Z"),
                Instant.parse("2026-01-01T00:00:00Z"));
    }
}
