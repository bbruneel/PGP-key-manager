import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api-error"
import { keysApi } from "@/lib/keys-api"

const getAccessToken = vi.fn()
const navigate = vi.fn()

vi.mock("@/hooks/use-api-access-token", () => ({
  useApiAccessToken: () => ({
    getAccessToken,
    isAuthenticated: true,
    isConfigured: true,
    isLoading: false,
    authError: null,
  }),
}))

vi.mock("@/hooks/use-group-context", () => ({
  useGroupContext: () => ({
    groups: [],
    activeGroup: null,
    activeGroupId: null,
    isLoading: false,
    error: null,
    requestId: null,
    refreshGroups: vi.fn(),
    setActiveGroupId: vi.fn(),
  }),
}))

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom")
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}))

vi.mock("@/lib/keys-api", () => ({
  keysApi: {
    register: vi.fn(),
    previewKeyring: vi.fn(),
    listSubkeys: vi.fn(),
  },
}))

import { ImportKeyPage } from "@/pages/ImportKeyPage"

const SAMPLE_PUBLIC_ARMOR = `-----BEGIN PGP PUBLIC KEY BLOCK-----
Version: Test

mQENBGexample
-----END PGP PUBLIC KEY BLOCK-----`

const SAMPLE_PRIVATE_ARMOR = `-----BEGIN PGP PRIVATE KEY BLOCK-----
Version: Test

hQEMAexample
-----END PGP PRIVATE KEY BLOCK-----`

