import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup } from "@testing-library/react"

import { keysApi } from "@/lib/keys-api"

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}))

vi.mock("@/lib/keys-api", () => ({
  keysApi: {
    exportPublic: vi.fn(),
  },
}))

vi.mock("@/lib/clipboard", () => ({
  copyTextToClipboard: vi.fn(),
}))

import { toast } from "sonner"

import { copyTextToClipboard } from "@/lib/clipboard"
import { KeyExportAction } from "@/components/keys/key-export-action"

describe("KeyExportAction", () => {
  afterEach(() => {
    cleanup()
  })

  const getAccessToken = vi.fn()
  const armored = "-----BEGIN PGP PUBLIC KEY BLOCK-----\n\nmQENBGexample\n-----END PGP PUBLIC KEY BLOCK-----"

  beforeEach(() => {
    getAccessToken.mockReset()
    vi.mocked(keysApi.exportPublic).mockReset()
    vi.mocked(copyTextToClipboard).mockReset()
    vi.mocked(toast.success).mockReset()
    getAccessToken.mockResolvedValue("access-token")
    vi.mocked(keysApi.exportPublic).mockResolvedValue(armored)
    vi.mocked(copyTextToClipboard).mockResolvedValue(undefined)
  })

  it("copies exported armored key to clipboard", async () => {
    const user = userEvent.setup()
    render(<KeyExportAction keyId="key-1" fingerprint="ABCD1234" getAccessToken={getAccessToken} />)

    await user.click(screen.getByRole("button", { name: /copy to clipboard/i }))

    await waitFor(() => {
      expect(keysApi.exportPublic).toHaveBeenCalledWith({
        accessToken: "access-token",
        keyId: "key-1",
      })
      expect(copyTextToClipboard).toHaveBeenCalledWith(armored)
      expect(toast.success).toHaveBeenCalledWith("Public key copied to clipboard")
    })
  })

  it("refetches after invalidateToken changes", async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <KeyExportAction keyId="key-1" fingerprint="ABCD1234" getAccessToken={getAccessToken} />,
    )

    await user.click(screen.getByRole("button", { name: /copy to clipboard/i }))
    await waitFor(() => {
      expect(keysApi.exportPublic).toHaveBeenCalledTimes(1)
    })

    rerender(
      <KeyExportAction
        keyId="key-1"
        fingerprint="ABCD1234"
        getAccessToken={getAccessToken}
        invalidateToken={1}
      />,
    )

    await user.click(screen.getByRole("button", { name: /copy to clipboard/i }))
    await waitFor(() => {
      expect(keysApi.exportPublic).toHaveBeenCalledTimes(2)
    })
  })

  it("reuses cached export for copy then download", async () => {
    const user = userEvent.setup()
    render(<KeyExportAction keyId="key-1" fingerprint="ABCD1234" getAccessToken={getAccessToken} />)

    const exportSection = screen.getByRole("region", { name: /export public key/i })
    await user.click(within(exportSection).getByRole("button", { name: /copy to clipboard/i }))
    await waitFor(() => {
      expect(keysApi.exportPublic).toHaveBeenCalledTimes(1)
    })

    await user.click(within(exportSection).getByRole("button", { name: /download \.asc/i }))
    await waitFor(() => {
      expect(keysApi.exportPublic).toHaveBeenCalledTimes(1)
    })
  })
})
