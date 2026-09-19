import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/keys-api", () => ({
  keysApi: {
    exportPrivate: vi.fn(),
  },
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

import { ExportPrivateCard } from "@/components/keys/export-private-card"
import { keysApi } from "@/lib/keys-api"
import { logUiEvent } from "@/lib/ui-logger"
import { toast } from "sonner"

describe("ExportPrivateCard", () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.mocked(keysApi.exportPrivate).mockReset()
    vi.mocked(logUiEvent).mockReset()
    vi.mocked(toast.success).mockReset()
    vi.mocked(toast.error).mockReset()
  })

  it("requires confirm before download", async () => {
    const user = userEvent.setup()
    render(
      <ExportPrivateCard
        keyId="primary-1"
        fingerprint="AABB"
        canExport
        getAccessToken={async () => "token"}
      />,
    )

    await user.click(screen.getByRole("button", { name: /download encrypted private keyring/i }))
    expect(keysApi.exportPrivate).not.toHaveBeenCalled()
    expect(logUiEvent).toHaveBeenCalledWith(
      "warn",
      expect.objectContaining({ eventId: "keyDetail.exportPrivate.validationFailed" }),
    )
  })

  it("downloads armored secret after confirm", async () => {
    const user = userEvent.setup()
    vi.mocked(keysApi.exportPrivate).mockResolvedValue(
      "-----BEGIN PGP PRIVATE KEY BLOCK-----\ntest\n-----END PGP PRIVATE KEY BLOCK-----\n",
    )
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})

    render(
      <ExportPrivateCard
        keyId="primary-1"
        fingerprint="AABB"
        keyIdHex="ABCDEF01"
        label="Work key"
        canExport
        getAccessToken={async () => "token"}
      />,
    )

    await user.click(screen.getByLabelText(/I understand this download is the full secret keyring/i))
    await user.click(screen.getByRole("button", { name: /download encrypted private keyring/i }))

    await waitFor(() => {
      expect(keysApi.exportPrivate).toHaveBeenCalledWith({
        accessToken: "token",
        keyId: "primary-1",
        body: {},
      })
    })
    expect(toast.success).toHaveBeenCalled()
    expect(logUiEvent).toHaveBeenCalledWith(
      "info",
      expect.objectContaining({ eventId: "keyDetail.exportPrivate.success" }),
    )

    clickSpy.mockRestore()
  })

  it("shows vault-owner-only copy when export is disabled", () => {
    render(
      <ExportPrivateCard
        keyId="primary-1"
        canExport={false}
        disabledReason="Only a vault owner can export the private keyring from a team vault."
        getAccessToken={async () => "token"}
      />,
    )

    expect(
      screen.getByText(/Only a vault owner can export the private keyring from a team vault/i),
    ).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /download encrypted private keyring/i })).toBeNull()
  })
})
