import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api-error"
import { keysApi } from "@/lib/keys-api"

const getAccessToken = vi.fn()

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock("@/hooks/use-api-access-token", () => ({
  useApiAccessToken: () => ({
    getAccessToken,
    isAuthenticated: true,
    isConfigured: true,
    isLoading: false,
    authError: null,
  }),
}))

vi.mock("@/lib/keys-api", () => ({
  keysApi: {
    list: vi.fn(),
    exportPublic: vi.fn(),
  },
}))

import { toast } from "sonner"

import { HomeKeysPanel } from "@/pages/HomeKeysPanel"

function renderPanel(initialPath = "/keys") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <HomeKeysPanel />
    </MemoryRouter>,
  )
}

describe("HomeKeysPanel", () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    getAccessToken.mockReset()
    vi.mocked(keysApi.list).mockReset()
    vi.mocked(keysApi.exportPublic).mockReset()
    vi.mocked(toast.success).mockReset()
    vi.mocked(toast.error).mockReset()
    getAccessToken.mockResolvedValue("access-token")
  })

  it("renders keys from keysApi.list", async () => {
    vi.mocked(keysApi.list).mockResolvedValue([
      {
        id: "key-1",
        label: "Work key",
        fingerprint: "ABCD1234",
        keyId: "EF567890",
        keyType: "private",
        algorithm: "ed25519",
        capabilities: ["certify", "sign"],
        status: "active",
        expiresAt: null,
      },
    ])

    renderPanel()

    expect(await screen.findByText("Work key")).toBeInTheDocument()
    expect(screen.getByText("ABCD1234")).toBeInTheDocument()
    expect(screen.getByText(/Key ID EF567890/)).toBeInTheDocument()
    expect(screen.getByText(/certify, sign · Does not expire/)).toBeInTheDocument()
    expect(screen.getByText("Active")).toBeInTheDocument()
    expect(keysApi.list).toHaveBeenCalledWith({ accessToken: "access-token", role: "primary" })
  })

  it("passes status filter to keysApi.list", async () => {
    vi.mocked(keysApi.list).mockResolvedValue([])

    renderPanel("/keys?status=revoked")

    await waitFor(() => {
      expect(keysApi.list).toHaveBeenCalledWith({
        accessToken: "access-token",
        role: "primary",
        status: "revoked",
      })
    })
  })

  it("passes subkeys view to keysApi.list", async () => {
    vi.mocked(keysApi.list).mockResolvedValue([])

    renderPanel("/keys?view=subkeys")

    await waitFor(() => {
      expect(keysApi.list).toHaveBeenCalledWith({
        accessToken: "access-token",
        role: "subkey",
      })
    })
  })

  it("filters public keys client-side", async () => {
    vi.mocked(keysApi.list).mockResolvedValue([
      { id: "pub-1", label: "Public key", fingerprint: "PUB", keyType: "public" },
      { id: "priv-1", label: "Private key", fingerprint: "PRIV", keyType: "private" },
    ])

    renderPanel("/keys?view=public")

    expect(await screen.findByText("Public key")).toBeInTheDocument()
    expect(screen.queryByText("Private key")).not.toBeInTheDocument()
  })

  it("shows ApiError detail and request id on failure", async () => {
    vi.mocked(keysApi.list).mockRejectedValue(
      new ApiError({
        operationId: "listKeys",
        requestId: "req-fail-1",
        status: 401,
        title: "Unauthorized",
        detail: "Invalid token",
      }),
    )

    renderPanel()

    await waitFor(() => {
      expect(screen.getByText("Invalid token")).toBeInTheDocument()
    })
    expect(screen.getByText(/request id: req-fail-1/i)).toBeInTheDocument()
    expect(screen.queryByText(/HTTP 401/i)).not.toBeInTheDocument()
  })

  it("links list items to key detail", async () => {
    vi.mocked(keysApi.list).mockResolvedValue([
      {
        id: "key-1",
        label: "Work key",
        fingerprint: "ABCD1234",
        keyType: "private",
        capabilities: ["certify"],
        expiresAt: null,
      },
    ])

    renderPanel()

    const viewLink = await screen.findByRole("link", { name: /view/i })
    expect(viewLink).toHaveAttribute("href", "/keys/key-1")
  })

  it("shows create and import key links", async () => {
    vi.mocked(keysApi.list).mockResolvedValue([])

    renderPanel()

    await waitFor(() => {
      expect(screen.getAllByRole("link", { name: /create key/i }).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByRole("link", { name: /import key/i }).length).toBeGreaterThanOrEqual(1)
    })
  })

  it("bulk exports selected keys", async () => {
    const user = userEvent.setup()
    vi.mocked(keysApi.list).mockResolvedValue([
      { id: "key-1", label: "Key one", fingerprint: "FP1", keyType: "private" },
      { id: "key-2", label: "Key two", fingerprint: "FP2", keyType: "private" },
    ])
    vi.mocked(keysApi.exportPublic)
      .mockResolvedValueOnce("-----BEGIN PGP PUBLIC KEY BLOCK-----\nA")
      .mockResolvedValueOnce("-----BEGIN PGP PUBLIC KEY BLOCK-----\nB")

    renderPanel()

    await screen.findByText("Key one")
    await user.click(screen.getByLabelText(/^select all keys$/i))
    await user.click(screen.getByRole("button", { name: /export selected \(2\)/i }))

    await waitFor(() => {
      expect(keysApi.exportPublic).toHaveBeenCalledTimes(2)
      expect(toast.success).toHaveBeenCalledWith("Exported 2 public keys")
    })
  })
})
