import { describe, expect, it } from "vitest"

import {
  isValidSubkeyCapabilitySet,
  SUBKEY_CAPABILITY_OPTIONS,
  toggleSubkeyCapability,
} from "@/lib/subkey-capabilities"

describe("SUBKEY_CAPABILITY_OPTIONS", () => {
  it("does not include certify", () => {
    expect(SUBKEY_CAPABILITY_OPTIONS).not.toContain("certify")
    expect(SUBKEY_CAPABILITY_OPTIONS).toEqual(["sign", "encrypt", "authenticate"])
  })
})

describe("isValidSubkeyCapabilitySet", () => {
  it("accepts sign-only capabilities", () => {
    expect(isValidSubkeyCapabilitySet(["sign"])).toBe(true)
  })

  it("rejects empty capabilities", () => {
    expect(isValidSubkeyCapabilitySet([])).toBe(false)
  })

  it("rejects certify", () => {
    expect(isValidSubkeyCapabilitySet(["certify"])).toBe(false)
    expect(isValidSubkeyCapabilitySet(["sign", "certify"])).toBe(false)
  })

  it("rejects encrypt and authenticate together", () => {
    expect(isValidSubkeyCapabilitySet(["encrypt", "authenticate"])).toBe(false)
  })
})

describe("toggleSubkeyCapability", () => {
  it("selecting authenticate removes encrypt", () => {
    expect(toggleSubkeyCapability(["encrypt"], "authenticate")).toEqual(["authenticate"])
  })

  it("selecting encrypt removes authenticate", () => {
    expect(toggleSubkeyCapability(["authenticate"], "encrypt")).toEqual(["encrypt"])
  })

  it("allows deselecting encrypt when authenticate remains", () => {
    expect(toggleSubkeyCapability(["encrypt", "authenticate"], "encrypt")).toEqual([
      "authenticate",
    ])
  })

  it("prevents removing the last capability", () => {
    expect(toggleSubkeyCapability(["encrypt"], "encrypt")).toBeNull()
  })
})
