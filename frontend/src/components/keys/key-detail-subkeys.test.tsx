import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { keysApi } from "@/lib/keys-api"

vi.mock("@/lib/keys-api", () => ({
  keysApi: {
    listSubkeys: vi.fn(),
  },
}))

import { KeyDetailSubkeys } from "@/components/keys/key-detail-subkeys"

describe("KeyDetailSubkeys", () => {
  const getAccessToken = vi.fn()

  beforeEach(() => {
    getAccessToken.mockReset()
    vi.mocked(keysApi.listSubkeys).mockReset()
    getAccessToken.mockResolvedValue("access-token")
  })

  it("renders subkeys from listSubkeys", async () => {
    vi.mocked(keysApi.listSubkeys).mockResolvedValue([
      {
        id: "sub-1",
        fingerprint: "SUBKEYFINGERPRINT",
        keyId: "1234ABCD",
        capabilities: ["encrypt"],
        status: "active",
        expiresAt: null,
      },
    ])

    render(
      <MemoryRouter>
        <KeyDetailSubkeys primaryKeyId="primary-1" getAccessToken={getAccessToken} />
      </MemoryRouter>,
    )

    expect(await screen.findByText("SUBKEYFINGERPRINT")).toBeInTheDocument()
    expect(screen.getByText(/encrypt · Does not expire · Active/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute("href", "/keys/sub-1")
    expect(keysApi.listSubkeys).toHaveBeenCalledWith({
      accessToken: "access-token",
      primaryKeyId: "primary-1",
    })
  })

  it("shows empty state when no subkeys", async () => {
    vi.mocked(keysApi.listSubkeys).mockResolvedValue([])

    render(
      <MemoryRouter>
        <KeyDetailSubkeys primaryKeyId="primary-1" getAccessToken={getAccessToken} />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText(/no subkeys yet/i)).toBeInTheDocument()
      expect(screen.getByText(/add subkey form below/i)).toBeInTheDocument()
    })
  })
})
