import { describe, expect, it } from "vitest"

import {
  buildRevokeKeyRequest,
  defaultRevokeKeyFormValues,
  validateRevokeKeyForm,
} from "@/lib/revoke-key-validation"

describe("validateRevokeKeyForm", () => {
  it("accepts valid form without passphrase when not required", () => {
    const values = defaultRevokeKeyFormValues()
    const result = validateRevokeKeyForm(values, { requiresPassphrase: false })
    expect(result.valid).toBe(true)
  })

  it("requires passphrase when private material exists", () => {
    const values = { ...defaultRevokeKeyFormValues(), passphrase: "" }
    const result = validateRevokeKeyForm(values, { requiresPassphrase: true })
    expect(result.valid).toBe(false)
    expect(result.fieldErrors.passphrase).toMatch(/at least/)
  })

  it("accepts valid passphrase when required", () => {
    const values = { ...defaultRevokeKeyFormValues(), passphrase: "valid-passphrase" }
    const result = validateRevokeKeyForm(values, { requiresPassphrase: true })
    expect(result.valid).toBe(true)
  })
})

describe("buildRevokeKeyRequest", () => {
  it("builds request with reason and optional fields", () => {
    const request = buildRevokeKeyRequest({
      reason: "key_retired",
      description: "No longer needed",
      passphrase: "valid-passphrase",
    })

    expect(request).toEqual({
      reason: "key_retired",
      description: "No longer needed",
      passphrase: "valid-passphrase",
    })
  })

  it("omits empty description and passphrase", () => {
    const request = buildRevokeKeyRequest(defaultRevokeKeyFormValues())
    expect(request).toEqual({ reason: "key_retired" })
    expect(request).not.toHaveProperty("passphrase")
    expect(request).not.toHaveProperty("description")
  })
})
