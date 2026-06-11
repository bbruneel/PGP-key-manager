import {
  buildAlgorithmSpec,
  defaultPrimaryAlgorithmValues,
  filterPrimaryAlgorithms,
  validateAlgorithmSpec,
  type OpenpgpVersion,
  type PrimaryAlgorithmId,
  type RsaKeySize,
  type NistCurve,
} from "@/lib/algorithm-spec"
import type { CreatePgpKeyRequest } from "@/types/api"

export type CreateKeyFormValues = {
  label: string
  userName: string
  userEmail: string
  passphrase: string
  confirmPassphrase: string
  expiresAt: string
  algorithm: PrimaryAlgorithmId
  keySize?: RsaKeySize
  curve?: NistCurve
  openpgpVersion: OpenpgpVersion
}

export type CreateKeyFieldErrors = Partial<Record<keyof CreateKeyFormValues, string>>

export type CreateKeyValidationResult = {
  valid: boolean
  fieldErrors: CreateKeyFieldErrors
}

const LABEL_MAX_LENGTH = 128
const USER_NAME_MAX_LENGTH = 256
const EMAIL_MAX_LENGTH = 254
const PASSPHRASE_MIN_LENGTH = 8
const PASSPHRASE_MAX_LENGTH = 256
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function defaultExpiryDate(): string {
  const date = new Date()
  date.setFullYear(date.getFullYear() + 2)
  return date.toISOString().slice(0, 10)
}

export function defaultCreateKeyFormValues(): CreateKeyFormValues {
  return {
    label: "",
    userName: "",
    userEmail: "",
    passphrase: "",
    confirmPassphrase: "",
    expiresAt: defaultExpiryDate(),
    algorithm: "ed25519",
    openpgpVersion: 4,
  }
}

function parseExpiryInstant(expiresAt: string): Date | null {
  if (!expiresAt) {
    return null
  }
  const parsed = new Date(`${expiresAt}T00:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function validateCreateKeyForm(values: CreateKeyFormValues): CreateKeyValidationResult {
  const fieldErrors: CreateKeyFieldErrors = {}

  if (values.label.length > LABEL_MAX_LENGTH) {
    fieldErrors.label = `Label must be at most ${LABEL_MAX_LENGTH} characters`
  }

  if (!values.userName.trim()) {
    fieldErrors.userName = "Name is required"
  } else if (values.userName.length > USER_NAME_MAX_LENGTH) {
    fieldErrors.userName = `Name must be at most ${USER_NAME_MAX_LENGTH} characters`
  }

  const trimmedEmail = values.userEmail.trim()
  if (trimmedEmail) {
    if (trimmedEmail.length > EMAIL_MAX_LENGTH) {
      fieldErrors.userEmail = `Email must be at most ${EMAIL_MAX_LENGTH} characters`
    } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
      fieldErrors.userEmail = "Enter a valid email address"
    }
  }

  if (values.passphrase.length < PASSPHRASE_MIN_LENGTH) {
    fieldErrors.passphrase = `Passphrase must be at least ${PASSPHRASE_MIN_LENGTH} characters`
  } else if (values.passphrase.length > PASSPHRASE_MAX_LENGTH) {
    fieldErrors.passphrase = `Passphrase must be at most ${PASSPHRASE_MAX_LENGTH} characters`
  }

  if (values.passphrase !== values.confirmPassphrase) {
    fieldErrors.confirmPassphrase = "Passphrases do not match"
  }

  const expiry = parseExpiryInstant(values.expiresAt)
  if (!expiry) {
    fieldErrors.expiresAt = "Expiry date is required"
  } else if (expiry.getTime() <= Date.now()) {
    fieldErrors.expiresAt = "Expiry date must be in the future"
  }

  const algorithmValidation = validateAlgorithmSpec(
    ["certify", "sign"],
    values,
    "primary",
    values.openpgpVersion,
  )
  if (!algorithmValidation.valid) {
    fieldErrors.algorithm = algorithmValidation.error
  }

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
  }
}

export function buildCreateKeyRequest(values: CreateKeyFormValues): CreatePgpKeyRequest {
  const expiry = parseExpiryInstant(values.expiresAt)
  const request: CreatePgpKeyRequest = {
    algorithmSpec: buildAlgorithmSpec(values),
    userIds: [
      {
        name: values.userName.trim(),
        ...(values.userEmail.trim() ? { email: values.userEmail.trim() } : {}),
      },
    ],
    validity: { expiresAt: expiry!.toISOString() },
    passphrase: values.passphrase,
    openpgpVersion: values.openpgpVersion,
  }

  const label = values.label.trim()
  if (label) {
    request.label = label
  }

  return request
}

export function applyPrimaryAlgorithmChange(
  values: CreateKeyFormValues,
  algorithm: PrimaryAlgorithmId,
): CreateKeyFormValues {
  const allowed = filterPrimaryAlgorithms(values.openpgpVersion)
  if (!allowed.some((option) => option.id === algorithm)) {
    return { ...values, ...defaultPrimaryAlgorithmValues("ed25519") }
  }
  return { ...values, ...defaultPrimaryAlgorithmValues(algorithm) }
}

export function applyOpenpgpVersionChange(
  values: CreateKeyFormValues,
  openpgpVersion: OpenpgpVersion,
): CreateKeyFormValues {
  const next = { ...values, openpgpVersion }
  const allowed = filterPrimaryAlgorithms(openpgpVersion)
  if (!allowed.some((option) => option.id === next.algorithm)) {
    return { ...next, ...defaultPrimaryAlgorithmValues("ed25519") }
  }
  return next
}
