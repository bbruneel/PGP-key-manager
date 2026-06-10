import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { useApiAccessToken } from "@/hooks/use-api-access-token"
import { ApiError, getApiErrorMessage } from "@/lib/api-error"
import { formatCapabilities, formatKeyExpiry } from "@/lib/key-display"
import { keysApi } from "@/lib/keys-api"
import type { PgpKeySummary } from "@/types/api"

export function HomeKeysPanel() {
  const { getAccessToken, isAuthenticated, isConfigured, authError } = useApiAccessToken()
  const [keys, setKeys] = useState<PgpKeySummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const loadKeys = useCallback(async () => {
    if (!isConfigured || !isAuthenticated) {
      return
    }
    setLoading(true)
    setError(null)
    setRequestId(null)
    try {
      const token = await getAccessToken()
      const data = await keysApi.list({ accessToken: token, role: "primary" })
      setKeys(data)
    } catch (e) {
      setKeys([])
      setError(getApiErrorMessage(e))
      if (e instanceof ApiError && e.requestId) {
        setRequestId(e.requestId)
      }
    } finally {
      setLoading(false)
    }
  }, [getAccessToken, isAuthenticated, isConfigured])

  useEffect(() => {
    queueMicrotask(() => {
      void loadKeys()
    })
  }, [loadKeys])

  if (!isConfigured) {
    return (
      <section className="rounded-lg border border-dashed border-border bg-card/50 p-6 text-sm md:p-8">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">PGP keys</h2>
        <p className="mt-2 text-muted-foreground">
          Configure Auth0 to list and manage keys stored in Supabase via the API.
        </p>
      </section>
    )
  }

  if (!isAuthenticated) {
    return (
      <section className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm md:p-8">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">PGP keys</h2>
        <p className="mt-2 text-sm text-muted-foreground">Sign in to view keys synced to your account.</p>
        {authError ? <p className="mt-2 text-sm text-destructive">{authError}</p> : null}
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
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="default" className="transition-colors duration-200" asChild>
            <Link to="/keys/new">Create key</Link>
          </Button>
          <Button type="button" variant="outline" className="transition-colors duration-200" asChild>
            <Link to="/keys/import">Import key</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="transition-colors duration-200"
            onClick={() => void loadKeys()}
          >
            Refresh
          </Button>
        </div>
      </header>

      {loading && <p className="text-sm text-muted-foreground">Loading keys…</p>}
      {error && (
        <div className="text-sm text-destructive">
          <p>{error}</p>
          {requestId ? (
            <p className="mt-1 text-xs text-muted-foreground">Request ID: {requestId}</p>
          ) : null}
        </div>
      )}
      {!loading && !error && keys.length === 0 && (
        <div className="text-sm text-muted-foreground">
          <p>No keys yet. Create a new key or import an existing one to get started.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="default" asChild>
              <Link to="/keys/new">Create key</Link>
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link to="/keys/import">Import key</Link>
            </Button>
          </div>
        </div>
      )}
      {!loading && keys.length > 0 && (
        <ul className="space-y-3">
          {keys.map((key) => (
            <li
              key={key.id}
              className="rounded-md border border-input bg-background px-3 py-2.5 text-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">{key.label ?? "Unlabeled key"}</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{key.fingerprint}</p>
                  {key.keyId ? (
                    <p className="mt-1 font-mono text-xs text-muted-foreground">Key ID {key.keyId}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {key.keyType}
                    {key.algorithm ? ` · ${key.algorithm}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatCapabilities(key.capabilities)} · {formatKeyExpiry(key.expiresAt)}
                  </p>
                </div>
                {key.id ? (
                  <Button type="button" variant="outline" size="sm" asChild>
                    <Link to={`/keys/${key.id}`}>View</Link>
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
