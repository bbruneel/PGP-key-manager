import { describe, expect, it } from "vitest"

import {
  buildCreateKeyRequest,
  defaultCreateKeyFormValues,
  validateCreateKeyForm,
  type CreateKeyFormValues,
} from "@/lib/create-key-validation"

function validValues(overrides: Partial<CreateKeyFormValues> = {}): CreateKeyFormValues {
  return {
    ...defaultCreateKeyFormValues(),
    userName: "Jane Doe",
    userEmail: "jane@example.com",
    passphrase: "test-passphrase-1",
    confirmPassphrase: "test-passphrase-1",
    ...overrides,
  }
}

describe("validateCreateKeyForm", () => {
  it("accepts a valid form", () => {
    const result = validateCreateKeyForm(validValues())
    expect(result.valid).toBe(true)
    expect(result.fieldErrors).toEqual({})
  })

  it("rejects blank user name", () => {
    const result = validateCreateKeyForm(validValues({ userName: "  " }))
    expect(result.valid).toBe(false)
    expect(result.fieldErrors.userName).toBeDefined()
  })

  it("rejects invalid email when provided", () => {
    const result = validateCreateKeyForm(validValues({ userEmail: "not-an-email" }))
    expect(result.valid).toBe(false)
    expect(result.fieldErrors.userEmail).toBeDefined()
  })

  it("rejects passphrase shorter than 8 characters", () => {
    const result = validateCreateKeyForm(validValues({ passphrase: "short", confirmPassphrase: "short" }))
    expect(result.valid).toBe(false)
    expect(result.fieldErrors.passphrase).toBeDefined()
  })

  it("rejects mismatched passphrase confirmation", () => {
    const result = validateCreateKeyForm(
      validValues({ passphrase: "test-passphrase-1", confirmPassphrase: "different-pass" }),
    )
    expect(result.valid).toBe(false)
    expect(result.fieldErrors.confirmPassphrase).toBeDefined()
  })

  it("rejects label longer than 128 characters", () => {
    const result = validateCreateKeyForm(validValues({ label: "a".repeat(129) }))
    expect(result.valid).toBe(false)
    expect(result.fieldErrors.label).toBeDefined()
  })

  it("rejects user name longer than 256 characters", () => {
    const result = validateCreateKeyForm(validValues({ userName: "a".repeat(257) }))
    expect(result.valid).toBe(false)
    expect(result.fieldErrors.userName).toBeDefined()
  })

  it("rejects email longer than 254 characters", () => {
    const longLocal = "a".repeat(250)
    const result = validateCreateKeyForm(validValues({ userEmail: `${longLocal}@example.com` }))
    expect(result.valid).toBe(false)
    expect(result.fieldErrors.userEmail).toBeDefined()
  })

  it("rejects expiry in the past", () => {
    const result = validateCreateKeyForm(validValues({ expiresAt: "2020-01-01" }))
    expect(result.valid).toBe(false)
    expect(result.fieldErrors.expiresAt).toBeDefined()
  })

  it("accepts rsa 4096 primary in advanced options", () => {
    const result = validateCreateKeyForm(
      validValues({ algorithm: "rsa", keySize: 4096 }),
    )
    expect(result.valid).toBe(true)
  })

  it("accepts ecdsa primary with curve", () => {
    const result = validateCreateKeyForm(
      validValues({ algorithm: "ecdsa", curve: "P-384" }),
    )
    expect(result.valid).toBe(true)
  })

  it("rejects rsa primary without keySize", () => {
    const result = validateCreateKeyForm(validValues({ algorithm: "rsa" }))
    expect(result.valid).toBe(false)
    expect(result.fieldErrors.algorithm).toMatch(/key size/i)
  })
})

describe("buildCreateKeyRequest", () => {
  it("maps form values to CreatePgpKeyRequest", () => {
    const request = buildCreateKeyRequest(
      validValues({
        label: "Work key",
        userName: "Jane Doe",
        userEmail: "jane@example.com",
        passphrase: "test-passphrase-1",
        expiresAt: "2030-06-01",
        openpgpVersion: 6,
      }),
    )

    expect(request).toEqual({
      label: "Work key",
      algorithmSpec: { algorithm: "ed25519" },
      userIds: [{ name: "Jane Doe", email: "jane@example.com" }],
      validity: { expiresAt: "2030-06-01T00:00:00.000Z" },
      passphrase: "test-passphrase-1",
      openpgpVersion: 6,
    })
  })

  it("maps rsa primary algorithm spec", () => {
    const request = buildCreateKeyRequest(
      validValues({ algorithm: "rsa", keySize: 4096 }),
    )
    expect(request.algorithmSpec).toEqual({ algorithm: "rsa", keySize: 4096 })
  })

  it("omits label when blank", () => {
    const request = buildCreateKeyRequest(validValues({ label: "  " }))
    expect(request.label).toBeUndefined()
  })

  it("omits email when blank", () => {
    const request = buildCreateKeyRequest(validValues({ userEmail: "" }))
    expect(request.userIds?.[0]?.email).toBeUndefined()
  })

  it("includes ownerGroupId when provided", () => {
    const request = buildCreateKeyRequest(validValues(), {
      ownerGroupId: "2cfb1f20-10c9-4de0-b8dc-d89bbf3ab5d9",
    })
    expect(request.ownerGroupId).toBe("2cfb1f20-10c9-4de0-b8dc-d89bbf3ab5d9")
  })
})
