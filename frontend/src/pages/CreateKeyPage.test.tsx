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
    info: vi.fn(),
  },
}))

vi.mock("@/lib/keys-api", () => ({
  keysApi: {
    create: vi.fn(),
  },
}))

import { CreateKeyPage } from "@/pages/CreateKeyPage"

function renderCreateKeyPage() {
  return render(
    <MemoryRouter initialEntries={["/keys/new"]}>
      <Routes>
        <Route path="/keys/new" element={<CreateKeyPage />} />
        <Route path="/keys" element={<div>Keys list</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

function getSubmitButton() {
  const form = screen.getByRole("form", { name: /create primary key form/i })
  return within(form).getByRole("button", { name: /^create key$/i })
}

describe("CreateKeyPage", () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    getAccessToken.mockReset()
    navigate.mockReset()
    vi.mocked(keysApi.create).mockReset()
    getAccessToken.mockResolvedValue("access-token")
  })

  it("shows validation errors without calling the API", async () => {
    const user = userEvent.setup()
    renderCreateKeyPage()

    await user.click(getSubmitButton())

    expect(await screen.findByText("Name is required")).toBeInTheDocument()
    expect(keysApi.create).not.toHaveBeenCalled()
  })

  it("creates a key and navigates to /keys on success", async () => {
    const user = userEvent.setup()
    vi.mocked(keysApi.create).mockResolvedValue({
      id: "key-new",
      fingerprint: "ABCD1234EFGH5678",
    })

    renderCreateKeyPage()

    await user.type(screen.getByLabelText(/^name$/i), "Jane Doe")
    await user.type(screen.getByLabelText(/^passphrase$/i), "test-passphrase-1")
    await user.type(screen.getByLabelText(/confirm passphrase/i), "test-passphrase-1")
    await user.click(getSubmitButton())

    await waitFor(() => {
      expect(keysApi.create).toHaveBeenCalledWith({
        accessToken: "access-token",
        body: expect.objectContaining({
          algorithmSpec: { algorithm: "ed25519" },
          userIds: [{ name: "Jane Doe" }],
          passphrase: "test-passphrase-1",
        }),
      })
    })
    expect(navigate).toHaveBeenCalledWith("/keys")
  })

  it("shows ApiError detail and request id on failure", async () => {
    const user = userEvent.setup()
    vi.mocked(keysApi.create).mockRejectedValue(
      new ApiError({
        operationId: "createKey",
        requestId: "req-create-fail",
        status: 400,
        title: "Bad Request",
        detail: "passphrase is required for key generation",
      }),
    )

    renderCreateKeyPage()

    await user.type(screen.getByLabelText(/^name$/i), "Jane Doe")
    await user.type(screen.getByLabelText(/^passphrase$/i), "test-passphrase-1")
    await user.type(screen.getByLabelText(/confirm passphrase/i), "test-passphrase-1")
    await user.click(getSubmitButton())

    expect(await screen.findByText("passphrase is required for key generation")).toBeInTheDocument()
    expect(screen.getByText(/request id: req-create-fail/i)).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
  })
})
