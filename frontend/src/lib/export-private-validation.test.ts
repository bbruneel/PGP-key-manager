import { describe, expect, it } from "vitest"

import { isPrivateKeyringExportableKey } from "@/lib/private-keyring-export"
import {
  buildExportPrivateRequest,
  defaultExportPrivateFormValues,
  isModeBExportAttempt,
  validateExportPrivateForm,
} from "@/lib/export-private-validation"

describe("validateExportPrivateForm", () => {
  it("requires confirmation", () => {
    const result = validateExportPrivateForm(defaultExportPrivateFormValues)
    expect(result.valid).toBe(false)
    expect(result.fieldErrors.confirmed).toBeDefined()
  })

  it("accepts confirmed Mode A form", () => {
    const result = validateExportPrivateForm({
      ...defaultExportPrivateFormValues,
      confirmed: true,
    })
    expect(result.valid).toBe(true)
    expect(buildExportPrivateRequest({ ...defaultExportPrivateFormValues, confirmed: true })).toEqual(
      {},
    )
  })

  it("treats empty rewrap disclosure as Mode A", () => {
    const values = {
      ...defaultExportPrivateFormValues,
      confirmed: true,
      rewrapOpen: true,
    }
    expect(isModeBExportAttempt(values)).toBe(false)
    expect(validateExportPrivateForm(values).valid).toBe(true)
    expect(buildExportPrivateRequest(values)).toEqual({})
  })

  it("requires both passphrases when Mode B fields are started", () => {
    const result = validateExportPrivateForm({
      ...defaultExportPrivateFormValues,
      confirmed: true,
      rewrapOpen: true,
      passphrase: "vault-passphrase-1",
    })
    expect(result.valid).toBe(false)
    expect(result.fieldErrors.newPassphrase).toBeDefined()
  })

  it("enforces vault passphrase length on Mode B", () => {
    const result = validateExportPrivateForm({
      ...defaultExportPrivateFormValues,
      confirmed: true,
      passphrase: "short",
      newPassphrase: "transfer-pass-99",
      confirmNewPassphrase: "transfer-pass-99",
    })
    expect(result.valid).toBe(false)
    expect(result.fieldErrors.passphrase).toMatch(/at least 8/)
  })

  it("requires confirm match for transfer passphrase", () => {
    const result = validateExportPrivateForm({
      ...defaultExportPrivateFormValues,
      confirmed: true,
      passphrase: "vault-passphrase-1",
      newPassphrase: "transfer-pass-99",
      confirmNewPassphrase: "different-pass-1",
    })
    expect(result.valid).toBe(false)
    expect(result.fieldErrors.confirmNewPassphrase).toBeDefined()
  })

  it("builds Mode B request with both passphrases", () => {
    const values = {
      ...defaultExportPrivateFormValues,
      confirmed: true,
      rewrapOpen: true,
      passphrase: "vault-passphrase-1",
      newPassphrase: "transfer-pass-99",
      confirmNewPassphrase: "transfer-pass-99",
    }
    expect(validateExportPrivateForm(values).valid).toBe(true)
    expect(buildExportPrivateRequest(values)).toEqual({
      passphrase: "vault-passphrase-1",
      newPassphrase: "transfer-pass-99",
    })
  })
})

describe("isPrivateKeyringExportableKey", () => {
  it("requires primary with private material and not revoked", () => {
    expect(
      isPrivateKeyringExportableKey({
        role: "subkey",
        hasPrivateMaterial: true,
        status: "active",
      }),
    ).toBe(false)
    expect(
      isPrivateKeyringExportableKey({
        role: "primary",
        hasPrivateMaterial: false,
        status: "active",
      }),
    ).toBe(false)
    expect(
      isPrivateKeyringExportableKey({
        role: "primary",
        hasPrivateMaterial: true,
        status: "revoked",
      }),
    ).toBe(false)
    expect(
      isPrivateKeyringExportableKey({
        role: "primary",
        hasPrivateMaterial: true,
        status: "active",
      }),
    ).toBe(true)
  })
})
