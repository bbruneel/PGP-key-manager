import { describe, expect, it } from "vitest"

import {
  isValidSubkeyCapabilitySet,
  SUBKEY_CAPABILITY_OPTIONS,
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
})
