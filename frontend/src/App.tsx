import { useCallback, useState } from "react"
import { Route, Routes, useLocation } from "react-router-dom"

import { AuthSessionGuard } from "@/components/auth/auth-session-guard"
import { requireAuth } from "@/components/auth/require-auth"
import { AppShell } from "@/components/layout/app-shell"
import { auth0Configured } from "@/lib/auth0-env"
import { CreateKeyPage } from "@/pages/CreateKeyPage"
import { ImportKeyPage } from "@/pages/ImportKeyPage"
import { KeyDetailPage } from "@/pages/KeyDetailPage"
import { KeysPage } from "@/pages/KeysPage"
import { OverviewPage } from "@/pages/OverviewPage"
import { PoliciesPage } from "@/pages/PoliciesPage"
import { SettingsPage } from "@/pages/SettingsPage"
import type { ApiHealth } from "@/pages/HomePage"

function resolvePageTitle(pathname: string): string {
  if (pathname === "/keys/new") {
    return "Create key"
  }
  if (pathname === "/keys/import") {
    return "Import key"
  }
  if (
    /^\/keys\/[^/]+$/.test(pathname) &&
    pathname !== "/keys/new" &&
    pathname !== "/keys/import"
  ) {
    return "Key detail"
  }
  if (pathname.startsWith("/keys")) {
    return "Keys"
  }
  if (pathname === "/policies") {
    return "Policies"
  }
  if (pathname === "/settings") {
    return "Settings"
  }
  return "Overview"
}

function AppContent() {
  const [apiHealth, setApiHealth] = useState<ApiHealth>("unknown")
  const location = useLocation()
  const handleHealthChange = useCallback((health: ApiHealth) => {
    setApiHealth(health)
  }, [])

  const pageTitle = resolvePageTitle(location.pathname)

  return (
    <AppShell footerStatus={apiHealth} pageTitle={pageTitle}>
      <Routes>
        <Route path="/" element={<OverviewPage onHealthChange={handleHealthChange} />} />
        <Route path="/keys" element={<KeysPage />} />
        <Route path="/keys/new" element={<CreateKeyPage />} />
        <Route path="/keys/import" element={<ImportKeyPage />} />
        <Route path="/keys/:id" element={<KeyDetailPage />} />
        <Route path="/policies" element={<PoliciesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </AppShell>
  )
}

const AuthenticatedAppContent = requireAuth(AppContent)

export function App() {
  if (auth0Configured()) {
    return (
      <AuthSessionGuard>
        <AuthenticatedAppContent />
      </AuthSessionGuard>
    )
  }
  return <AppContent />
}
