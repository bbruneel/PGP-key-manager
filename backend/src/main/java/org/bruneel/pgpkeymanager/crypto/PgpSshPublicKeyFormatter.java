package org.bruneel.pgpkeymanager.crypto;

import java.io.IOException;
import java.security.PublicKey;
import java.util.Base64;
import java.util.Iterator;

import org.bouncycastle.bcpg.PublicKeyAlgorithmTags;
import org.bouncycastle.bcpg.SignatureSubpacketTags;
import org.bouncycastle.bcpg.sig.KeyFlags;
import org.bouncycastle.crypto.params.AsymmetricKeyParameter;
import org.bouncycastle.crypto.params.ECNamedDomainParameters;
import org.bouncycastle.crypto.params.ECPublicKeyParameters;
import org.bouncycastle.crypto.params.Ed25519PublicKeyParameters;
import org.bouncycastle.crypto.params.RSAKeyParameters;
import org.bouncycastle.crypto.util.OpenSSHPublicKeyUtil;
import org.bouncycastle.crypto.util.PublicKeyFactory;
import org.bouncycastle.openpgp.PGPPublicKey;
import org.bouncycastle.openpgp.PGPException;
import org.bouncycastle.openpgp.PGPSignature;
import org.bouncycastle.openpgp.PGPSignatureSubpacketVector;
import org.bouncycastle.openpgp.operator.jcajce.JcaPGPKeyConverter;
import org.bruneel.pgpkeymanager.service.CryptoException;

final class PgpSshPublicKeyFormatter {

    private static final String PROVIDER = PgpCryptoSupport.PROVIDER;

    private PgpSshPublicKeyFormatter() {}

    static void validateSshExportable(PGPPublicKey publicKey) {
        if (!hasAuthenticateFlag(publicKey)) {
            throw new CryptoException("OpenSSH export requires the authenticate capability on this key");
        }
        if (!isSshCompatibleAlgorithm(publicKey.getAlgorithm())) {
            throw new CryptoException("Algorithm cannot be exported as an OpenSSH public key");
        }
    }

    static String formatLine(PGPPublicKey publicKey, String comment) {
        validateSshExportable(publicKey);

        try {
            JcaPGPKeyConverter converter = new JcaPGPKeyConverter().setProvider(PROVIDER);
            PublicKey jcaKey = converter.getPublicKey(publicKey);
            AsymmetricKeyParameter params = PublicKeyFactory.createKey(jcaKey.getEncoded());
            byte[] encoded = OpenSSHPublicKeyUtil.encodePublicKey(params);
            String type = sshType(params);
            return type + " " + Base64.getEncoder().encodeToString(encoded) + " " + comment;
        } catch (PGPException | IOException ex) {
            throw new CryptoException("Failed to export OpenSSH public key", ex);
        }
    }

    static boolean isSshCompatibleAlgorithm(int algorithm) {
        return switch (algorithm) {
            case PublicKeyAlgorithmTags.RSA_GENERAL,
                    PublicKeyAlgorithmTags.RSA_ENCRYPT,
                    PublicKeyAlgorithmTags.RSA_SIGN,
                    PublicKeyAlgorithmTags.EDDSA,
                    PublicKeyAlgorithmTags.ECDSA -> true;
            default -> false;
        };
    }

    private static String sshType(AsymmetricKeyParameter params) {
        if (params instanceof Ed25519PublicKeyParameters) {
            return "ssh-ed25519";
        }
        if (params instanceof RSAKeyParameters) {
            return "ssh-rsa";
        }
        if (params instanceof ECPublicKeyParameters ec) {
            if (ec.getParameters() instanceof ECNamedDomainParameters named) {
                return switch (named.getName().getId()) {
                    case "1.2.840.10045.3.1.7" -> "ecdsa-sha2-nistp256";
                    case "1.3.132.0.34" -> "ecdsa-sha2-nistp384";
                    case "1.3.132.0.35" -> "ecdsa-sha2-nistp521";
                    default -> throw new CryptoException("Unsupported ECDSA curve for OpenSSH export");
                };
            }
            throw new CryptoException("Unsupported ECDSA curve for OpenSSH export");
        }
        throw new CryptoException("Unsupported key type for OpenSSH export");
    }

    private static boolean hasAuthenticateFlag(PGPPublicKey publicKey) {
        return (extractKeyFlags(publicKey) & KeyFlags.AUTHENTICATION) != 0;
    }

    private static int extractKeyFlags(PGPPublicKey publicKey) {
        int merged = 0;
        Iterator<PGPSignature> signatures = publicKey.getSignatures();
        while (signatures.hasNext()) {
            merged |= keyFlagsFromSignature(signatures.next());
        }
        if (merged == 0) {
            Iterator<PGPSignature> keySignatures = publicKey.getKeySignatures();
            while (keySignatures.hasNext()) {
                merged |= keyFlagsFromSignature(keySignatures.next());
            }
        }
        return merged;
    }

    private static int keyFlagsFromSignature(PGPSignature signature) {
        PGPSignatureSubpacketVector hashed = signature.getHashedSubPackets();
        if (hashed != null && hashed.hasSubpacket(SignatureSubpacketTags.KEY_FLAGS)) {
            return hashed.getKeyFlags();
        }
        return 0;
    }
}
