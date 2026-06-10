import { describe, expect, it } from "vitest"

import {
  buildAlgorithmSpec,
  defaultAlgorithmForCapabilities,
  filterAlgorithmsForCapabilities,
  isAlgorithmAllowedForCapabilities,
  normalizeAlgorithmSelection,
  validateAlgorithmSpec,
  type AlgorithmFormValues,
} from "@/lib/algorithm-spec"

describe("filterAlgorithmsForCapabilities", () => {
  it("offers encrypt algorithms for encrypt capability", () => {
    const options = filterAlgorithmsForCapabilities(["encrypt"], 4)
    expect(options.map((item) => item.id)).toEqual(["cv25519", "ecdh", "rsa"])
  })

  it("offers sign algorithms for sign capability", () => {
    const options = filterAlgorithmsForCapabilities(["sign"], 4)
    expect(options.map((item) => item.id)).toEqual(["ed25519", "ecdsa", "rsa"])
  })

  it("hides ed448 and x448 when openpgpVersion is 4", () => {
    const options = filterAlgorithmsForCapabilities(["sign", "encrypt"], 4)
    expect(options.map((item) => item.id)).not.toContain("ed448")
    expect(options.map((item) => item.id)).not.toContain("x448")
  })

  it("includes ed448 and x448 when openpgpVersion is 6", () => {
    const options = filterAlgorithmsForCapabilities(["sign", "encrypt"], 6)
    expect(options.map((item) => item.id)).toContain("ed448")
    expect(options.map((item) => item.id)).toContain("x448")
  })

  it("offers primary algorithms excluding encryption-only options", () => {
    const options = filterAlgorithmsForCapabilities(["certify", "sign"], 4, "primary")
    expect(options.map((item) => item.id)).toEqual(["ed25519", "ecdsa", "rsa"])
  })
})

describe("defaultAlgorithmForCapabilities", () => {
  it("defaults encrypt to cv25519", () => {
    expect(defaultAlgorithmForCapabilities(["encrypt"], 4)).toBe("cv25519")
  })

  it("defaults sign to ed25519", () => {
    expect(defaultAlgorithmForCapabilities(["sign"], 4)).toBe("ed25519")
  })

  it("defaults primary to ed25519", () => {
    expect(defaultAlgorithmForCapabilities(["certify", "sign"], 4, "primary")).toBe("ed25519")
  })
})

describe("validateAlgorithmSpec", () => {
  it("rejects encrypt with ed25519", () => {
    const result = validateAlgorithmSpec(
      ["encrypt"],
      { algorithm: "ed25519" },
      "subkey",
      4,
    )
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/encrypt/i)
  })

  it("rejects sign with cv25519", () => {
    const result = validateAlgorithmSpec(
      ["sign"],
      { algorithm: "cv25519" },
      "subkey",
      4,
    )
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/sign/i)
  })

  it("rejects rsa encrypt without keySize", () => {
    const result = validateAlgorithmSpec(
      ["encrypt"],
      { algorithm: "rsa" },
      "subkey",
      4,
    )
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/key size/i)
  })

  it("rejects ecdsa sign without curve", () => {
    const result = validateAlgorithmSpec(
      ["sign"],
      { algorithm: "ecdsa" },
      "subkey",
      4,
    )
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/curve/i)
  })

  it("rejects ed448 when openpgpVersion is 4", () => {
    const result = validateAlgorithmSpec(
      ["sign"],
      { algorithm: "ed448" },
      "subkey",
      4,
    )
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/OpenPGP v6/i)
  })

  it("accepts rsa encrypt subkey with keySize", () => {
    const result = validateAlgorithmSpec(
      ["encrypt"],
      { algorithm: "rsa", keySize: 4096 },
      "subkey",
      4,
    )
    expect(result.valid).toBe(true)
  })

  it("accepts ecdsa sign subkey with curve", () => {
    const result = validateAlgorithmSpec(
      ["sign"],
      { algorithm: "ecdsa", curve: "P-256" },
      "subkey",
      4,
    )
    expect(result.valid).toBe(true)
  })

  it("rejects cv25519 primary", () => {
    const result = validateAlgorithmSpec(
      ["certify", "sign"],
      { algorithm: "cv25519" },
      "primary",
      4,
    )
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/primary/i)
  })
})

describe("buildAlgorithmSpec", () => {
  it("builds cv25519 spec without optional fields", () => {
    expect(buildAlgorithmSpec({ algorithm: "cv25519" })).toEqual({ algorithm: "cv25519" })
  })

  it("builds rsa spec with keySize", () => {
    expect(buildAlgorithmSpec({ algorithm: "rsa", keySize: 4096 })).toEqual({
      algorithm: "rsa",
      keySize: 4096,
    })
  })

  it("builds ecdh spec with curve", () => {
    expect(buildAlgorithmSpec({ algorithm: "ecdh", curve: "P-256" })).toEqual({
      algorithm: "ecdh",
      curve: "P-256",
    })
  })
})

describe("isAlgorithmAllowedForCapabilities", () => {
  it("returns false when algorithm is incompatible", () => {
    expect(isAlgorithmAllowedForCapabilities("ed25519", ["encrypt"], 4)).toBe(false)
  })

  it("returns true for allowed combination", () => {
    expect(isAlgorithmAllowedForCapabilities("cv25519", ["encrypt"], 4)).toBe(true)
  })
})

describe("normalizeAlgorithmSelection", () => {
  it("keeps valid selection", () => {
    const current: AlgorithmFormValues = {
      algorithm: "cv25519",
    }
    expect(normalizeAlgorithmSelection(current, ["encrypt"], 4)).toEqual(current)
  })

  it("resets invalid selection to default", () => {
    const current: AlgorithmFormValues = {
      algorithm: "ed25519",
    }
    expect(normalizeAlgorithmSelection(current, ["encrypt"], 4)).toEqual({
      algorithm: "cv25519",
    })
  })

  it("resets ed448 to ed25519 when switching to v4", () => {
    const current: AlgorithmFormValues = {
      algorithm: "ed448",
    }
    expect(normalizeAlgorithmSelection(current, ["sign"], 4, "primary")).toEqual({
      algorithm: "ed25519",
    })
  })
})
