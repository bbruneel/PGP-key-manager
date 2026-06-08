import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const loginWithRedirect = vi.fn()

vi.mock("@auth0/auth0-react", () => ({
  useAuth0: () => ({
    isLoading: false,
    error: new Error(
      "Missing Refresh Token (audience: 'https://api.example.com', scope: 'openid profile email offline_access')",
    ),
    loginWithRedirect,
  }),
}))

vi.mock("@/lib/ui-logger", () => ({
  logUiEvent: vi.fn(),
}))

import { AuthSessionGuard } from "@/components/auth/auth-session-guard"

describe("AuthSessionGuard", () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    loginWithRedirect.mockReset()
    loginWithRedirect.mockResolvedValue(undefined)
  })

  it("redirects to login when session error is recoverable", async () => {
    render(
      <AuthSessionGuard>
        <div>Protected content</div>
      </AuthSessionGuard>,
    )

    expect(screen.getByText("Restoring sign in…")).toBeInTheDocument()
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument()

    await vi.waitFor(() => {
      expect(loginWithRedirect).toHaveBeenCalledWith(
        expect.objectContaining({
          authorizationParams: expect.objectContaining({
            scope: expect.stringContaining("offline_access"),
            prompt: "login",
          }),
        }),
      )
    })
  })
})
