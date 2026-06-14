import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { toast } from "sonner"

import { KeysListFilters } from "@/components/keys/keys-list-filters"
import { Button } from "@/components/ui/button"
import { useApiAccessToken } from "@/hooks/use-api-access-token"
import { ApiError, getApiErrorMessage } from "@/lib/api-error"
import {
  bulkExportFilename,
  bulkExportPublicKeys,
  downloadArmoredBundle,
} from "@/lib/bulk-export-keys"
import { formatCapabilities, formatKeyExpiry, formatKeyStatus } from "@/lib/key-display"
import { keysApi } from "@/lib/keys-api"
import {
  applyMaterialViewFilter,
  buildKeysListSearch,
  listOptionsFromParams,
  parseKeysListParams,
  type KeysListParams,
} from "@/lib/keys-list-params"
import { logUiEvent } from "@/lib/ui-logger"
import { cn } from "@/lib/utils"
import type { PgpKeySummary } from "@/types/api"

function shortFingerprint(fingerprint: string): string {
  if (fingerprint.length <= 16) {
    return fingerprint
  }
  return `${fingerprint.slice(0, 8)}…${fingerprint.slice(-8)}`
}

function formatBulkExportFailureLabels(
  failedKeyIds: string[],
  keysById: Map<string, PgpKeySummary>,
): string {
  return failedKeyIds
    .map((keyId) => {
      const key = keysById.get(keyId)
      if (key?.label) {
        return key.label
      }
      if (key?.fingerprint) {
        return shortFingerprint(key.fingerprint)
      }
      return keyId
    })
    .join(", ")
}

function statusBadgeClass(status: string | null | undefined): string {
  switch (status) {
    case "revoked":
      return "border-destructive/30 bg-destructive/10 text-destructive"
    case "expired":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
    default:
      return "border-border bg-muted/60 text-muted-foreground"
  }
}

