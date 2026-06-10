import { isValidSubkeyCapabilitySet } from "@/lib/subkey-capabilities"
import type { CreateSubkeyRequest, PgpCapability } from "@/types/api"

export type CreateSubkeyAlgorithm = "ed25519" | "cv25519"

export type CreateSubkeyFormValues = {
  capabilities: PgpCapability[]
  algorithm: CreateSubkeyAlgorithm
  expiresAt: string
  passphrase: string
}

export type CreateSubkeyFieldErrors = Partial<Record<keyof CreateSubkeyFormValues, string>>

export type CreateSubkeyValidationResult = {
  valid: boolean
  fieldErrors: CreateSubkeyFieldErrors
}

const PASSPHRASE_MIN_LENGTH = 8
const PASSPHRASE_MAX_LENGTH = 256

function defaultExpiryDate(): string {
  const date = new Date()
  date.setFullYear(date.getFullYear() + 2)
  return date.toISOString().slice(0, 10)
}

export function defaultCreateSubkeyFormValues(): CreateSubkeyFormValues {
  return {
    capabilities: ["encrypt"],
    algorithm: "cv25519",
    expiresAt: defaultExpiryDate(),
    passphrase: "",
  }
}

function parseExpiryInstant(expiresAt: string): Date | null {
  if (!expiresAt) {
    return null
  }
  const parsed = new Date(`${expiresAt}T00:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function validateCreateSubkeyForm(values: CreateSubkeyFormValues): CreateSubkeyValidationResult {
  const fieldErrors: CreateSubkeyFieldErrors = {}

  if (!isValidSubkeyCapabilitySet(values.capabilities)) {
    fieldErrors.capabilities = values.capabilities.includes("certify")
      ? "Subkeys cannot include certify"
      : "Select at least one capability"
  }

  if (values.algorithm !== "ed25519" && values.algorithm !== "cv25519") {
    fieldErrors.algorithm = "Select a supported algorithm"
  }

  const expiry = parseExpiryInstant(values.expiresAt)
  if (!expiry) {
    fieldErrors.expiresAt = "Expiry date is required"
  } else if (expiry.getTime() <= Date.now()) {
    fieldErrors.expiresAt = "Expiry date must be in the future"
  }

  if (values.passphrase.length < PASSPHRASE_MIN_LENGTH) {
    fieldErrors.passphrase = `Passphrase must be at least ${PASSPHRASE_MIN_LENGTH} characters`
  } else if (values.passphrase.length > PASSPHRASE_MAX_LENGTH) {
    fieldErrors.passphrase = `Passphrase must be at most ${PASSPHRASE_MAX_LENGTH} characters`
  }

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
  }
}

export function buildCreateSubkeyRequest(values: CreateSubkeyFormValues): CreateSubkeyRequest {
  const expiry = parseExpiryInstant(values.expiresAt)!
  return {
    capabilities: values.capabilities,
    algorithm: { algorithm: values.algorithm },
    validity: { expiresAt: expiry.toISOString() },
    passphrase: values.passphrase,
  }
}
