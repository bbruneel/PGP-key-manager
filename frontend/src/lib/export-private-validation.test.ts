import { describe, expect, it } from "vitest"

import {
  buildExportPrivateRequest,
  defaultExportPrivateFormValues,
  validateExportPrivateForm,
} from "@/lib/export-private-validation"
import { isEncryptPrivateExportableKey } from "@/lib/encrypt-private-export"

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

describe("isEncryptPrivateExportableKey", () => {
  it("requires encrypt capability", () => {
    expect(isEncryptPrivateExportableKey(["authenticate"])).toBe(false)
    expect(isEncryptPrivateExportableKey(["encrypt"])).toBe(true)
  })
})
