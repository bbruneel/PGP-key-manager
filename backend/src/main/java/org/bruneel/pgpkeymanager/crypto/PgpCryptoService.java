package org.bruneel.pgpkeymanager.crypto;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.spec.ECGenParameterSpec;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Date;
import java.util.Iterator;
import java.util.List;

import org.bouncycastle.bcpg.HashAlgorithmTags;
import org.bouncycastle.bcpg.PublicKeyAlgorithmTags;
import org.bouncycastle.bcpg.SymmetricKeyAlgorithmTags;
import org.bouncycastle.bcpg.sig.KeyFlags;
import org.bouncycastle.openpgp.PGPException;
import org.bouncycastle.openpgp.PGPKeyPair;
import org.bouncycastle.openpgp.PGPKeyRingGenerator;
import org.bouncycastle.openpgp.PGPPrivateKey;
import org.bouncycastle.openpgp.PGPPublicKey;
import org.bouncycastle.openpgp.PGPPublicKeyRing;
import org.bouncycastle.openpgp.PGPSecretKey;
import org.bouncycastle.openpgp.PGPSecretKeyRing;
import org.bouncycastle.openpgp.PGPSignature;
import org.bouncycastle.openpgp.PGPSignatureGenerator;
import org.bouncycastle.openpgp.PGPSignatureSubpacketGenerator;
import org.bouncycastle.openpgp.PGPSignatureSubpacketVector;
import org.bouncycastle.openpgp.operator.PBESecretKeyEncryptor;
import org.bouncycastle.openpgp.operator.PGPDigestCalculator;
import org.bouncycastle.openpgp.operator.jcajce.JcaPGPContentSignerBuilder;
import org.bouncycastle.openpgp.operator.jcajce.JcaPGPDigestCalculatorProviderBuilder;
import org.bouncycastle.openpgp.operator.PGPKeyPairGenerator;
import org.bouncycastle.openpgp.operator.jcajce.JcaPGPKeyPair;
import org.bouncycastle.openpgp.operator.jcajce.JcaPGPKeyPairGeneratorProvider;
import org.bouncycastle.openpgp.operator.jcajce.JcePBESecretKeyDecryptorBuilder;
import org.bouncycastle.openpgp.operator.jcajce.JcePBESecretKeyEncryptorBuilder;
import org.bruneel.pgpkeymanager.domain.PgpCapability;
import org.bruneel.pgpkeymanager.service.CryptoException;
import org.bruneel.pgpkeymanager.service.PgpKeyValidator;
import org.bruneel.pgpkeymanager.web.dto.AlgorithmSpecDto;
import org.bruneel.pgpkeymanager.web.dto.UserIdSpecDto;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

@Service
public class PgpCryptoService {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final String PROVIDER = PgpCryptoSupport.PROVIDER;
    static {
        PgpCryptoSupport.fingerprintCalculator();
    }

    public GeneratedKeyMaterial generatePrimary(
            int openpgpVersion,
            List<UserIdSpecDto> userIds,
            List<PgpCapability> capabilities,
            AlgorithmSpecDto algorithm,
            Instant expiresAt,
            char[] passphrase) {
        try {
            Date creationTime = new Date();
            PGPKeyPair primaryPair = generateKeyPair(openpgpVersion, algorithm, creationTime);
            PGPDigestCalculator sha1Calc = sha1Calculator();
            JcaPGPContentSignerBuilder signerBuilder = contentSigner(primaryPair);
            PBESecretKeyEncryptor encryptor = secretKeyEncryptor(sha1Calc, passphrase);
            PGPSignatureSubpacketVector hashed = hashedSubpackets(capabilities, expiresAt);

            PGPKeyRingGenerator generator = new PGPKeyRingGenerator(
                    PGPSignature.POSITIVE_CERTIFICATION,
                    primaryPair,
                    formatIdentity(userIds),
                    sha1Calc,
                    hashed,
                    null,
                    signerBuilder,
                    encryptor);

            PGPSecretKeyRing secretRing = generator.generateSecretKeyRing();
            PGPPublicKeyRing publicRing = generator.generatePublicKeyRing();
            PGPPublicKey master = publicRing.getPublicKey();

            return new GeneratedKeyMaterial(
                    PgpCryptoSupport.fingerprintHex(master),
                    PgpCryptoSupport.keyIdHex(master),
                    algorithm.algorithm(),
                    MAPPER.writeValueAsString(algorithm),
                    capabilities,
                    expiresAt,
                    PgpCryptoSupport.armorPublicRing(publicRing),
                    PgpCryptoSupport.armorSecretRing(secretRing));
        } catch (Exception e) {
            throw new CryptoException("Failed to generate primary key", e);
        }
    }

