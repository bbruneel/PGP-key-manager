import type { RegisterPgpKeyRequest } from "@/types/api"

export type ImportMode = "public" | "private"

export type ImportKeyFormValues = {
  importMode: ImportMode
  label: string
  fingerprint: string
  armoredPublic: string
  encryptedPrivateArmored: string
}

export type ImportKeyFieldErrors = Partial<Record<keyof ImportKeyFormValues, string>>

export type ImportKeyValidationResult = {
  valid: boolean
  fieldErrors: ImportKeyFieldErrors
}

const LABEL_MAX_LENGTH = 128
const FINGERPRINT_PATTERN = /^[0-9A-Fa-f]{16,40}$/

/** Strip whitespace and colons so pasted `gpg --fingerprint` output validates. */
export function normalizeFingerprint(value: string): string {
  return value.replace(/[\s:]/g, "")
}
const PUBLIC_ARMOR_HEADER = "BEGIN PGP PUBLIC KEY BLOCK"
const PRIVATE_ARMOR_HEADERS = ["BEGIN PGP PRIVATE KEY BLOCK", "BEGIN PGP SECRET KEY BLOCK"] as const

export function defaultImportKeyFormValues(): ImportKeyFormValues {
  return {
    importMode: "public",
    label: "",
    fingerprint: "",
    armoredPublic: "",
    encryptedPrivateArmored: "",
  }
}

function containsArmorHeader(value: string, headers: readonly string[]): boolean {
  return headers.some((header) => value.includes(header))
}

export function validateImportKeyForm(values: ImportKeyFormValues): ImportKeyValidationResult {
  const fieldErrors: ImportKeyFieldErrors = {}

  if (values.label.length > LABEL_MAX_LENGTH) {
    fieldErrors.label = `Label must be at most ${LABEL_MAX_LENGTH} characters`
  }

  const normalizedFingerprint = normalizeFingerprint(values.fingerprint)
  if (normalizedFingerprint && !FINGERPRINT_PATTERN.test(normalizedFingerprint)) {
    fieldErrors.fingerprint = "Enter a valid hex fingerprint (16–40 characters)"
  }

  const trimmedPublic = values.armoredPublic.trim()
  const trimmedPrivate = values.encryptedPrivateArmored.trim()

  if (values.importMode === "public") {
    if (!trimmedPublic) {
      fieldErrors.armoredPublic = "Armored public key block is required"
    } else if (!trimmedPublic.includes(PUBLIC_ARMOR_HEADER)) {
      fieldErrors.armoredPublic = "Paste a valid armored public key block"
    }
  } else {
    if (!trimmedPrivate) {
      fieldErrors.encryptedPrivateArmored = "Armored private key block is required"
    } else if (!containsArmorHeader(trimmedPrivate, PRIVATE_ARMOR_HEADERS)) {
      fieldErrors.encryptedPrivateArmored = "Paste a valid armored private or secret key block"
    }

    if (trimmedPublic && !trimmedPublic.includes(PUBLIC_ARMOR_HEADER)) {
      fieldErrors.armoredPublic = "Paste a valid armored public key block"
    }
  }

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
  }
}

/** True when a form edit invalidates a loaded keyring preview (armored material or import mode). */
export function shouldClearImportPreview(
  previous: ImportKeyFormValues,
  next: ImportKeyFormValues,
): boolean {
  return (
    previous.importMode !== next.importMode ||
    previous.armoredPublic !== next.armoredPublic ||
    previous.encryptedPrivateArmored !== next.encryptedPrivateArmored
  )
}

export function buildImportKeyRequest(values: ImportKeyFormValues): RegisterPgpKeyRequest {
  const request: RegisterPgpKeyRequest = {
    keyType: values.importMode,
  }

  const trimmedPublic = values.armoredPublic.trim()
  if (trimmedPublic) {
    request.armoredPublic = trimmedPublic
  }

  const normalizedFingerprint = normalizeFingerprint(values.fingerprint)
  if (normalizedFingerprint) {
    request.fingerprint = normalizedFingerprint.toUpperCase()
  }

  const label = values.label.trim()
  if (label) {
    request.label = label
  }

  if (values.importMode === "private") {
    request.encryptedPrivateArmored = values.encryptedPrivateArmored.trim()
  }

  return request
}
