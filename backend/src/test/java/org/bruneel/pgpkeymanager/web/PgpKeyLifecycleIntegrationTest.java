package org.bruneel.pgpkeymanager.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;

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
import org.bruneel.pgpkeymanager.crypto.GeneratedKeyMaterial;
import org.bruneel.pgpkeymanager.crypto.PgpCryptoService;
import org.bruneel.pgpkeymanager.domain.PgpCapability;
import org.bruneel.pgpkeymanager.web.dto.AlgorithmSpecDto;
import org.bruneel.pgpkeymanager.web.dto.UserIdSpecDto;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestJwtConfiguration.class)
class PgpKeyLifecycleIntegrationTest {

    private static final String PASSPHRASE = "lifecycle-passphrase-1";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void generatePrimaryAddSubkeyAndExport() throws Exception {
        MvcResult createPrimary =
                mockMvc.perform(post("/api/keys")
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "label": "lifecycle-primary",
                                          "keyType": "private",
                                          "capabilities": ["certify", "sign"],
                                          "algorithmSpec": { "algorithm": "ed25519" },
                                          "validity": { "expiresAt": "2030-06-01T00:00:00Z" },
                                          "userIds": [{ "name": "Lifecycle Test", "email": "life@example.com" }],
                                          "passphrase": "%s"
                                        }
                                        """
                                        .formatted(PASSPHRASE)))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.role").value("primary"))
                        .andExpect(jsonPath("$.openpgpVersion").value(4))
                        .andExpect(jsonPath("$.fingerprint").exists())
                        .andExpect(jsonPath("$.keyId").value(org.hamcrest.Matchers.matchesRegex("[0-9A-F]{16}")))
                        .andReturn();

        String primaryId = readJsonField(createPrimary.getResponse().getContentAsString(), "id");

        MvcResult createSubkey =
                mockMvc.perform(post("/api/keys/{primaryKeyId}/subkeys", primaryId)
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "capabilities": ["encrypt"],
                                          "algorithm": { "algorithm": "cv25519" },
                                          "validity": { "expiresAt": "2029-06-01T00:00:00Z" },
                                          "passphrase": "%s"
                                        }
                                        """
                                        .formatted(PASSPHRASE)))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.role").value("subkey"))
                        .andExpect(jsonPath("$.parentKeyId").value(primaryId))
                        .andExpect(jsonPath("$.armoredPublic").doesNotExist())
                        .andExpect(jsonPath("$.encryptedPrivateArmored").doesNotExist())
                        .andReturn();

        String subkeyId = readJsonField(createSubkey.getResponse().getContentAsString(), "id");

        mockMvc.perform(get("/api/keys/{keyId}", primaryId).with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(primaryId))
                .andExpect(jsonPath("$.role").value("primary"));

        mockMvc.perform(get("/api/keys/{primaryKeyId}/subkeys/{subkeyId}", primaryId, subkeyId).with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(subkeyId))
                .andExpect(jsonPath("$.role").value("subkey"));

        mockMvc.perform(get("/api/keys/{primaryKeyId}/subkeys", primaryId).with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].role").value("subkey"));

        mockMvc.perform(get("/api/keys/{keyId}/export-public", primaryId).with(jwt()))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("BEGIN PGP PUBLIC KEY BLOCK")));

        MvcResult createAuthSubkey =
                mockMvc.perform(post("/api/keys/{primaryKeyId}/subkeys", primaryId)
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "capabilities": ["authenticate"],
                                          "algorithm": { "algorithm": "ed25519" },
                                          "validity": { "expiresAt": "2029-06-01T00:00:00Z" },
                                          "passphrase": "%s"
                                        }
                                        """
                                        .formatted(PASSPHRASE)))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.capabilities[0]").value("authenticate"))
                        .andReturn();

        String authSubkeyId = readJsonField(createAuthSubkey.getResponse().getContentAsString(), "id");

        mockMvc.perform(get("/api/keys/{keyId}/export-ssh-public", authSubkeyId).with(jwt()))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_PLAIN))
                .andExpect(content().string(org.hamcrest.Matchers.startsWith("ssh-ed25519 ")));

        mockMvc.perform(post("/api/keys/{keyId}/export-ssh-private", authSubkeyId)
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                { "passphrase": "%s" }
                                """
                                        .formatted(PASSPHRASE)))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_PLAIN))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("BEGIN OPENSSH PRIVATE KEY")));

        mockMvc.perform(post("/api/keys/{keyId}/export-ssh-private", authSubkeyId)
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"passphrase\": \"wrong-passphrase-xx\" }"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/keys/{keyId}/export-ssh-public", subkeyId).with(jwt()))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/keys/{keyId}/export-ssh-private", subkeyId)
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                { "passphrase": "%s" }
                                """
                                        .formatted(PASSPHRASE)))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/keys/{keyId}/export-private", subkeyId)
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isNotFound());

        mockMvc.perform(post("/api/keys/{keyId}/export-private", authSubkeyId)
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isNotFound());

        mockMvc.perform(post("/api/keys/{keyId}/export-private", primaryId)
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.parseMediaType("application/pgp-keys")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("BEGIN PGP PRIVATE KEY BLOCK")))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
                        .string("Cache-Control", "no-store"));

        mockMvc.perform(post("/api/keys/{keyId}/export-private", primaryId)
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                { "passphrase": "%s" }
                                """
                                        .formatted(PASSPHRASE)))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/keys/{keyId}/export-private", primaryId)
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                { "newPassphrase": "transfer-passphrase-1" }
                                """))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/keys/{keyId}/export-private", primaryId)
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "passphrase": "wrong-passphrase-xx",
                                  "newPassphrase": "transfer-passphrase-1"
                                }
                                """))
                .andExpect(status().isBadRequest());

        MvcResult rewrapResult =
                mockMvc.perform(post("/api/keys/{keyId}/export-private", primaryId)
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "passphrase": "%s",
                                          "newPassphrase": "transfer-passphrase-1"
                                        }
                                        """
                                                .formatted(PASSPHRASE)))
                        .andExpect(status().isOk())
                        .andExpect(content().contentTypeCompatibleWith(MediaType.parseMediaType("application/pgp-keys")))
                        .andExpect(content().string(org.hamcrest.Matchers.containsString("BEGIN PGP PRIVATE KEY BLOCK")))
                        .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
                                .string("Cache-Control", "no-store"))
                        .andReturn();
        org.assertj.core.api.Assertions.assertThat(rewrapResult.getResponse().getContentAsString())
                .contains("BEGIN PGP PRIVATE KEY BLOCK");

        // Vault key still unlocks with the original passphrase after Mode B export.
        mockMvc.perform(post("/api/keys/{keyId}/export-ssh-private", authSubkeyId)
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                { "passphrase": "%s" }
                                """
                                        .formatted(PASSPHRASE)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/keys/{keyId}", primaryId).with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.encryptedPrivateArmored").doesNotExist())
                .andExpect(jsonPath("$.hasPrivateMaterial").value(true));

        mockMvc.perform(get("/api/keys/{keyId}", primaryId)
                        .param("includePrivateCiphertext", "true")
                        .with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.encryptedPrivateArmored").value(org.hamcrest.Matchers.containsString(
                        "BEGIN PGP PRIVATE KEY BLOCK")));

        MvcResult packResult =
                mockMvc.perform(post("/api/keys/{keyId}/export-ssh-setup-pack", authSubkeyId)
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        { "passphrase": "%s" }
                                        """
                                                .formatted(PASSPHRASE)))
                        .andExpect(status().isOk())
                        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                        .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
                                .doesNotExist("X-Archive-Password"))
                        .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
                                .string("Cache-Control", "no-store"))
                        .andExpect(jsonPath("$.filename").isNotEmpty())
                        .andExpect(jsonPath("$.archivePassword").isNotEmpty())
                        .andExpect(jsonPath("$.content").isNotEmpty())
                        .andReturn();

        String responseJson = packResult.getResponse().getContentAsString();
        tools.jackson.databind.JsonNode packJson =
                new tools.jackson.databind.ObjectMapper().readTree(responseJson);
        String archivePassword = packJson.get("archivePassword").asString();
        byte[] zipBytes =
                java.util.Base64.getDecoder().decode(packJson.get("content").asString());
        org.assertj.core.api.Assertions.assertThat(archivePassword).isNotBlank();
        org.assertj.core.api.Assertions.assertThat(zipBytes).isNotEmpty();
        // Password must not appear inside the zip ciphertext itself.
        org.assertj.core.api.Assertions.assertThat(new String(zipBytes, java.nio.charset.StandardCharsets.ISO_8859_1))
                .doesNotContain(archivePassword);

        java.nio.file.Path zipPath = java.nio.file.Files.createTempFile("ssh-setup-", ".zip");
        java.nio.file.Path extractDir = java.nio.file.Files.createTempDirectory("ssh-setup-out");
        try {
            java.nio.file.Files.write(zipPath, zipBytes);
            try (net.lingala.zip4j.ZipFile zipFile =
                    new net.lingala.zip4j.ZipFile(zipPath.toFile(), archivePassword.toCharArray())) {
                zipFile.extractAll(extractDir.toString());
            }
            boolean foundPrivate =
                    java.nio.file.Files.list(extractDir)
                            .anyMatch(
                                    path -> {
                                        try {
                                            return java.nio.file.Files.readString(path)
                                                    .contains("BEGIN OPENSSH PRIVATE KEY");
                                        } catch (java.io.IOException e) {
                                            return false;
                                        }
                                    });
            org.assertj.core.api.Assertions.assertThat(foundPrivate).isTrue();
            org.assertj.core.api.Assertions.assertThat(extractDir.resolve("README.txt")).exists();
        } finally {
            java.nio.file.Files.deleteIfExists(zipPath);
            try (var paths = java.nio.file.Files.walk(extractDir)) {
                paths.sorted(java.util.Comparator.reverseOrder())
                        .forEach(
                                path -> {
                                    try {
                                        java.nio.file.Files.deleteIfExists(path);
                                    } catch (java.io.IOException ignored) {
                                        // best-effort cleanup
                                    }
                                });
            }
        }

        mockMvc.perform(post("/api/keys/{keyId}/extend-expiry", subkeyId)
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "expiresAt": "2031-06-01T00:00:00Z",
                                  "passphrase": "%s"
                                }
                                """
                                .formatted(PASSPHRASE)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.expiresAt").exists());

        mockMvc.perform(post("/api/keys/{keyId}/revoke", subkeyId)
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "reason": "key_retired",
                                  "passphrase": "%s"
                                }
                                """
                                .formatted(PASSPHRASE)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("revoked"));

        mockMvc.perform(post("/api/keys/{keyId}/export-private", primaryId)
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/keys/{keyId}/revoke", primaryId)
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "reason": "key_retired",
                                  "passphrase": "%s"
                                }
                                """
                                .formatted(PASSPHRASE)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("revoked"));

        mockMvc.perform(post("/api/keys/{keyId}/export-private", primaryId)
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isConflict());
    }

    @Test
    void rotateSubkeyRevokesPreviousInKeyring() throws Exception {
        String primaryId = createPrimaryForRotate();
        String subkeyId = createEncryptSubkey(primaryId);

        mockMvc.perform(post("/api/keys/{keyId}/rotate", subkeyId)
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "capabilities": ["encrypt"],
                                  "algorithm": { "algorithm": "cv25519" },
                                  "validity": { "expiresAt": "2032-06-01T00:00:00Z" },
                                  "passphrase": "%s",
                                  "revokePrevious": true
                                }
                                """
                                .formatted(PASSPHRASE)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.newKey.role").value("subkey"))
                .andExpect(jsonPath("$.previousKey.status").value("revoked"));
    }

    @Test
    void rotateRequiresPassphraseWhenRevokePrevious() throws Exception {
        String primaryId = createPrimaryForRotate();
        String subkeyId = createEncryptSubkey(primaryId);

        mockMvc.perform(post("/api/keys/{keyId}/rotate", subkeyId)
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "capabilities": ["encrypt"],
                                  "algorithm": { "algorithm": "cv25519" },
                                  "revokePrevious": true
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void listFiltersByCapability() throws Exception {
        String primaryId = createPrimaryForRotate();
        createEncryptSubkey(primaryId);

        mockMvc.perform(
                        get("/api/keys")
                                .param("capability", "encrypt")
                                .param("role", "subkey")
                                .with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].role").value("subkey"))
                .andExpect(jsonPath("$[0].capabilities[0]").value("encrypt"));

        mockMvc.perform(get("/api/keys").param("capability", "not-a-capability").with(jwt()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createPrimaryWithExplicitV6() throws Exception {
        mockMvc.perform(post("/api/keys")
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "label": "v6-primary",
                                  "keyType": "private",
                                  "capabilities": ["certify", "sign"],
                                  "algorithmSpec": { "algorithm": "ed25519" },
                                  "openpgpVersion": 6,
                                  "validity": { "expiresAt": "2030-06-01T00:00:00Z" },
                                  "passphrase": "%s"
                                }
                                """
                                .formatted(PASSPHRASE)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.openpgpVersion").value(6));
    }

    @Test
    void createPrimaryEd448OnV6() throws Exception {
        mockMvc.perform(post("/api/keys")
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "label": "ed448-v6-primary",
                                  "keyType": "private",
                                  "capabilities": ["certify", "sign"],
                                  "algorithmSpec": { "algorithm": "ed448" },
                                  "openpgpVersion": 6,
                                  "validity": { "expiresAt": "2030-06-01T00:00:00Z" },
                                  "passphrase": "%s"
                                }
                                """
                                .formatted(PASSPHRASE)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.openpgpVersion").value(6))
                .andExpect(jsonPath("$.algorithm").value("ed448"));
    }

    @Test
    void createPrimaryEd448OnV4Rejects() throws Exception {
        mockMvc.perform(post("/api/keys")
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "label": "ed448-v4-primary",
                                  "capabilities": ["certify", "sign"],
                                  "algorithmSpec": { "algorithm": "ed448" },
                                  "openpgpVersion": 4,
                                  "validity": { "expiresAt": "2030-06-01T00:00:00Z" },
                                  "passphrase": "%s"
                                }
                                """
                                .formatted(PASSPHRASE)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createV6PrimaryWithX448EncryptSubkey() throws Exception {
        MvcResult createPrimary =
                mockMvc.perform(post("/api/keys")
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "label": "x448-subkey-primary",
                                          "keyType": "private",
                                          "capabilities": ["certify", "sign"],
                                          "algorithmSpec": { "algorithm": "ed25519" },
                                          "openpgpVersion": 6,
                                          "validity": { "expiresAt": "2030-06-01T00:00:00Z" },
                                          "passphrase": "%s"
                                        }
                                        """
                                        .formatted(PASSPHRASE)))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.openpgpVersion").value(6))
                        .andReturn();

        String primaryId = readJsonField(createPrimary.getResponse().getContentAsString(), "id");

        mockMvc.perform(post("/api/keys/{primaryKeyId}/subkeys", primaryId)
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "capabilities": ["encrypt"],
                                  "algorithm": { "algorithm": "x448" },
                                  "validity": { "expiresAt": "2029-06-01T00:00:00Z" },
                                  "passphrase": "%s"
                                }
                                """
                                .formatted(PASSPHRASE)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("subkey"))
                .andExpect(jsonPath("$.algorithm").value("x448"))
                .andExpect(jsonPath("$.parentKeyId").value(primaryId));
    }

    @Test
    void invalidOpenpgpVersionReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/keys")
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "label": "bad-version",
                                  "capabilities": ["certify", "sign"],
                                  "algorithmSpec": { "algorithm": "ed25519" },
                                  "openpgpVersion": 5,
                                  "passphrase": "%s"
                                }
                                """
                                .formatted(PASSPHRASE)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void invalidRevocationReasonReturnsBadRequest() throws Exception {
        String primaryId = createPrimaryForRotate();

        mockMvc.perform(post("/api/keys/{keyId}/revoke", primaryId)
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"not_valid\",\"passphrase\":\"%s\"}".formatted(PASSPHRASE)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void exportAndApplyRevocationCertificateRoundTrip() throws Exception {
        String primaryId = createPrimaryForRotate();

        MvcResult export =
                mockMvc.perform(post("/api/keys/{keyId}/export-revocation-cert", primaryId)
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "reason": "key_compromised",
                                          "description": "offline insurance",
                                          "passphrase": "%s"
                                        }
                                        """
                                        .formatted(PASSPHRASE)))
                        .andExpect(status().isOk())
                        .andExpect(content().contentTypeCompatibleWith(MediaType.parseMediaType("application/pgp-keys")))
                        .andExpect(content().string(org.hamcrest.Matchers.containsString("BEGIN PGP PUBLIC KEY BLOCK")))
                        .andReturn();

        String cert = export.getResponse().getContentAsString();

        mockMvc.perform(get("/api/keys/{keyId}", primaryId).with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("active"))
                .andExpect(jsonPath("$.revokedAt").doesNotExist());

        String escapedCert = cert.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "");

        mockMvc.perform(post("/api/keys/{keyId}/apply-revocation-cert", primaryId)
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"armoredCertificate\":\"" + escapedCert + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("revoked"))
                .andExpect(jsonPath("$.revokedAt").exists());

        mockMvc.perform(post("/api/keys/{keyId}/apply-revocation-cert", primaryId)
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"armoredCertificate\":\"" + escapedCert + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("revoked"));
    }

    @Test
    void exportRevocationCertOnSubkeyReturnsNotFound() throws Exception {
        String primaryId = createPrimaryForRotate();
        String subkeyId = createEncryptSubkey(primaryId);

        mockMvc.perform(post("/api/keys/{keyId}/export-revocation-cert", subkeyId)
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "reason": "key_retired",
                                  "passphrase": "%s"
                                }
                                """
                                .formatted(PASSPHRASE)))
                .andExpect(status().isNotFound());
    }

    @Test
    void applyRevocationCertMergesArmorAfterMetadataOnlyRevoke() throws Exception {
        PgpCryptoService crypto = new PgpCryptoService();
        char[] passphrase = "metadata-revoke-pass".toCharArray();
        GeneratedKeyMaterial material =
                crypto.generatePrimary(
                        4,
                        List.of(new UserIdSpecDto("Meta Revoke", "meta@example.com")),
                        List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                        new AlgorithmSpecDto("ed25519", null, null),
                        Instant.parse("2030-06-01T00:00:00Z"),
                        passphrase);

        String cert =
                crypto.generateRevocationCertificate(
                        material.armoredPrivate(), passphrase, 2, "sync after metadata revoke");
        assertThat(crypto.primaryKeyIsCryptographicallyRevoked(material.armoredPublic())).isFalse();

        MvcResult register =
                mockMvc.perform(post("/api/keys")
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "label": "public-only-meta-revoke",
                                          "keyType": "public",
                                          "armoredPublic": "%s"
                                        }
                                        """
                                        .formatted(jsonEscape(material.armoredPublic()))))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.hasPrivateMaterial").value(false))
                        .andReturn();
        String primaryId = readJsonField(register.getResponse().getContentAsString(), "id");

        mockMvc.perform(post("/api/keys/{keyId}/revoke", primaryId)
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"key_retired\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("revoked"));

        MvcResult afterMetadataRevoke =
                mockMvc.perform(get("/api/keys/{keyId}", primaryId).with(jwt()))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.status").value("revoked"))
                        .andReturn();
        String publicBeforeApply =
                readJsonField(afterMetadataRevoke.getResponse().getContentAsString(), "armoredPublic")
                        .replace("\\n", "\n");
        assertThat(crypto.primaryKeyIsCryptographicallyRevoked(publicBeforeApply)).isFalse();

        mockMvc.perform(post("/api/keys/{keyId}/apply-revocation-cert", primaryId)
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"armoredCertificate\":\"" + jsonEscape(cert) + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("revoked"));

        MvcResult afterApply =
                mockMvc.perform(get("/api/keys/{keyId}", primaryId).with(jwt()))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.status").value("revoked"))
                        .andReturn();
        String publicAfterApply =
                readJsonField(afterApply.getResponse().getContentAsString(), "armoredPublic")
                        .replace("\\n", "\n");
        assertThat(crypto.primaryKeyIsCryptographicallyRevoked(publicAfterApply)).isTrue();
    }

    private String createPrimaryForRotate() throws Exception {
        MvcResult result =
                mockMvc.perform(post("/api/keys")
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "label": "rotate-primary",
                                          "keyType": "private",
                                          "capabilities": ["certify", "sign"],
                                          "algorithmSpec": { "algorithm": "ed25519" },
                                          "validity": { "expiresAt": "2030-06-01T00:00:00Z" },
                                          "passphrase": "%s"
                                        }
                                        """
                                        .formatted(PASSPHRASE)))
                        .andExpect(status().isCreated())
                        .andReturn();
        return readJsonField(result.getResponse().getContentAsString(), "id");
    }

    private String createEncryptSubkey(String primaryId) throws Exception {
        MvcResult result =
                mockMvc.perform(post("/api/keys/{primaryKeyId}/subkeys", primaryId)
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "capabilities": ["encrypt"],
                                          "algorithm": { "algorithm": "cv25519" },
                                          "validity": { "expiresAt": "2029-06-01T00:00:00Z" },
                                          "passphrase": "%s"
                                        }
                                        """
                                        .formatted(PASSPHRASE)))
                        .andExpect(status().isCreated())
                        .andReturn();
        return readJsonField(result.getResponse().getContentAsString(), "id");
    }

    @Test
    void lifecycleEndpointsRequireAuth() throws Exception {
        mockMvc.perform(post("/api/keys/00000000-0000-0000-0000-000000000099/revoke")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"key_retired\"}"))
                .andExpect(status().isUnauthorized());
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

    private static String jsonEscape(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "");
    }
}
