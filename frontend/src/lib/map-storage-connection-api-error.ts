import type { ApiError } from "@/lib/api-error"
import type { StorageConnectionFieldErrors } from "@/lib/storage-connection-validation"

const FIELD_NAMES = ["displayName", "region", "bucket", "prefix", "roleArn"] as const

type FieldName = (typeof FIELD_NAMES)[number]

function isFieldName(value: string): value is FieldName {
  return (FIELD_NAMES as readonly string[]).includes(value)
}

export function mapStorageConnectionApiError(error: ApiError): {
  fieldErrors: StorageConnectionFieldErrors
  bannerMessage: string | null
} {
  const fieldErrors: StorageConnectionFieldErrors = {}

  for (const item of error.fieldErrors) {
    if (item.field && item.message && isFieldName(item.field)) {
      fieldErrors[item.field] = item.message
    }
  }

  const hasFieldErrors = Object.keys(fieldErrors).length > 0
  return {
    fieldErrors,
    bannerMessage: hasFieldErrors ? null : error.detail,
  }
}