    public SubkeyMaterial addSubkey(
            int openpgpVersion,
            String armoredPrivate,
            char[] passphrase,
            List<PgpCapability> capabilities,
            AlgorithmSpecDto algorithm,
            Instant expiresAt) {
        try {
            PGPSecretKeyRing existing = PgpCryptoSupport.loadSecretKeyRing(armoredPrivate, passphrase);
            int ringVersion = PgpKeyValidator.validateDetectedOpenpgpVersion(PgpCryptoSupport.detectOpenpgpVersion(existing));
            if (ringVersion != openpgpVersion) {
                throw new CryptoException(
                        "Keyring OpenPGP version "
                                + ringVersion
                                + " does not match expected version "
                                + openpgpVersion);
            }
            PGPDigestCalculator sha1Calc = sha1Calculator();
            JcaPGPContentSignerBuilder signerBuilder = contentSignerFromRing(existing);
            PBESecretKeyEncryptor encryptor = secretKeyEncryptor(sha1Calc, passphrase);
            PGPSignatureSubpacketVector subHashed = hashedSubpackets(capabilities, expiresAt);

            PGPKeyRingGenerator generator =
                    new PGPKeyRingGenerator(
                            existing,
                            new JcePBESecretKeyDecryptorBuilder().setProvider(PROVIDER).build(passphrase),
                            sha1Calc,
                            signerBuilder,
                            encryptor);

            PGPKeyPair subPair = generateKeyPair(openpgpVersion, algorithm, new Date());
            generator.addSubKey(subPair, subHashed, null);

            PGPSecretKeyRing updatedSecret = generator.generateSecretKeyRing();
            PGPPublicKeyRing updatedPublic = generator.generatePublicKeyRing();
            PGPPublicKey subPublic = findPublicKey(updatedPublic, subPair.getKeyID());

            return new SubkeyMaterial(
                    PgpCryptoSupport.fingerprintHex(subPublic),
                    PgpCryptoSupport.keyIdHex(subPublic),
                    algorithm.algorithm(),
                    MAPPER.writeValueAsString(algorithm),
                    capabilities,
                    expiresAt,
                    PgpCryptoSupport.armorPublicRing(updatedPublic),
                    PgpCryptoSupport.armorSecretRing(updatedSecret));
        } catch (Exception e) {
            throw new CryptoException("Failed to add subkey", e);
        }
    }

    public KeyRingUpdate revokeKeyInRing(
            String armoredPrivate, char[] passphrase, long targetKeyId, int revocationReasonCode) {
        try {
            PGPSecretKeyRing ring = PgpCryptoSupport.loadSecretKeyRing(armoredPrivate, passphrase);
            PGPSecretKey masterSecret = ring.getSecretKey();
            PGPPublicKey target =
                    findPublicKey(PgpCryptoSupport.publicRingFromSecret(ring), targetKeyId);
            if (target == null) {
                throw new CryptoException("Key id not found in keyring");
            }

            PGPPublicKey masterPublic = masterSecret.getPublicKey();
            PGPSignatureGenerator sigGen = new PGPSignatureGenerator(
                    new JcaPGPContentSignerBuilder(masterPublic.getAlgorithm(), HashAlgorithmTags.SHA512)
                            .setProvider(PROVIDER));
            int revocationType = target.isMasterKey() ? PGPSignature.KEY_REVOCATION : PGPSignature.SUBKEY_REVOCATION;
            sigGen.init(revocationType, unlockSecret(masterSecret, passphrase));

            PGPSignatureSubpacketGenerator spGen = new PGPSignatureSubpacketGenerator();
            spGen.setRevocationReason(false, (byte) revocationReasonCode, "revoked via API");
            sigGen.setHashedSubpackets(spGen.generate());

            PGPSignature revocation =
                    target.isMasterKey()
                            ? sigGen.generateCertification(target)
                            : sigGen.generateCertification(masterPublic, target);
            PGPPublicKey revokedPublic = PGPPublicKey.addCertification(target, revocation);
            PGPSecretKeyRing updated = replacePublicKeyInRing(ring, targetKeyId, revokedPublic);
            PGPPublicKeyRing publicRing = PgpCryptoSupport.publicRingFromSecret(updated);
            return new KeyRingUpdate(
                    PgpCryptoSupport.armorPublicRing(publicRing),
                    PgpCryptoSupport.armorSecretRing(updated));
        } catch (Exception e) {
            throw new CryptoException("Failed to revoke key in keyring", e);
        }
    }

