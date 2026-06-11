import { describe, expect, it } from "vitest"

import { isSshExportableKey } from "@/lib/ssh-export"

describe("isSshExportableKey", () => {
  it("returns true for authenticate ed25519 subkey", () => {
    expect(isSshExportableKey(["authenticate"], "ed25519")).toBe(true)
  })

  it("returns false for encrypt-only subkey", () => {
    expect(isSshExportableKey(["encrypt"], "cv25519")).toBe(false)
  })

  it("returns false for sign-only subkey", () => {
    expect(isSshExportableKey(["sign"], "ed25519")).toBe(false)
  })

  it("returns false for ed448 authenticate subkey", () => {
    expect(isSshExportableKey(["authenticate"], "ed448")).toBe(false)
  })

  it("returns true for authenticate rsa subkey", () => {
    expect(isSshExportableKey(["authenticate"], "rsa")).toBe(true)
  })
})
