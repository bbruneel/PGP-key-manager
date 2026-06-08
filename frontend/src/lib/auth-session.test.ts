import { describe, expect, it } from "vitest"

import { AUTH0_SCOPE, authLoginParams, isRecoverableAuthError } from "@/lib/auth-session"

describe("auth-session", () => {
  it("exports offline_access scope", () => {
    expect(AUTH0_SCOPE).toContain("offline_access")
  })

  it("detects missing refresh token as recoverable", () => {
    expect(
      isRecoverableAuthError(
        new Error(
          "Missing Refresh Token (audience: 'https://api.example.com', scope: 'openid profile email offline_access')",
        ),
      ),
    ).toBe(true)
  })

  it("detects login_required as recoverable", () => {
    expect(isRecoverableAuthError(new Error("login_required"))).toBe(true)
  })

  it("ignores unrelated errors", () => {
    expect(isRecoverableAuthError(new Error("Network request failed"))).toBe(false)
  })

  it("builds login params with scope and optional prompt", () => {
    expect(authLoginParams()).toEqual({ scope: AUTH0_SCOPE })
    expect(authLoginParams("login")).toEqual({ scope: AUTH0_SCOPE, prompt: "login" })
  })
})
