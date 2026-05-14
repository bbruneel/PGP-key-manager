import type { ReactNode } from "react"

import { Auth0Provider } from "@auth0/auth0-react"

import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { auth0Configured } from "@/lib/auth0-env"

function Auth0Shell({ children }: { children: ReactNode }) {
  if (!auth0Configured()) {
    return children
  }
  const domain = import.meta.env.VITE_AUTH0_DOMAIN
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE

  return (
    <Auth0Provider
      domain={domain!}
      clientId={clientId!}
      authorizationParams={{
        audience: audience || undefined,
        redirect_uri: window.location.origin,
      }}
      cacheLocation="localstorage"
      useRefreshTokens
    >
      {children}
    </Auth0Provider>
  )
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <Auth0Shell>
        {children}
        <Toaster richColors closeButton position="top-center" />
      </Auth0Shell>
    </ThemeProvider>
  )
}
