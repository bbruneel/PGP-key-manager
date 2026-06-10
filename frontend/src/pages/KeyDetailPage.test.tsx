import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { keysApi } from "@/lib/keys-api"
import { logUiEvent } from "@/lib/ui-logger"

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}))

const getAccessToken = vi.fn()
const navigate = vi.fn()

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom")
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

vi.mock("@/hooks/use-api-access-token", () => ({
  useApiAccessToken: () => ({
    getAccessToken,
    isAuthenticated: true,
    isConfigured: true,
    isLoading: false,
    authError: null,
  }),
}))

vi.mock("@/lib/ui-logger", () => ({
  logUiEvent: vi.fn(),
}))

vi.mock("@/lib/keys-api", () => ({
  keysApi: {
    get: vi.fn(),
    listSubkeys: vi.fn(),
    createSubkey: vi.fn(),
    importSubkeysFromKeyring: vi.fn(),
    revoke: vi.fn(),
    extendExpiry: vi.fn(),
    rotate: vi.fn(),
    exportPublic: vi.fn(),
  },
}))

import { toast } from "sonner"

import { KeyDetailPage } from "@/pages/KeyDetailPage"
import type { PgpKey } from "@/types/api"

const primaryKey: PgpKey = {
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

const metadataOnlyPrimary: PgpKey = {
  ...primaryKey,
  keyType: "public",
  armoredPublic: "-----BEGIN PGP PUBLIC KEY BLOCK-----",
  encryptedPrivateArmored: undefined,
}

const subkey: PgpKey = {
  id: "sub-1",
  label: "Work key",
  fingerprint: "SUBKEYFINGERPRINT",
  keyId: "SUB1234",
  keyType: "private",
  role: "subkey",
  parentKeyId: "primary-1",
  capabilities: ["encrypt"],
  algorithm: "cv25519",
  status: "active",
  expiresAt: "2030-06-01T00:00:00Z",
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
    navigate.mockReset()
    getAccessToken.mockReset()
    vi.mocked(keysApi.get).mockReset()
    vi.mocked(keysApi.listSubkeys).mockReset()
    vi.mocked(keysApi.createSubkey).mockReset()
    vi.mocked(keysApi.importSubkeysFromKeyring).mockReset()
    vi.mocked(keysApi.revoke).mockReset()
    vi.mocked(logUiEvent).mockReset()
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

  it("renders create subkey form for primary with private material", async () => {
    renderDetail()

    expect(await screen.findByRole("region", { name: "Add subkey" })).toBeInTheDocument()
  })

  it("submits create subkey and navigates to new subkey", async () => {
    const user = userEvent.setup()
    vi.mocked(keysApi.createSubkey).mockResolvedValue({
      id: "sub-new",
      fingerprint: "NEWFINGERPRINT",
      role: "subkey",
      parentKeyId: "primary-1",
    })

    renderDetail()

    await screen.findByRole("heading", { name: "Work key" })

    const createSection = screen.getByRole("region", { name: "Add subkey" })
    await user.type(within(createSection).getByLabelText(/^passphrase$/i), "valid-passphrase")
    await user.click(within(createSection).getByRole("button", { name: /^add subkey$/i }))

    await waitFor(() => {
      expect(keysApi.createSubkey).toHaveBeenCalledWith({
        accessToken: "access-token",
        primaryKeyId: "primary-1",
        body: expect.objectContaining({
          capabilities: ["encrypt"],
          algorithm: { algorithm: "cv25519" },
          passphrase: "valid-passphrase",
        }),
      })
    })

    expect(toast.success).toHaveBeenCalledWith("Subkey created", expect.any(Object))
    expect(navigate).toHaveBeenCalledWith("/keys/sub-new")
    expect(logUiEvent).toHaveBeenCalledWith(
      "info",
      expect.objectContaining({ eventId: "keyDetail.createSubkey.apiSuccess" }),
    )
    expect(within(createSection).getByLabelText(/^passphrase$/i)).toHaveValue("")
  })

  it("clears passphrase after failed create subkey API call", async () => {
    const user = userEvent.setup()
    vi.mocked(keysApi.createSubkey).mockRejectedValue(new Error("API failed"))

    renderDetail()

    await screen.findByRole("heading", { name: "Work key" })

    const createSection = screen.getByRole("region", { name: "Add subkey" })
    await user.type(within(createSection).getByLabelText(/^passphrase$/i), "valid-passphrase")
    await user.click(within(createSection).getByRole("button", { name: /^add subkey$/i }))

    await waitFor(() => {
      expect(within(createSection).getByLabelText(/^passphrase$/i)).toHaveValue("")
    })
  })

  it("submits import subkeys from keyring and refreshes subkeys list", async () => {
    const user = userEvent.setup()
    vi.mocked(keysApi.importSubkeysFromKeyring).mockResolvedValue({
      registered: [{ id: "sub-imported", fingerprint: "IMPORTEDFP", role: "subkey" }],
      skippedCount: 0,
    })

    renderDetail()

    await screen.findByRole("heading", { name: "Work key" })

    const importSection = screen.getByRole("region", { name: "Import subkeys from keyring" })
    await user.click(
      within(importSection).getByRole("button", { name: /^import subkeys from keyring$/i }),
    )

    await waitFor(() => {
      expect(keysApi.importSubkeysFromKeyring).toHaveBeenCalledWith({
        accessToken: "access-token",
        primaryKeyId: "primary-1",
      })
    })

    expect(toast.success).toHaveBeenCalledWith("Subkeys imported", expect.any(Object))
    expect(logUiEvent).toHaveBeenCalledWith(
      "info",
      expect.objectContaining({ eventId: "keyDetail.importSubkeys.apiSuccess" }),
    )
  })

  it("does not render create subkey form for metadata-only primary", async () => {
    vi.mocked(keysApi.get).mockResolvedValue(metadataOnlyPrimary)

    renderDetail()

    await screen.findByRole("heading", { name: "Work key" })

    expect(screen.queryByRole("region", { name: "Add subkey" })).not.toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Import subkeys from keyring" })).toBeInTheDocument()
    expect(screen.getByText(/import or register private key material/i)).toBeInTheDocument()
  })

  it("does not render create subkey form on subkey detail", async () => {
    vi.mocked(keysApi.get).mockImplementation(async ({ keyId }) => {
      if (keyId === "sub-1") {
        return subkey
      }
      return primaryKey
    })

    renderDetail("/keys/sub-1")

    await screen.findByRole("heading", { name: "Work key" })

    expect(screen.queryByRole("region", { name: "Add subkey" })).not.toBeInTheDocument()
  })
})
