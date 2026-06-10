import { describe, expect, it } from "vitest"

import { validateImportSubkeysForm } from "@/lib/import-subkeys-validation"

describe("validateImportSubkeysForm", () => {
  it("always passes validation", () => {
    expect(validateImportSubkeysForm()).toEqual({ valid: true })
  })
})
