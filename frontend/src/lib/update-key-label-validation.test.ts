import { describe, expect, it } from "vitest"

import {
  buildUpdateKeyLabelRequest,
  validateUpdateKeyLabelForm,
} from "@/lib/update-key-label-validation"

describe("validateUpdateKeyLabelForm", () => {
  it("accepts a trimmed non-empty label", () => {
    const result = validateUpdateKeyLabelForm({ label: "  Work key  " })
    expect(result.valid).toBe(true)
    expect(result.fieldErrors).toEqual({})
  })

  it("rejects empty label after trim", () => {
    const result = validateUpdateKeyLabelForm({ label: "   " })
    expect(result.valid).toBe(false)
    expect(result.fieldErrors.label).toBeDefined()
  })

  it("rejects label longer than max length", () => {
    const result = validateUpdateKeyLabelForm({ label: "a".repeat(121) })
    expect(result.valid).toBe(false)
    expect(result.fieldErrors.label).toBeDefined()
  })
})

describe("buildUpdateKeyLabelRequest", () => {
  it("returns trimmed label", () => {
    expect(buildUpdateKeyLabelRequest({ label: "  Work key  " })).toEqual({ label: "Work key" })
  })
})
