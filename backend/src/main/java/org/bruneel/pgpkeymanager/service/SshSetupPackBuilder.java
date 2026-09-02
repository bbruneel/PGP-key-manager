package org.bruneel.pgpkeymanager.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.stereotype.Component;

import net.lingala.zip4j.io.outputstream.ZipOutputStream;
import net.lingala.zip4j.model.ZipParameters;
import net.lingala.zip4j.model.enums.AesKeyStrength;
import net.lingala.zip4j.model.enums.EncryptionMethod;

/**
 * Builds an AES-256 password-protected SSH setup zip in memory.
 * The archive password is returned separately and must never be logged.
 */
@Component
public class SshSetupPackBuilder {

    /** Unambiguous alphabet (no 0/O/1/l/I). */
    private static final char[] PASSWORD_ALPHABET =
            "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789".toCharArray();
    private static final int PASSWORD_LENGTH = 20;
    private static final int FILE_COUNT = 4;

    private final SecureRandom secureRandom = new SecureRandom();

    public record BuiltPack(byte[] zipBytes, char[] archivePassword, String filename, int fileCount) {}

    public BuiltPack build(
            String baseName, String privatePem, String publicLine, String label, String fingerprint) {
        String safeName = sanitizeBaseName(baseName);
        String readme = buildReadme(safeName, label, fingerprint);
        String configSnippet = buildConfigSnippet(safeName);

        Map<String, byte[]> files = new LinkedHashMap<>();
        files.put(safeName, privatePem.getBytes(StandardCharsets.UTF_8));
        files.put(safeName + ".pub", (publicLine.endsWith("\n") ? publicLine : publicLine + "\n").getBytes(StandardCharsets.UTF_8));
        files.put("README.txt", readme.getBytes(StandardCharsets.UTF_8));
        files.put("config-snippet.txt", configSnippet.getBytes(StandardCharsets.UTF_8));

        char[] password = generatePassword();
        try {
            byte[] zipBytes = writeEncryptedZip(files, password);
            return new BuiltPack(zipBytes, password, safeName + "-ssh-setup.zip", FILE_COUNT);
        } catch (IOException ex) {
            PassphraseUtil.wipe(password);
            throw new CryptoException("Failed to build SSH setup pack archive", ex);
        }
    }

    static String sanitizeBaseName(String baseName) {
        if (baseName == null || baseName.isBlank()) {
            return "ssh-key";
        }
        String sanitized =
                baseName.trim().toLowerCase().replaceAll("[^a-z0-9._-]+", "-").replaceAll("^-+|-+$", "");
        return sanitized.isBlank() ? "ssh-key" : sanitized;
    }

    char[] generatePassword() {
        char[] password = new char[PASSWORD_LENGTH];
        for (int i = 0; i < PASSWORD_LENGTH; i++) {
            password[i] = PASSWORD_ALPHABET[secureRandom.nextInt(PASSWORD_ALPHABET.length)];
        }
        return password;
    }

    private static byte[] writeEncryptedZip(Map<String, byte[]> files, char[] password) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos, password)) {
            ZipParameters parameters = new ZipParameters();
            parameters.setEncryptFiles(true);
            parameters.setEncryptionMethod(EncryptionMethod.AES);
            parameters.setAesKeyStrength(AesKeyStrength.KEY_STRENGTH_256);

            for (Map.Entry<String, byte[]> entry : files.entrySet()) {
                parameters.setFileNameInZip(entry.getKey());
                zos.putNextEntry(parameters);
                zos.write(entry.getValue());
                zos.closeEntry();
            }
        }
        return baos.toByteArray();
    }

    private static String buildReadme(String fileName, String label, String fingerprint) {
        String displayLabel = label != null && !label.isBlank() ? label : fileName;
        String displayFingerprint = fingerprint != null && !fingerprint.isBlank() ? fingerprint : "(unknown)";
        return """
                SSH setup for: %s
                Fingerprint: %s

                The zip archive password is shown once in the app after download.
                It is NOT stored in this archive. If you lose it, download a new pack.

                CLIENT (this machine)
                1. mkdir -p ~/.ssh && chmod 700 ~/.ssh
                2. Unzip this archive with the one-time password from the app
                3. mv %s %s.pub ~/.ssh/
                4. chmod 600 ~/.ssh/%s
                5. Optional ~/.ssh/config — see config-snippet.txt
                6. Test: ssh -i ~/.ssh/%s user@host

                SERVER (each host you log into)
                1. Append %s.pub to ~/.ssh/authorized_keys
                2. chmod 600 ~/.ssh/authorized_keys

                Notes
                - This is an OpenSSH key extracted from your OpenPGP authenticate subkey.
                - Rotating or revoking the subkey in the vault does not update files on disk;
                  re-download a new pack after rotation.
                - Prefer gpg-agent if you want to keep one OpenPGP keyring instead of a standalone SSH key.
                - WinZip AES zips need 7-Zip, PeaZip, or The Unarchiver.
                  macOS Archive Utility / Finder, macOS & Linux Info-ZIP `unzip`, and older
                  Windows Explorer do not support AES (method 99).
                """
                .formatted(
                        displayLabel,
                        displayFingerprint,
                        fileName,
                        fileName,
                        fileName,
                        fileName,
                        fileName);
    }

    private static String buildConfigSnippet(String fileName) {
        return """
                Host myserver
                  HostName example.com
                  User youruser
                  IdentityFile ~/.ssh/%s
                  IdentitiesOnly yes
                """
                .formatted(fileName);
    }

    /** Test helper: wipe password arrays after assertions. */
    public static void wipePassword(char[] password) {
        if (password != null) {
            Arrays.fill(password, '\0');
        }
    }
}
