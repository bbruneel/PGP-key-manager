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

  it("rejects expiry in the past", () => {
    const result = validateCreateKeyForm(validValues({ expiresAt: "2020-01-01" }))
    expect(result.valid).toBe(false)
    expect(result.fieldErrors.expiresAt).toBeDefined()
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

  it("omits label when blank", () => {
    const request = buildCreateKeyRequest(validValues({ label: "  " }))
    expect(request.label).toBeUndefined()
  })

  it("omits email when blank", () => {
    const request = buildCreateKeyRequest(validValues({ userEmail: "" }))
    expect(request.userIds?.[0]?.email).toBeUndefined()
  })
})
