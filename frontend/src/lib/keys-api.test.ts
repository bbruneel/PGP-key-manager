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
