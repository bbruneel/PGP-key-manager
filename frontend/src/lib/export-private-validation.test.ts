import { describe, expect, it } from "vitest"

import { isPrivateKeyringExportableKey } from "@/lib/private-keyring-export"
import {
  buildExportPrivateRequest,
  defaultExportPrivateFormValues,
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
