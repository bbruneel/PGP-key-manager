import { describe, expect, it } from "vitest"

import {
  buildExportSshPrivateRequest,
  defaultExportSshPrivateFormValues,
  validateExportSshPrivateForm,
} from "@/lib/export-ssh-private-validation"

describe("export-ssh-private-validation", () => {
  it("rejects short passphrase and missing confirmation", () => {
    const result = validateExportSshPrivateForm(defaultExportSshPrivateFormValues())
    expect(result.valid).toBe(false)
    expect(result.fieldErrors.passphrase).toMatch(/at least 8/)
    expect(result.fieldErrors.confirmed).toBeTruthy()
  })

  it("accepts valid passphrase with confirmation", () => {
    const result = validateExportSshPrivateForm({
      passphrase: "vault-pass-123",
      confirmed: true,
    })
    expect(result.valid).toBe(true)
    expect(result.fieldErrors).toEqual({})
    expect(buildExportSshPrivateRequest({ passphrase: "vault-pass-123", confirmed: true })).toEqual({
      passphrase: "vault-pass-123",
    })
  })
})
