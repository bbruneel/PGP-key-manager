export type ExportSshPrivateFormValues = {
  passphrase: string
  confirmed: boolean
}

export type ExportSshPrivateFieldErrors = Partial<Record<"passphrase" | "confirmed", string>>

export type ExportSshPrivateValidationResult = {
  valid: boolean
  fieldErrors: ExportSshPrivateFieldErrors
}

const PASSPHRASE_MIN_LENGTH = 8
const PASSPHRASE_MAX_LENGTH = 256

export function defaultExportSshPrivateFormValues(): ExportSshPrivateFormValues {
  return {
    passphrase: "",
    confirmed: false,
  }
}

export function validateExportSshPrivateForm(
  values: ExportSshPrivateFormValues,
): ExportSshPrivateValidationResult {
  const fieldErrors: ExportSshPrivateFieldErrors = {}

  if (values.passphrase.length < PASSPHRASE_MIN_LENGTH) {
    fieldErrors.passphrase = `Passphrase must be at least ${PASSPHRASE_MIN_LENGTH} characters`
  } else if (values.passphrase.length > PASSPHRASE_MAX_LENGTH) {
    fieldErrors.passphrase = `Passphrase must be at most ${PASSPHRASE_MAX_LENGTH} characters`
  }

  if (!values.confirmed) {
    fieldErrors.confirmed = "Confirm that you understand this download contains secret key material"
  }

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
  }
}

export function buildExportSshPrivateRequest(values: ExportSshPrivateFormValues): {
  passphrase: string
} {
  return { passphrase: values.passphrase }
}
