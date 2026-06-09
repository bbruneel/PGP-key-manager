import type { RevokeKeyRequest } from "@/types/api"

export const REVOCATION_REASONS = [
  "no_reason",
  "key_superseded",
  "key_compromised",
  "key_retired",
  "user_id_invalid",
] as const

export type RevocationReason = (typeof REVOCATION_REASONS)[number]

export type RevokeKeyFormValues = {
  reason: RevocationReason
  description: string
  passphrase: string
}

export type RevokeKeyFieldErrors = Partial<Record<keyof RevokeKeyFormValues, string>>

export type RevokeKeyValidationResult = {
  valid: boolean
  fieldErrors: RevokeKeyFieldErrors
}

export type RevokeKeyValidationContext = {
  requiresPassphrase: boolean
}

const PASSPHRASE_MIN_LENGTH = 8
const PASSPHRASE_MAX_LENGTH = 256

export function defaultRevokeKeyFormValues(): RevokeKeyFormValues {
  return {
    reason: "key_retired",
    description: "",
    passphrase: "",
  }
}

export function validateRevokeKeyForm(
  values: RevokeKeyFormValues,
  context: RevokeKeyValidationContext,
): RevokeKeyValidationResult {
  const fieldErrors: RevokeKeyFieldErrors = {}

  if (!REVOCATION_REASONS.includes(values.reason)) {
    fieldErrors.reason = "Select a revocation reason"
  }

  if (context.requiresPassphrase) {
    if (values.passphrase.length < PASSPHRASE_MIN_LENGTH) {
      fieldErrors.passphrase = `Passphrase must be at least ${PASSPHRASE_MIN_LENGTH} characters`
    } else if (values.passphrase.length > PASSPHRASE_MAX_LENGTH) {
      fieldErrors.passphrase = `Passphrase must be at most ${PASSPHRASE_MAX_LENGTH} characters`
    }
  }

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
  }
}

export function buildRevokeKeyRequest(values: RevokeKeyFormValues): RevokeKeyRequest {
  const request: RevokeKeyRequest = {
    reason: values.reason,
  }

  const description = values.description.trim()
  if (description) {
    request.description = description
  }

  if (values.passphrase) {
    request.passphrase = values.passphrase
  }

  return request
}
