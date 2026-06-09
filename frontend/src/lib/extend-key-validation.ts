import type { ExtendExpiryRequest } from "@/types/api"

export type ExtendExpiryFormValues = {
  expiresAt: string
  passphrase: string
}

export type ExtendExpiryFieldErrors = Partial<Record<keyof ExtendExpiryFormValues, string>>

export type ExtendExpiryValidationResult = {
  valid: boolean
  fieldErrors: ExtendExpiryFieldErrors
}

export type ExtendExpiryValidationContext = {
  requiresPassphrase: boolean
}

const PASSPHRASE_MIN_LENGTH = 8
const PASSPHRASE_MAX_LENGTH = 256

function defaultExpiryDate(): string {
  const date = new Date()
  date.setFullYear(date.getFullYear() + 2)
  return date.toISOString().slice(0, 10)
}

export function defaultExtendExpiryFormValues(): ExtendExpiryFormValues {
  return {
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

export function validateExtendExpiryForm(
  values: ExtendExpiryFormValues,
  context: ExtendExpiryValidationContext,
): ExtendExpiryValidationResult {
  const fieldErrors: ExtendExpiryFieldErrors = {}

  const expiry = parseExpiryInstant(values.expiresAt)
  if (!expiry) {
    fieldErrors.expiresAt = "Expiry date is required"
  } else if (expiry.getTime() <= Date.now()) {
    fieldErrors.expiresAt = "Expiry date must be in the future"
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

export function buildExtendExpiryRequest(values: ExtendExpiryFormValues): ExtendExpiryRequest {
  const expiry = parseExpiryInstant(values.expiresAt)!
  const request: ExtendExpiryRequest = {
    expiresAt: expiry.toISOString(),
  }

  if (values.passphrase) {
    request.passphrase = values.passphrase
  }

  return request
}
