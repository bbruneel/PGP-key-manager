import { useCallback, useState } from "react"

import { AppShell } from "@/components/layout/app-shell"
import { auth0Configured } from "@/lib/auth0-env"
import { HomeAuthPanel, HomeAuthPlaceholder } from "@/pages/HomeAuthPanel"
import { HomePage, type ApiHealth } from "@/pages/HomePage"

export function App() {
  const [apiHealth, setApiHealth] = useState<ApiHealth>("unknown")
  const handleHealthChange = useCallback((health: ApiHealth) => {
    setApiHealth(health)
  }, [])

  return (
    <AppShell footerStatus={apiHealth}>
      <HomePage onHealthChange={handleHealthChange} />
      {auth0Configured() ? <HomeAuthPanel /> : <HomeAuthPlaceholder />}
    </AppShell>
  )
}
