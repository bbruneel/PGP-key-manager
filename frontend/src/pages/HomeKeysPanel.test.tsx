import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api-error"
import { keysApi } from "@/lib/keys-api"

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
    list: vi.fn(),
  },
}))

import { HomeKeysPanel } from "@/pages/HomeKeysPanel"

describe("HomeKeysPanel", () => {
  beforeEach(() => {
    getAccessToken.mockReset()
    vi.mocked(keysApi.list).mockReset()
    getAccessToken.mockResolvedValue("access-token")
  })

  it("renders keys from keysApi.list", async () => {
    vi.mocked(keysApi.list).mockResolvedValue([
      {
        id: "key-1",
        label: "Work key",
        fingerprint: "ABCD1234",
        keyType: "private",
        algorithm: "ed25519",
      },
    ])

    render(
      <MemoryRouter>
        <HomeKeysPanel />
      </MemoryRouter>,
    )

    expect(await screen.findByText("Work key")).toBeInTheDocument()
    expect(screen.getByText("ABCD1234")).toBeInTheDocument()
    expect(keysApi.list).toHaveBeenCalledWith({ accessToken: "access-token" })
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

    render(
      <MemoryRouter>
        <HomeKeysPanel />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText("Invalid token")).toBeInTheDocument()
    })
    expect(screen.getByText(/request id: req-fail-1/i)).toBeInTheDocument()
    expect(screen.queryByText(/HTTP 401/i)).not.toBeInTheDocument()
  })

  it("shows create and import key links", async () => {
    vi.mocked(keysApi.list).mockResolvedValue([])

    render(
      <MemoryRouter>
        <HomeKeysPanel />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getAllByRole("link", { name: /create key/i }).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByRole("link", { name: /import key/i }).length).toBeGreaterThanOrEqual(1)
    })
  })
})
