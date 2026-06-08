import { useAuth0 } from "@auth0/auth0-react"
import { useEffect, type ReactNode } from "react"

import { AuthLoadingScreen } from "@/components/auth/auth-loading-screen"
import { authLoginParams, isRecoverableAuthError } from "@/lib/auth-session"
import { logUiEvent } from "@/lib/ui-logger"

type AuthSessionGuardProps = {
  children: ReactNode
}

/**
 * Recovers broken Auth0 sessions (e.g. stale cache without a refresh token) by
 * redirecting to login instead of leaving the app in a half-authenticated state.
 */
export function AuthSessionGuard({ children }: AuthSessionGuardProps) {
  const { isLoading, error, loginWithRedirect } = useAuth0()
  const shouldRecover = Boolean(error && isRecoverableAuthError(error))

  useEffect(() => {
    if (isLoading || !shouldRecover) {
      return
    }

    logUiEvent("warn", {
      eventId: "auth.sessionRecovery",
      message: "Recovering invalid Auth0 session",
    })

    void loginWithRedirect({
      authorizationParams: authLoginParams("login"),
      appState: {
        returnTo: `${window.location.pathname}${window.location.search}`,
      },
    })
  }, [isLoading, loginWithRedirect, shouldRecover])

  if (isLoading) {
    return <AuthLoadingScreen message="Checking sign-in…" />
  }

  if (shouldRecover) {
    return <AuthLoadingScreen message="Restoring sign in…" />
  }

  return children
}
