import type { UpdatePgpKeyRequest } from "@/types/api"

export type UpdateKeyLabelFormValues = {
  label: string
}

export type UpdateKeyLabelFieldErrors = Partial<Record<keyof UpdateKeyLabelFormValues, string>>

export type UpdateKeyLabelValidationResult = {
  valid: boolean
  fieldErrors: UpdateKeyLabelFieldErrors
}

const LABEL_MAX_LENGTH = 120

export function validateUpdateKeyLabelForm(
  values: UpdateKeyLabelFormValues,
): UpdateKeyLabelValidationResult {
  const fieldErrors: UpdateKeyLabelFieldErrors = {}
  const trimmed = values.label.trim()

  if (!trimmed) {
    fieldErrors.label = "Label is required. Clearing an existing label is not supported."
  } else if (trimmed.length > LABEL_MAX_LENGTH) {
    fieldErrors.label = `Label must be at most ${LABEL_MAX_LENGTH} characters.`
  }

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
  }
}

export function buildUpdateKeyLabelRequest(values: UpdateKeyLabelFormValues): UpdatePgpKeyRequest {
  return { label: values.label.trim() }
}
