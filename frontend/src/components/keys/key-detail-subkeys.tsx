import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { ApiError, getApiErrorMessage } from "@/lib/api-error"
import { formatCapabilities, formatKeyExpiry, formatKeyStatus } from "@/lib/key-display"
import { keysApi } from "@/lib/keys-api"
import { logUiEvent } from "@/lib/ui-logger"
import type { PgpKeySummary } from "@/types/api"

type KeyDetailSubkeysProps = {
  primaryKeyId: string
  getAccessToken: () => Promise<string>
  refreshToken?: number
}

export function KeyDetailSubkeys({ primaryKeyId, getAccessToken, refreshToken = 0 }: KeyDetailSubkeysProps) {
  const [subkeys, setSubkeys] = useState<PgpKeySummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requestId, setRequestId] = useState<string | null>(null)

  const loadSubkeys = useCallback(async () => {
    setLoading(true)
    setError(null)
    setRequestId(null)

    try {
      const token = await getAccessToken()
      const data = await keysApi.listSubkeys({ accessToken: token, primaryKeyId })
      setSubkeys(data)
      logUiEvent("debug", {
        eventId: "keyDetail.subkeysLoaded",
        message: "Subkeys loaded for primary key",
        operationId: "listSubkeys",
        keyId: primaryKeyId,
      })
    } catch (e) {
      setSubkeys([])
      setError(getApiErrorMessage(e))
      if (e instanceof ApiError && e.requestId) {
        setRequestId(e.requestId)
      }
    } finally {
      setLoading(false)
    }
  }, [getAccessToken, primaryKeyId])

  useEffect(() => {
    queueMicrotask(() => {
      void loadSubkeys()
    })
  }, [loadSubkeys, refreshToken])

  return (
    <section aria-label="Subkeys" className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Subkeys</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Subkeys inherit the primary keyring. Rotate a subkey to create a replacement.
        </p>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading subkeys…</p> : null}
      {error ? (
        <div className="text-sm text-destructive">
          <p>{error}</p>
          {requestId ? <p className="mt-1 text-xs text-muted-foreground">Request ID: {requestId}</p> : null}
        </div>
      ) : null}

      {!loading && !error && subkeys.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No subkeys yet. Use the add subkey form below to create one.
        </p>
      ) : null}

      {!loading && subkeys.length > 0 ? (
        <ul className="space-y-3">
          {subkeys.map((subkey) => (
            <li
              key={subkey.id}
              className="rounded-md border border-input bg-background px-3 py-2.5 text-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">{subkey.fingerprint}</p>
                  {subkey.keyId ? (
                    <p className="mt-1 font-mono text-xs text-muted-foreground">Key ID {subkey.keyId}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatCapabilities(subkey.capabilities)} · {formatKeyExpiry(subkey.expiresAt)} ·{" "}
                    {formatKeyStatus(subkey.status)}
                  </p>
                </div>
                {subkey.id ? (
                  <Link
                    to={`/keys/${subkey.id}`}
                    className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                  >
                    View
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
