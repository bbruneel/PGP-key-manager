import { useCallback, useState } from "react"
import { Route, Routes, useLocation } from "react-router-dom"

import { requireAuth } from "@/components/auth/require-auth"
import { AppShell } from "@/components/layout/app-shell"
import { auth0Configured } from "@/lib/auth0-env"
import { CreateKeyPage } from "@/pages/CreateKeyPage"
import { KeysPage } from "@/pages/KeysPage"
import { OverviewPage } from "@/pages/OverviewPage"
import type { ApiHealth } from "@/pages/HomePage"

function AppContent() {
  const [apiHealth, setApiHealth] = useState<ApiHealth>("unknown")
  const location = useLocation()
  const handleHealthChange = useCallback((health: ApiHealth) => {
    setApiHealth(health)
  }, [])

  const pageTitle = location.pathname === "/keys/new"
    ? "Create key"
    : location.pathname.startsWith("/keys")
      ? "Keys"
      : "Overview"

  return (
    <AppShell footerStatus={apiHealth} pageTitle={pageTitle}>
      <Routes>
        <Route path="/" element={<OverviewPage onHealthChange={handleHealthChange} />} />
        <Route path="/keys" element={<KeysPage />} />
        <Route path="/keys/new" element={<CreateKeyPage />} />
      </Routes>
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
