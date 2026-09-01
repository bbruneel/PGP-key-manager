package org.bruneel.pgpkeymanager.storage;

public interface AwsAssumeRoleClient {

    AwsSessionCredentials assumeRole(String roleArn, String externalId, String sessionName);
}