export function HomeKeysPanel() {
  const [searchParams, setSearchParams] = useSearchParams()
  const listParams = useMemo(() => parseKeysListParams(searchParams), [searchParams])
  const { getAccessToken, isAuthenticated, isConfigured, authError } = useApiAccessToken()
  const [keys, setKeys] = useState<PgpKeySummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkExporting, setBulkExporting] = useState(false)

  const updateListParams = useCallback(
    (nextParams: KeysListParams) => {
      logUiEvent("info", {
        eventId: "keysList.filterChange",
        message: "Keys list filters changed",
        view: nextParams.view,
        keyStatus: nextParams.status,
        filterCapability: nextParams.capability,
      })
      const query = buildKeysListSearch(nextParams)
      setSearchParams(query ? query.replace(/^\?/, "") : "")
    },
    [setSearchParams],
  )

  const loadKeys = useCallback(async () => {
    if (!isConfigured || !isAuthenticated) {
      return
    }
    setLoading(true)
    setError(null)
    setRequestId(null)
    try {
      const token = await getAccessToken()
      const listOptions = listOptionsFromParams(listParams)
      const data = await keysApi.list({ accessToken: token, ...listOptions })
      const filtered = applyMaterialViewFilter(data, listParams.view)
      setKeys(filtered)
      setSelectedIds(new Set())
      logUiEvent("info", {
        eventId: "keysList.loaded",
        message: "Keys list loaded",
        count: filtered.length,
        view: listParams.view,
        keyStatus: listParams.status,
        filterCapability: listParams.capability,
      })
    } catch (e) {
      setKeys([])
      setError(getApiErrorMessage(e))
      if (e instanceof ApiError && e.requestId) {
        setRequestId(e.requestId)
      }
    } finally {
      setLoading(false)
    }
  }, [getAccessToken, isAuthenticated, isConfigured, listParams])

  useEffect(() => {
    queueMicrotask(() => {
      void loadKeys()
    })
  }, [loadKeys])

  const selectableIds = useMemo(
    () => keys.map((key) => key.id).filter((id): id is string => Boolean(id)),
    [keys],
  )

  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id))

  function toggleSelected(keyId: string) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(keyId)) {
        next.delete(keyId)
      } else {
        next.add(keyId)
      }
      return next
    })
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set())
      return
    }
    setSelectedIds(new Set(selectableIds))
  }

  async function handleBulkExport() {
    const keyIds = [...selectedIds]
    if (keyIds.length === 0) {
      return
    }

    logUiEvent("info", {
      eventId: "keysList.bulkExport.submit",
      message: "Bulk export requested",
      count: keyIds.length,
    })

    setBulkExporting(true)
    try {
      const keysById = new Map(keys.filter((key) => key.id).map((key) => [key.id!, key]))
      const result = await bulkExportPublicKeys({ keyIds, getAccessToken })

      if (result.succeeded.length > 0) {
        downloadArmoredBundle(bulkExportFilename(), result.armored)
      }

      if (result.failed.length === 0) {
        toast.success(
          `Exported ${result.succeeded.length} public key${result.succeeded.length === 1 ? "" : "s"}`,
        )
        logUiEvent("info", {
          eventId: "keysList.bulkExport.success",
          message: "Bulk export completed",
          count: result.succeeded.length,
        })
      } else if (result.succeeded.length > 0) {
        const failedLabels = formatBulkExportFailureLabels(
          result.failed.map((failure) => failure.keyId),
          keysById,
        )
        toast.success(
          `Exported ${result.succeeded.length} public key${result.succeeded.length === 1 ? "" : "s"}`,
          {
            description: `${result.failed.length} failed: ${failedLabels}`,
          },
        )
        logUiEvent("warn", {
          eventId: "keysList.bulkExport.partial",
          message: "Bulk export completed with failures",
          succeededCount: result.succeeded.length,
          failedCount: result.failed.length,
          failedKeyIds: result.failed.map((failure) => failure.keyId),
        })
      } else {
        const failedLabels = formatBulkExportFailureLabels(
          result.failed.map((failure) => failure.keyId),
          keysById,
        )
        toast.error(`Export failed for ${result.failed.length} key${result.failed.length === 1 ? "" : "s"}: ${failedLabels}`)
        logUiEvent("error", {
          eventId: "keysList.bulkExport.error",
          message: "Bulk export failed for all selected keys",
          operationId: "exportPublicKey",
          failedCount: result.failed.length,
          failedKeyIds: result.failed.map((failure) => failure.keyId),
        })
      }
    } catch (e) {
      const message = getApiErrorMessage(e)
      toast.error(message)
      logUiEvent("error", {
        eventId: "keysList.bulkExport.error",
        message: "Bulk export failed",
        operationId: e instanceof ApiError ? e.operationId : "exportPublicKey",
        requestId: e instanceof ApiError ? e.requestId : undefined,
        status: e instanceof ApiError ? e.status : undefined,
      })
    } finally {
      setBulkExporting(false)
    }
  }

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
          <Button
            type="button"
            variant="outline"
            className="transition-colors duration-200"
            disabled={selectedIds.size === 0 || bulkExporting}
            onClick={() => void handleBulkExport()}
          >
            {bulkExporting ? "Exporting…" : `Export selected (${selectedIds.size})`}
          </Button>
        </div>
      </header>

      <div className="mb-4">
        <KeysListFilters params={listParams} disabled={loading} onChange={updateListParams} />
      </div>

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
          <p>No keys match the current filters.</p>
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
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <input
              id="keys-select-all"
              type="checkbox"
              className="size-4 rounded border border-input"
              checked={allSelected}
              onChange={toggleSelectAll}
              aria-label="Select all keys"
            />
            <label htmlFor="keys-select-all" className="text-muted-foreground">
              Select all
            </label>
          </div>
          <ul className="space-y-3">
            {keys.map((key) => (
              <li
                key={key.id}
                className={cn(
                  "rounded-md border border-input bg-background px-3 py-2.5 text-sm",
                  (key.status === "revoked" || key.status === "expired") && "opacity-80",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-3">
                    {key.id ? (
                      <input
                        type="checkbox"
                        className="mt-1 size-4 rounded border border-input"
                        checked={selectedIds.has(key.id)}
                        onChange={() => toggleSelected(key.id!)}
                        aria-label={`Select ${key.label ?? "Unlabeled key"}`}
                      />
                    ) : null}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{key.label ?? "Unlabeled key"}</p>
                        {key.status ? (
                          <span
                            className={cn(
                              "rounded-md border px-2 py-0.5 text-xs font-medium",
                              statusBadgeClass(key.status),
                            )}
                          >
                            {formatKeyStatus(key.status)}
                          </span>
                        ) : null}
                      </div>
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
        </div>
      )}
    </section>
  )
}
