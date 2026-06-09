import { describe, expect, it } from "vitest"

import {
  buildCreateSubkeyRequest,
  defaultCreateSubkeyFormValues,
  validateCreateSubkeyForm,
} from "@/lib/create-subkey-validation"

describe("validateCreateSubkeyForm", () => {
  it("accepts valid encrypt subkey", () => {
    const values = { ...defaultCreateSubkeyFormValues(), passphrase: "valid-passphrase" }
    const result = validateCreateSubkeyForm(values)
    expect(result.valid).toBe(true)
  })

  it("accepts valid sign subkey with ed25519", () => {
    const values = {
      ...defaultCreateSubkeyFormValues(),
      capabilities: ["sign" as const],
      algorithm: "ed25519" as const,
      passphrase: "valid-passphrase",
    }
    const result = validateCreateSubkeyForm(values)
    expect(result.valid).toBe(true)
  })

  it("rejects certify capability", () => {
    const values = {
      ...defaultCreateSubkeyFormValues(),
      capabilities: ["certify" as const, "sign" as const],
      passphrase: "valid-passphrase",
    }
    const result = validateCreateSubkeyForm(values)
    expect(result.valid).toBe(false)
    expect(result.fieldErrors.capabilities).toMatch(/certify/i)
  })

  it("rejects empty capabilities", () => {
    const values = { ...defaultCreateSubkeyFormValues(), capabilities: [], passphrase: "valid-passphrase" }
    const result = validateCreateSubkeyForm(values)
    expect(result.valid).toBe(false)
    expect(result.fieldErrors.capabilities).toBeDefined()
  })

  it("rejects past expiry", () => {
    const values = {
      ...defaultCreateSubkeyFormValues(),
      expiresAt: "2000-01-01",
      passphrase: "valid-passphrase",
    }
    const result = validateCreateSubkeyForm(values)
    expect(result.valid).toBe(false)
    expect(result.fieldErrors.expiresAt).toMatch(/future/i)
  })

  it("rejects short passphrase", () => {
    const values = { ...defaultCreateSubkeyFormValues(), passphrase: "short" }
    const result = validateCreateSubkeyForm(values)
    expect(result.valid).toBe(false)
    expect(result.fieldErrors.passphrase).toBeDefined()
  })
})

describe("buildCreateSubkeyRequest", () => {
  it("builds create subkey request", () => {
    const request = buildCreateSubkeyRequest({
      capabilities: ["encrypt"],
      algorithm: "cv25519",
      expiresAt: "2031-06-01",
      passphrase: "valid-passphrase",
    })

    expect(request).toEqual({
      capabilities: ["encrypt"],
      algorithm: { algorithm: "cv25519" },
      validity: { expiresAt: "2031-06-01T00:00:00.000Z" },
      passphrase: "valid-passphrase",
    })
  })
})
