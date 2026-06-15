import { useCallback, useState } from "react"
import { Route, Routes, useLocation } from "react-router-dom"

import { AuthSessionGuard } from "@/components/auth/auth-session-guard"
import { requireAuth } from "@/components/auth/require-auth"
import { AppShell } from "@/components/layout/app-shell"
import { auth0Configured } from "@/lib/auth0-env"
import { CreateGroupPage } from "@/pages/CreateGroupPage"
import { CreateKeyPage } from "@/pages/CreateKeyPage"
import { GroupKeysPage } from "@/pages/GroupKeysPage"
import { GroupMembersPage } from "@/pages/GroupMembersPage"
import { ImportKeyPage } from "@/pages/ImportKeyPage"
import { KeyDetailPage } from "@/pages/KeyDetailPage"
import { KeysPage } from "@/pages/KeysPage"
import { OverviewPage } from "@/pages/OverviewPage"
import { PoliciesPage } from "@/pages/PoliciesPage"
import { SettingsPage } from "@/pages/SettingsPage"
import { GroupProvider } from "@/providers/group-context"
import type { ApiHealth } from "@/pages/HomePage"

function resolvePageTitle(pathname: string): string {
  if (pathname === "/keys/new") {
    return "Create key"
  }
  if (pathname === "/groups/new") {
    return "Create group"
  }
  if (pathname === "/keys/import") {
    return "Import key"
  }
  if (/^\/groups\/[^/]+\/members$/.test(pathname)) {
    return "Group members"
  }
  if (/^\/groups\/[^/]+\/keys$/.test(pathname)) {
    return "Team vault keys"
  }
  if (
    /^\/keys\/[^/]+$/.test(pathname) &&
    pathname !== "/keys/new" &&
    pathname !== "/keys/import"
  ) {
    return "Key detail"
  }
  if (pathname.startsWith("/keys")) {
    return "Personal vault"
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
    <GroupProvider>
      <AppShell footerStatus={apiHealth} pageTitle={pageTitle}>
        <Routes>
          <Route path="/" element={<OverviewPage onHealthChange={handleHealthChange} />} />
          <Route path="/keys" element={<KeysPage />} />
          <Route path="/keys/new" element={<CreateKeyPage />} />
          <Route path="/keys/import" element={<ImportKeyPage />} />
          <Route path="/keys/:id" element={<KeyDetailPage />} />
          <Route path="/groups/new" element={<CreateGroupPage />} />
          <Route path="/groups/:groupId/members" element={<GroupMembersPage />} />
          <Route path="/groups/:groupId/keys" element={<GroupKeysPage />} />
          <Route path="/policies" element={<PoliciesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </AppShell>
    </GroupProvider>
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
