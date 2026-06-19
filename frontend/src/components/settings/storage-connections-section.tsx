import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { StorageConnectionCard } from "@/components/settings/storage-connection-card"
import { StorageConnectionForm } from "@/components/settings/storage-connection-form"
import { toFormValues } from "@/components/settings/storage-connection-form-values"
import { Button } from "@/components/ui/button"
import { useApiAccessToken } from "@/hooks/use-api-access-token"
import { ApiError, getApiErrorMessage } from "@/lib/api-error"
import { mapStorageConnectionApiError } from "@/lib/map-storage-connection-api-error"
import { storageConnectionsApi } from "@/lib/storage-connections-api"
import type { StorageConnectionFieldErrors } from "@/lib/storage-connection-validation"
import { logUiEvent } from "@/lib/ui-logger"
import type {
  CreateStorageConnectionRequest,
  StorageConnectionResponse,
  UpdateStorageConnectionRequest,
} from "@/types/api"

type FormMode = "hidden" | "create" | "edit"

export function StorageConnectionsSection() {
  const { getAccessToken, isAuthenticated, isConfigured, authError } = useApiAccessToken()
  const [connections, setConnections] = useState<StorageConnectionResponse[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [formMode, setFormMode] = useState<FormMode>("hidden")
  const [editingConnection, setEditingConnection] = useState<StorageConnectionResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [formFieldErrors, setFormFieldErrors] = useState<StorageConnectionFieldErrors>({})

  const loadConnections = useCallback(async () => {
    if (!isConfigured || !isAuthenticated) {
      return
    }
    setLoading(true)
    setApiError(null)
    setRequestId(null)
    logUiEvent("info", { eventId: "settings.storageConnections.load", message: "Loading storage connections" })
    try {
      const accessToken = await getAccessToken()
      const listed = await storageConnectionsApi.list({ accessToken })
      setConnections(listed)
      setSelectedId((current) => {
        if (current && listed.some((connection) => connection.id === current)) {
          return current
        }
        return listed[0]?.id ?? null
      })
      logUiEvent("info", {
        eventId: "settings.storageConnections.load",
        message: "Storage connections loaded",
        count: listed.length,
      })
    } catch (error) {
      setApiError(getApiErrorMessage(error))
      if (error instanceof ApiError && error.requestId) {
        setRequestId(error.requestId)
      }
      logUiEvent("error", {
        eventId: "settings.storageConnections.load",
        message: "Failed to load storage connections",
        requestId: error instanceof ApiError ? error.requestId : undefined,
        status: error instanceof ApiError ? error.status : undefined,
      })
    } finally {
      setLoading(false)
    }
  }, [getAccessToken, isAuthenticated, isConfigured])

  useEffect(() => {
    queueMicrotask(() => {
      void loadConnections()
    })
  }, [loadConnections])

  const handleCreateOpen = useCallback(() => {
    logUiEvent("info", { eventId: "settings.storageConnections.create.open", message: "Open create form" })
    setFormMode("create")
    setEditingConnection(null)
    setApiError(null)
    setRequestId(null)
    setFormFieldErrors({})
  }, [])

  const handleEditOpen = useCallback((connection: StorageConnectionResponse) => {
    logUiEvent("info", {
      eventId: "settings.storageConnections.edit.open",
      message: "Open edit form",
    })
    setFormMode("edit")
    setEditingConnection(connection)
    setSelectedId(connection.id)
    setApiError(null)
    setRequestId(null)
    setFormFieldErrors({})
  }, [])

  const handleFormCancel = useCallback(() => {
    setFormMode("hidden")
    setEditingConnection(null)
    setFormFieldErrors({})
  }, [])

  const handleCreateSubmit = useCallback(
    async (body: CreateStorageConnectionRequest | UpdateStorageConnectionRequest) => {
      setSubmitting(true)
      setApiError(null)
      setRequestId(null)
      setFormFieldErrors({})
      logUiEvent("info", {
        eventId: "settings.storageConnections.create.submit",
        message: "Submit create storage connection",
      })
      try {
        const accessToken = await getAccessToken()
        const created = await storageConnectionsApi.create({
          accessToken,
          body: body as CreateStorageConnectionRequest,
        })
        setConnections((current) => [created, ...current])
        setSelectedId(created.id)
        setFormMode("hidden")
        toast.success("Storage connection added", { description: created.displayName })
        logUiEvent("info", {
          eventId: "settings.storageConnections.create.submit",
          message: "Storage connection created",
        })
      } catch (error) {
        if (error instanceof ApiError) {
          const mapped = mapStorageConnectionApiError(error)
          setFormFieldErrors(mapped.fieldErrors)
          setApiError(mapped.bannerMessage)
          if (error.requestId) {
            setRequestId(error.requestId)
          }
        } else {
          setApiError(getApiErrorMessage(error))
        }
        logUiEvent("error", {
          eventId: "settings.storageConnections.create.submit",
          message: "Create storage connection failed",
          requestId: error instanceof ApiError ? error.requestId : undefined,
          status: error instanceof ApiError ? error.status : undefined,
        })
      } finally {
        setSubmitting(false)
      }
    },
    [getAccessToken],
  )

  const handleEditSubmit = useCallback(
    async (body: CreateStorageConnectionRequest | UpdateStorageConnectionRequest) => {
      if (!editingConnection) {
        return
      }
      setSubmitting(true)
      setApiError(null)
      setRequestId(null)
      setFormFieldErrors({})
      logUiEvent("info", {
        eventId: "settings.storageConnections.edit.submit",
        message: "Submit edit storage connection",
      })
      try {
        const accessToken = await getAccessToken()
        const updated = await storageConnectionsApi.update({
          accessToken,
          connectionId: editingConnection.id,
          body: body as UpdateStorageConnectionRequest,
        })
        setConnections((current) => current.map((item) => (item.id === updated.id ? updated : item)))
        setEditingConnection(null)
        setFormMode("hidden")
        toast.success("Storage connection updated", { description: updated.displayName })
      } catch (error) {
        if (error instanceof ApiError) {
          const mapped = mapStorageConnectionApiError(error)
          setFormFieldErrors(mapped.fieldErrors)
          setApiError(mapped.bannerMessage)
          if (error.requestId) {
            setRequestId(error.requestId)
          }
        } else {
          setApiError(getApiErrorMessage(error))
        }
        logUiEvent("error", {
          eventId: "settings.storageConnections.edit.submit",
          message: "Edit storage connection failed",
          requestId: error instanceof ApiError ? error.requestId : undefined,
          status: error instanceof ApiError ? error.status : undefined,
        })
      } finally {
        setSubmitting(false)
      }
    },
    [editingConnection, getAccessToken],
  )

  const handleDelete = useCallback(
    async (connection: StorageConnectionResponse) => {
      logUiEvent("info", {
        eventId: "settings.storageConnections.delete.confirm",
        message: "Confirm delete storage connection",
      })
      const confirmed = window.confirm(`Delete storage connection "${connection.displayName}"?`)
      if (!confirmed) {
        return
      }
      setSubmitting(true)
      setApiError(null)
      setRequestId(null)
      setFormFieldErrors({})
      logUiEvent("info", {
        eventId: "settings.storageConnections.delete.submit",
        message: "Submit delete storage connection",
      })
      try {
        const accessToken = await getAccessToken()
        await storageConnectionsApi.delete({ accessToken, connectionId: connection.id })
        setConnections((current) => current.filter((item) => item.id !== connection.id))
        setSelectedId((current) => (current === connection.id ? null : current))
        if (editingConnection?.id === connection.id) {
          setEditingConnection(null)
          setFormMode("hidden")
        }
        toast.success("Storage connection deleted")
      } catch (error) {
        setApiError(getApiErrorMessage(error))
        if (error instanceof ApiError && error.requestId) {
          setRequestId(error.requestId)
        }
        logUiEvent("error", {
          eventId: "settings.storageConnections.delete.submit",
          message: "Delete storage connection failed",
          requestId: error instanceof ApiError ? error.requestId : undefined,
          status: error instanceof ApiError ? error.status : undefined,
        })
      } finally {
        setSubmitting(false)
      }
    },
    [editingConnection, getAccessToken],
  )

  if (!isConfigured) {
    return (
      <section className="rounded-lg border border-dashed border-border bg-card/50 p-6 text-sm">
        <h3 className="text-lg font-semibold text-foreground">Cloud storage connections</h3>
        <p className="mt-2 text-muted-foreground">Configure Auth0 to manage BYO cloud storage connections via the API.</p>
      </section>
    )
  }

  if (!isAuthenticated) {
    return (
      <section className="rounded-lg border border-dashed border-border bg-card/50 p-6 text-sm">
        <h3 className="text-lg font-semibold text-foreground">Cloud storage connections</h3>
        <p className="mt-2 text-muted-foreground">Sign in to register AWS S3 storage connections.</p>
        {authError ? <p className="mt-2 text-destructive">{authError}</p> : null}
      </section>
    )
  }

  return (
    <section
      className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm"
      data-pgp-ui="settings.storageConnections.section"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Cloud storage connections</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Register customer-owned AWS S3 buckets for future keyring offload (Phase 17a registry only).
          </p>
        </div>
        {formMode === "hidden" ? (
          <Button type="button" onClick={handleCreateOpen}>
            Add AWS S3 connection
          </Button>
        ) : null}
      </div>

      {apiError ? (
        <p className="text-sm text-destructive" role="alert">
          {apiError}
          {requestId ? ` (request ID: ${requestId})` : ""}
        </p>
      ) : null}

      {formMode === "create" ? (
        <StorageConnectionForm
          mode="create"
          submitting={submitting}
          serverFieldErrors={formFieldErrors}
          onSubmit={(body) => void handleCreateSubmit(body)}
          onCancel={handleFormCancel}
        />
      ) : null}

      {formMode === "edit" && editingConnection ? (
        <StorageConnectionForm
          mode="edit"
          initialValues={toFormValues(editingConnection)}
          submitting={submitting}
          serverFieldErrors={formFieldErrors}
          onSubmit={(body) => void handleEditSubmit(body)}
          onCancel={handleFormCancel}
        />
      ) : null}

      {loading ? <p className="text-sm text-muted-foreground">Loading connections…</p> : null}

      {!loading && connections.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-pgp-ui="settings.storageConnections.list">
          No storage connections yet. Add an AWS S3 connection to prepare for BYO keyring storage.
        </p>
      ) : null}

      {connections.length > 0 ? (
        <div className="space-y-3" data-pgp-ui="settings.storageConnections.list">
          {connections.map((connection) => (
            <StorageConnectionCard
              key={connection.id}
              connection={connection}
              selected={selectedId === connection.id}
              onSelect={setSelectedId}
              onEdit={handleEditOpen}
              onDelete={(item) => void handleDelete(item)}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}
