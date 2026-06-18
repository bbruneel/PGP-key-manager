package org.bruneel.pgpkeymanager.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.bruneel.pgpkeymanager.domain.StorageRef;

class StorageRefParserTest {

    private static final UUID CONNECTION_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");

    private StorageRefParser parser;

    @BeforeEach
    void setUp() {
        parser = new StorageRefParser();
    }

    @Test
    void parseValidRefWithoutVersionId() {
        StorageRef ref = parser.parse("aws-s3://550e8400-e29b-41d4-a716-446655440000/user/abc/keys/def/keyring.json");

        assertThat(ref.connectionId()).isEqualTo(CONNECTION_ID);
        assertThat(ref.objectKey()).isEqualTo("user/abc/keys/def/keyring.json");
        assertThat(ref.versionId()).isEmpty();
    }

    @Test
    void parseValidRefWithVersionId() {
        StorageRef ref = parser.parse(
                "aws-s3://550e8400-e29b-41d4-a716-446655440000/user/abc/keys/def/keyring.json?versionId=abc123");

        assertThat(ref.connectionId()).isEqualTo(CONNECTION_ID);
        assertThat(ref.objectKey()).isEqualTo("user/abc/keys/def/keyring.json");
        assertThat(ref.versionId()).contains("abc123");
    }

    @Test
    void formatRoundTrip() {
        StorageRef ref = new StorageRef(CONNECTION_ID, "user/keys/abc/keyring.json", java.util.Optional.of("v1"));

        assertThat(parser.parse(parser.format(ref))).isEqualTo(ref);
    }

    @Test
    void extractConnectionId() {
        assertThat(parser.extractConnectionId("aws-s3://550e8400-e29b-41d4-a716-446655440000/path/keyring.json"))
                .isEqualTo(CONNECTION_ID);
    }

    @Test
    void rejectsInvalidProvider() {
        assertThatThrownBy(() -> parser.parse("s3://550e8400-e29b-41d4-a716-446655440000/keyring.json"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Invalid storage_ref");
    }

    @Test
    void rejectsInvalidUuid() {
        assertThatThrownBy(() -> parser.parse("aws-s3://not-a-uuid/keyring.json"))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void rejectsEmptyObjectKey() {
        assertThatThrownBy(() -> parser.parse("aws-s3://550e8400-e29b-41d4-a716-446655440000/"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Invalid storage_ref");
    }

    @Test
    void rejectsBlankInput() {
        assertThatThrownBy(() -> parser.parse("  "))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("required");
    }
}
