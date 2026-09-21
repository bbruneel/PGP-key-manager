import { useAuth0 } from "@auth0/auth0-react"
import { useCallback } from "react"

import { auth0Configured } from "@/lib/auth0-env"
import { authLoginParams, isRecoverableAuthError } from "@/lib/auth-session"
import { logApiEvent } from "@/lib/logger"
import { logUiEvent } from "@/lib/ui-logger"

/**
 * Acquires Auth0 access tokens for protected API routes.
 * Returns clear error state when Auth0 is not configured or the user is not signed in.
 */
export function useApiAccessToken() {
  const {
    isAuthenticated,
    isLoading,
    error,
    getAccessTokenSilently,
    loginWithRedirect,
  } = useAuth0()
  const isConfigured = auth0Configured()

  const getAccessToken = useCallback(async (): Promise<string> => {
    if (!isConfigured) {
      throw new Error("Auth0 is not configured")
    }
    if (!isAuthenticated) {
      throw new Error("Sign in to continue")
    }
    try {
      const token = await getAccessTokenSilently()
      if (!token) {
        throw new Error("Failed to acquire access token")
      }
      logApiEvent("debug", {
        operationId: "auth.getAccessToken",
        message: "Access token acquired",
      })
      return token
    } catch (tokenError) {
      logApiEvent("error", {
        operationId: "auth.getAccessToken",
        message: "Failed to acquire access token",
      })

      if (isRecoverableAuthError(tokenError)) {
        logUiEvent("warn", {
          eventId: "auth.sessionRecovery",
          message: "Redirecting to sign in after token acquisition failure",
        })
        await loginWithRedirect({
          authorizationParams: authLoginParams("login"),
          appState: {
            returnTo: `${window.location.pathname}${window.location.search}`,
          },
        })
      }

      throw tokenError instanceof Error ? tokenError : new Error("Failed to acquire access token")
    }
  }, [getAccessTokenSilently, isAuthenticated, isConfigured, loginWithRedirect])

  return {
    getAccessToken,
    isAuthenticated,
    isConfigured,
    isLoading,
    authError: error?.message ?? null,
  }
}
