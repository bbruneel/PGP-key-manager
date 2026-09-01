import { describe, expect, it } from "vitest"

import { formatStorageConnectionTestError } from "@/lib/storage-connection-test-error"

describe("formatStorageConnectionTestError", () => {
  it("maps known error categories", () => {
    expect(formatStorageConnectionTestError("assume_role_denied")).toMatch(/trust policy/i)
  })

  it("falls back to message then unknown", () => {
    expect(formatStorageConnectionTestError(null, "Custom failure")).toBe("Custom failure")
    expect(formatStorageConnectionTestError("not-a-category")).toMatch(/unknown reason/i)
  })
})
