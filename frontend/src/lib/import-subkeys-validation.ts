export type ImportSubkeysFormValues = Record<string, never>

export type ImportSubkeysFieldErrors = Record<string, never>

export function defaultImportSubkeysFormValues(): ImportSubkeysFormValues {
  return {}
}

export function validateImportSubkeysForm(): { valid: true } {
  return { valid: true }
}
