import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { logApiEvent } from "@/lib/logger"

const getAccessTokenSilently = vi.fn()
const loginWithRedirect = vi.fn()
const authState = vi.hoisted(() => ({
  isAuthenticated: true,
  isLoading: false,
  error: undefined as Error | undefined,
}))

vi.mock("@auth0/auth0-react", () => ({
  useAuth0: () => ({
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    getAccessTokenSilently,
    loginWithRedirect,
    error: authState.error,
  }),
}))

vi.mock("@/lib/auth0-env", () => ({
  auth0Configured: () => true,
}))

vi.mock("@/lib/logger", () => ({
  logApiEvent: vi.fn(),
}))

import { useApiAccessToken } from "@/hooks/use-api-access-token"

describe("useApiAccessToken", () => {
  beforeEach(() => {
    authState.isAuthenticated = true
    authState.isLoading = false
    authState.error = undefined
    getAccessTokenSilently.mockReset()
    loginWithRedirect.mockReset()
    loginWithRedirect.mockResolvedValue(undefined)
    vi.mocked(logApiEvent).mockClear()
  })

  it("returns token when authenticated", async () => {
    getAccessTokenSilently.mockResolvedValue("access-token-xyz")

    const { result } = renderHook(() => useApiAccessToken())
    const token = await result.current.getAccessToken()

    expect(token).toBe("access-token-xyz")
    expect(logApiEvent).toHaveBeenCalledWith(
      "debug",
      expect.objectContaining({
        operationId: "auth.getAccessToken",
        message: "Access token acquired",
      }),
    )
  })

  it("throws when not authenticated", async () => {
    authState.isAuthenticated = false

    const { result } = renderHook(() => useApiAccessToken())

    await expect(result.current.getAccessToken()).rejects.toThrow("Sign in to continue")
  })

  it("surfaces Auth0 errors with human-readable message", async () => {
    getAccessTokenSilently.mockRejectedValue(new Error("login_required"))

    const { result } = renderHook(() => useApiAccessToken())

    await expect(result.current.getAccessToken()).rejects.toThrow("login_required")
    expect(loginWithRedirect).toHaveBeenCalledWith(
      expect.objectContaining({
        authorizationParams: expect.objectContaining({
          scope: expect.stringContaining("offline_access"),
          prompt: "login",
        }),
      }),
    )
    expect(logApiEvent).toHaveBeenCalledWith(
      "error",
      expect.objectContaining({
        operationId: "auth.getAccessToken",
        message: "Failed to acquire access token",
      }),
    )
  })
})
