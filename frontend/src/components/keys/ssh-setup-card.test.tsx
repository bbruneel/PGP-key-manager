import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/keys-api", () => ({
  keysApi: {
    exportSshPublic: vi.fn(),
    exportSshSetupPack: vi.fn(),
  },
}))

vi.mock("@/lib/clipboard", () => ({
  copyTextToClipboard: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock("@/lib/ui-logger", () => ({
  logUiEvent: vi.fn(),
}))

import { SshSetupCard } from "@/components/keys/ssh-setup-card"
import { keysApi } from "@/lib/keys-api"
import { logUiEvent } from "@/lib/ui-logger"

describe("SshSetupCard", () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.mocked(keysApi.exportSshPublic).mockReset()
    vi.mocked(keysApi.exportSshSetupPack).mockReset()
    vi.mocked(logUiEvent).mockReset()
    vi.mocked(keysApi.exportSshPublic).mockResolvedValue(
      "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIExample openpgp:0xabcdef01",
    )
  })

  it("downloads pack and shows one-time password dialog", async () => {
    const user = userEvent.setup()
    const password = "Abcdefghjk23456789mn"
    vi.mocked(keysApi.exportSshSetupPack).mockResolvedValue({
      blob: new Blob([new Uint8Array([1, 2, 3])], { type: "application/zip" }),
      filename: "bc-tst-ssh-setup.zip",
      archivePassword: password,
      requestId: "rid-1",
    })

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})

    render(
      <SshSetupCard
        keyId="auth-1"
        fingerprint="AABB"
        keyIdHex="49B54FD31EFC697F"
        label="BC-TST"
        canDownloadPack
        getAccessToken={async () => "token"}
      />,
    )

    await user.type(screen.getByLabelText(/vault passphrase/i), "vault-pass-123")
    await user.click(screen.getByLabelText(/I understand this download/i))
    await user.click(screen.getByRole("button", { name: /download ssh setup pack/i }))

    await waitFor(() => {
      expect(keysApi.exportSshSetupPack).toHaveBeenCalled()
    })
    expect(screen.getByLabelText(/archive password/i)).toHaveValue(password)
    expect(logUiEvent).toHaveBeenCalledWith(
      "info",
      expect.objectContaining({ eventId: "keyDetail.sshSetup.password.shown" }),
    )

    await user.click(screen.getByRole("button", { name: /i saved this password/i }))
    expect(screen.getByLabelText(/archive password/i)).toHaveValue("")
    expect(logUiEvent).toHaveBeenCalledWith(
      "info",
      expect.objectContaining({ eventId: "keyDetail.sshSetup.password.dismissed" }),
    )

    clickSpy.mockRestore()
  })

  it("shows disabled reason when pack cannot download", () => {
    render(
      <SshSetupCard
        keyId="auth-1"
        canDownloadPack={false}
        packDisabledReason="This key is revoked."
        getAccessToken={async () => "token"}
      />,
    )

    expect(screen.getByText(/this key is revoked/i)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /download ssh setup pack/i })).not.toBeInTheDocument()
  })
})
