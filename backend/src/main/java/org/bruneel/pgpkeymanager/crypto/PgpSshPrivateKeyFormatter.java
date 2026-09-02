package org.bruneel.pgpkeymanager.crypto;

import java.io.IOException;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.security.PrivateKey;

import org.bouncycastle.bcpg.PublicKeyAlgorithmTags;
import org.bouncycastle.crypto.params.AsymmetricKeyParameter;
import org.bouncycastle.crypto.util.OpenSSHPrivateKeyUtil;
import org.bouncycastle.crypto.util.PrivateKeyFactory;
import org.bouncycastle.openpgp.PGPException;
import org.bouncycastle.openpgp.PGPPrivateKey;
import org.bouncycastle.openpgp.PGPPublicKey;
import org.bouncycastle.openpgp.operator.jcajce.JcaPGPKeyConverter;
import org.bouncycastle.util.io.pem.PemObject;
import org.bouncycastle.util.io.pem.PemWriter;
import org.bruneel.pgpkeymanager.service.CryptoException;

final class PgpSshPrivateKeyFormatter {

    private static final String PROVIDER = PgpCryptoSupport.PROVIDER;
    private static final byte[] OPENSSH_MAGIC = "openssh-key-v1\0".getBytes(StandardCharsets.UTF_8);

    private PgpSshPrivateKeyFormatter() {}

    static String formatPem(PGPPublicKey publicKey, PGPPrivateKey privateKey) {
        PgpSshPublicKeyFormatter.validateSshExportable(publicKey);

        try {
            JcaPGPKeyConverter converter = new JcaPGPKeyConverter().setProvider(PROVIDER);
            PrivateKey jcaPrivate = converter.getPrivateKey(privateKey);
            AsymmetricKeyParameter params = PrivateKeyFactory.createKey(jcaPrivate.getEncoded());
            byte[] encoded = OpenSSHPrivateKeyUtil.encodePrivateKey(params);
            String pemType = pemTypeForEncoded(encoded, publicKey.getAlgorithm());
            StringWriter sw = new StringWriter();
            try (PemWriter writer = new PemWriter(sw)) {
                writer.writeObject(new PemObject(pemType, encoded));
            }
            return sw.toString();
        } catch (CryptoException ex) {
            throw ex;
        } catch (PGPException | IOException | RuntimeException ex) {
            throw new CryptoException("Failed to export OpenSSH private key", ex);
        }
    }

    private static String pemTypeForEncoded(byte[] encoded, int pgpAlgorithm) {
        if (startsWithOpenSshMagic(encoded)) {
            return "OPENSSH PRIVATE KEY";
        }
        // BC encodes RSA as PKCS#1 DER (not openssh-key-v1).
        return switch (pgpAlgorithm) {
            case PublicKeyAlgorithmTags.RSA_GENERAL,
                    PublicKeyAlgorithmTags.RSA_ENCRYPT,
                    PublicKeyAlgorithmTags.RSA_SIGN -> "RSA PRIVATE KEY";
            case PublicKeyAlgorithmTags.ECDSA -> "EC PRIVATE KEY";
            default -> "OPENSSH PRIVATE KEY";
        };
    }

    private static boolean startsWithOpenSshMagic(byte[] encoded) {
        if (encoded.length < OPENSSH_MAGIC.length) {
            return false;
        }
        for (int i = 0; i < OPENSSH_MAGIC.length; i++) {
            if (encoded[i] != OPENSSH_MAGIC[i]) {
                return false;
            }
        }
        return true;
    }
}
