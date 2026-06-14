import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createMemoryRouter, MemoryRouter, Route, Routes, RouterProvider } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { keysApi } from "@/lib/keys-api"
import { logUiEvent } from "@/lib/ui-logger"

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
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

vi.mock("@/lib/clipboard", () => ({
  copyTextToClipboard: vi.fn(),
}))

vi.mock("@/lib/keys-api", () => ({
  keysApi: {
    get: vi.fn(),
    listSubkeys: vi.fn(),
    createSubkey: vi.fn(),
    importSubkeysFromKeyring: vi.fn(),
    previewImportSubkeysFromKeyring: vi.fn(),
    revoke: vi.fn(),
    extendExpiry: vi.fn(),
    rotate: vi.fn(),
    exportPublic: vi.fn(),
    exportSshPublic: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

import { toast } from "sonner"

import { copyTextToClipboard } from "@/lib/clipboard"
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

const authSubkey: PgpKey = {
  id: "auth-sub-1",
  label: "Work key",
  fingerprint: "AUTHFINGERPRINT",
  keyId: "AUTH1234",
  keyType: "private",
  role: "subkey",
  parentKeyId: "primary-1",
  capabilities: ["authenticate"],
  algorithm: "ed25519",
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
    vi.mocked(keysApi.previewImportSubkeysFromKeyring).mockReset()
    vi.mocked(keysApi.revoke).mockReset()
    vi.mocked(keysApi.extendExpiry).mockReset()
    vi.mocked(keysApi.rotate).mockReset()
    vi.mocked(keysApi.exportPublic).mockReset()
    vi.mocked(keysApi.exportSshPublic).mockReset()
    vi.mocked(keysApi.update).mockReset()
    vi.mocked(keysApi.delete).mockReset()
    vi.mocked(copyTextToClipboard).mockReset()
    vi.mocked(logUiEvent).mockReset()
    getAccessToken.mockResolvedValue("access-token")
    vi.mocked(keysApi.get).mockResolvedValue(primaryKey)
    vi.mocked(keysApi.listSubkeys).mockResolvedValue([])
  })

  it("keeps inactive tab panels in the DOM with hidden class", async () => {
    renderDetail()

    await screen.findByRole("heading", { name: "Work key" })

    const overviewPanel = document.getElementById("key-detail-overview-panel")
    const subkeysPanel = document.getElementById("key-detail-subkeys-panel")
    const actionsPanel = document.getElementById("key-detail-actions-panel")

    expect(overviewPanel).toBeInTheDocument()
    expect(subkeysPanel).toBeInTheDocument()
    expect(actionsPanel).toBeInTheDocument()

    expect(overviewPanel).not.toHaveClass("hidden")
    expect(subkeysPanel).toHaveClass("hidden")
    expect(actionsPanel).toHaveClass("hidden")

    expect(overviewPanel).toHaveAttribute("data-pgp-ui", "keyDetail.tab.overview")
    expect(subkeysPanel).toHaveAttribute("data-pgp-ui", "keyDetail.tab.subkeys")
    expect(actionsPanel).toHaveAttribute("data-pgp-ui", "keyDetail.tab.actions")

    expect(screen.getByRole("region", { name: "Revoke key" })).toBeInTheDocument()
  })

  it("loads and renders key detail", async () => {
    renderDetail()

    expect(await screen.findByRole("heading", { name: "Work key" })).toBeInTheDocument()
    expect(within(screen.getByRole("region", { name: "Key summary" })).getByText("PRIMARYFINGERPRINT")).toBeInTheDocument()
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
      updated: [],
      updatedCount: 0,
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

  it("mentions primary revocation sync in import subkeys toast", async () => {
    const user = userEvent.setup()
    vi.mocked(keysApi.importSubkeysFromKeyring).mockResolvedValue({
      registered: [],
      skippedCount: 0,
      updated: [{ id: "primary-1", fingerprint: "PRIMARYFP", role: "primary", status: "revoked" }],
      updatedCount: 1,
    })

    renderDetail()

    await screen.findByRole("heading", { name: "Work key" })

    const importSection = screen.getByRole("region", { name: "Import subkeys from keyring" })
    await user.click(
      within(importSection).getByRole("button", { name: /^import subkeys from keyring$/i }),
    )

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Subkeys imported", {
        description: "primary revocation synced",
      })
    })
  })

  it("does not render create subkey form for metadata-only primary", async () => {
    vi.mocked(keysApi.get).mockResolvedValue(metadataOnlyPrimary)

    renderDetail()

    await screen.findByRole("heading", { name: "Work key" })

    expect(screen.queryByRole("region", { name: "Add subkey" })).not.toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Import subkeys from keyring" })).toBeInTheDocument()
    expect(screen.getByText(/import or register private key material/i)).toBeInTheDocument()
  })

  it("updates key label", async () => {
    const user = userEvent.setup()
    vi.mocked(keysApi.update).mockResolvedValue({
      ...primaryKey,
      label: "Renamed key",
    })

    renderDetail()

    await screen.findByRole("heading", { name: "Work key" })

    const editSection = screen.getByRole("region", { name: "Edit key label" })
    const labelInput = within(editSection).getByLabelText(/^label$/i)
    await user.clear(labelInput)
    await user.type(labelInput, "Renamed key")
    await user.click(within(editSection).getByRole("button", { name: /^save label$/i }))

    await waitFor(() => {
      expect(keysApi.update).toHaveBeenCalledWith({
        accessToken: "access-token",
        keyId: "primary-1",
        body: { label: "Renamed key" },
      })
    })
    expect(await screen.findByRole("heading", { name: "Renamed key" })).toBeInTheDocument()
    expect(toast.success).toHaveBeenCalledWith("Label updated")
  })

  it("deletes key and navigates to keys list", async () => {
    const user = userEvent.setup()
    vi.mocked(keysApi.delete).mockResolvedValue(undefined)

    renderDetail()

    await screen.findByRole("heading", { name: "Work key" })

    const deleteSection = screen.getByRole("region", { name: "Delete key" })
    await user.click(within(deleteSection).getByRole("button", { name: /^delete key$/i }))
    await user.click(within(deleteSection).getByRole("button", { name: /^confirm delete$/i }))

    await waitFor(() => {
      expect(keysApi.delete).toHaveBeenCalledWith({
        accessToken: "access-token",
        keyId: "primary-1",
      })
    })
    expect(navigate).toHaveBeenCalledWith("/keys")
    expect(toast.success).toHaveBeenCalledWith("Key deleted")
  })

  it("refreshes key detail on button click", async () => {
    const user = userEvent.setup()

    renderDetail()

    await screen.findByRole("heading", { name: "Work key" })
    expect(keysApi.get).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole("button", { name: /^refresh$/i }))

    await waitFor(() => {
      expect(keysApi.get).toHaveBeenCalledTimes(2)
    })
    expect(logUiEvent).toHaveBeenCalledWith(
      "info",
      expect.objectContaining({ eventId: "keyDetail.refresh" }),
    )
  })

  it("submits extend expiry", async () => {
    const user = userEvent.setup()
    vi.mocked(keysApi.extendExpiry).mockResolvedValue({
      ...primaryKey,
      expiresAt: "2035-06-01T00:00:00Z",
    })

    renderDetail()

    await screen.findByRole("heading", { name: "Work key" })

    const extendSection = screen.getByRole("region", { name: "Extend expiry" })
    await user.type(within(extendSection).getByLabelText(/^passphrase$/i), "valid-passphrase")
    await user.click(within(extendSection).getByRole("button", { name: /^extend expiry$/i }))

    await waitFor(() => {
      expect(keysApi.extendExpiry).toHaveBeenCalled()
    })
  })

  it("submits rotate on subkey detail", async () => {
    const user = userEvent.setup()
    vi.mocked(keysApi.get).mockImplementation(async ({ keyId }) => {
      if (keyId === "sub-1") {
        return subkey
      }
      return primaryKey
    })
    vi.mocked(keysApi.rotate).mockResolvedValue({
      newKey: { ...subkey, id: "sub-new" },
      previousKey: { ...subkey, status: "revoked" },
    })

    renderDetail("/keys/sub-1")

    await screen.findByRole("heading", { name: "Work key" })

    const rotateSection = screen.getByRole("region", { name: "Rotate subkey" })
    await user.type(within(rotateSection).getByLabelText(/^passphrase$/i), "valid-passphrase")
    await user.click(within(rotateSection).getByRole("button", { name: /^rotate subkey$/i }))

    await waitFor(() => {
      expect(keysApi.rotate).toHaveBeenCalled()
    })
  })

  it("exports public key to clipboard", async () => {
    const user = userEvent.setup()
    const armored = "-----BEGIN PGP PUBLIC KEY BLOCK-----\n\nmQENBGexample\n-----END PGP PUBLIC KEY BLOCK-----"
    vi.mocked(keysApi.exportPublic).mockResolvedValue(armored)
    vi.mocked(copyTextToClipboard).mockResolvedValue(undefined)

    renderDetail()

    await screen.findByRole("heading", { name: "Work key" })
    await user.click(screen.getByRole("button", { name: /copy to clipboard/i }))

    await waitFor(() => {
      expect(keysApi.exportPublic).toHaveBeenCalledWith({
        accessToken: "access-token",
        keyId: "primary-1",
      })
      expect(copyTextToClipboard).toHaveBeenCalledWith(armored)
      expect(toast.success).toHaveBeenCalledWith("Public key copied to clipboard")
    })
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

  it("shows SSH export for authenticate subkey", async () => {
    vi.mocked(keysApi.get).mockImplementation(async ({ keyId }) => {
      if (keyId === "auth-sub-1") {
        return authSubkey
      }
      return primaryKey
    })

    renderDetail("/keys/auth-sub-1")

    await screen.findByRole("heading", { name: "Work key" })

    expect(screen.getByRole("region", { name: "Export SSH public key" })).toBeInTheDocument()
  })

  it("clears passphrase fields when navigating to another key", async () => {
    const user = userEvent.setup()
    vi.mocked(keysApi.get).mockImplementation(async ({ keyId }) => {
      if (keyId === "sub-1") {
        return subkey
      }
      return primaryKey
    })
    vi.mocked(keysApi.listSubkeys).mockResolvedValue([subkey])

    const router = createMemoryRouter(
      [{ path: "/keys/:id", element: <KeyDetailPage /> }],
      { initialEntries: ["/keys/primary-1"] },
    )
    render(<RouterProvider router={router} />)

    await screen.findByRole("heading", { name: "Work key" })
    await user.click(screen.getByRole("tab", { name: /actions & lifecycle/i }))

    const revokeSection = screen.getByRole("region", { name: "Revoke key" })
    await user.type(within(revokeSection).getByLabelText(/^passphrase$/i), "secret-passphrase")

    await router.navigate("/keys/sub-1")
    await screen.findByText(/subkey of/i)

    await user.click(screen.getByRole("tab", { name: /actions & lifecycle/i }))
    const rotateSection = screen.getByRole("region", { name: "Rotate subkey" })
    expect(within(rotateSection).getByLabelText(/^passphrase$/i)).toHaveValue("")

    await router.navigate("/keys/primary-1")
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /^subkeys$/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole("tab", { name: /actions & lifecycle/i }))
    const revokeSectionAfterReturn = screen.getByRole("region", { name: "Revoke key" })
    expect(within(revokeSectionAfterReturn).getByLabelText(/^passphrase$/i)).toHaveValue("")

    expect(logUiEvent).toHaveBeenCalledWith(
      "debug",
      expect.objectContaining({
        eventId: "keyDetail.unmount",
        keyId: "primary-1",
      }),
    )
  })

  it("resets active tab to overview when navigating to a different key", async () => {
    const user = userEvent.setup()
    vi.mocked(keysApi.get).mockImplementation(async ({ keyId }) => {
      if (keyId === "sub-1") {
        return subkey
      }
      return primaryKey
    })

    const router = createMemoryRouter(
      [{ path: "/keys/:id", element: <KeyDetailPage /> }],
      { initialEntries: ["/keys/primary-1"] },
    )
    render(<RouterProvider router={router} />)

    await screen.findByRole("heading", { name: "Work key" })
    await user.click(screen.getByRole("tab", { name: /^subkeys$/i }))

    await router.navigate("/keys/sub-1")
    await screen.findByText(/subkey of/i)

    await waitFor(() => {
      expect(screen.queryByRole("tab", { name: /^subkeys$/i })).not.toBeInTheDocument()
    })
    expect(screen.getByRole("button", { name: /copy to clipboard/i })).toBeVisible()
  })

  it("hides SSH export for encrypt-only subkey", async () => {
    vi.mocked(keysApi.get).mockImplementation(async ({ keyId }) => {
      if (keyId === "sub-1") {
        return subkey
      }
      return primaryKey
    })

    renderDetail("/keys/sub-1")

    await screen.findByRole("heading", { name: "Work key" })

    expect(screen.queryByRole("region", { name: "Export SSH public key" })).not.toBeInTheDocument()
  })

  it("uses roving tabindex on key detail tabs", async () => {
    renderDetail()

    await screen.findByRole("heading", { name: "Work key" })

    const overviewTab = screen.getByRole("tab", { name: /^overview$/i })
    const subkeysTab = screen.getByRole("tab", { name: /^subkeys$/i })
    const actionsTab = screen.getByRole("tab", { name: /actions & lifecycle/i })

    expect(overviewTab).toHaveAttribute("tabindex", "0")
    expect(subkeysTab).toHaveAttribute("tabindex", "-1")
    expect(actionsTab).toHaveAttribute("tabindex", "-1")
  })

  it("moves focus and activates subkeys tab with ArrowRight after clicking overview tab", async () => {
    const user = userEvent.setup()

    renderDetail()

    await screen.findByRole("heading", { name: "Work key" })

    const overviewTab = screen.getByRole("tab", { name: /^overview$/i })
    await user.click(overviewTab)
    await user.keyboard("{ArrowRight}")

    const subkeysTab = screen.getByRole("tab", { name: /^subkeys$/i })
    await waitFor(() => {
      expect(document.activeElement).toBe(subkeysTab)
    })
    expect(subkeysTab).toHaveAttribute("tabindex", "0")
    expect(screen.getByRole("region", { name: "Subkeys" })).toBeVisible()
    expect(logUiEvent).toHaveBeenCalledWith(
      "debug",
      expect.objectContaining({
        eventId: "keyDetail.tabs.keyboardNav",
        tab: "subkeys",
        direction: "right",
      }),
    )
  })

  it("does not switch tabs when Tab is pressed on the active tab button", async () => {
    const user = userEvent.setup()

    renderDetail()

    await screen.findByRole("heading", { name: "Work key" })

    const overviewTab = screen.getByRole("tab", { name: /^overview$/i })
    const subkeysTab = screen.getByRole("tab", { name: /^subkeys$/i })
    await user.click(overviewTab)
    await user.keyboard("{Tab}")

    expect(overviewTab).toHaveAttribute("aria-selected", "true")
    expect(subkeysTab).toHaveAttribute("aria-selected", "false")
    expect(document.activeElement).not.toBe(subkeysTab)
  })

  it("skips subkeys tab with ArrowRight on subkey detail", async () => {
    const user = userEvent.setup()
    vi.mocked(keysApi.get).mockImplementation(async ({ keyId }) => {
      if (keyId === "sub-1") {
        return subkey
      }
      return primaryKey
    })

    renderDetail("/keys/sub-1")

    await screen.findByRole("heading", { name: "Work key" })

    expect(screen.queryByRole("tab", { name: /^subkeys$/i })).not.toBeInTheDocument()

    const overviewTab = screen.getByRole("tab", { name: /^overview$/i })
    overviewTab.focus()
    await user.keyboard("{ArrowRight}")

    const actionsTab = screen.getByRole("tab", { name: /actions & lifecycle/i })
    await waitFor(() => {
      expect(document.activeElement).toBe(actionsTab)
    })
    expect(screen.getByRole("region", { name: "Revoke key" })).toBeVisible()
  })

  it("activates overview tab with Home key from actions tab", async () => {
    const user = userEvent.setup()

    renderDetail()

    await screen.findByRole("heading", { name: "Work key" })

    const actionsTab = screen.getByRole("tab", { name: /actions & lifecycle/i })
    actionsTab.focus()
    await user.click(actionsTab) // select it first to set state

    await user.keyboard("{Home}")

    const overviewTab = screen.getByRole("tab", { name: /^overview$/i })
    await waitFor(() => {
      expect(document.activeElement).toBe(overviewTab)
    })
    expect(screen.getByRole("region", { name: "Key summary" })).toBeVisible()
  })

  it("activates actions tab with End key from overview tab", async () => {
    const user = userEvent.setup()

    renderDetail()

    await screen.findByRole("heading", { name: "Work key" })

    const overviewTab = screen.getByRole("tab", { name: /^overview$/i })
    overviewTab.focus()

    await user.keyboard("{End}")

    const actionsTab = screen.getByRole("tab", { name: /actions & lifecycle/i })
    await waitFor(() => {
      expect(document.activeElement).toBe(actionsTab)
    })
    expect(screen.getByRole("region", { name: "Revoke key" })).toBeVisible()
  })
})

