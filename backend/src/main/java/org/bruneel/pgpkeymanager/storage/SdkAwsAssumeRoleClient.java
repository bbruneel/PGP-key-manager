package org.bruneel.pgpkeymanager.storage;

import org.springframework.stereotype.Component;

import software.amazon.awssdk.services.sts.StsClient;
import software.amazon.awssdk.services.sts.model.AssumeRoleRequest;
import software.amazon.awssdk.services.sts.model.StsException;

@Component
public class SdkAwsAssumeRoleClient implements AwsAssumeRoleClient {

    @Override
    public AwsSessionCredentials assumeRole(String roleArn, String externalId, String sessionName) {
        try (StsClient stsClient = StsClient.create()) {
            var response =
                    stsClient.assumeRole(
                            AssumeRoleRequest.builder()
                                    .roleArn(roleArn)
                                    .roleSessionName(sessionName)
                                    .externalId(externalId)
                                    .durationSeconds(900)
                                    .build());
            var credentials = response.credentials();
            return new AwsSessionCredentials(
                    credentials.accessKeyId(), credentials.secretAccessKey(), credentials.sessionToken());
        } catch (StsException ex) {
            throw mapStsException(ex);
        } catch (RuntimeException ex) {
            throw AwsStorageExceptionMapper.map(ex);
        }
    }

    static StorageConnectionProbeException mapStsException(StsException ex) {
        String errorCode = ex.awsErrorDetails() != null ? ex.awsErrorDetails().errorCode() : "";
        String category =
                switch (errorCode) {
                    case "AccessDenied" ->
                            looksLikeExternalIdMismatch(ex)
                                    ? StorageConnectionTestErrorCategories.EXTERNAL_ID_MISMATCH
                                    : StorageConnectionTestErrorCategories.ASSUME_ROLE_DENIED;
                    case "MalformedPolicyDocument", "ValidationError" ->
                            StorageConnectionTestErrorCategories.EXTERNAL_ID_MISMATCH;
                    default -> StorageConnectionTestErrorCategories.ASSUME_ROLE_DENIED;
                };
        return new StorageConnectionProbeException(category, ex.getMessage(), ex);
    }

    static boolean looksLikeExternalIdMismatch(StsException ex) {
        String message = ex.getMessage();
        if (message == null) {
            return false;
        }
        String lower = message.toLowerCase();
        return lower.contains("externalid")
                || lower.contains("external id")
                || lower.contains("sts:externalid");
    }
}
