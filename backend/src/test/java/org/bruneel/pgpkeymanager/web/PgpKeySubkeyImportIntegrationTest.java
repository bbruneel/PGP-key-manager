package org.bruneel.pgpkeymanager.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import org.bruneel.pgpkeymanager.TestJwtConfiguration;
import org.bruneel.pgpkeymanager.domain.AppUser;
import org.bruneel.pgpkeymanager.crypto.GeneratedKeyMaterial;
import org.bruneel.pgpkeymanager.crypto.PgpKeyMetadataParser;
import org.bruneel.pgpkeymanager.repo.AppUserRepository;
import org.bruneel.pgpkeymanager.repo.PgpKeyRepository;
import org.bruneel.pgpkeymanager.crypto.PgpCryptoService;
import org.bruneel.pgpkeymanager.crypto.PgpCryptoSupport;
import org.bruneel.pgpkeymanager.crypto.SubkeyMaterial;
import org.bruneel.pgpkeymanager.domain.PgpCapability;
import org.bruneel.pgpkeymanager.web.dto.AlgorithmSpecDto;
import org.bruneel.pgpkeymanager.web.dto.UserIdSpecDto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestJwtConfiguration.class)
class PgpKeySubkeyImportIntegrationTest {

    private static final String PASSPHRASE = "subkey-import-passphrase";

    private final PgpCryptoService crypto = new PgpCryptoService();

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PgpKeyRepository pgpKeyRepository;

    @Autowired
    private AppUserRepository appUserRepository;

    @Autowired
    private TransactionTemplate transactionTemplate;

    @Autowired
    private PgpKeyMetadataParser metadataParser;

