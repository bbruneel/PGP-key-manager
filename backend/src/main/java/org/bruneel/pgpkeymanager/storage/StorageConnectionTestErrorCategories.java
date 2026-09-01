package org.bruneel.pgpkeymanager.storage;

public final class StorageConnectionTestErrorCategories {

    public static final String ASSUME_ROLE_DENIED = "assume_role_denied";
    public static final String EXTERNAL_ID_MISMATCH = "external_id_mismatch";
    public static final String BUCKET_NOT_FOUND = "bucket_not_found";
    public static final String ACCESS_DENIED = "access_denied";
    public static final String KMS_ACCESS_DENIED = "kms_access_denied";
    public static final String NETWORK_ERROR = "network_error";
    public static final String AWS_DISABLED = "aws_disabled";
    public static final String UNKNOWN = "unknown";

    private StorageConnectionTestErrorCategories() {}
}
