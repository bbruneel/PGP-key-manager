export type ExportPrivateFormValues = {
  confirmed: boolean
  /** Reserved for Mode B vault unlock — unused in Mode A. */
  passphrase: string
  /** Reserved for Mode B transfer rewrap — unused in Mode A. */
  newPassphrase: string
}

export type ExportPrivateFieldErrors = {
  confirmed?: string
  passphrase?: string
  newPassphrase?: string
}

export const defaultExportPrivateFormValues: ExportPrivateFormValues = {
  confirmed: false,
  passphrase: "",
  newPassphrase: "",
}

export type ExportPrivateValidationResult =
  | { valid: true; fieldErrors: ExportPrivateFieldErrors }
  | { valid: false; fieldErrors: ExportPrivateFieldErrors }

/** Mode A: confirm only. Mode B will require passphrase (+ optional newPassphrase). */
export function validateExportPrivateForm(
  values: ExportPrivateFormValues,
): ExportPrivateValidationResult {
  const fieldErrors: ExportPrivateFieldErrors = {}
  if (!values.confirmed) {
    fieldErrors.confirmed =
      "Confirm that you understand this download is the full secret keyring for this identity"
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
  // Mode A: empty body. Mode B will send passphrase fields from the same form values.
  void values
  return {}
}
