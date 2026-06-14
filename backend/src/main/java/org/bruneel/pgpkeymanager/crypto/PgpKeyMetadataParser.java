package org.bruneel.pgpkeymanager.crypto;

import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Set;

import org.bouncycastle.bcpg.PublicKeyAlgorithmTags;
import org.bouncycastle.bcpg.SignatureSubpacketTags;
import org.bouncycastle.bcpg.sig.KeyFlags;
import org.bouncycastle.bcpg.sig.RevocationReason;
import org.bouncycastle.bcpg.sig.RevocationReasonTags;
import org.bouncycastle.openpgp.PGPException;
import org.bouncycastle.openpgp.PGPPublicKey;
import org.bouncycastle.openpgp.PGPPublicKeyRing;
import org.bouncycastle.openpgp.PGPSecretKey;
import org.bouncycastle.openpgp.PGPSecretKeyRing;
import org.bouncycastle.openpgp.PGPSecretKeyRingCollection;
import org.bouncycastle.openpgp.PGPSignature;
import org.bouncycastle.openpgp.PGPSignatureSubpacketVector;
import org.bouncycastle.openpgp.operator.jcajce.JcaKeyFingerprintCalculator;
import org.bruneel.pgpkeymanager.domain.PgpCapability;
import org.bruneel.pgpkeymanager.service.BadRequestException;
import org.bruneel.pgpkeymanager.service.CryptoException;
import org.bruneel.pgpkeymanager.service.PgpKeyValidator;
import org.bruneel.pgpkeymanager.web.dto.AlgorithmSpecDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

@Component
public class PgpKeyMetadataParser {