    public KeyRingUpdate extendExpiryInRing(
            String armoredPrivate, char[] passphrase, long targetKeyId, Instant newExpiresAt) {
        try {
            PGPSecretKeyRing ring = PgpCryptoSupport.loadSecretKeyRing(armoredPrivate, passphrase);
            PGPSecretKey masterSecret = ring.getSecretKey();
            PGPPublicKey target =
                    findPublicKey(PgpCryptoSupport.publicRingFromSecret(ring), targetKeyId);
            if (target == null) {
                throw new CryptoException("Key id not found in keyring");
            }

            PGPPublicKey masterPublic = masterSecret.getPublicKey();
            PGPSignatureGenerator sigGen = new PGPSignatureGenerator(
                    new JcaPGPContentSignerBuilder(masterPublic.getAlgorithm(), HashAlgorithmTags.SHA512)
                            .setProvider(PROVIDER));
            int signatureType =
                    target.isMasterKey() ? PGPSignature.POSITIVE_CERTIFICATION : PGPSignature.SUBKEY_BINDING;
            sigGen.init(signatureType, unlockSecret(masterSecret, passphrase));

            PGPSignatureSubpacketGenerator spGen = new PGPSignatureSubpacketGenerator();
            spGen.setKeyExpirationTime(false, expirySeconds(newExpiresAt));
            sigGen.setHashedSubpackets(spGen.generate());

            PGPSignature sig =
                    target.isMasterKey()
                            ? sigGen.generateCertification(target)
                            : sigGen.generateCertification(masterPublic, target);
            PGPPublicKey updatedKey = PGPPublicKey.addCertification(target, sig);
            PGPSecretKeyRing updated = replacePublicKeyInRing(ring, targetKeyId, updatedKey);
            PGPPublicKeyRing publicRing = PgpCryptoSupport.publicRingFromSecret(updated);
            return new KeyRingUpdate(
                    PgpCryptoSupport.armorPublicRing(publicRing),
                    PgpCryptoSupport.armorSecretRing(updated));
        } catch (Exception e) {
            throw new CryptoException("Failed to extend key expiry in keyring", e);
        }
    }

    public String exportPublicKey(String armoredPublic, long keyId) {
        try {
            PGPPublicKeyRing ring = PgpCryptoSupport.loadPublicKeyRing(armoredPublic);
            if (keyId == 0) {
                return PgpCryptoSupport.armorPublicRing(ring);
            }
            PGPPublicKey key = findPublicKey(ring, keyId);
            if (key == null) {
                throw new CryptoException("Public key id not found");
            }
            return PgpCryptoSupport.armorPublicRing(new PGPPublicKeyRing(List.of(key)));
        } catch (IOException | PGPException e) {
            throw new CryptoException("Failed to export public key", e);
        }
    }

    public record KeyRingUpdate(String armoredPublic, String armoredPrivate) {}

    private PGPPublicKey findPublicKey(PGPPublicKeyRing ring, long keyId) {
        Iterator<PGPPublicKey> keys = ring.getPublicKeys();
        while (keys.hasNext()) {
            PGPPublicKey k = keys.next();
            if (k.getKeyID() == keyId) {
                return k;
            }
        }
        return null;
    }

    private PGPSecretKeyRing replacePublicKeyInRing(PGPSecretKeyRing ring, long keyId, PGPPublicKey newPublic)
            throws PGPException, IOException {
        List<PGPSecretKey> keys = new ArrayList<>();
        Iterator<PGPSecretKey> it = ring.getSecretKeys();
        while (it.hasNext()) {
            PGPSecretKey sk = it.next();
            if (sk.getKeyID() == keyId) {
                keys.add(PGPSecretKey.replacePublicKey(sk, newPublic));
            } else {
                keys.add(sk);
            }
        }
        return new PGPSecretKeyRing(keys);
    }

