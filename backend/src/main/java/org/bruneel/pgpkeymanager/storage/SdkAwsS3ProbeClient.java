package org.bruneel.pgpkeymanager.storage;

import java.nio.charset.StandardCharsets;
import java.time.Instant;

import org.springframework.stereotype.Component;

import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.ResponseTransformer;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchBucketException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.model.ServerSideEncryption;

@Component
public class SdkAwsS3ProbeClient implements AwsS3ProbeClient {

    @Override
    public void putGetDeleteProbe(
            String region, String bucket, String objectKey, AwsSessionCredentials credentials, byte[] payload) {
        try (S3Client s3Client = s3Client(region, credentials)) {
            s3Client.putObject(
                    PutObjectRequest.builder()
                            .bucket(bucket)
                            .key(objectKey)
                            .serverSideEncryption(ServerSideEncryption.AES256)
                            .build(),
                    software.amazon.awssdk.core.sync.RequestBody.fromBytes(payload));

            byte[] downloaded =
                    s3Client.getObject(
                                    GetObjectRequest.builder().bucket(bucket).key(objectKey).build(),
                                    ResponseTransformer.toBytes())
                            .asByteArray();
            if (!java.util.Arrays.equals(payload, downloaded)) {
                throw new StorageConnectionProbeException(
                        StorageConnectionTestErrorCategories.ACCESS_DENIED, "Probe object content mismatch after upload");
            }

            s3Client.deleteObject(builder -> builder.bucket(bucket).key(objectKey));
        } catch (NoSuchBucketException ex) {
            throw new StorageConnectionProbeException(StorageConnectionTestErrorCategories.BUCKET_NOT_FOUND, ex.getMessage(), ex);
        } catch (S3Exception ex) {
            throw mapS3Exception(ex);
        } catch (StorageConnectionProbeException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            throw AwsStorageExceptionMapper.map(ex);
        }
    }

    private static S3Client s3Client(String region, AwsSessionCredentials credentials) {
        return S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(
                        StaticCredentialsProvider.create(
                                software.amazon.awssdk.auth.credentials.AwsSessionCredentials.create(
                                        credentials.accessKeyId(),
                                        credentials.secretAccessKey(),
                                        credentials.sessionToken())))
                .build();
    }

    static StorageConnectionProbeException mapS3Exception(S3Exception ex) {
        String errorCode = ex.awsErrorDetails() != null ? ex.awsErrorDetails().errorCode() : "";
        String category =
                switch (errorCode) {
                    case "AccessDenied", "AllAccessDisabled" -> StorageConnectionTestErrorCategories.ACCESS_DENIED;
                    case "NoSuchBucket" -> StorageConnectionTestErrorCategories.BUCKET_NOT_FOUND;
                    case "KMS.AccessDeniedException" -> StorageConnectionTestErrorCategories.KMS_ACCESS_DENIED;
                    default ->
                            isKmsMessage(ex)
                                    ? StorageConnectionTestErrorCategories.KMS_ACCESS_DENIED
                                    : StorageConnectionTestErrorCategories.ACCESS_DENIED;
                };
        return new StorageConnectionProbeException(category, ex.getMessage(), ex);
    }

    private static boolean isKmsMessage(S3Exception ex) {
        String message = ex.getMessage();
        return message != null && message.toLowerCase().contains("kms");
    }

    static byte[] probePayload() {
        return ("{\"probe\":true,\"timestamp\":\"" + Instant.now() + "\"}").getBytes(StandardCharsets.UTF_8);
    }
}
