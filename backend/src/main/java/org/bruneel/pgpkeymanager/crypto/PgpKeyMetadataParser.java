package org.bruneel.pgpkeymanager.crypto;

import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

import org.bouncycastle.bcpg.PublicKeyAlgorithmTags;
import org.bouncycastle.bcpg.sig.KeyFlags;
import org.bouncycastle.openpgp.PGPException;
import org.bouncycastle.openpgp.PGPPublicKey;
import org.bouncycastle.openpgp.PGPPublicKeyRing;
import org.bouncycastle.openpgp.PGPPublicKeyRingCollection;
import org.bouncycastle.openpgp.PGPSignature;
import org.bouncycastle.openpgp.PGPSignatureSubpacketVector;
import org.bouncycastle.openpgp.PGPSecretKey;
import org.bouncycastle.openpgp.PGPSecretKeyRing;
import org.bouncycastle.openpgp.PGPSecretKeyRingCollection;
import org.bouncycastle.openpgp.operator.jcajce.JcaKeyFingerprintCalculator;
import org.bruneel.pgpkeymanager.domain.PgpCapability;
import org.bruneel.pgpkeymanager.service.BadRequestException;
import org.bruneel.pgpkeymanager.service.CryptoException;
import org.bruneel.pgpkeymanager.service.PgpKeyValidator;
import org.bruneel.pgpkeymanager.web.dto.AlgorithmSpecDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

@Component
public class PgpKeyMetadataParser {