    private PGPPrivateKey unlockSecret(PGPSecretKey secret, char[] passphrase) throws PGPException {
        return secret.extractPrivateKey(
                new JcePBESecretKeyDecryptorBuilder().setProvider(PROVIDER).build(passphrase));
    }

    private PGPKeyPair generateKeyPair(int openpgpVersion, AlgorithmSpecDto spec, Date creationTime) throws Exception {
        if (openpgpVersion == PgpKeyValidator.OPENPGP_V6) {
            return generateKeyPairV6(spec, creationTime);
        }
        return generateKeyPairV4(spec, creationTime);
    }

    private PGPKeyPair generateKeyPairV4(AlgorithmSpecDto spec, Date creationTime) throws Exception {
        return switch (spec.algorithm().toLowerCase()) {
            case "ed25519" ->
                    new JcaPGPKeyPair(PgpKeyValidator.OPENPGP_V4, PublicKeyAlgorithmTags.EDDSA, ed25519Pair(), creationTime);
            case "cv25519" ->
                    new JcaPGPKeyPair(PgpKeyValidator.OPENPGP_V4, PublicKeyAlgorithmTags.ECDH, x25519Pair(), creationTime);
            case "rsa" -> {
                int size = spec.keySize() != null ? spec.keySize() : 4096;
                KeyPairGenerator rsa = KeyPairGenerator.getInstance("RSA", PROVIDER);
                rsa.initialize(size);
                yield new JcaPGPKeyPair(
                        PgpKeyValidator.OPENPGP_V4,
                        PublicKeyAlgorithmTags.RSA_GENERAL,
                        rsa.generateKeyPair(),
                        creationTime);
            }
            case "ecdsa" -> new JcaPGPKeyPair(
                    PgpKeyValidator.OPENPGP_V4,
                    PublicKeyAlgorithmTags.ECDSA,
                    ecKeyPair(resolveCurveName(spec.curve(), "P-256"), "ECDSA"),
                    creationTime);
            case "ecdh" -> new JcaPGPKeyPair(
                    PgpKeyValidator.OPENPGP_V4,
                    PublicKeyAlgorithmTags.ECDH,
                    ecKeyPair(resolveCurveName(spec.curve(), null), "ECDH"),
                    creationTime);
            default -> throw new CryptoException("Unsupported algorithm: " + spec.algorithm());
        };
    }

    private PGPKeyPair generateKeyPairV6(AlgorithmSpecDto spec, Date creationTime) throws Exception {
        PGPKeyPairGenerator generator =
                new JcaPGPKeyPairGeneratorProvider().setProvider(PROVIDER).get(PgpKeyValidator.OPENPGP_V6, creationTime);
        return switch (spec.algorithm().toLowerCase()) {
            case "ed25519" -> generator.generateEd25519KeyPair();
            case "cv25519" -> generator.generateX25519KeyPair();
            case "rsa" -> generator.generateRsaKeyPair(spec.keySize() != null ? spec.keySize() : 4096);
            case "ecdsa" -> generateNistEcdsaV6(generator, spec.curve());
            case "ecdh" -> generateNistEcdhV6(generator, spec.curve());
            default -> throw new CryptoException("Unsupported algorithm: " + spec.algorithm());
        };
    }

    private PGPKeyPair generateNistEcdsaV6(PGPKeyPairGenerator generator, String curve) throws PGPException {
        return switch (resolveCurveName(curve, "P-256")) {
            case "P-256" -> generator.generateNistP256ECDSAKeyPair();
            case "P-384" -> generator.generateNistP384ECDSAKeyPair();
            case "P-521" -> generator.generateNistP521ECDSAKeyPair();
            default -> throw new CryptoException("Unsupported curve for v6 ecdsa: " + curve);
        };
    }

    private PGPKeyPair generateNistEcdhV6(PGPKeyPairGenerator generator, String curve) throws PGPException {
        return switch (resolveCurveName(curve, null)) {
            case "P-256" -> generator.generateNistP256ECDHKeyPair();
            case "P-384" -> generator.generateNistP384ECDHKeyPair();
            case "P-521" -> generator.generateNistP521ECDHKeyPair();
            default -> throw new CryptoException("Unsupported curve for v6 ecdh: " + curve);
        };
    }

    private KeyPair ed25519Pair() throws Exception {
        KeyPairGenerator gen = KeyPairGenerator.getInstance("Ed25519", PROVIDER);
        return gen.generateKeyPair();
    }

