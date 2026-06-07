import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { isApiDebugEnabled, logApiEvent } from "@/lib/logger"

describe("logApiEvent", () => {
  beforeEach(() => {
    vi.spyOn(console, "info").mockImplementation(() => {})
    vi.spyOn(console, "warn").mockImplementation(() => {})
    vi.spyOn(console, "debug").mockImplementation(() => {})
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("logs info with pgp-api prefix and instrumentation fields", () => {
    logApiEvent("info", {
      operationId: "listKeys",
      requestId: "rid-1",
      path: "/api/keys",
      status: 200,
      message: "Listed keys successfully",
    })

    expect(console.info).toHaveBeenCalledOnce()
    const [prefix, payload] = vi.mocked(console.info).mock.calls[0]!
    expect(prefix).toContain("[pgp-api]")
    expect(prefix).toContain("Listed keys successfully")
    expect(payload).toMatchObject({
      operationId: "listKeys",
      requestId: "rid-1",
      path: "/api/keys",
      status: 200,
    })
  })

  it("suppresses debug logs when debug logging is disabled", () => {
    logApiEvent(
      "debug",
      {
        operationId: "getHello",
        requestId: "rid-2",
        message: "Debug detail",
      },
      { debugEnabled: false },
    )

    expect(console.debug).not.toHaveBeenCalled()
  })

  it("emits debug logs when debug logging is enabled", () => {
    logApiEvent(
      "debug",
      {
        operationId: "getHello",
        requestId: "rid-3",
        message: "Debug detail",
      },
      { debugEnabled: true },
    )

    expect(console.debug).toHaveBeenCalledOnce()
  })

  it("reports whether debug logging is enabled", () => {
    expect(typeof isApiDebugEnabled()).toBe("boolean")
  })
})
