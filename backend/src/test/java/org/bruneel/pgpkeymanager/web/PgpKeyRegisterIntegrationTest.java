package org.bruneel.pgpkeymanager.web;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
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
import org.bruneel.pgpkeymanager.crypto.PgpCryptoService;
import org.bruneel.pgpkeymanager.crypto.PgpCryptoSupport;
import org.bruneel.pgpkeymanager.domain.PgpCapability;
import org.bruneel.pgpkeymanager.web.dto.AlgorithmSpecDto;
import org.bruneel.pgpkeymanager.web.dto.UserIdSpecDto;

import java.time.Instant;
import java.util.List;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestJwtConfiguration.class)
class PgpKeyRegisterIntegrationTest {

    private static final String PASSPHRASE = "register-reimport-passphrase";

    private final PgpCryptoService crypto = new PgpCryptoService();

    @Autowired
    private MockMvc mockMvc;

    @Test
    void registerPublicKeyWithoutFingerprintEnrichesMetadata() throws Exception {
        GeneratedKeyMaterial material = TestArmoredKeys.sampleEd25519PublicKey();
        String armoredPublic = jsonEscape(material.armoredPublic());

        mockMvc.perform(post("/api/keys")
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "label": "register-enriched",
                                  "keyType": "public",
                                  "armoredPublic": "%s"
                                }
                                """
                                        .formatted(armoredPublic)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.fingerprint").value(material.fingerprint()))
                .andExpect(jsonPath("$.keyId").value(material.keyId()))
                .andExpect(jsonPath("$.algorithm").value("ed25519"))
                .andExpect(jsonPath("$.capabilities", containsInAnyOrder("certify", "sign")))
                .andExpect(jsonPath("$.expiresAt").value("2030-06-01T00:00:00Z"))
                .andExpect(jsonPath("$.openpgpVersion").value(4));
    }

    @Test
    void registerWithMismatchedFingerprintReturns400() throws Exception {
        GeneratedKeyMaterial material = TestArmoredKeys.sampleEd25519PublicKey();
        String armoredPublic = jsonEscape(material.armoredPublic());

        mockMvc.perform(post("/api/keys")
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "fingerprint": "DEADBEEF0123456789ABCDEF0123456789ABCD",
                                  "keyType": "public",
                                  "armoredPublic": "%s"
                                }
                                """
                                        .formatted(armoredPublic)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("fingerprint does not match armored key material"));
    }

    @Test
    void registerPrivateKeyWithoutPublicEnrichesMetadata() throws Exception {
        GeneratedKeyMaterial material = TestArmoredKeys.sampleEd25519PublicKey();
        String armoredPrivate = jsonEscape(material.armoredPrivate());

        mockMvc.perform(post("/api/keys")
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "label": "register-private-only",
                                  "keyType": "private",
                                  "encryptedPrivateArmored": "%s"
                                }
                                """
                                        .formatted(armoredPrivate)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.fingerprint").value(material.fingerprint()))
                .andExpect(jsonPath("$.keyId").value(material.keyId()))
                .andExpect(jsonPath("$.algorithm").value("ed25519"));
    }

    @Test
    void registerWithMismatchedPublicAndPrivateReturns400() throws Exception {
        GeneratedKeyMaterial first = TestArmoredKeys.sampleEd25519PublicKey();
        GeneratedKeyMaterial second = TestArmoredKeys.sampleEd25519PublicKey();
        String armoredPublic = jsonEscape(first.armoredPublic());
        String armoredPrivate = jsonEscape(second.armoredPrivate());

        mockMvc.perform(post("/api/keys")
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "keyType": "private",
                                  "armoredPublic": "%s",
                                  "encryptedPrivateArmored": "%s"
                                }
                                """
                                        .formatted(armoredPublic, armoredPrivate)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("armored public and private key blocks do not match"));
    }

    @Test
    void registerExistingFingerprintSyncsPrimaryRevocation() throws Exception {
        GeneratedKeyMaterial primary =
                crypto.generatePrimary(
                        4,
                        List.of(new UserIdSpecDto("Reimport Revoke", null)),
                        List.of(PgpCapability.CERTIFY, PgpCapability.SIGN),
                        new AlgorithmSpecDto("ed25519", null, null),
                        Instant.parse("2030-06-01T00:00:00Z"),
                        PASSPHRASE.toCharArray());
        String armoredPrivate = jsonEscape(primary.armoredPrivate());

        MvcResult firstRegister =
                mockMvc.perform(post("/api/keys")
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "label": "reimport-active",
                                          "keyType": "private",
                                          "encryptedPrivateArmored": "%s"
                                        }
                                        """
                                                .formatted(armoredPrivate)))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.status").value("active"))
                        .andReturn();

        String primaryId = readJsonField(firstRegister.getResponse().getContentAsString(), "id");

        long primaryKeyId = PgpCryptoSupport.parseKeyIdHex(primary.keyId());
        PgpCryptoService.KeyRingUpdate revoked =
                crypto.revokeKeyInRing(
                        primary.armoredPrivate(),
                        PASSPHRASE.toCharArray(),
                        primaryKeyId,
                        2);
        String revokedPrivate = jsonEscape(revoked.armoredPrivate());

        mockMvc.perform(post("/api/keys")
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "label": "reimport-revoked",
                                  "keyType": "private",
                                  "encryptedPrivateArmored": "%s"
                                }
                                """
                                        .formatted(revokedPrivate)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(primaryId))
                .andExpect(jsonPath("$.status").value("revoked"))
                .andExpect(jsonPath("$.revokedAt").exists());

        mockMvc.perform(get("/api/keys/{keyId}", primaryId).with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("revoked"));
    }

    @Test
    void registerExistingFingerprintIsIdempotentForActiveKeyring() throws Exception {
        GeneratedKeyMaterial material = TestArmoredKeys.sampleEd25519PublicKey();
        String armoredPublic = jsonEscape(material.armoredPublic());

        MvcResult firstRegister =
                mockMvc.perform(post("/api/keys")
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "label": "reimport-idempotent",
                                          "keyType": "public",
                                          "armoredPublic": "%s"
                                        }
                                        """
                                                .formatted(armoredPublic)))
                        .andExpect(status().isCreated())
                        .andReturn();

        String primaryId = readJsonField(firstRegister.getResponse().getContentAsString(), "id");

        mockMvc.perform(post("/api/keys")
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "label": "reimport-idempotent-again",
                                  "keyType": "public",
                                  "armoredPublic": "%s"
                                }
                                """
                                        .formatted(armoredPublic)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(primaryId))
                .andExpect(jsonPath("$.status").value("active"));
    }

    @Test
    void registerWithoutArmorReturns400() throws Exception {
        mockMvc.perform(post("/api/keys")
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "fingerprint": "DEADBEEF0123456789ABCDEF0123456789ABCD",
                                  "keyType": "public"
                                }
                                """))
                .andExpect(status().isBadRequest());
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
