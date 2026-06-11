import { describe, expect, it } from "vitest"

import {
  buildImportKeyRequest,
  defaultImportKeyFormValues,
  normalizeFingerprint,
  shouldClearImportPreview,
  validateImportKeyForm,
  type ImportKeyFormValues,
} from "@/lib/import-key-validation"

const SAMPLE_PUBLIC_ARMOR = `-----BEGIN PGP PUBLIC KEY BLOCK-----
Version: Test

mQENBGexample
-----END PGP PUBLIC KEY BLOCK-----`

const SAMPLE_PRIVATE_ARMOR = `-----BEGIN PGP PRIVATE KEY BLOCK-----
Version: Test

hQEMAexample
-----END PGP PRIVATE KEY BLOCK-----`

const VALID_FINGERPRINT = "DEADBEEF0123456789ABCDEF0123456789ABCD"

function validValues(overrides: Partial<ImportKeyFormValues> = {}): ImportKeyFormValues {
  return {
    ...defaultImportKeyFormValues(),
    fingerprint: VALID_FINGERPRINT,
    armoredPublic: SAMPLE_PUBLIC_ARMOR,
    ...overrides,
  }
}

describe("validateImportKeyForm", () => {
  it("accepts a valid public import form", () => {
    const result = validateImportKeyForm(validValues({ importMode: "public" }))
    expect(result.valid).toBe(true)
    expect(result.fieldErrors).toEqual({})
  })

  it("accepts a valid private import form", () => {
    const result = validateImportKeyForm(
      validValues({
        importMode: "private",
        encryptedPrivateArmored: SAMPLE_PRIVATE_ARMOR,
      }),
    )
    expect(result.valid).toBe(true)
    expect(result.fieldErrors).toEqual({})
  })

  it("accepts blank fingerprint", () => {
    const result = validateImportKeyForm(validValues({ fingerprint: "  " }))
    expect(result.valid).toBe(true)
    expect(result.fieldErrors.fingerprint).toBeUndefined()
  })

  it("rejects invalid fingerprint format", () => {
    const result = validateImportKeyForm(validValues({ fingerprint: "not-hex!" }))
    expect(result.valid).toBe(false)
    expect(result.fieldErrors.fingerprint).toBeDefined()
  })

  it("rejects fingerprint shorter than 16 hex chars", () => {
    const result = validateImportKeyForm(validValues({ fingerprint: "ABCDEF012345678" }))
    expect(result.valid).toBe(false)
    expect(result.fieldErrors.fingerprint).toBeDefined()
  })

  it("accepts gpg-style spaced fingerprint", () => {
    const spaced = "DEAD BEEF 0123 4567 89AB CDEF 0123 4567 89AB CD"
    const result = validateImportKeyForm(validValues({ fingerprint: spaced }))
    expect(result.valid).toBe(true)
    expect(normalizeFingerprint(spaced)).toBe(VALID_FINGERPRINT)
  })

  it("rejects missing armored public block", () => {
    const result = validateImportKeyForm(validValues({ armoredPublic: "" }))
    expect(result.valid).toBe(false)
    expect(result.fieldErrors.armoredPublic).toBeDefined()
  })

  it("rejects armored public without PGP header", () => {
    const result = validateImportKeyForm(validValues({ armoredPublic: "not a pgp block" }))
    expect(result.valid).toBe(false)
    expect(result.fieldErrors.armoredPublic).toBeDefined()
  })

  it("requires encrypted private armored block in private mode", () => {
    const result = validateImportKeyForm(
      validValues({ importMode: "private", encryptedPrivateArmored: "" }),
    )
    expect(result.valid).toBe(false)
    expect(result.fieldErrors.encryptedPrivateArmored).toBeDefined()
  })

  it("accepts private-only import without armored public block", () => {
    const result = validateImportKeyForm(
      validValues({
        importMode: "private",
        armoredPublic: "",
        encryptedPrivateArmored: SAMPLE_PRIVATE_ARMOR,
      }),
    )
    expect(result.valid).toBe(true)
    expect(result.fieldErrors.armoredPublic).toBeUndefined()
  })

  it("rejects invalid optional armored public block in private mode", () => {
    const result = validateImportKeyForm(
      validValues({
        importMode: "private",
        armoredPublic: "not a pgp block",
        encryptedPrivateArmored: SAMPLE_PRIVATE_ARMOR,
      }),
    )
    expect(result.valid).toBe(false)
    expect(result.fieldErrors.armoredPublic).toBeDefined()
  })

  it("accepts secret key block header in private mode", () => {
    const secretArmor = `-----BEGIN PGP SECRET KEY BLOCK-----
Version: Test

hQEMAexample
-----END PGP SECRET KEY BLOCK-----`
    const result = validateImportKeyForm(
      validValues({ importMode: "private", encryptedPrivateArmored: secretArmor }),
    )
    expect(result.valid).toBe(true)
  })

  it("rejects private armored block without PGP header", () => {
    const result = validateImportKeyForm(
      validValues({ importMode: "private", encryptedPrivateArmored: "not a pgp block" }),
    )
    expect(result.valid).toBe(false)
    expect(result.fieldErrors.encryptedPrivateArmored).toBeDefined()
  })

  it("rejects label longer than 128 characters", () => {
    const result = validateImportKeyForm(validValues({ label: "a".repeat(129) }))
    expect(result.valid).toBe(false)
    expect(result.fieldErrors.label).toBeDefined()
  })
})

