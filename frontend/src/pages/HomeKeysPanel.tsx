import { useAuth0 } from "@auth0/auth0-react"
import { useCallback, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api"
import { auth0Configured } from "@/lib/auth0-env"

export type PgpKeySummary = {
  id: string
  label: string | null
  fingerprint: string
  keyId: string | null
  keyType: string
  algorithm: string | null
  expiresAt: string | null
}

export function HomeKeysPanel() {
  const auth0 = useAuth0()
  const [keys, setKeys] = useState<PgpKeySummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const loadKeys = useCallback(async () => {
    if (!auth0Configured() || !auth0.isAuthenticated) {
      return
    }
    setLoading(true)
    setError(null)
    try {
      const token = await auth0.getAccessTokenSilently()
      const res = await apiFetch("/api/keys", { method: "GET", accessToken: token })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data = (await res.json()) as PgpKeySummary[]
      setKeys(data)
    } catch (e) {
      setKeys([])
      setError(e instanceof Error ? e.message : "Failed to load keys")
    } finally {
      setLoading(false)
    }
  }, [auth0])

  useEffect(() => {
    queueMicrotask(() => {
      void loadKeys()
    })
  }, [loadKeys])

  if (!auth0Configured()) {
    return (
      <section className="rounded-lg border border-dashed border-border bg-card/50 p-6 text-sm md:p-8">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">PGP keys</h2>
        <p className="mt-2 text-muted-foreground">
          Configure Auth0 to list and manage keys stored in Supabase via the API.
        </p>
      </section>
    )
  }

  if (!auth0.isAuthenticated) {
    return (
      <section className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm md:p-8">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">PGP keys</h2>
        <p className="mt-2 text-sm text-muted-foreground">Sign in to view keys synced to your account.</p>
      </section>
    )
  }

  return (
    <section className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm md:p-8">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">PGP keys</h2>
          <p className="mt-1 text-sm text-muted-foreground">Keys stored in Supabase for your account.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="transition-colors duration-200"
          onClick={() => void loadKeys()}
        >
          Refresh
        </Button>
      </header>

      {loading && <p className="text-sm text-muted-foreground">Loading keys…</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!loading && !error && keys.length === 0 && (
        <p className="text-sm text-muted-foreground">No keys yet. Create one via the API or a future import flow.</p>
      )}
      {!loading && keys.length > 0 && (
        <ul className="space-y-3">
          {keys.map((key) => (
            <li
              key={key.id}
              className="rounded-md border border-input bg-background px-3 py-2.5 text-sm"
            >
              <p className="font-medium text-foreground">{key.label ?? "Unlabeled key"}</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{key.fingerprint}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {key.keyType}
                {key.algorithm ? ` · ${key.algorithm}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