function renderImportKeyPage() {
  return render(
    <MemoryRouter initialEntries={["/keys/import"]}>
      <Routes>
        <Route path="/keys/import" element={<ImportKeyPage />} />
        <Route path="/keys" element={<div>Keys list</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

function getSubmitButton() {
  const form = screen.getByRole("form", { name: /import key form/i })
  return within(form).getByRole("button", { name: /^import key$/i })
}

describe("ImportKeyPage", () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    getAccessToken.mockReset()
    navigate.mockReset()
    vi.mocked(keysApi.register).mockReset()
    vi.mocked(keysApi.previewKeyring).mockReset()
    vi.mocked(keysApi.listSubkeys).mockReset()
    getAccessToken.mockResolvedValue("access-token")
  })

  it("shows validation errors without calling the API", async () => {
    const user = userEvent.setup()
    renderImportKeyPage()

    await user.click(getSubmitButton())

    expect(await screen.findByText("Armored public key block is required")).toBeInTheDocument()
    expect(keysApi.register).not.toHaveBeenCalled()
  })

  it("imports a private-only key and navigates to /keys on success", async () => {
    const user = userEvent.setup()
    vi.mocked(keysApi.register).mockResolvedValue({
      id: "key-imported-private",
      fingerprint: "DEADBEEF0123456789ABCDEF0123456789ABCD",
      role: "primary",
    })

    renderImportKeyPage()

    await user.click(screen.getByRole("radio", { name: /private key/i }))
    await user.type(screen.getByLabelText(/armored private key/i), SAMPLE_PRIVATE_ARMOR)
    await user.click(getSubmitButton())

    await waitFor(() => {
      expect(keysApi.register).toHaveBeenCalledWith({
        accessToken: "access-token",
        body: expect.objectContaining({
          keyType: "private",
          encryptedPrivateArmored: SAMPLE_PRIVATE_ARMOR,
        }),
      })
    })

    const registerCall = vi.mocked(keysApi.register).mock.calls[0]![0]
    expect(registerCall.body).not.toHaveProperty("armoredPublic")
    expect(registerCall.body).not.toHaveProperty("fingerprint")
    expect(navigate).toHaveBeenCalledWith("/keys/key-imported-private")
  })

  it("shows private-mode validation errors without calling the API", async () => {
    const user = userEvent.setup()
    renderImportKeyPage()

    await user.click(screen.getByRole("radio", { name: /private key/i }))
    await user.click(getSubmitButton())

    expect(await screen.findByText("Armored private key block is required")).toBeInTheDocument()
    expect(screen.queryByText("Armored public key block is required")).not.toBeInTheDocument()
    expect(keysApi.register).not.toHaveBeenCalled()
  })

  it("imports a public key and navigates to /keys on success", async () => {
    const user = userEvent.setup()
    vi.mocked(keysApi.register).mockResolvedValue({
      id: "key-imported",
      fingerprint: "DEADBEEF0123456789ABCDEF0123456789ABCD",
      role: "primary",
    })

    renderImportKeyPage()

    await user.type(screen.getByLabelText(/armored public key/i), SAMPLE_PUBLIC_ARMOR)
    await user.click(getSubmitButton())

    await waitFor(() => {
      expect(keysApi.register).toHaveBeenCalledWith({
        accessToken: "access-token",
        body: expect.objectContaining({
          keyType: "public",
          armoredPublic: SAMPLE_PUBLIC_ARMOR,
        }),
      })
    })

    const registerCall = vi.mocked(keysApi.register).mock.calls[0]![0]
    expect(registerCall.body).not.toHaveProperty("fingerprint")
    expect(registerCall.body).not.toHaveProperty("passphrase")
    expect(registerCall.body).not.toHaveProperty("algorithmSpec")
    expect(navigate).toHaveBeenCalledWith("/keys/key-imported")
  })

  it("redirects to key detail and mentions subkeys when import registers subkey rows", async () => {
    const user = userEvent.setup()
    const { toast } = await import("sonner")

    vi.mocked(keysApi.register).mockResolvedValue({
      id: "key-with-subkeys",
      fingerprint: "DEADBEEF0123456789ABCDEF0123456789ABCD",
      role: "primary",
      registeredSubkeyCount: 1,
    })

    renderImportKeyPage()

    await user.type(screen.getByLabelText(/armored public key/i), SAMPLE_PUBLIC_ARMOR)
    await user.click(getSubmitButton())

    await waitFor(() => {
      expect(keysApi.listSubkeys).not.toHaveBeenCalled()
      expect(navigate).toHaveBeenCalledWith("/keys/key-with-subkeys")
      expect(toast.success).toHaveBeenCalledWith(
        "Key imported",
        expect.objectContaining({
          description: expect.stringContaining("1 subkey registered from keyring"),
        }),
      )
    })
  })

  it("keeps preview visible when label changes after preview", async () => {
    const user = userEvent.setup()

    vi.mocked(keysApi.previewKeyring).mockResolvedValue({
      primary: {
        role: "primary",
        fingerprint: "DEADBEEF0123456789ABCDEF0123456789ABCD",
        keyId: "ABCDEF0123456789",
        algorithm: "ed25519",
        capabilities: ["certify", "sign"],
        status: "active",
        openpgpVersion: 4,
      },
      subkeys: [],
      warnings: [],
      source: "public",
    })

    renderImportKeyPage()

    await user.type(screen.getByLabelText(/armored public key/i), SAMPLE_PUBLIC_ARMOR)
    await user.click(screen.getByRole("button", { name: /^preview import$/i }))

    await waitFor(() => {
      expect(screen.getByRole("region", { name: "Import preview" })).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/label/i), "My imported key")

    expect(screen.getByRole("region", { name: "Import preview" })).toBeInTheDocument()
  })

  it("clears preview when armored public key changes after preview", async () => {
    const user = userEvent.setup()

    vi.mocked(keysApi.previewKeyring).mockResolvedValue({
      primary: {
        role: "primary",
        fingerprint: "DEADBEEF0123456789ABCDEF0123456789ABCD",
        keyId: "ABCDEF0123456789",
        algorithm: "ed25519",
        capabilities: ["certify", "sign"],
        status: "active",
        openpgpVersion: 4,
      },
      subkeys: [],
      warnings: [],
      source: "public",
    })

    renderImportKeyPage()

    const publicField = screen.getByLabelText(/armored public key/i)
    await user.type(publicField, SAMPLE_PUBLIC_ARMOR)
    await user.click(screen.getByRole("button", { name: /^preview import$/i }))

    await waitFor(() => {
      expect(screen.getByRole("region", { name: "Import preview" })).toBeInTheDocument()
    })

    await user.type(publicField, "x")

    expect(screen.queryByRole("region", { name: "Import preview" })).not.toBeInTheDocument()
  })

  it("loads preview without registering the key", async () => {
    const user = userEvent.setup()

    vi.mocked(keysApi.previewKeyring).mockResolvedValue({
      primary: {
        role: "primary",
        fingerprint: "DEADBEEF0123456789ABCDEF0123456789ABCD",
        keyId: "ABCDEF0123456789",
        algorithm: "ed25519",
        capabilities: ["certify", "sign"],
        status: "active",
        openpgpVersion: 4,
      },
      subkeys: [
        {
          role: "subkey",
          fingerprint: "SUBKEYFINGERPRINT0123456789ABCDEF01",
          keyId: "SUBKEYFINGERPRINT",
          algorithm: "cv25519",
          capabilities: ["encrypt"],
          status: "revoked",
          revokedAt: "2026-06-01T00:00:00Z",
          openpgpVersion: 4,
        },
      ],
      warnings: [],
      source: "public",
    })

    renderImportKeyPage()

    await user.type(screen.getByLabelText(/armored public key/i), SAMPLE_PUBLIC_ARMOR)
    await user.click(screen.getByRole("button", { name: /^preview import$/i }))

    await waitFor(() => {
      expect(keysApi.previewKeyring).toHaveBeenCalled()
      expect(screen.getByRole("region", { name: "Import preview" })).toBeInTheDocument()
      expect(screen.getByText("Revoked")).toBeInTheDocument()
    })
    expect(keysApi.register).not.toHaveBeenCalled()
  })

  it("redirects to key detail when re-importing an existing fingerprint syncs keyring", async () => {
    const user = userEvent.setup()
    const { toast } = await import("sonner")

    vi.mocked(keysApi.register).mockResolvedValue({
      id: "existing-primary",
      fingerprint: "DEADBEEF0123456789ABCDEF0123456789ABCD",
      role: "primary",
      status: "revoked",
      registeredSubkeyCount: 0,
    })

    renderImportKeyPage()

    await user.type(screen.getByLabelText(/armored public key/i), SAMPLE_PUBLIC_ARMOR)
    await user.click(getSubmitButton())

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/keys/existing-primary")
      expect(toast.success).toHaveBeenCalledWith(
        "Key imported",
        expect.objectContaining({
          description: expect.stringContaining("DEADBEEF0123456789ABCDEF0123456789ABCD"),
        }),
      )
    })
  })

  it("shows ApiError detail and request id on failure", async () => {
    const user = userEvent.setup()
    vi.mocked(keysApi.register).mockRejectedValue(
      new ApiError({
        operationId: "createKey",
        requestId: "req-import-fail",
        status: 409,
        title: "Conflict",
        detail: "A key with this fingerprint already exists for your account",
      }),
    )

    renderImportKeyPage()

    await user.type(screen.getByLabelText(/armored public key/i), SAMPLE_PUBLIC_ARMOR)
    await user.click(getSubmitButton())

    expect(
      await screen.findByText("A key with this fingerprint already exists for your account"),
    ).toBeInTheDocument()
    expect(screen.getByText(/request id: req-import-fail/i)).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/armored public key/i)).toHaveValue(SAMPLE_PUBLIC_ARMOR)
  })
})
