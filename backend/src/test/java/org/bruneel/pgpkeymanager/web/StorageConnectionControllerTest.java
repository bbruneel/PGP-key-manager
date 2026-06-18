package org.bruneel.pgpkeymanager.web;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
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

import org.bruneel.pgpkeymanager.domain.AppUser;
import org.bruneel.pgpkeymanager.domain.StorageConnection;
import org.bruneel.pgpkeymanager.domain.StorageConnectionStatus;
import org.bruneel.pgpkeymanager.domain.StorageProvider;
import org.bruneel.pgpkeymanager.service.CurrentUserService;
import org.bruneel.pgpkeymanager.service.StorageConnectionService;

@WebMvcTest(controllers = StorageConnectionController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(ApiExceptionHandler.class)
class StorageConnectionControllerTest {

    private static final AppUser USER =
            new AppUser(
                    UUID.fromString("00000000-0000-0000-0000-000000000001"),
                    "auth0|test",
                    "test@example.test",
                    "Test User",
                    "user",
                    Instant.EPOCH);

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CurrentUserService currentUserService;

    @MockitoBean
    private StorageConnectionService storageConnectionService;

    @Test
    void listReturnsConnections() throws Exception {
        StorageConnection connection = connection();
        when(currentUserService.requireCurrentUser(any())).thenReturn(USER);
        when(storageConnectionService.listConnections(USER)).thenReturn(List.of(connection));

        mockMvc.perform(get("/api/storage-connections"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(connection.id().toString()))
                .andExpect(jsonPath("$[0].displayName").value("Personal vault"));

        verify(storageConnectionService).listConnections(USER);
    }

    @Test
    void createReturnsCreated() throws Exception {
        StorageConnection connection = connection();
        when(currentUserService.requireCurrentUser(any())).thenReturn(USER);
        when(storageConnectionService.createConnection(
                        eq(USER),
                        eq("Personal vault"),
                        eq("eu-west-1"),
                        eq("acme-pgp-vault"),
                        eq("pgp-key-manager/"),
                        eq("arn:aws:iam::123456789012:role/PgpKeyManager")))
                .thenReturn(connection);

        mockMvc.perform(post("/api/storage-connections")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "displayName": "Personal vault",
                                  "region": "eu-west-1",
                                  "bucket": "acme-pgp-vault",
                                  "prefix": "pgp-key-manager/",
                                  "roleArn": "arn:aws:iam::123456789012:role/PgpKeyManager"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.externalId").value("external-id-1"))
                .andExpect(jsonPath("$.status").value("registered"));

        verify(storageConnectionService)
                .createConnection(
                        eq(USER),
                        eq("Personal vault"),
                        eq("eu-west-1"),
                        eq("acme-pgp-vault"),
                        eq("pgp-key-manager/"),
                        eq("arn:aws:iam::123456789012:role/PgpKeyManager"));
    }

    @Test
    void getReturnsConnection() throws Exception {
        StorageConnection connection = connection();
        when(currentUserService.requireCurrentUser(any())).thenReturn(USER);
        when(storageConnectionService.getConnection(USER, connection.id())).thenReturn(connection);

        mockMvc.perform(get("/api/storage-connections/{connectionId}", connection.id()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bucket").value("acme-pgp-vault"));

        verify(storageConnectionService).getConnection(USER, connection.id());
    }

    @Test
    void updateReturnsConnection() throws Exception {
        StorageConnection connection =
                new StorageConnection(
                        connection().id(),
                        USER.id(),
                        StorageProvider.AWS_S3,
                        "Updated vault",
                        "eu-west-1",
                        "acme-pgp-vault",
                        "pgp-key-manager/",
                        "arn:aws:iam::123456789012:role/PgpKeyManager",
                        "external-id-1",
                        StorageConnectionStatus.REGISTERED,
                        Instant.EPOCH,
                        Instant.now());
        when(currentUserService.requireCurrentUser(any())).thenReturn(USER);
        when(storageConnectionService.updateConnection(
                        eq(USER),
                        eq(connection.id()),
                        eq("Updated vault"),
                        eq(null),
                        eq(null),
                        eq(null),
                        eq(null)))
                .thenReturn(connection);

        mockMvc.perform(patch("/api/storage-connections/{connectionId}", connection.id())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"displayName\":\"Updated vault\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Updated vault"));

        verify(storageConnectionService)
                .updateConnection(
                        eq(USER),
                        eq(connection.id()),
                        eq("Updated vault"),
                        eq(null),
                        eq(null),
                        eq(null),
                        eq(null));
    }

    @Test
    void deleteReturnsNoContent() throws Exception {
        UUID connectionId = connection().id();
        when(currentUserService.requireCurrentUser(any())).thenReturn(USER);

        mockMvc.perform(delete("/api/storage-connections/{connectionId}", connectionId))
                .andExpect(status().isNoContent());

        verify(storageConnectionService).deleteConnection(USER, connectionId);
    }

    private static StorageConnection connection() {
        return new StorageConnection(
                UUID.fromString("00000000-0000-0000-0000-000000000020"),
                USER.id(),
                StorageProvider.AWS_S3,
                "Personal vault",
                "eu-west-1",
                "acme-pgp-vault",
                "pgp-key-manager/",
                "arn:aws:iam::123456789012:role/PgpKeyManager",
                "external-id-1",
                StorageConnectionStatus.REGISTERED,
                Instant.EPOCH,
                Instant.EPOCH);
    }
}
