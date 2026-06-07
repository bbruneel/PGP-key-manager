import { withAuthenticationRequired } from "@auth0/auth0-react"
import type { ComponentType } from "react"

import { AuthLoadingScreen } from "@/components/auth/auth-loading-screen"

/**
 * Wraps a page when Auth0 is configured. Unauthenticated visitors are redirected to Auth0 login.
 */
export function requireAuth<P extends object>(Component: ComponentType<P>): ComponentType<P> {
  return withAuthenticationRequired(Component, {
    onRedirecting: () => <AuthLoadingScreen message="Redirecting to sign in…" />,
  })
}
