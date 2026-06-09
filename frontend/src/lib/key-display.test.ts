import { describe, expect, it } from "vitest"

import {
  formatCapabilities,
  formatKeyExpiry,
  formatKeyStatus,
  formatRevokedAt,
  hasPrivateMaterial,
} from "@/lib/key-display"

describe("formatKeyExpiry", () => {
  it("returns Does not expire when expiresAt is null", () => {
    expect(formatKeyExpiry(null)).toBe("Does not expire")
    expect(formatKeyExpiry(undefined)).toBe("Does not expire")
  })

  it("formats a valid expiry date", () => {
    expect(formatKeyExpiry("2030-06-01T00:00:00Z")).toBe("Jun 1, 2030")
  })
})

describe("formatCapabilities", () => {
  it("joins capability labels", () => {
    expect(formatCapabilities(["certify", "sign"])).toBe("certify, sign")
  })

  it("defaults to certify when empty", () => {
    expect(formatCapabilities([])).toBe("certify")
  })
})

describe("formatKeyStatus", () => {
  it("maps status values to labels", () => {
    expect(formatKeyStatus("active")).toBe("Active")
    expect(formatKeyStatus("expired")).toBe("Expired")
    expect(formatKeyStatus("revoked")).toBe("Revoked")
    expect(formatKeyStatus(null)).toBe("Unknown")
  })
})

describe("formatRevokedAt", () => {
  it("returns null when revokedAt is missing", () => {
    expect(formatRevokedAt(null)).toBeNull()
  })

  it("formats a valid revoked date", () => {
    expect(formatRevokedAt("2030-06-01T00:00:00Z")).toBe("Jun 1, 2030")
  })
})

describe("hasPrivateMaterial", () => {
  it("returns true when encrypted private armored is present", () => {
    expect(hasPrivateMaterial({ encryptedPrivateArmored: "-----BEGIN PGP PRIVATE KEY BLOCK-----" })).toBe(
      true,
    )
  })

  it("returns true when keyType is private", () => {
    expect(hasPrivateMaterial({ keyType: "private" })).toBe(true)
  })

  it("returns false for public-only keys", () => {
    expect(hasPrivateMaterial({ keyType: "public" })).toBe(false)
  })
})
