import { isValidSubkeyCapabilitySet } from "@/lib/subkey-capabilities"
import {
  buildAlgorithmSpec,
  defaultAlgorithmForCapabilities,
  validateAlgorithmSpec,
  type AlgorithmFormValues,
  type OpenpgpVersion,
} from "@/lib/algorithm-spec"
import type { CreateSubkeyRequest, PgpCapability } from "@/types/api"

export type CreateSubkeyFormValues = AlgorithmFormValues & {
  capabilities: PgpCapability[]
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

export function defaultCreateSubkeyFormValues(openpgpVersion: OpenpgpVersion = 4): CreateSubkeyFormValues {
  return {
    capabilities: ["encrypt"],
    algorithm: defaultAlgorithmForCapabilities(["encrypt"], openpgpVersion),
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

export function validateCreateSubkeyForm(
  values: CreateSubkeyFormValues,
  openpgpVersion: OpenpgpVersion = 4,
): CreateSubkeyValidationResult {
  const fieldErrors: CreateSubkeyFieldErrors = {}

  if (!isValidSubkeyCapabilitySet(values.capabilities)) {
    fieldErrors.capabilities = values.capabilities.includes("certify")
      ? "Subkeys cannot include certify"
      : "Select at least one capability"
  }

  const algorithmValidation = validateAlgorithmSpec(
    values.capabilities,
    values,
    "subkey",
    openpgpVersion,
  )
  if (!algorithmValidation.valid) {
    fieldErrors.algorithm = algorithmValidation.error
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
    algorithm: buildAlgorithmSpec(values),
    validity: { expiresAt: expiry.toISOString() },
    passphrase: values.passphrase,
  }
}