    private static final Logger log = LoggerFactory.getLogger(PgpKeyMetadataParser.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();

    public ImportedKeyMetadata parse(String armoredPublic, String encryptedPrivateArmored) {
        return parseKeyring(armoredPublic, encryptedPrivateArmored).primary();
    }

    public ImportedKeyringMetadata parseKeyring(String armoredPublic, String encryptedPrivateArmored) {
        try {
            PGPPublicKeyRing ring = loadPublicKeyRing(armoredPublic, encryptedPrivateArmored);
            PGPPublicKey master = ring.getPublicKey();
            ImportedKeyMetadata primary = buildMetadata(master, armoredPublic, encryptedPrivateArmored);

            List<ImportedKeyMetadata> subkeys = new ArrayList<>();
            Iterator<PGPPublicKey> keys = ring.getPublicKeys();
            while (keys.hasNext()) {
                PGPPublicKey key = keys.next();
                if (key.isMasterKey()) {
                    continue;
                }
                ImportedKeyMetadata subkeyMetadata = buildSubkeyMetadata(key, primary.openpgpVersion());
                subkeys.add(subkeyMetadata);
            }

            log.info(
                    "register_keyring_metadata_parsed masterFingerprint={} subkeyCount={}",
                    primary.fingerprint(),
                    subkeys.size());

            return new ImportedKeyringMetadata(primary, List.copyOf(subkeys));
        } catch (BadRequestException ex) {
            throw ex;
        } catch (Exception ex) {
            log.warn("Failed to parse armored key metadata", ex);
            throw new BadRequestException("Invalid or unreadable armored key material");
        }
    }

    public void validateFingerprintMatch(ImportedKeyMetadata metadata, String clientFingerprint) {
        if (clientFingerprint == null || clientFingerprint.isBlank()) {
            return;
        }
        String normalized = normalizeFingerprint(clientFingerprint);
        if (!metadata.fingerprint().equalsIgnoreCase(normalized)) {
            throw new BadRequestException("fingerprint does not match armored key material");
        }
    }

    private ImportedKeyMetadata buildMetadata(
            PGPPublicKey master, String armoredPublic, String encryptedPrivateArmored)
            throws IOException, PGPException {
        String fingerprint = PgpCryptoSupport.fingerprintHex(master);
        String keyId = PgpCryptoSupport.keyIdHex(master);
        AlgorithmSpecDto algorithmSpec = resolveAlgorithmSpec(master);
        List<PgpCapability> capabilities = resolveCapabilities(master);
        Instant expiresAt = resolveExpiresAt(master);
        int openpgpVersion =
                PgpKeyValidator.validateDetectedOpenpgpVersion(
                        PgpCryptoSupport.detectOpenpgpVersionFromArmored(
                                encryptedPrivateArmored, armoredPublic));

        log.info(
                "register_key_metadata_parsed fingerprint={} keyId={} algorithm={} capabilities={} expiresAt={} openpgpVersion={}",
                fingerprint,
                keyId,
                algorithmSpec.algorithm(),
                capabilities.stream().map(PgpCapability::toApi).toList(),
                expiresAt,
                openpgpVersion);

        return new ImportedKeyMetadata(
                fingerprint,
                keyId,
                algorithmSpec.algorithm(),
                writeAlgorithmSpecJson(algorithmSpec),
                capabilities,
                expiresAt,
                openpgpVersion);
    }

    private ImportedKeyMetadata buildSubkeyMetadata(PGPPublicKey subkey, int openpgpVersion) {
        String fingerprint = PgpCryptoSupport.fingerprintHex(subkey);
        String keyId = PgpCryptoSupport.keyIdHex(subkey);
        AlgorithmSpecDto algorithmSpec = resolveAlgorithmSpec(subkey);
        List<PgpCapability> capabilities = resolveCapabilities(subkey);
        Instant expiresAt = resolveExpiresAt(subkey);

        log.info(
                "register_subkey_metadata_parsed fingerprint={} keyId={} algorithm={} capabilities={} expiresAt={} openpgpVersion={}",
                fingerprint,
                keyId,
                algorithmSpec.algorithm(),
                capabilities.stream().map(PgpCapability::toApi).toList(),
                expiresAt,
                openpgpVersion);

        return new ImportedKeyMetadata(
                fingerprint,
                keyId,
                algorithmSpec.algorithm(),
                writeAlgorithmSpecJson(algorithmSpec),
                capabilities,
                expiresAt,
                openpgpVersion);
    }

    private PGPPublicKeyRing loadPublicKeyRing(String armoredPublic, String encryptedPrivateArmored)
            throws IOException, PGPException {
        boolean hasPublic = armoredPublic != null && !armoredPublic.isBlank();
        boolean hasPrivate = encryptedPrivateArmored != null && !encryptedPrivateArmored.isBlank();
        if (!hasPublic && !hasPrivate) {
            throw new BadRequestException("armoredPublic or encryptedPrivateArmored is required when registering a key");
        }
        if (hasPublic && hasPrivate) {
            PGPPublicKeyRing fromPublic = PgpCryptoSupport.loadPublicKeyRing(armoredPublic);
            PGPPublicKeyRing fromPrivate = loadPublicKeyRingFromPrivate(encryptedPrivateArmored);
            String publicFingerprint = PgpCryptoSupport.fingerprintHex(fromPublic.getPublicKey());
            String privateFingerprint = PgpCryptoSupport.fingerprintHex(fromPrivate.getPublicKey());
            if (!publicFingerprint.equalsIgnoreCase(privateFingerprint)) {
                throw new BadRequestException("armored public and private key blocks do not match");
            }
            return fromPublic;
        }
        if (hasPublic) {
            return PgpCryptoSupport.loadPublicKeyRing(armoredPublic);
        }
        return loadPublicKeyRingFromPrivate(encryptedPrivateArmored);
    }

    private PGPPublicKeyRing loadPublicKeyRingFromPrivate(String encryptedPrivateArmored)
            throws IOException, PGPException {
        try (InputStream in = PgpCryptoSupport.decoderStream(encryptedPrivateArmored)) {
            PGPSecretKeyRingCollection collection =
                    new PGPSecretKeyRingCollection(in, new JcaKeyFingerprintCalculator());
            Iterator<PGPSecretKeyRing> rings = collection.getKeyRings();
            if (!rings.hasNext()) {
                throw new BadRequestException("No secret key ring found in armored private key");
            }
            PGPSecretKeyRing secretRing = rings.next();
            List<PGPPublicKey> publicKeys = new ArrayList<>();
            Iterator<PGPSecretKey> secretKeys = secretRing.getSecretKeys();
            while (secretKeys.hasNext()) {
                publicKeys.add(secretKeys.next().getPublicKey());
            }
            return new PGPPublicKeyRing(publicKeys);
        }
    }

    private List<PgpCapability> resolveCapabilities(PGPPublicKey master) {
        int flags = extractKeyFlags(master);
        List<PgpCapability> capabilities = flagsToCapabilities(flags);
        if (capabilities.isEmpty() && master.isMasterKey()) {
            return List.of(PgpCapability.CERTIFY);
        }
        return capabilities;
    }

    private int extractKeyFlags(PGPPublicKey master) {
        int merged = 0;
        Iterator<PGPSignature> signatures = master.getSignatures();
        while (signatures.hasNext()) {
            merged |= keyFlagsFromSignature(signatures.next());
        }
        if (merged == 0) {
            Iterator<PGPSignature> keySignatures = master.getKeySignatures();
            while (keySignatures.hasNext()) {
                merged |= keyFlagsFromSignature(keySignatures.next());
            }
        }
        return merged;
    }

    private int keyFlagsFromSignature(PGPSignature signature) {
        PGPSignatureSubpacketVector hashed = signature.getHashedSubPackets();
        if (hashed != null && hashed.hasSubpacket(org.bouncycastle.bcpg.SignatureSubpacketTags.KEY_FLAGS)) {
            return hashed.getKeyFlags();
        }
        return 0;
    }

    private List<PgpCapability> flagsToCapabilities(int flags) {
        List<PgpCapability> capabilities = new ArrayList<>();
        if ((flags & KeyFlags.CERTIFY_OTHER) != 0) {
            capabilities.add(PgpCapability.CERTIFY);
        }
        if ((flags & KeyFlags.SIGN_DATA) != 0) {
            capabilities.add(PgpCapability.SIGN);
        }
        if ((flags & (KeyFlags.ENCRYPT_COMMS | KeyFlags.ENCRYPT_STORAGE)) != 0) {
            capabilities.add(PgpCapability.ENCRYPT);
        }
        if ((flags & KeyFlags.AUTHENTICATION) != 0) {
            capabilities.add(PgpCapability.AUTHENTICATE);
        }
        return List.copyOf(capabilities);
    }

    private Instant resolveExpiresAt(PGPPublicKey master) {
        long validSeconds = master.getValidSeconds();
        if (validSeconds <= 0) {
            return null;
        }
        return master.getCreationTime().toInstant().plusSeconds(validSeconds);
    }

    private AlgorithmSpecDto resolveAlgorithmSpec(PGPPublicKey master) {
        return switch (master.getAlgorithm()) {
            case PublicKeyAlgorithmTags.RSA_GENERAL,
                    PublicKeyAlgorithmTags.RSA_ENCRYPT,
                    PublicKeyAlgorithmTags.RSA_SIGN -> {
                int keySize = master.getBitStrength();
                if (keySize <= 0) {
                    keySize = 4096;
                }
                yield new AlgorithmSpecDto("rsa", normalizeRsaKeySize(keySize), null);
            }
            case PublicKeyAlgorithmTags.EDDSA -> new AlgorithmSpecDto("ed25519", null, null);
            case PublicKeyAlgorithmTags.Ed448 -> new AlgorithmSpecDto("ed448", null, null);
            case PublicKeyAlgorithmTags.X448 -> new AlgorithmSpecDto("x448", null, null);
            case PublicKeyAlgorithmTags.ECDH -> resolveEcdhSpec(master);
            case PublicKeyAlgorithmTags.ECDSA -> resolveEcdsaSpec(master);
            default -> throw new CryptoException("Unsupported OpenPGP algorithm tag: " + master.getAlgorithm());
        };
    }

    private AlgorithmSpecDto resolveEcdhSpec(PGPPublicKey master) {
        int bitStrength = master.getBitStrength();
        if (bitStrength == 255 || bitStrength == 256) {
            return new AlgorithmSpecDto("cv25519", null, null);
        }
        if (bitStrength == 448) {
            return new AlgorithmSpecDto("x448", null, null);
        }
        return new AlgorithmSpecDto("ecdh", null, curveFromBitStrength(bitStrength));
    }

    private AlgorithmSpecDto resolveEcdsaSpec(PGPPublicKey master) {
        return new AlgorithmSpecDto("ecdsa", null, curveFromBitStrength(master.getBitStrength()));
    }

    private String curveFromBitStrength(int bitStrength) {
        return switch (bitStrength) {
            case 256, 255 -> "P-256";
            case 384 -> "P-384";
            case 521, 512 -> "P-521";
            default -> "P-256";
        };
    }

    private int normalizeRsaKeySize(int keySize) {
        if (keySize == 2048 || keySize == 3072 || keySize == 4096) {
            return keySize;
        }
        if (keySize < 3072) {
            return 2048;
        }
        if (keySize < 4096) {
            return 3072;
        }
        return 4096;
    }

    private String writeAlgorithmSpecJson(AlgorithmSpecDto spec) {
        try {
            return MAPPER.writeValueAsString(spec);
        } catch (JsonProcessingException e) {
            throw new CryptoException("Failed to serialize algorithm spec", e);
        }
    }

    private static String normalizeFingerprint(String fingerprint) {
        return fingerprint.replaceAll("[\\s:]", "").toUpperCase();
    }
}
