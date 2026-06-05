import { useCallback, useState } from "react"
import { Route, Routes, useLocation } from "react-router-dom"

import { AppShell } from "@/components/layout/app-shell"
import { OverviewPage } from "@/pages/OverviewPage"
import { KeysPage } from "@/pages/KeysPage"
import type { ApiHealth } from "@/pages/HomePage"

function AppRoutes() {
  const [apiHealth, setApiHealth] = useState<ApiHealth>("unknown")
  const location = useLocation()
  const handleHealthChange = useCallback((health: ApiHealth) => {
    setApiHealth(health)
  }, [])

  const pageTitle = location.pathname.startsWith("/keys") ? "Keys" : "Overview"

  return (
    <AppShell footerStatus={apiHealth} pageTitle={pageTitle}>
      <Routes>
        <Route path="/" element={<OverviewPage onHealthChange={handleHealthChange} />} />
        <Route path="/keys" element={<KeysPage />} />
      </Routes>
    </AppShell>
  )
}

export function App() {
  return <AppRoutes />
}
