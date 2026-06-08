import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { requestJson } from "@/lib/api-client"
import { keysApi } from "@/lib/keys-api"

vi.mock("@/lib/api-client", () => ({
  requestJson: vi.fn(),
}))

describe("keysApi.list", () => {
  beforeEach(() => {
    vi.mocked(requestJson).mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("calls GET /api/keys with listKeys operationId", async () => {
    vi.mocked(requestJson).mockResolvedValue([{ id: "key-1", fingerprint: "ABCD" }])

    const result = await keysApi.list({ accessToken: "token-abc" })

    expect(requestJson).toHaveBeenCalledWith("/api/keys", {
      operationId: "listKeys",
      accessToken: "token-abc",
      method: "GET",
    })
    expect(result).toEqual([{ id: "key-1", fingerprint: "ABCD" }])
  })

  it("appends query filters when provided", async () => {
    vi.mocked(requestJson).mockResolvedValue([])

    await keysApi.list({
      accessToken: "token-abc",
      role: "primary",
      status: "active",
      capability: "sign",
    })

    expect(requestJson).toHaveBeenCalledWith(
      "/api/keys?role=primary&status=active&capability=sign",
      expect.objectContaining({ operationId: "listKeys" }),
    )
  })
})

describe("keysApi.create", () => {
  beforeEach(() => {
    vi.mocked(requestJson).mockReset()
  })

  it("calls POST /api/keys with createKey operationId", async () => {
    const body = {
      label: "Work key",
      algorithmSpec: { algorithm: "ed25519" as const },
      userIds: [{ name: "Jane Doe", email: "jane@example.com" }],
      validity: { expiresAt: "2030-06-01T00:00:00Z" },
      passphrase: "test-passphrase-1",
      openpgpVersion: 4 as const,
    }
    vi.mocked(requestJson).mockResolvedValue({ id: "key-new", fingerprint: "ABCD1234" })

    const result = await keysApi.create({ accessToken: "token-abc", body })

    expect(requestJson).toHaveBeenCalledWith("/api/keys", {
      operationId: "createKey",
      accessToken: "token-abc",
      method: "POST",
      body,
    })
    expect(result).toEqual({ id: "key-new", fingerprint: "ABCD1234" })
  })
})
