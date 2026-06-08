import type { CreatePgpKeyRequest } from "@/types/api"

export type CreateKeyFormValues = {
  label: string
  userName: string
  userEmail: string
  passphrase: string
  confirmPassphrase: string
  expiresAt: string
  algorithm: "ed25519"
  openpgpVersion: 4 | 6
}

export type CreateKeyFieldErrors = Partial<Record<keyof CreateKeyFormValues, string>>

export type CreateKeyValidationResult = {
  valid: boolean
  fieldErrors: CreateKeyFieldErrors
}

const LABEL_MAX_LENGTH = 128
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
  }

  if (values.userEmail.trim() && !EMAIL_PATTERN.test(values.userEmail.trim())) {
    fieldErrors.userEmail = "Enter a valid email address"
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

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
  }
}

export function buildCreateKeyRequest(values: CreateKeyFormValues): CreatePgpKeyRequest {
  const expiry = parseExpiryInstant(values.expiresAt)
  const request: CreatePgpKeyRequest = {
    algorithmSpec: { algorithm: values.algorithm },
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
