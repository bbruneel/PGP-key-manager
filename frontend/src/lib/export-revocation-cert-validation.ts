import type { RevokeKeyRequest } from "@/types/api"
import {
  defaultRevokeKeyFormValues,
  validateRevokeKeyForm,
  buildRevokeKeyRequest,
  type RevokeKeyFieldErrors,
  type RevokeKeyFormValues,
  type RevokeKeyValidationResult,
} from "@/lib/revoke-key-validation"

export type ExportRevocationCertFormValues = RevokeKeyFormValues
export type ExportRevocationCertFieldErrors = RevokeKeyFieldErrors

export function defaultExportRevocationCertFormValues(): ExportRevocationCertFormValues {
  return defaultRevokeKeyFormValues()
}

export function validateExportRevocationCertForm(
  values: ExportRevocationCertFormValues,
): RevokeKeyValidationResult {
  // Generate always requires passphrase (private material required by API).
  return validateRevokeKeyForm(values, { requiresPassphrase: true })
}

export function buildExportRevocationCertRequest(
  values: ExportRevocationCertFormValues,
): RevokeKeyRequest {
  return buildRevokeKeyRequest(values)
}
