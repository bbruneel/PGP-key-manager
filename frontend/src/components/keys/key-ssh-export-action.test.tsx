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
    exportSshPublic: vi.fn(),
  },
}))

vi.mock("@/lib/clipboard", () => ({
  copyTextToClipboard: vi.fn(),
}))

import { toast } from "sonner"

import { copyTextToClipboard } from "@/lib/clipboard"
import { KeySshExportAction } from "@/components/keys/key-ssh-export-action"

describe("KeySshExportAction", () => {
  afterEach(() => {
    cleanup()
  })

  const getAccessToken = vi.fn()
  const sshLine = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIExample openpgp:0xabcdef01"

  beforeEach(() => {
    getAccessToken.mockReset()
    vi.mocked(keysApi.exportSshPublic).mockReset()
    vi.mocked(copyTextToClipboard).mockReset()
    vi.mocked(toast.success).mockReset()
    getAccessToken.mockResolvedValue("access-token")
    vi.mocked(keysApi.exportSshPublic).mockResolvedValue(sshLine)
    vi.mocked(copyTextToClipboard).mockResolvedValue(undefined)
  })

  it("copies exported SSH public key to clipboard", async () => {
    const user = userEvent.setup()
    render(
      <KeySshExportAction
        keyId="key-1"
        fingerprint="ABCD1234"
        keyIdHex="ABCDEF01"
        getAccessToken={getAccessToken}
      />,
    )

    await user.click(screen.getByRole("button", { name: /copy ssh public key/i }))

    await waitFor(() => {
      expect(keysApi.exportSshPublic).toHaveBeenCalledWith({
        accessToken: "access-token",
        keyId: "key-1",
      })
      expect(copyTextToClipboard).toHaveBeenCalledWith(sshLine)
      expect(toast.success).toHaveBeenCalledWith("SSH public key copied to clipboard")
    })
  })

  it("reuses cached export for copy then download", async () => {
    const user = userEvent.setup()
    render(
      <KeySshExportAction
        keyId="key-1"
        fingerprint="ABCD1234"
        getAccessToken={getAccessToken}
      />,
    )

    const exportSection = screen.getByRole("region", { name: /export ssh public key/i })
    await user.click(within(exportSection).getByRole("button", { name: /copy ssh public key/i }))
    await waitFor(() => {
      expect(keysApi.exportSshPublic).toHaveBeenCalledTimes(1)
    })

    await user.click(within(exportSection).getByRole("button", { name: /download \.pub/i }))
    await waitFor(() => {
      expect(keysApi.exportSshPublic).toHaveBeenCalledTimes(1)
    })
  })
})
