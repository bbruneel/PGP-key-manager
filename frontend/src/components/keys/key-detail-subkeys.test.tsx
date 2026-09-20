import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

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

  afterEach(() => {
    cleanup()
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

  it("shows Primary key is revoked hint when primaryRevoked", async () => {
    vi.mocked(keysApi.listSubkeys).mockResolvedValue([
      {
        id: "sub-1",
        fingerprint: "SUBKEYFINGERPRINT",
        keyId: "1234ABCD",
        capabilities: ["encrypt"],
        status: "revoked",
        expiresAt: null,
      },
    ])

    render(
      <MemoryRouter>
        <KeyDetailSubkeys
          primaryKeyId="primary-1"
          getAccessToken={getAccessToken}
          primaryRevoked
        />
      </MemoryRouter>,
    )

    expect(await screen.findByText("SUBKEYFINGERPRINT")).toBeInTheDocument()
    expect(screen.getByText(/encrypt · Does not expire · Revoked/)).toBeInTheDocument()
    expect(screen.getByText("Primary key is revoked")).toBeInTheDocument()
    expect(screen.getByText("Primary key is revoked")).toHaveAttribute(
      "data-pgp-ui",
      "keyDetail.subkeys.primaryRevoked",
    )
  })

  it("does not show primary-revoked hint by default", async () => {
    vi.mocked(keysApi.listSubkeys).mockResolvedValue([
      {
        id: "sub-1",
        fingerprint: "SUBKEYFINGERPRINT",
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
    expect(screen.queryByText("Primary key is revoked")).not.toBeInTheDocument()
  })
})
