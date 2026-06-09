import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { keysApi } from "@/lib/keys-api"

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}))

const getAccessToken = vi.fn()

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
    get: vi.fn(),
    listSubkeys: vi.fn(),
    revoke: vi.fn(),
    extendExpiry: vi.fn(),
    rotate: vi.fn(),
    exportPublic: vi.fn(),
  },
}))

import { KeyDetailPage } from "@/pages/KeyDetailPage"
import type { PgpKeyDetail } from "@/types/api"

const primaryKey: PgpKeyDetail = {
  id: "primary-1",
  label: "Work key",
  fingerprint: "PRIMARYFINGERPRINT",
  keyId: "ABCD1234",
  keyType: "private",
  role: "primary",
  capabilities: ["certify", "sign"],
  algorithm: "ed25519",
  status: "active",
  expiresAt: "2030-06-01T00:00:00Z",
  encryptedPrivateArmored: "-----BEGIN PGP PRIVATE KEY BLOCK-----",
  openpgpVersion: 4,
}

function renderDetail(path = "/keys/primary-1") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/keys/:id" element={<KeyDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe("KeyDetailPage", () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    getAccessToken.mockReset()
    vi.mocked(keysApi.get).mockReset()
    vi.mocked(keysApi.listSubkeys).mockReset()
    vi.mocked(keysApi.revoke).mockReset()
    getAccessToken.mockResolvedValue("access-token")
    vi.mocked(keysApi.get).mockResolvedValue(primaryKey)
    vi.mocked(keysApi.listSubkeys).mockResolvedValue([])
  })

  it("loads and renders key detail", async () => {
    renderDetail()

    expect(await screen.findByRole("heading", { name: "Work key" })).toBeInTheDocument()
    expect(screen.getByText("PRIMARYFINGERPRINT")).toBeInTheDocument()
    expect(keysApi.get).toHaveBeenCalledWith({
      accessToken: "access-token",
      keyId: "primary-1",
    })
  })

  it("submits revoke and reloads key", async () => {
    const user = userEvent.setup()
    vi.mocked(keysApi.revoke).mockResolvedValue({
      ...primaryKey,
      status: "revoked",
    })

    renderDetail()

    await screen.findByRole("heading", { name: "Work key" })

    const revokeSection = screen.getByRole("region", { name: "Revoke key" })
    await user.type(within(revokeSection).getByLabelText(/^passphrase$/i), "valid-passphrase")
    await user.click(within(revokeSection).getByRole("button", { name: /^revoke key$/i }))

    await waitFor(() => {
      expect(keysApi.revoke).toHaveBeenCalledWith({
        accessToken: "access-token",
        keyId: "primary-1",
        body: expect.objectContaining({
          reason: "key_retired",
          passphrase: "valid-passphrase",
        }),
      })
    })
  })
})
