import { useCallback, useState } from "react"

import { requireAuth } from "@/components/auth/require-auth"
import { AppShell } from "@/components/layout/app-shell"
import { auth0Configured } from "@/lib/auth0-env"
import { HomeAuthPanel, HomeAuthPlaceholder } from "@/pages/HomeAuthPanel"
import { HomeKeysPanel } from "@/pages/HomeKeysPanel"
import { HomePage, type ApiHealth } from "@/pages/HomePage"

function AppContent() {
  const [apiHealth, setApiHealth] = useState<ApiHealth>("unknown")
  const handleHealthChange = useCallback((health: ApiHealth) => {
    setApiHealth(health)
  }, [])

  return (
    <AppShell footerStatus={apiHealth}>
      <HomePage onHealthChange={handleHealthChange} />
      {auth0Configured() ? <HomeAuthPanel /> : <HomeAuthPlaceholder />}
      <HomeKeysPanel />
    </AppShell>
  )
}

const AuthenticatedAppContent = requireAuth(AppContent)

export function App() {
  if (auth0Configured()) {
    return <AuthenticatedAppContent />
  }
  return <AppContent />
}
