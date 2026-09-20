export type ExportPrivateFormValues = {
  confirmed: boolean
  /** When true, Mode B rewrap fields are required and sent. */
  rewrapEnabled: boolean
  /** Vault passphrase (Mode B). */
  passphrase: string
  /** Transfer passphrase for the downloaded file (Mode B). */
  newPassphrase: string
  /** Client-only confirm; not sent to the API. */
  confirmNewPassphrase: string
}

export type ExportPrivateFieldErrors = {
  confirmed?: string
  passphrase?: string
  newPassphrase?: string
  confirmNewPassphrase?: string
}

export const defaultExportPrivateFormValues: ExportPrivateFormValues = {
  confirmed: false,
  rewrapEnabled: false,
  passphrase: "",
  newPassphrase: "",
  confirmNewPassphrase: "",
}

const PASSPHRASE_MIN_LENGTH = 8
const PASSPHRASE_MAX_LENGTH = 256

export type ExportPrivateValidationResult =
  | { valid: true; fieldErrors: ExportPrivateFieldErrors }
  | { valid: false; fieldErrors: ExportPrivateFieldErrors }

function validatePassphraseLength(value: string, label: string): string | undefined {
  if (value.length < PASSPHRASE_MIN_LENGTH) {
    return `${label} must be at least ${PASSPHRASE_MIN_LENGTH} characters`
  }
  if (value.length > PASSPHRASE_MAX_LENGTH) {
    return `${label} must be at most ${PASSPHRASE_MAX_LENGTH} characters`
  }
  return undefined
}

/** True when Mode B rewrap checkbox is enabled. */
export function isModeBExportAttempt(values: ExportPrivateFormValues): boolean {
  return values.rewrapEnabled
}

/**
 * Mode A: confirm only (`rewrapEnabled` false) → empty body.
 * Mode B: checkbox on → require vault + transfer (8–256) + confirm match.
 */
export function validateExportPrivateForm(
  values: ExportPrivateFormValues,
): ExportPrivateValidationResult {
  const fieldErrors: ExportPrivateFieldErrors = {}
  if (!values.confirmed) {
    fieldErrors.confirmed =
      "Confirm that you understand this download is the full secret keyring for this identity"
  }

  if (values.rewrapEnabled) {
    const passphrase = values.passphrase.trim()
    const newPassphrase = values.newPassphrase.trim()
    const confirmNewPassphrase = values.confirmNewPassphrase.trim()

    if (!passphrase) {
      fieldErrors.passphrase = "Vault passphrase is required to export with a new passphrase"
    } else {
      const lengthError = validatePassphraseLength(passphrase, "Vault passphrase")
      if (lengthError) {
        fieldErrors.passphrase = lengthError
      }
    }

    if (!newPassphrase) {
      fieldErrors.newPassphrase =
        "New transfer passphrase is required to export with a new passphrase"
    } else {
      const lengthError = validatePassphraseLength(newPassphrase, "New transfer passphrase")
      if (lengthError) {
        fieldErrors.newPassphrase = lengthError
      }
    }

    if (newPassphrase && newPassphrase !== confirmNewPassphrase) {
      fieldErrors.confirmNewPassphrase = "Passphrases do not match"
    } else if (!confirmNewPassphrase) {
      fieldErrors.confirmNewPassphrase = "Confirm the new transfer passphrase"
    }
  }

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
  }
}

export function buildExportPrivateRequest(values: ExportPrivateFormValues): {
  passphrase?: string
  newPassphrase?: string
} {
  if (!values.rewrapEnabled) {
    return {}
  }
  return {
    passphrase: values.passphrase.trim(),
    newPassphrase: values.newPassphrase.trim(),
  }
}
