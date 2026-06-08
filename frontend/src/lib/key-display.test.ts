import { describe, expect, it } from "vitest"

import { formatCapabilities, formatKeyExpiry } from "@/lib/key-display"

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
