import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/keys-api", () => ({
  keysApi: {
    exportRevocationCert: vi.fn(),
    applyRevocationCert: vi.fn(),
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

import { ApplyRevocationCertCard } from "@/components/keys/apply-revocation-cert-card"
import { ExportRevocationCertCard } from "@/components/keys/export-revocation-cert-card"
import { keysApi } from "@/lib/keys-api"
import { logUiEvent } from "@/lib/ui-logger"
import { toast } from "sonner"

describe("ExportRevocationCertCard", () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.mocked(keysApi.exportRevocationCert).mockReset()
    vi.mocked(logUiEvent).mockReset()
    vi.mocked(toast.success).mockReset()
  })

  it("validates passphrase before download", async () => {
    const user = userEvent.setup()
    render(
      <ExportRevocationCertCard
        keyId="primary-1"
        fingerprint="AABBCCDD"
        disabled={false}
        getAccessToken={async () => "token"}
      />,
    )

    await user.click(screen.getByRole("button", { name: /download revocation certificate/i }))
    expect(keysApi.exportRevocationCert).not.toHaveBeenCalled()
    expect(logUiEvent).toHaveBeenCalledWith(
      "warn",
      expect.objectContaining({ eventId: "keyDetail.exportRevocationCert.validationFailed" }),
    )
  })

  it("downloads armored certificate after successful API call", async () => {
    const user = userEvent.setup()
    vi.mocked(keysApi.exportRevocationCert).mockResolvedValue(
      "-----BEGIN PGP PUBLIC KEY BLOCK-----\nComment: This is a revocation certificate\n-----END PGP PUBLIC KEY BLOCK-----\n",
    )
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})

    render(
      <ExportRevocationCertCard
        keyId="primary-1"
        fingerprint="AABBCCDDEEFF0011"
        label="Backup"
        disabled={false}
        getAccessToken={async () => "token"}
      />,
    )

    await user.type(screen.getByLabelText(/^passphrase$/i), "long-enough-passphrase")
    await user.click(screen.getByRole("button", { name: /download revocation certificate/i }))

    await waitFor(() => {
      expect(keysApi.exportRevocationCert).toHaveBeenCalled()
    })
    expect(clickSpy).toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith(
      "Revocation certificate downloaded",
      expect.objectContaining({ description: expect.stringMatching(/does not revoke/i) }),
    )
    clickSpy.mockRestore()
  })

  it("shows disabled copy when revoked", () => {
    render(
      <ExportRevocationCertCard
        keyId="primary-1"
        disabled
        disabledReason="This key is already revoked."
        getAccessToken={async () => "token"}
      />,
    )
    expect(screen.getByText(/already revoked/i)).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /download revocation certificate/i }),
    ).not.toBeInTheDocument()
  })
})

describe("ApplyRevocationCertCard", () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.mocked(keysApi.applyRevocationCert).mockReset()
    vi.mocked(logUiEvent).mockReset()
    vi.mocked(toast.success).mockReset()
  })

  it("requires confirm before apply", async () => {
    const user = userEvent.setup()
    render(
      <ApplyRevocationCertCard
        keyId="primary-1"
        getAccessToken={async () => "token"}
        onApplied={vi.fn()}
      />,
    )

    await user.type(
      screen.getByLabelText(/armored certificate/i),
      "-----BEGIN PGP PUBLIC KEY BLOCK-----\nx\n-----END PGP PUBLIC KEY BLOCK-----",
    )
    await user.click(screen.getByRole("button", { name: /apply revocation certificate/i }))
    expect(keysApi.applyRevocationCert).not.toHaveBeenCalled()
    expect(logUiEvent).toHaveBeenCalledWith(
      "warn",
      expect.objectContaining({ eventId: "keyDetail.applyRevocationCert.validationFailed" }),
    )
  })

  it("applies certificate and refreshes", async () => {
    const user = userEvent.setup()
    const onApplied = vi.fn().mockResolvedValue(undefined)
    vi.mocked(keysApi.applyRevocationCert).mockResolvedValue({
      id: "primary-1",
      fingerprint: "AABB",
      status: "revoked",
    } as never)

    render(
      <ApplyRevocationCertCard
        keyId="primary-1"
        fingerprint="AABB"
        getAccessToken={async () => "token"}
        onApplied={onApplied}
      />,
    )

    await user.type(
      screen.getByLabelText(/armored certificate/i),
      "-----BEGIN PGP PUBLIC KEY BLOCK-----\nx\n-----END PGP PUBLIC KEY BLOCK-----",
    )
    await user.click(screen.getByLabelText(/permanently revokes/i))
    await user.click(screen.getByRole("button", { name: /apply revocation certificate/i }))

    await waitFor(() => {
      expect(keysApi.applyRevocationCert).toHaveBeenCalled()
    })
    expect(onApplied).toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith(
      "Revocation certificate applied",
      expect.any(Object),
    )
  })
})
