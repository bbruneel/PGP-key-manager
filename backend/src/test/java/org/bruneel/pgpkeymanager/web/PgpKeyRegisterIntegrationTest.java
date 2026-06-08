package org.bruneel.pgpkeymanager.web;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
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

import org.bruneel.pgpkeymanager.TestArmoredKeys;
import org.bruneel.pgpkeymanager.TestJwtConfiguration;
import org.bruneel.pgpkeymanager.crypto.GeneratedKeyMaterial;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestJwtConfiguration.class)
class PgpKeyRegisterIntegrationTest {

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

    private static String jsonEscape(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "");
    }
}
