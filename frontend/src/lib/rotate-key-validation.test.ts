import { describe, expect, it } from "vitest"

import {
  buildRotateKeyRequest,
  defaultRotateKeyFormValues,
  validateRotateKeyForm,
} from "@/lib/rotate-key-validation"
import type { PgpCapability } from "@/types/api"

describe("validateRotateKeyForm", () => {
  it("requires at least one capability", () => {
    const values = { ...defaultRotateKeyFormValues(), capabilities: [] }
    const result = validateRotateKeyForm(values)
    expect(result.valid).toBe(false)
    expect(result.fieldErrors.capabilities).toBeDefined()
  })

  it("rejects certify capability", () => {
    const values = {
      ...defaultRotateKeyFormValues(),
      capabilities: ["certify", "sign"] as PgpCapability[],
    }
    const result = validateRotateKeyForm(values)
    expect(result.valid).toBe(false)
    expect(result.fieldErrors.capabilities).toMatch(/certify/i)
  })

  it("rejects encrypt with ed25519", () => {
    const values = {
      ...defaultRotateKeyFormValues(),
      algorithm: "ed25519" as const,
      passphrase: "valid-passphrase",
    }
    const result = validateRotateKeyForm(values)
    expect(result.valid).toBe(false)
    expect(result.fieldErrors.algorithm).toMatch(/encrypt/i)
  })

  it("requires passphrase even when revokePrevious is false", () => {
    const values = { ...defaultRotateKeyFormValues(), revokePrevious: false, passphrase: "" }
    const result = validateRotateKeyForm(values)
    expect(result.valid).toBe(false)
    expect(result.fieldErrors.passphrase).toBeDefined()
  })

  it("accepts valid form with passphrase", () => {
    const values = { ...defaultRotateKeyFormValues(), passphrase: "valid-passphrase" }
    const result = validateRotateKeyForm(values)
    expect(result.valid).toBe(true)
  })

  it("accepts rsa encrypt rotate with keySize", () => {
    const values = {
      ...defaultRotateKeyFormValues(),
      algorithm: "rsa" as const,
      keySize: 4096 as const,
      passphrase: "valid-passphrase",
    }
    const result = validateRotateKeyForm(values)
    expect(result.valid).toBe(true)
  })
})

describe("buildRotateKeyRequest", () => {
  it("builds rotate request with defaults", () => {
    const request = buildRotateKeyRequest({
      capabilities: ["encrypt"],
      algorithm: "cv25519",
      expiresAt: "2031-06-01",
      revokePrevious: true,
      passphrase: "valid-passphrase",
    })

    expect(request).toEqual({
      capabilities: ["encrypt"],
      algorithm: { algorithm: "cv25519" },
      validity: { expiresAt: "2031-06-01T00:00:00.000Z" },
      revokePrevious: true,
      passphrase: "valid-passphrase",
    })
  })

  it("builds ecdh encrypt rotate request with curve", () => {
    const request = buildRotateKeyRequest({
      capabilities: ["encrypt"],
      algorithm: "ecdh",
      curve: "P-256",
      expiresAt: "2031-06-01",
      revokePrevious: true,
      passphrase: "valid-passphrase",
    })

    expect(request.algorithm).toEqual({ algorithm: "ecdh", curve: "P-256" })
  })
})
