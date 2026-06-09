import { describe, expect, it } from "vitest"

import {
  buildExtendExpiryRequest,
  defaultExtendExpiryFormValues,
  validateExtendExpiryForm,
} from "@/lib/extend-key-validation"

describe("validateExtendExpiryForm", () => {
  it("rejects past expiry dates", () => {
    const values = { expiresAt: "2000-01-01", passphrase: "" }
    const result = validateExtendExpiryForm(values, { requiresPassphrase: false })
    expect(result.valid).toBe(false)
    expect(result.fieldErrors.expiresAt).toMatch(/future/)
  })

  it("requires passphrase when private material exists", () => {
    const values = defaultExtendExpiryFormValues()
    const result = validateExtendExpiryForm(values, { requiresPassphrase: true })
    expect(result.valid).toBe(false)
    expect(result.fieldErrors.passphrase).toBeDefined()
  })

  it("accepts valid form with passphrase when required", () => {
    const values = { ...defaultExtendExpiryFormValues(), passphrase: "valid-passphrase" }
    const result = validateExtendExpiryForm(values, { requiresPassphrase: true })
    expect(result.valid).toBe(true)
  })
})

describe("buildExtendExpiryRequest", () => {
  it("builds request with UTC midnight expiry", () => {
    const request = buildExtendExpiryRequest({
      expiresAt: "2031-06-01",
      passphrase: "valid-passphrase",
    })

    expect(request).toEqual({
      expiresAt: "2031-06-01T00:00:00.000Z",
      passphrase: "valid-passphrase",
    })
  })
})
