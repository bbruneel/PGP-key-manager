import { describe, expect, it } from "vitest"

import {
  buildApplyRevocationCertRequest,
  defaultApplyRevocationCertFormValues,
  validateApplyRevocationCertForm,
} from "@/lib/apply-revocation-cert-validation"
import {
  buildExportRevocationCertRequest,
  defaultExportRevocationCertFormValues,
  validateExportRevocationCertForm,
} from "@/lib/export-revocation-cert-validation"

describe("export-revocation-cert-validation", () => {
  it("requires passphrase", () => {
    const result = validateExportRevocationCertForm({
      ...defaultExportRevocationCertFormValues(),
      passphrase: "short",
    })
    expect(result.valid).toBe(false)
    expect(result.fieldErrors.passphrase).toMatch(/at least/i)
  })

  it("builds request with reason and passphrase", () => {
    const body = buildExportRevocationCertRequest({
      reason: "key_compromised",
      description: "offline",
      passphrase: "long-enough-passphrase",
    })
    expect(body).toEqual({
      reason: "key_compromised",
      description: "offline",
      passphrase: "long-enough-passphrase",
    })
  })
})

describe("apply-revocation-cert-validation", () => {
  it("requires armor and confirm", () => {
    const result = validateApplyRevocationCertForm(defaultApplyRevocationCertFormValues())
    expect(result.valid).toBe(false)
    expect(result.fieldErrors.armoredCertificate).toBeTruthy()
    expect(result.fieldErrors.confirmed).toBeTruthy()
  })

  it("accepts armored block with confirm", () => {
    const values = {
      armoredCertificate: "-----BEGIN PGP PUBLIC KEY BLOCK-----\nabc\n-----END PGP PUBLIC KEY BLOCK-----",
      confirmed: true,
    }
    expect(validateApplyRevocationCertForm(values).valid).toBe(true)
    expect(buildApplyRevocationCertRequest(values).armoredCertificate).toContain("BEGIN PGP")
  })
})
