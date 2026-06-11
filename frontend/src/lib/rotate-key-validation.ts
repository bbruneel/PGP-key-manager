import { isValidSubkeyCapabilitySet } from "@/lib/subkey-capabilities"
import {
  buildAlgorithmSpec,
  defaultAlgorithmForCapabilities,
  validateAlgorithmSpec,
  type AlgorithmFormValues,
  type OpenpgpVersion,
} from "@/lib/algorithm-spec"
import type { PgpCapability, RotateKeyRequest } from "@/types/api"

export type RotateKeyFormValues = AlgorithmFormValues & {
  capabilities: PgpCapability[]
  expiresAt: string
  revokePrevious: boolean
  passphrase: string
}

export type RotateKeyFieldErrors = Partial<Record<keyof RotateKeyFormValues, string>>

export type RotateKeyValidationResult = {
  valid: boolean
  fieldErrors: RotateKeyFieldErrors
}

const PASSPHRASE_MIN_LENGTH = 8
const PASSPHRASE_MAX_LENGTH = 256

function defaultExpiryDate(): string {
  const date = new Date()
  date.setFullYear(date.getFullYear() + 2)
  return date.toISOString().slice(0, 10)
}

export function defaultRotateKeyFormValues(openpgpVersion: OpenpgpVersion = 4): RotateKeyFormValues {
  return {
    capabilities: ["encrypt"],
    algorithm: defaultAlgorithmForCapabilities(["encrypt"], openpgpVersion),
    expiresAt: defaultExpiryDate(),
    revokePrevious: true,
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

export function validateRotateKeyForm(
  values: RotateKeyFormValues,
  openpgpVersion: OpenpgpVersion = 4,
): RotateKeyValidationResult {
  const fieldErrors: RotateKeyFieldErrors = {}

  if (!isValidSubkeyCapabilitySet(values.capabilities)) {
    if (values.capabilities.includes("certify")) {
      fieldErrors.capabilities = "Subkeys cannot include certify"
    } else if (
      values.capabilities.includes("encrypt") &&
      values.capabilities.includes("authenticate")
    ) {
      fieldErrors.capabilities =
        "Use separate subkeys for encryption and authentication (select one of encrypt or authenticate)"
    } else {
      fieldErrors.capabilities = "Select at least one capability"
    }
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

export function buildRotateKeyRequest(values: RotateKeyFormValues): RotateKeyRequest {
  const expiry = parseExpiryInstant(values.expiresAt)!
  const request: RotateKeyRequest = {
    capabilities: values.capabilities,
    algorithm: buildAlgorithmSpec(values),
    validity: { expiresAt: expiry.toISOString() },
    revokePrevious: values.revokePrevious,
  }

  if (values.passphrase) {
    request.passphrase = values.passphrase
  }

  return request
}
