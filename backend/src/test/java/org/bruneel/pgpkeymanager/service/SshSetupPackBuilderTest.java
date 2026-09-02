package org.bruneel.pgpkeymanager.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import net.lingala.zip4j.ZipFile;

class SshSetupPackBuilderTest {

    private final SshSetupPackBuilder builder = new SshSetupPackBuilder();

    @TempDir
    Path tempDir;

    @Test
    void buildCreatesAesZipWithExpectedFiles() throws Exception {
        String privatePem =
                """
                -----BEGIN OPENSSH PRIVATE KEY-----
                b3BlbnNzaC1rZXktdjEAAAAABG5vbmU=
                -----END OPENSSH PRIVATE KEY-----
                """;
        String publicLine = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIExample openpgp:0xabcdef01";

        SshSetupPackBuilder.BuiltPack pack =
                builder.build("BC-TST", privatePem, publicLine, "BC-TST", "CC7DC89FE89EB465");

        try {
            assertThat(pack.filename()).isEqualTo("bc-tst-ssh-setup.zip");
            assertThat(pack.fileCount()).isEqualTo(4);
            assertThat(pack.archivePassword()).hasSize(20);
            assertThat(new String(pack.archivePassword())).doesNotContain("0", "O", "1", "l", "I");
            assertThat(pack.zipBytes()).isNotEmpty();

            Path zipPath = tempDir.resolve(pack.filename());
            Files.write(zipPath, pack.zipBytes());
            Path extractDir = tempDir.resolve("out");
            Files.createDirectories(extractDir);

            try (ZipFile zipFile = new ZipFile(zipPath.toFile(), pack.archivePassword())) {
                assertThat(zipFile.isEncrypted()).isTrue();
                zipFile.extractAll(extractDir.toString());
            }

            String extractedPrivate = Files.readString(extractDir.resolve("bc-tst"));
            String extractedPub = Files.readString(extractDir.resolve("bc-tst.pub"));
            String readme = Files.readString(extractDir.resolve("README.txt"));
            String config = Files.readString(extractDir.resolve("config-snippet.txt"));

            assertThat(extractedPrivate).contains("BEGIN OPENSSH PRIVATE KEY");
            assertThat(extractedPub.trim()).isEqualTo(publicLine);
            assertThat(readme).contains("SSH setup for: BC-TST");
            assertThat(readme).contains("zip archive password is shown once");
            assertThat(readme).doesNotContain(new String(pack.archivePassword()));
            assertThat(config).contains("IdentityFile ~/.ssh/bc-tst");
        } finally {
            SshSetupPackBuilder.wipePassword(pack.archivePassword());
        }
    }

    @Test
    void sanitizeBaseNameFallsBackWhenBlank() {
        assertThat(SshSetupPackBuilder.sanitizeBaseName("  ")).isEqualTo("ssh-key");
        assertThat(SshSetupPackBuilder.sanitizeBaseName("My Key!!")).isEqualTo("my-key");
    }
}