    private static final Logger log = LoggerFactory.getLogger(PgpKeyMetadataParser.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();

    public ImportedKeyMetadata parse(String armoredPublic, String encryptedPrivateArmored) {
        return parseKeyring(armoredPublic, encryptedPrivateArmored).primary();
    }

    public ImportedKeyringMetadata parseKeyring(String armoredPublic, String encryptedPrivateArmored) {
        try {
            LoadedKeyring loaded = loadPublicKeyRing(armoredPublic, encryptedPrivateArmored);
            PGPPublicKeyRing ring = loaded.ring();
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
                    "register_keyring_metadata_parsed masterFingerprint={} subkeyCount={} source={} warningCount={}",
                    primary.fingerprint(),
                    subkeys.size(),
                    loaded.source(),
                    loaded.warnings().size());

            return new ImportedKeyringMetadata(primary, List.copyOf(subkeys), List.copyOf(loaded.warnings()), loaded.source());
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
        RevocationDetails revocation = resolveRevocation(master, fingerprint, true);

        log.info(
                "register_key_metadata_parsed fingerprint={} keyId={} algorithm={} capabilities={} expiresAt={} openpgpVersion={} revoked={}",
                fingerprint,
                keyId,
                algorithmSpec.algorithm(),
                capabilities.stream().map(PgpCapability::toApi).toList(),
                expiresAt,
                openpgpVersion,
                revocation != null);

        return new ImportedKeyMetadata(
                fingerprint,
                keyId,
                algorithmSpec.algorithm(),
                writeAlgorithmSpecJson(algorithmSpec),
                capabilities,
                expiresAt,
                openpgpVersion,
                revocation != null ? revocation.revokedAt() : null,
                revocation != null ? revocation.reason() : null);
    }

    private ImportedKeyMetadata buildSubkeyMetadata(PGPPublicKey subkey, int openpgpVersion) {
        String fingerprint = PgpCryptoSupport.fingerprintHex(subkey);
        String keyId = PgpCryptoSupport.keyIdHex(subkey);
        AlgorithmSpecDto algorithmSpec = resolveAlgorithmSpec(subkey);
        List<PgpCapability> capabilities = resolveCapabilities(subkey);
        Instant expiresAt = resolveExpiresAt(subkey);
        RevocationDetails revocation = resolveRevocation(subkey, fingerprint, false);

        log.info(
                "register_subkey_metadata_parsed fingerprint={} keyId={} algorithm={} capabilities={} expiresAt={} openpgpVersion={} revoked={}",
                fingerprint,
                keyId,
                algorithmSpec.algorithm(),
                capabilities.stream().map(PgpCapability::toApi).toList(),
                expiresAt,
                openpgpVersion,
                revocation != null);

        return new ImportedKeyMetadata(
                fingerprint,
                keyId,
                algorithmSpec.algorithm(),
                writeAlgorithmSpecJson(algorithmSpec),
                capabilities,
                expiresAt,
                openpgpVersion,
                revocation != null ? revocation.revokedAt() : null,
                revocation != null ? revocation.reason() : null);
    }

    private record RevocationDetails(Instant revokedAt, org.bruneel.pgpkeymanager.domain.RevocationReason reason) {}

    private RevocationDetails resolveRevocation(PGPPublicKey key, String fingerprint, boolean isPrimary) {
        if (!key.isRevoked()) {
            return null;
        }

        int revocationType = isPrimary ? PGPSignature.KEY_REVOCATION : PGPSignature.SUBKEY_REVOCATION;
        Iterator<PGPSignature> revocations = key.getSignaturesOfType(revocationType);
        Instant revokedAt = null;
        org.bruneel.pgpkeymanager.domain.RevocationReason reason =
                org.bruneel.pgpkeymanager.domain.RevocationReason.NO_REASON;

        while (revocations.hasNext()) {
            PGPSignature signature = revocations.next();
            if (revokedAt == null) {
                revokedAt = signature.getCreationTime().toInstant();
            }
            PGPSignatureSubpacketVector hashed = signature.getHashedSubPackets();
            if (hashed != null && hashed.hasSubpacket(SignatureSubpacketTags.REVOCATION_REASON)) {
                org.bouncycastle.bcpg.SignatureSubpacket subpacket =
                        hashed.getSubpacket(SignatureSubpacketTags.REVOCATION_REASON);
                if (subpacket instanceof RevocationReason revocationReason) {
                    reason = mapRevocationReason(revocationReason.getRevocationReason());
                }
            }
        }

        if (revokedAt == null) {
            log.warn(
                    "register_revocation_missing_timestamp fingerprint={} isPrimary={} — using current time",
                    fingerprint,
                    isPrimary);
            revokedAt = Instant.now();
        }

        String eventId = isPrimary ? "register_key_revocation_detected" : "register_subkey_revocation_detected";
        log.info("{} fingerprint={} reason={} revokedAt={}", eventId, fingerprint, reason, revokedAt);

        return new RevocationDetails(revokedAt, reason);
    }

    private org.bruneel.pgpkeymanager.domain.RevocationReason mapRevocationReason(byte code) {
        return switch (code) {
            case RevocationReasonTags.KEY_SUPERSEDED ->
                    org.bruneel.pgpkeymanager.domain.RevocationReason.KEY_SUPERSEDED;
            case RevocationReasonTags.KEY_COMPROMISED ->
                    org.bruneel.pgpkeymanager.domain.RevocationReason.KEY_COMPROMISED;
            case RevocationReasonTags.KEY_RETIRED -> org.bruneel.pgpkeymanager.domain.RevocationReason.KEY_RETIRED;
            case RevocationReasonTags.USER_NO_LONGER_VALID ->
                    org.bruneel.pgpkeymanager.domain.RevocationReason.USER_ID_INVALID;
            default -> org.bruneel.pgpkeymanager.domain.RevocationReason.NO_REASON;
        };
    }

    private record LoadedKeyring(PGPPublicKeyRing ring, List<String> warnings, String source) {}

    private LoadedKeyring loadPublicKeyRing(String armoredPublic, String encryptedPrivateArmored)
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
            List<String> warnings = compareSubkeyFingerprints(fromPublic, fromPrivate);
            return new LoadedKeyring(fromPrivate, warnings, "both");
        }
        if (hasPublic) {
            return new LoadedKeyring(PgpCryptoSupport.loadPublicKeyRing(armoredPublic), List.of(), "public");
        }
        return new LoadedKeyring(loadPublicKeyRingFromPrivate(encryptedPrivateArmored), List.of(), "private");
    }

    private List<String> compareSubkeyFingerprints(PGPPublicKeyRing fromPublic, PGPPublicKeyRing fromPrivate) {
        Set<String> publicSubkeys = subkeyFingerprints(fromPublic);
        Set<String> privateSubkeys = subkeyFingerprints(fromPrivate);
        if (publicSubkeys.equals(privateSubkeys)) {
            return List.of();
        }

        Set<String> onlyInPrivate = new HashSet<>(privateSubkeys);
        onlyInPrivate.removeAll(publicSubkeys);
        Set<String> onlyInPublic = new HashSet<>(publicSubkeys);
        onlyInPublic.removeAll(privateSubkeys);

        log.warn(
                "register_keyring_public_private_subkey_mismatch publicSubkeyCount={} privateSubkeyCount={} onlyInPrivate={} onlyInPublic={}",
                publicSubkeys.size(),
                privateSubkeys.size(),
                onlyInPrivate,
                onlyInPublic);

        List<String> warnings = new ArrayList<>();
        if (!onlyInPrivate.isEmpty()) {
            warnings.add(
                    "Private keyring has "
                            + onlyInPrivate.size()
                            + " subkey(s) not present in the pasted public block; using the private keyring.");
        }
        if (!onlyInPublic.isEmpty()) {
            warnings.add(
                    "Public block lists "
                            + onlyInPublic.size()
                            + " subkey(s) absent from the private keyring; those entries are ignored.");
        }
        return List.copyOf(warnings);
    }

    private Set<String> subkeyFingerprints(PGPPublicKeyRing ring) {
        Set<String> fingerprints = new HashSet<>();
        Iterator<PGPPublicKey> keys = ring.getPublicKeys();
        while (keys.hasNext()) {
            PGPPublicKey key = keys.next();
            if (!key.isMasterKey()) {
                fingerprints.add(PgpCryptoSupport.fingerprintHex(key).toUpperCase());
            }
        }
        return fingerprints;
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
        if (hashed != null && hashed.hasSubpacket(SignatureSubpacketTags.KEY_FLAGS)) {
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
            case PublicKeyAlgorithmTags.EDDSA,
                    PublicKeyAlgorithmTags.Ed25519 -> new AlgorithmSpecDto("ed25519", null, null);
            case PublicKeyAlgorithmTags.Ed448 -> new AlgorithmSpecDto("ed448", null, null);
            case PublicKeyAlgorithmTags.X25519 -> new AlgorithmSpecDto("cv25519", null, null);
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
        } catch (JacksonException exception) {
            throw new CryptoException("Failed to serialize algorithm spec", exception);
        }
    }

    private static String normalizeFingerprint(String fingerprint) {
        return fingerprint.replaceAll("[\\s:]", "").toUpperCase();
    }
}
