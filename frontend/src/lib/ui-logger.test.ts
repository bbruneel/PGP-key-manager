import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { isUiDebugEnabled, logUiEvent } from "@/lib/ui-logger"

describe("ui-logger", () => {
  beforeEach(() => {
    vi.spyOn(console, "debug").mockImplementation(() => {})
    vi.spyOn(console, "info").mockImplementation(() => {})
    vi.spyOn(console, "warn").mockImplementation(() => {})
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("formats log prefix with eventId", () => {
    logUiEvent("info", {
      eventId: "createKey.submit",
      message: "Submit started",
    })

    expect(console.info).toHaveBeenCalledWith(
      "[pgp-ui] createKey.submit: Submit started",
      expect.objectContaining({ eventId: "createKey.submit" }),
    )
  })

  it("includes optional metadata in payload", () => {
    logUiEvent("info", {
      eventId: "createKey.apiSuccess",
      message: "Key created",
      keyId: "key-1",
      fingerprint: "ABCD1234",
    })

    expect(console.info).toHaveBeenCalledWith(
      "[pgp-ui] createKey.apiSuccess: Key created",
      expect.objectContaining({
        eventId: "createKey.apiSuccess",
        keyId: "key-1",
        fingerprint: "ABCD1234",
      }),
    )
  })

  it("suppresses debug logs when debug is disabled", () => {
    logUiEvent(
      "debug",
      { eventId: "createKey.pageView", message: "Page viewed" },
      { debugEnabled: false },
    )

    expect(console.debug).not.toHaveBeenCalled()
  })

  it("emits debug logs when debug is enabled", () => {
    logUiEvent(
      "debug",
      { eventId: "createKey.pageView", message: "Page viewed" },
      { debugEnabled: true },
    )

    expect(console.debug).toHaveBeenCalled()
  })

  it("exposes isUiDebugEnabled", () => {
    expect(typeof isUiDebugEnabled()).toBe("boolean")
  })
})
