package org.bruneel.pgpkeymanager.storage;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import software.amazon.awssdk.awscore.exception.AwsErrorDetails;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.sts.model.StsException;

class AwsStorageProbeExceptionMappingTest {

    @ParameterizedTest
    @MethodSource("stsExceptionCases")
    void mapStsExceptionCategories(String errorCode, String message, String expectedCategory) {
        StsException ex =
                (StsException)
                        StsException.builder()
                                .message(message)
                                .awsErrorDetails(AwsErrorDetails.builder().errorCode(errorCode).build())
                                .build();

        StorageConnectionProbeException mapped = SdkAwsAssumeRoleClient.mapStsException(ex);

        assertThat(mapped.errorCategory()).isEqualTo(expectedCategory);
    }

    static Stream<Arguments> stsExceptionCases() {
        return Stream.of(
                Arguments.of("AccessDenied", "Not authorized", StorageConnectionTestErrorCategories.ASSUME_ROLE_DENIED),
                Arguments.of(
                        "AccessDenied",
                        "ExternalId mismatch in trust policy",
                        StorageConnectionTestErrorCategories.EXTERNAL_ID_MISMATCH),
                Arguments.of(
                        "MalformedPolicyDocument",
                        "Invalid policy",
                        StorageConnectionTestErrorCategories.EXTERNAL_ID_MISMATCH),
                Arguments.of("ValidationError", "Bad param", StorageConnectionTestErrorCategories.EXTERNAL_ID_MISMATCH),
                Arguments.of("Throttling", "Slow down", StorageConnectionTestErrorCategories.ASSUME_ROLE_DENIED));
    }

    @Test
    void looksLikeExternalIdMismatchDetectsCommonMessages() {
        StsException ex =
                (StsException)
                        StsException.builder()
                                .message("Condition sts:ExternalId failed")
                                .awsErrorDetails(AwsErrorDetails.builder().errorCode("AccessDenied").build())
                                .build();

        assertThat(SdkAwsAssumeRoleClient.looksLikeExternalIdMismatch(ex)).isTrue();
    }

    @ParameterizedTest
    @MethodSource("s3ExceptionCases")
    void mapS3ExceptionCategories(String errorCode, String message, String expectedCategory) {
        S3Exception ex =
                (S3Exception)
                        S3Exception.builder()
                                .message(message)
                                .awsErrorDetails(AwsErrorDetails.builder().errorCode(errorCode).build())
                                .build();

        StorageConnectionProbeException mapped = SdkAwsS3ProbeClient.mapS3Exception(ex);

        assertThat(mapped.errorCategory()).isEqualTo(expectedCategory);
    }

    static Stream<Arguments> s3ExceptionCases() {
        return Stream.of(
                Arguments.of("AccessDenied", "Denied", StorageConnectionTestErrorCategories.ACCESS_DENIED),
                Arguments.of("NoSuchBucket", "Missing", StorageConnectionTestErrorCategories.BUCKET_NOT_FOUND),
                Arguments.of(
                        "KMS.AccessDeniedException",
                        "KMS denied",
                        StorageConnectionTestErrorCategories.KMS_ACCESS_DENIED),
                Arguments.of("AccessDenied", "SSE-KMS key access", StorageConnectionTestErrorCategories.KMS_ACCESS_DENIED));
    }
}
