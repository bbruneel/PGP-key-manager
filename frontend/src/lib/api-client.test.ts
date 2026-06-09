import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api-error"
import { requestJson, requestText } from "@/lib/api-client"
import { logApiEvent } from "@/lib/logger"

vi.mock("@/lib/logger", () => ({
  logApiEvent: vi.fn(),
}))

describe("requestJson", () => {
  const originalBaseUrl = import.meta.env.VITE_API_BASE_URL

  beforeEach(() => {
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8080")
    vi.mocked(logApiEvent).mockClear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    if (originalBaseUrl !== undefined) {
      vi.stubEnv("VITE_API_BASE_URL", originalBaseUrl)
    }
  })

  it("returns parsed JSON and logs success with response request id", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({
        "content-type": "application/json",
        "x-request-id": "server-rid-1",
      }),
      json: async () => ({ message: "ok" }),
    } as Response)
    vi.stubGlobal("fetch", fetchMock)

    const data = await requestJson<{ message: string }>("/api/hello", {
      operationId: "getHello",
      requestId: "client-rid-1",
    })

    expect(data).toEqual({ message: "ok" })
    expect(fetchMock).toHaveBeenCalledOnce()
    const [, init] = fetchMock.mock.calls[0]!
    const headers = init?.headers as Headers
    expect(headers.get("Accept")).toBe("application/json; version=1")
    expect(headers.get("X-Request-Id")).toBe("client-rid-1")

    expect(logApiEvent).toHaveBeenCalledWith(
      "info",
      expect.objectContaining({
        operationId: "getHello",
        requestId: "server-rid-1",
        status: 200,
      }),
    )
  })

  it("sends Authorization and Content-Type when body is provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      headers: new Headers({ "x-request-id": "server-rid-2" }),
      json: async () => ({ id: "key-1" }),
    } as Response)
    vi.stubGlobal("fetch", fetchMock)

    await requestJson("/api/keys", {
      operationId: "createKey",
      method: "POST",
      accessToken: "token-123",
      body: { label: "Test" },
    })

    const [, init] = fetchMock.mock.calls[0]!
    const headers = init?.headers as Headers
    expect(headers.get("Authorization")).toBe("Bearer token-123")
    expect(headers.get("Content-Type")).toBe("application/json")
    expect(init?.body).toBe(JSON.stringify({ label: "Test" }))
  })

  it("throws ApiError with parsed detail on failure", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers({
        "content-type": "application/problem+json",
        "x-request-id": "server-rid-3",
      }),
      json: async () => ({
        title: "Unauthorized",
        status: 401,
        detail: "Invalid token",
      }),
    } as Response)
    vi.stubGlobal("fetch", fetchMock)

    await expect(
      requestJson("/api/keys", { operationId: "listKeys", accessToken: "bad" }),
    ).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
      detail: "Invalid token",
      requestId: "server-rid-3",
    } satisfies Partial<ApiError>)

    expect(logApiEvent).toHaveBeenCalledWith(
      "warn",
      expect.objectContaining({
        operationId: "listKeys",
        requestId: "server-rid-3",
        status: 401,
      }),
    )
  })

  it("propagates missing VITE_API_BASE_URL error", async () => {
    vi.unstubAllEnvs()
    vi.stubEnv("VITE_API_BASE_URL", "")

    await expect(requestJson("/api/hello", { operationId: "getHello" })).rejects.toThrow(
      "VITE_API_BASE_URL is not set",
    )
  })
})

describe("requestText", () => {
  const originalBaseUrl = import.meta.env.VITE_API_BASE_URL

  beforeEach(() => {
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8080")
    vi.mocked(logApiEvent).mockClear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    if (originalBaseUrl !== undefined) {
      vi.stubEnv("VITE_API_BASE_URL", originalBaseUrl)
    }
  })

  it("returns response body text and logs success with operationId and requestId", async () => {
    const armored = "-----BEGIN PGP PUBLIC KEY BLOCK-----\n\nmQENBGexample\n-----END PGP PUBLIC KEY BLOCK-----"
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({
        "content-type": "application/pgp-keys",
        "x-request-id": "server-rid-export",
      }),
      text: async () => armored,
    } as Response)
    vi.stubGlobal("fetch", fetchMock)

    const data = await requestText("/api/keys/key-1/export-public", {
      operationId: "exportPublicKey",
      accessToken: "token-abc",
      requestId: "client-rid-export",
    })

    expect(data).toBe(armored)
    expect(logApiEvent).toHaveBeenCalledWith(
      "info",
      expect.objectContaining({
        operationId: "exportPublicKey",
        requestId: "server-rid-export",
        status: 200,
      }),
    )
  })

  it("throws ApiError on failure", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers({
        "content-type": "application/problem+json",
        "x-request-id": "server-rid-missing",
      }),
      json: async () => ({
        title: "Not Found",
        status: 404,
        detail: "Key not found",
      }),
    } as Response)
    vi.stubGlobal("fetch", fetchMock)

    await expect(
      requestText("/api/keys/missing/export-public", {
        operationId: "exportPublicKey",
        accessToken: "token-abc",
      }),
    ).rejects.toMatchObject({
      name: "ApiError",
      status: 404,
      detail: "Key not found",
      requestId: "server-rid-missing",
    } satisfies Partial<ApiError>)

    expect(logApiEvent).toHaveBeenCalledWith(
      "warn",
      expect.objectContaining({
        operationId: "exportPublicKey",
        requestId: "server-rid-missing",
        status: 404,
      }),
    )
  })
})
