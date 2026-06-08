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
  },
}))

import { ImportKeyPage } from "@/pages/ImportKeyPage"

const SAMPLE_PUBLIC_ARMOR = `-----BEGIN PGP PUBLIC KEY BLOCK-----
Version: Test

mQENBGexample
-----END PGP PUBLIC KEY BLOCK-----`

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
    getAccessToken.mockResolvedValue("access-token")
  })

  it("shows validation errors without calling the API", async () => {
    const user = userEvent.setup()
    renderImportKeyPage()

    await user.click(getSubmitButton())

    expect(await screen.findByText("Fingerprint is required")).toBeInTheDocument()
    expect(keysApi.register).not.toHaveBeenCalled()
  })

  it("imports a public key and navigates to /keys on success", async () => {
    const user = userEvent.setup()
    vi.mocked(keysApi.register).mockResolvedValue({
      id: "key-imported",
      fingerprint: "DEADBEEF0123456789ABCDEF0123456789ABCD",
    })

    renderImportKeyPage()

    await user.type(screen.getByLabelText(/fingerprint/i), "deadbeef0123456789abcdef0123456789abcd")
    await user.type(screen.getByLabelText(/armored public key/i), SAMPLE_PUBLIC_ARMOR)
    await user.click(getSubmitButton())

    await waitFor(() => {
      expect(keysApi.register).toHaveBeenCalledWith({
        accessToken: "access-token",
        body: expect.objectContaining({
          fingerprint: "DEADBEEF0123456789ABCDEF0123456789ABCD",
          keyType: "public",
          armoredPublic: SAMPLE_PUBLIC_ARMOR,
        }),
      })
    })

    const registerCall = vi.mocked(keysApi.register).mock.calls[0]![0]
    expect(registerCall.body).not.toHaveProperty("passphrase")
    expect(registerCall.body).not.toHaveProperty("algorithmSpec")
    expect(navigate).toHaveBeenCalledWith("/keys")
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

    await user.type(screen.getByLabelText(/fingerprint/i), "deadbeef0123456789abcdef0123456789abcd")
    await user.type(screen.getByLabelText(/armored public key/i), SAMPLE_PUBLIC_ARMOR)
    await user.click(getSubmitButton())

    expect(
      await screen.findByText("A key with this fingerprint already exists for your account"),
    ).toBeInTheDocument()
    expect(screen.getByText(/request id: req-import-fail/i)).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
  })
})