    private KeyPair x25519Pair() throws Exception {
        KeyPairGenerator gen = KeyPairGenerator.getInstance("X25519", PROVIDER);
        return gen.generateKeyPair();
    }

    private KeyPair ecKeyPair(String curveName, String algorithm) throws Exception {
        KeyPairGenerator gen = KeyPairGenerator.getInstance(algorithm, PROVIDER);
        gen.initialize(new ECGenParameterSpec(curveName));
        return gen.generateKeyPair();
    }

    private String resolveCurveName(String curve, String defaultCurve) {
        if (curve == null || curve.isBlank()) {
            if (defaultCurve == null) {
                throw new CryptoException("curve is required for this algorithm");
            }
            return defaultCurve;
        }
        String normalized = curve.toLowerCase().replace("_", "").replace("-", "");
        return switch (normalized) {
            case "p256", "nistp256", "secp256r1" -> "P-256";
            case "p384", "nistp384" -> "P-384";
            case "p521", "nistp521" -> "P-521";
            default -> resolveCurveNamePassthrough(curve);
        };
    }

    private String resolveCurveNamePassthrough(String curve) {
        if (curve.matches("(?i)P-\\d{3}")) {
            return curve.toUpperCase().startsWith("P-") ? curve : "P-" + curve.substring(1);
        }
        throw new CryptoException("Unknown curve: " + curve);
    }

    /** SHA-1 digest calculator for OpenPGP v4 key packets (RFC 4880 §5.5.3). */
    private PGPDigestCalculator sha1Calculator() throws PGPException {
        return new JcaPGPDigestCalculatorProviderBuilder()
                .setProvider(PROVIDER)
                .build()
                .get(HashAlgorithmTags.SHA1);
    }

    private JcaPGPContentSignerBuilder contentSigner(PGPKeyPair pair) {
        return new JcaPGPContentSignerBuilder(pair.getPublicKey().getAlgorithm(), HashAlgorithmTags.SHA512)
                .setProvider(PROVIDER);
    }

    private JcaPGPContentSignerBuilder contentSignerFromRing(PGPSecretKeyRing ring) {
        return new JcaPGPContentSignerBuilder(ring.getSecretKey().getPublicKey().getAlgorithm(), HashAlgorithmTags.SHA512)
                .setProvider(PROVIDER);
    }

    private PBESecretKeyEncryptor secretKeyEncryptor(PGPDigestCalculator sha1Calc, char[] passphrase)
            throws PGPException {
        return new JcePBESecretKeyEncryptorBuilder(SymmetricKeyAlgorithmTags.AES_256, sha1Calc)
                .setProvider(PROVIDER)
                .build(passphrase);
    }

    private PGPSignatureSubpacketVector hashedSubpackets(List<PgpCapability> capabilities, Instant expiresAt)
            throws PGPException {
        PGPSignatureSubpacketGenerator gen = new PGPSignatureSubpacketGenerator();
        gen.setKeyFlags(false, capabilityFlags(capabilities));
        if (expiresAt != null) {
            gen.setKeyExpirationTime(false, expirySeconds(expiresAt));
        }
        return gen.generate();
    }

    private int capabilityFlags(List<PgpCapability> capabilities) {
        int flags = 0;
        for (PgpCapability cap : capabilities) {
            flags |= switch (cap) {
                case CERTIFY -> KeyFlags.CERTIFY_OTHER;
                case SIGN -> KeyFlags.SIGN_DATA;
                case ENCRYPT -> KeyFlags.ENCRYPT_COMMS | KeyFlags.ENCRYPT_STORAGE;
                case AUTHENTICATE -> KeyFlags.AUTHENTICATION;
            };
        }
        return flags;
    }

    private long expirySeconds(Instant expiresAt) {
        long seconds = expiresAt.getEpochSecond() - Instant.now().getEpochSecond();
        if (seconds <= 0) {
            throw new CryptoException("Expiry must be in the future");
        }
        return seconds;
    }

    private String formatIdentity(List<UserIdSpecDto> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return "PGP Key Manager User";
        }
        UserIdSpecDto first = userIds.getFirst();
        if (first.email() != null && !first.email().isBlank()) {
            return first.name() + " <" + first.email() + ">";
        }
        return first.name();
    }
}
