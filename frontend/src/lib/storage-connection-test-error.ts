const TEST_ERROR_MESSAGES: Record<string, string> = {
  assume_role_denied: "Could not assume the IAM role. Check the trust policy and app role ARN.",
  external_id_mismatch: "External ID in the IAM trust policy does not match this connection.",
  bucket_not_found: "The S3 bucket was not found in the configured region.",
  access_denied: "Access denied writing or reading the probe object. Check S3 permissions on the prefix.",
  kms_access_denied: "KMS denied access for the probe object. Review key policy or use SSE-S3 for Phase 17b.",
  network_error: "Network error reaching AWS. Try again or check connectivity.",
  aws_disabled: "AWS storage integration is disabled on the server.",
  unknown: "Connection test failed for an unknown reason.",
}

export function formatStorageConnectionTestError(
  errorCategory: string | null | undefined,
  fallbackMessage?: string | null,
): string {
  if (errorCategory && TEST_ERROR_MESSAGES[errorCategory]) {
    return TEST_ERROR_MESSAGES[errorCategory]
  }
  if (fallbackMessage && fallbackMessage.trim().length > 0) {
    return fallbackMessage
  }
  return TEST_ERROR_MESSAGES.unknown
}