describe("shouldClearImportPreview", () => {
  it("returns false when only label or fingerprint changes", () => {
    const base = validValues()
    expect(shouldClearImportPreview(base, { ...base, label: "Work key" })).toBe(false)
    expect(
      shouldClearImportPreview(base, {
        ...base,
        fingerprint: "ABCD1234EFGH5678IJKL9012MNOP3456QRST",
      }),
    ).toBe(false)
  })

  it("returns true when armored material or import mode changes", () => {
    const base = validValues()
    expect(shouldClearImportPreview(base, { ...base, armoredPublic: "changed" })).toBe(true)
    expect(
      shouldClearImportPreview(base, {
        ...base,
        importMode: "private",
        encryptedPrivateArmored: SAMPLE_PRIVATE_ARMOR,
      }),
    ).toBe(true)
    expect(
      shouldClearImportPreview(
        validValues({ importMode: "private", encryptedPrivateArmored: SAMPLE_PRIVATE_ARMOR }),
        {
          ...validValues({ importMode: "private", encryptedPrivateArmored: SAMPLE_PRIVATE_ARMOR }),
          encryptedPrivateArmored: "changed",
        },
      ),
    ).toBe(true)
  })
})

describe("buildImportKeyRequest", () => {
  it("maps public import form to register-only CreatePgpKeyRequest", () => {
    const request = buildImportKeyRequest(
      validValues({
        importMode: "public",
        label: "Imported public",
        fingerprint: "deadbeef0123456789abcdef0123456789abcd",
      }),
    )

    expect(request).toEqual({
      label: "Imported public",
      fingerprint: "DEADBEEF0123456789ABCDEF0123456789ABCD",
      keyType: "public",
      armoredPublic: SAMPLE_PUBLIC_ARMOR,
    })
    expect(request).not.toHaveProperty("passphrase")
    expect(request).not.toHaveProperty("algorithmSpec")
    expect(request).not.toHaveProperty("openpgpVersion")
    expect(request).not.toHaveProperty("userIds")
    expect(request).not.toHaveProperty("validity")
  })

  it("maps private import form with encrypted private armored", () => {
    const request = buildImportKeyRequest(
      validValues({
        importMode: "private",
        encryptedPrivateArmored: SAMPLE_PRIVATE_ARMOR,
      }),
    )

    expect(request).toEqual({
      fingerprint: VALID_FINGERPRINT,
      keyType: "private",
      armoredPublic: SAMPLE_PUBLIC_ARMOR,
      encryptedPrivateArmored: SAMPLE_PRIVATE_ARMOR,
    })
    expect(request).not.toHaveProperty("passphrase")
    expect(request).not.toHaveProperty("algorithmSpec")
  })

  it("omits armored public when blank in private mode", () => {
    const request = buildImportKeyRequest(
      validValues({
        importMode: "private",
        armoredPublic: "",
        fingerprint: "",
        encryptedPrivateArmored: SAMPLE_PRIVATE_ARMOR,
      }),
    )

    expect(request).toEqual({
      keyType: "private",
      encryptedPrivateArmored: SAMPLE_PRIVATE_ARMOR,
    })
    expect(request).not.toHaveProperty("armoredPublic")
    expect(request).not.toHaveProperty("fingerprint")
  })

  it("omits label when blank", () => {
    const request = buildImportKeyRequest(validValues({ label: "  " }))
    expect(request.label).toBeUndefined()
  })

  it("omits fingerprint when blank", () => {
    const request = buildImportKeyRequest(validValues({ fingerprint: "  " }))
    expect(request.fingerprint).toBeUndefined()
    expect(request.keyType).toBe("public")
    expect(request.armoredPublic).toBe(SAMPLE_PUBLIC_ARMOR)
  })
})
