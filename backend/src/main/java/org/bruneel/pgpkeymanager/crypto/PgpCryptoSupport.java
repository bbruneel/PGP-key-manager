package org.bruneel.pgpkeymanager.crypto;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.Security;
import java.util.Iterator;

import org.bouncycastle.bcpg.ArmoredInputStream;
import org.bouncycastle.bcpg.ArmoredOutputStream;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.openpgp.PGPException;
import org.bouncycastle.openpgp.PGPPublicKey;
import org.bouncycastle.openpgp.PGPPublicKeyRing;
import org.bouncycastle.openpgp.PGPPublicKeyRingCollection;
import org.bouncycastle.openpgp.PGPSecretKeyRing;
import org.bouncycastle.openpgp.PGPSecretKeyRingCollection;
import org.bouncycastle.openpgp.PGPUtil;
import org.bouncycastle.openpgp.operator.KeyFingerPrintCalculator;
import org.bouncycastle.openpgp.operator.jcajce.JcaKeyFingerprintCalculator;
import org.bouncycastle.util.encoders.Hex;
import org.bruneel.pgpkeymanager.service.CryptoException;

public final class PgpCryptoSupport {

    public static final String PROVIDER = BouncyCastleProvider.PROVIDER_NAME;

    static {
        if (Security.getProvider(PROVIDER) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
    }

    private PgpCryptoSupport() {}

    public static String fingerprintHex(PGPPublicKey key) {
        return Hex.toHexString(key.getFingerprint()).toUpperCase();
    }

    public static String keyIdHex(PGPPublicKey key) {
        return Long.toHexString(key.getKeyID()).toUpperCase();
    }

    public static PGPSecretKeyRing loadSecretKeyRing(String armoredPrivate, char[] passphrase)
            throws IOException, PGPException {
        try (InputStream in = decoderStream(armoredPrivate)) {
            PGPSecretKeyRingCollection collection =
                    new PGPSecretKeyRingCollection(in, new JcaKeyFingerprintCalculator());
            Iterator<PGPSecretKeyRing> rings = collection.getKeyRings();
            if (!rings.hasNext()) {
                throw new CryptoException("No secret key ring found in armored private key");
            }
            return rings.next();
        }
    }

    public static PGPPublicKeyRing loadPublicKeyRing(String armoredPublic) throws IOException, PGPException {
        try (InputStream in = decoderStream(armoredPublic)) {
            PGPPublicKeyRingCollection collection =
                    new PGPPublicKeyRingCollection(in, new JcaKeyFingerprintCalculator());
            Iterator<PGPPublicKeyRing> rings = collection.getKeyRings();
            if (!rings.hasNext()) {
                throw new CryptoException("No public key ring found");
            }
            return rings.next();
        }
    }

    public static String armorSecretRing(PGPSecretKeyRing ring) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ArmoredOutputStream armored = new ArmoredOutputStream(out)) {
            ring.encode(armored);
        }
        return out.toString(StandardCharsets.UTF_8);
    }

    public static String armorPublicRing(PGPPublicKeyRing ring) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ArmoredOutputStream armored = new ArmoredOutputStream(out)) {
            ring.encode(armored);
        }
        return out.toString(StandardCharsets.UTF_8);
    }

    public static InputStream decoderStream(String armored) {
        try {
            return new ArmoredInputStream(new ByteArrayInputStream(armored.getBytes(StandardCharsets.UTF_8)));
        } catch (IOException e) {
            throw new CryptoException("Invalid armored data", e);
        }
    }

    public static KeyFingerPrintCalculator fingerprintCalculator() {
        return new JcaKeyFingerprintCalculator();
    }

    public static PGPPublicKeyRing publicRingFromSecret(PGPSecretKeyRing secretRing) {
        try {
            return new PGPPublicKeyRing(secretRing.getEncoded(), fingerprintCalculator());
        } catch (Exception e) {
            throw new CryptoException("Failed to derive public key ring", e);
        }
    }

    public static long parseKeyIdHex(String keyId) {
        if (keyId == null || keyId.isBlank()) {
            return 0L;
        }
        String normalized = keyId.length() > 16 ? keyId.substring(keyId.length() - 16) : keyId;
        return Long.parseUnsignedLong(normalized, 16);
    }
}
