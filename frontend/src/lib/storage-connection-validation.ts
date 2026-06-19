export const DISPLAY_NAME_MAX = 128
export const REGION_MAX = 64
export const BUCKET_MAX = 255
export const PREFIX_MAX = 512
export const ROLE_ARN_MAX = 512

const ROLE_ARN_PATTERN = /^arn:aws:iam::[0-9]{12}:role\/.+$/

export type StorageConnectionFieldErrors = {
  displayName?: string
  region?: string
  bucket?: string
  prefix?: string
  roleArn?: string
}

export type StorageConnectionFormValues = {
  displayName: string
  region: string
  bucket: string
  prefix: string
  roleArn: string
}

export function validateStorageConnectionForm(
  values: StorageConnectionFormValues,
): StorageConnectionFieldErrors {
  const errors: StorageConnectionFieldErrors = {}
  const trimmedName = values.displayName.trim()
  if (!trimmedName) {
    errors.displayName = "Connection name is required"
  } else if (trimmedName.length > DISPLAY_NAME_MAX) {
    errors.displayName = `Connection name must be at most ${DISPLAY_NAME_MAX} characters`
  }
  if (!values.region.trim()) {
    errors.region = "Region is required"
  } else if (values.region.trim().length > REGION_MAX) {
    errors.region = `Region must be at most ${REGION_MAX} characters`
  }
  if (!values.bucket.trim()) {
    errors.bucket = "Bucket is required"
  } else if (values.bucket.trim().length > BUCKET_MAX) {
    errors.bucket = `Bucket must be at most ${BUCKET_MAX} characters`
  }
  if (values.prefix.trim().length > PREFIX_MAX) {
    errors.prefix = `Prefix must be at most ${PREFIX_MAX} characters`
  }
  if (!values.roleArn.trim()) {
    errors.roleArn = "IAM role ARN is required"
  } else if (values.roleArn.trim().length > ROLE_ARN_MAX) {
    errors.roleArn = `IAM role ARN must be at most ${ROLE_ARN_MAX} characters`
  } else if (!ROLE_ARN_PATTERN.test(values.roleArn.trim())) {
    errors.roleArn = "Enter a valid AWS IAM role ARN (arn:aws:iam::123456789012:role/RoleName)"
  }
  return errors
}
