export type ApplyRevocationCertFormValues = {
  armoredCertificate: string
  confirmed: boolean
}

export type ApplyRevocationCertFieldErrors = Partial<
  Record<keyof ApplyRevocationCertFormValues, string>
>

export type ApplyRevocationCertValidationResult = {
  valid: boolean
  fieldErrors: ApplyRevocationCertFieldErrors
}

export function defaultApplyRevocationCertFormValues(): ApplyRevocationCertFormValues {
  return {
    armoredCertificate: "",
    confirmed: false,
  }
}

export function validateApplyRevocationCertForm(
  values: ApplyRevocationCertFormValues,
): ApplyRevocationCertValidationResult {
  const fieldErrors: ApplyRevocationCertFieldErrors = {}
  const armor = values.armoredCertificate.trim()

  if (!armor) {
    fieldErrors.armoredCertificate = "Paste an armored revocation certificate"
  } else if (!armor.includes("BEGIN PGP")) {
    fieldErrors.armoredCertificate = "Certificate must be an armored OpenPGP block"
  }

  if (!values.confirmed) {
    fieldErrors.confirmed = "Confirm that you understand this will revoke the key"
  }

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
  }
}

export function buildApplyRevocationCertRequest(values: ApplyRevocationCertFormValues): {
  armoredCertificate: string
} {
  return { armoredCertificate: values.armoredCertificate.trim() }
}
