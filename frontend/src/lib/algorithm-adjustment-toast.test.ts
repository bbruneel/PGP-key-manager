import { describe, expect, it, vi } from "vitest"

vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
  },
}))

import { toast } from "sonner"

import { notifyAlgorithmAdjusted } from "@/lib/algorithm-adjustment-toast"

describe("notifyAlgorithmAdjusted", () => {
  it("shows a toast when the algorithm changes", () => {
    notifyAlgorithmAdjusted({ algorithm: "ed25519" }, { algorithm: "cv25519" })

    expect(toast.info).toHaveBeenCalledWith("Algorithm updated", {
      description: "Changed from Ed25519 (sign) to Cv25519 (encrypt) to match your selection.",
    })
  })

  it("does not show a toast when the algorithm is unchanged", () => {
    vi.mocked(toast.info).mockClear()
    notifyAlgorithmAdjusted({ algorithm: "ed25519" }, { algorithm: "ed25519" })
    expect(toast.info).not.toHaveBeenCalled()
  })
})
