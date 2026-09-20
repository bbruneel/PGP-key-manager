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

  it("treats unchecked rewrap checkbox as Mode A even if fields have leftover text", () => {
    const values = {
      ...defaultExportPrivateFormValues,
      confirmed: true,
      rewrapEnabled: false,
      passphrase: "should-be-ignored",
      newPassphrase: "should-be-ignored",
      confirmNewPassphrase: "should-be-ignored",
    }
    expect(isModeBExportAttempt(values)).toBe(false)
    expect(validateExportPrivateForm(values).valid).toBe(true)
    expect(buildExportPrivateRequest(values)).toEqual({})
  })

  it("requires passphrases when rewrap checkbox is checked", () => {
    const result = validateExportPrivateForm({
      ...defaultExportPrivateFormValues,
      confirmed: true,
      rewrapEnabled: true,
    })
    expect(result.valid).toBe(false)
    expect(result.fieldErrors.passphrase).toBeDefined()
    expect(result.fieldErrors.newPassphrase).toBeDefined()
    expect(result.fieldErrors.confirmNewPassphrase).toBeDefined()
  })

  it("enforces vault passphrase length on Mode B", () => {
    const result = validateExportPrivateForm({
      ...defaultExportPrivateFormValues,
      confirmed: true,
      rewrapEnabled: true,
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
      rewrapEnabled: true,
      passphrase: "vault-passphrase-1",
      newPassphrase: "transfer-pass-99",
      confirmNewPassphrase: "different-pass-1",
    })
    expect(result.valid).toBe(false)
    expect(result.fieldErrors.confirmNewPassphrase).toBeDefined()
  })

  it("builds Mode B request when checkbox is checked", () => {
    const values = {
      ...defaultExportPrivateFormValues,
      confirmed: true,
      rewrapEnabled: true,
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