    @Test
    void registerMultiKeyArmorReturnsRegisteredSubkeyCount() throws Exception {
        SubkeyMaterial keyring = buildKeyringWithEncryptSubkey();
        String armoredPublic = jsonEscape(keyring.updatedArmoredPublic());

        mockMvc.perform(post("/api/keys")
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "label": "count-import",
                                  "keyType": "public",
                                  "armoredPublic": "%s"
                                }
                                """
                                        .formatted(armoredPublic)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.registeredSubkeyCount").value(1));
    }

    @Test
    void registerMultiKeyArmorAutoImportsSubkeyRows() throws Exception {
        SubkeyMaterial keyring = buildKeyringWithEncryptSubkey();
        String armoredPublic = jsonEscape(keyring.updatedArmoredPublic());

        MvcResult register =
                mockMvc.perform(post("/api/keys")
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "label": "multi-key-import",
                                          "keyType": "public",
                                          "armoredPublic": "%s"
                                        }
                                        """
                                                .formatted(armoredPublic)))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.role").value("primary"))
                        .andReturn();

        String primaryId = readJsonField(register.getResponse().getContentAsString(), "id");

        mockMvc.perform(get("/api/keys/{primaryKeyId}/subkeys", primaryId).with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].fingerprint").value(keyring.fingerprint()))
                .andExpect(jsonPath("$[0].algorithm").value("cv25519"))
                .andExpect(jsonPath("$[0].capabilities", containsInAnyOrder("encrypt")))
                .andExpect(jsonPath("$[0].parentKeyId").value(primaryId))
                .andExpect(jsonPath("$[0].armoredPublic").doesNotExist());
    }

    @Test
    void importFromKeyringIsIdempotent() throws Exception {
        SubkeyMaterial keyring = buildKeyringWithEncryptSubkey();
        String armoredPrivate = jsonEscape(keyring.updatedArmoredPrivate());

        MvcResult register =
                mockMvc.perform(post("/api/keys")
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "label": "idempotent-import",
                                          "keyType": "private",
                                          "encryptedPrivateArmored": "%s"
                                        }
                                        """
                                                .formatted(armoredPrivate)))
                        .andExpect(status().isCreated())
                        .andReturn();

        String primaryId = readJsonField(register.getResponse().getContentAsString(), "id");

        mockMvc.perform(
                        post("/api/keys/{primaryKeyId}/subkeys/import-from-keyring", primaryId)
                                .with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.registered", hasSize(0)))
                .andExpect(jsonPath("$.skippedCount").value(1));

        mockMvc.perform(get("/api/keys/{primaryKeyId}/subkeys", primaryId).with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    void registerMultiKeyArmorImportsRevokedSubkeyAsRevoked() throws Exception {
        SubkeyMaterial keyring = buildKeyringWithEncryptSubkey();
        long subKeyId = PgpCryptoSupport.parseKeyIdHex(keyring.keyId());
        PgpCryptoService.KeyRingUpdate revoked =
                crypto.revokeKeyInRing(
                        keyring.updatedArmoredPrivate(),
                        PASSPHRASE.toCharArray(),
                        subKeyId,
                        3);
        String armoredPublic = jsonEscape(revoked.armoredPublic());

        MvcResult register =
                mockMvc.perform(post("/api/keys")
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "label": "revoked-subkey-import",
                                          "keyType": "public",
                                          "armoredPublic": "%s"
                                        }
                                        """
                                                .formatted(armoredPublic)))
                        .andExpect(status().isCreated())
                        .andReturn();

        String primaryId = readJsonField(register.getResponse().getContentAsString(), "id");

        mockMvc.perform(get("/api/keys/{primaryKeyId}/subkeys", primaryId).with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].status").value("revoked"))
                .andExpect(jsonPath("$[0].revokedAt").exists());
    }

    @Test
    void importFromKeyringSyncsRevokedSubkeyStatus() throws Exception {
        SubkeyMaterial keyring = buildKeyringWithEncryptSubkey();
        String armoredPrivate = jsonEscape(keyring.updatedArmoredPrivate());

        MvcResult register =
                mockMvc.perform(post("/api/keys")
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "label": "sync-revoked",
                                          "keyType": "private",
                                          "encryptedPrivateArmored": "%s"
                                        }
                                        """
                                                .formatted(armoredPrivate)))
                        .andExpect(status().isCreated())
                        .andReturn();

        String primaryId = readJsonField(register.getResponse().getContentAsString(), "id");
        String subkeyId =
                readJsonField(
                        mockMvc.perform(get("/api/keys/{primaryKeyId}/subkeys", primaryId).with(jwt()))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$[0].status").value("active"))
                                .andReturn()
                                .getResponse()
                                .getContentAsString(),
                        "id");

        long subKeyId = PgpCryptoSupport.parseKeyIdHex(keyring.keyId());
        PgpCryptoService.KeyRingUpdate revoked =
                crypto.revokeKeyInRing(
                        keyring.updatedArmoredPrivate(),
                        PASSPHRASE.toCharArray(),
                        subKeyId,
                        3);

        AppUser user = appUserRepository.upsertByAuth0Sub("user");
        var updatedPrimary =
                transactionTemplate.execute(
                        status ->
                                pgpKeyRepository.updateKeyringMaterial(
                                        UUID.fromString(primaryId),
                                        revoked.armoredPublic(),
                                        revoked.armoredPrivate(),
                                        null,
                                        null,
                                        null));
        assertThat(updatedPrimary).isPresent();
        assertThat(metadataParser.parseKeyring(
                        updatedPrimary.get().armoredPublic(),
                        updatedPrimary.get().encryptedPrivateArmored())
                .subkeys()
                .get(0)
                .revokedAt())
                .isNotNull();

        mockMvc.perform(
                        post("/api/keys/{primaryKeyId}/subkeys/import-from-keyring", primaryId)
                                .with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.registered", hasSize(0)))
                .andExpect(jsonPath("$.updated", hasSize(1)))
                .andExpect(jsonPath("$.updatedCount").value(1))
                .andExpect(jsonPath("$.updated[0].id").value(subkeyId))
                .andExpect(jsonPath("$.updated[0].status").value("revoked"));

        mockMvc.perform(get("/api/keys/{primaryKeyId}/subkeys", primaryId).with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("revoked"));
    }

    @Test
    void importFromKeyringSyncsRevokedPrimaryStatus() throws Exception {
        GeneratedKeyMaterial primary =
                crypto.generatePrimary(
                        4,
                        List.of(new UserIdSpecDto("Primary Revoke Sync", null)),
                        List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                        new AlgorithmSpecDto("ed25519", null, null),
                        Instant.parse("2030-06-01T00:00:00Z"),
                        PASSPHRASE.toCharArray());
        String armoredPrivate = jsonEscape(primary.armoredPrivate());

        MvcResult register =
                mockMvc.perform(post("/api/keys")
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "label": "primary-revoke-sync",
                                          "keyType": "private",
                                          "encryptedPrivateArmored": "%s"
                                        }
                                        """
                                                .formatted(armoredPrivate)))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.status").value("active"))
                        .andReturn();

        String primaryId = readJsonField(register.getResponse().getContentAsString(), "id");

        long primaryKeyId = PgpCryptoSupport.parseKeyIdHex(primary.keyId());
        PgpCryptoService.KeyRingUpdate revoked =
                crypto.revokeKeyInRing(
                        primary.armoredPrivate(),
                        PASSPHRASE.toCharArray(),
                        primaryKeyId,
                        2);

        AppUser user = appUserRepository.upsertByAuth0Sub("user");
        var updatedPrimary =
                transactionTemplate.execute(
                        status ->
                                pgpKeyRepository.updateKeyringMaterial(
                                        UUID.fromString(primaryId),
                                        revoked.armoredPublic(),
                                        revoked.armoredPrivate(),
                                        null,
                                        null,
                                        null));
        assertThat(updatedPrimary).isPresent();
        assertThat(metadataParser.parseKeyring(
                        updatedPrimary.get().armoredPublic(),
                        updatedPrimary.get().encryptedPrivateArmored())
                .primary()
                .revokedAt())
                .isNotNull();

        mockMvc.perform(
                        post("/api/keys/{primaryKeyId}/subkeys/import-from-keyring", primaryId)
                                .with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.registered", hasSize(0)))
                .andExpect(jsonPath("$.updated", hasSize(1)))
                .andExpect(jsonPath("$.updatedCount").value(1))
                .andExpect(jsonPath("$.updated[0].id").value(primaryId))
                .andExpect(jsonPath("$.updated[0].role").value("primary"))
                .andExpect(jsonPath("$.updated[0].status").value("revoked"));

        mockMvc.perform(get("/api/keys/{keyId}", primaryId).with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("revoked"))
                .andExpect(jsonPath("$.revokedAt").exists());
    }

    @Test
    void importFromKeyringBackfillsMissingSubkeyRows() throws Exception {
        SubkeyMaterial keyring = buildKeyringWithEncryptSubkey();
        String armoredPublic = jsonEscape(keyring.updatedArmoredPublic());

        MvcResult register =
                mockMvc.perform(post("/api/keys")
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "label": "backfill-primary",
                                          "keyType": "public",
                                          "armoredPublic": "%s"
                                        }
                                        """
                                                .formatted(armoredPublic)))
                        .andExpect(status().isCreated())
                        .andReturn();

        String primaryId = readJsonField(register.getResponse().getContentAsString(), "id");
        String subkeyId =
                readJsonField(
                        mockMvc.perform(get("/api/keys/{primaryKeyId}/subkeys", primaryId).with(jwt()))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$", hasSize(1)))
                                .andReturn()
                                .getResponse()
                                .getContentAsString(),
                        "id");

        mockMvc.perform(delete("/api/keys/{keyId}", subkeyId).with(jwt())).andExpect(status().isNoContent());

        mockMvc.perform(get("/api/keys/{primaryKeyId}/subkeys", primaryId).with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        mockMvc.perform(
                        post("/api/keys/{primaryKeyId}/subkeys/import-from-keyring", primaryId)
                                .with(jwt()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.registered", hasSize(1)))
                .andExpect(jsonPath("$.registered[0].fingerprint").value(keyring.fingerprint()))
                .andExpect(jsonPath("$.skippedCount").value(0));
    }

    private SubkeyMaterial buildKeyringWithEncryptSubkey() {
        GeneratedKeyMaterial primary =
                crypto.generatePrimary(
                        4,
                        List.of(new UserIdSpecDto("Import Test", null)),
                        List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                        new AlgorithmSpecDto("ed25519", null, null),
                        Instant.parse("2030-06-01T00:00:00Z"),
                        PASSPHRASE.toCharArray());

        return crypto.addSubkey(
                4,
                primary.armoredPrivate(),
                PASSPHRASE.toCharArray(),
                List.of(PgpCapability.ENCRYPT),
                new AlgorithmSpecDto("cv25519", null, null),
                Instant.parse("2029-06-01T00:00:00Z"));
    }

    private static String readJsonField(String json, String field) {
        String marker = "\"" + field + "\":\"";
        int start = json.indexOf(marker);
        if (start < 0) {
            throw new IllegalArgumentException("Field not found: " + field);
        }
        start += marker.length();
        int end = json.indexOf('"', start);
        return json.substring(start, end);
    }

    private static String jsonEscape(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "");
    }
}
