import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { notifyAlgorithmAdjusted } from "@/lib/algorithm-adjustment-toast"

import { CreateSubkeyForm } from "@/components/keys/create-subkey-form"
import { DeleteKeyForm } from "@/components/keys/delete-key-form"
import { EditKeyLabelForm } from "@/components/keys/edit-key-label-form"
import { ImportSubkeysForm } from "@/components/keys/import-subkeys-form"
import { ExtendExpiryForm } from "@/components/keys/extend-expiry-form"
import { KeyDetailSubkeys } from "@/components/keys/key-detail-subkeys"
import { KeyDetailSummary } from "@/components/keys/key-detail-summary"
import { KeyExportAction } from "@/components/keys/key-export-action"
import { RevokeKeyForm } from "@/components/keys/revoke-key-form"
import { RotateKeyForm } from "@/components/keys/rotate-key-form"
import { useApiAccessToken } from "@/hooks/use-api-access-token"
import { ApiError, getApiErrorMessage } from "@/lib/api-error"
import {
  buildCreateSubkeyRequest,
  defaultCreateSubkeyFormValues,
  validateCreateSubkeyForm,
  type CreateSubkeyFieldErrors,
  type CreateSubkeyFormValues,
} from "@/lib/create-subkey-validation"
import {
  buildExtendExpiryRequest,
  defaultExtendExpiryFormValues,
  validateExtendExpiryForm,
  type ExtendExpiryFieldErrors,
  type ExtendExpiryFormValues,
} from "@/lib/extend-key-validation"
import { validateImportSubkeysForm } from "@/lib/import-subkeys-validation"
import { hasArmoredKeyring, hasPrivateMaterial } from "@/lib/key-display"
import { keysApi } from "@/lib/keys-api"
import {
  buildRevokeKeyRequest,
  defaultRevokeKeyFormValues,
  validateRevokeKeyForm,
  type RevokeKeyFieldErrors,
  type RevokeKeyFormValues,
} from "@/lib/revoke-key-validation"
import {
  buildRotateKeyRequest,
  defaultRotateKeyFormValues,
  validateRotateKeyForm,
  type RotateKeyFieldErrors,
  type RotateKeyFormValues,
} from "@/lib/rotate-key-validation"
import {
  buildUpdateKeyLabelRequest,
  validateUpdateKeyLabelForm,
  type UpdateKeyLabelFieldErrors,
  type UpdateKeyLabelFormValues,
} from "@/lib/update-key-label-validation"
import { logUiEvent } from "@/lib/ui-logger"
import { Button } from "@/components/ui/button"
import type { PgpKey } from "@/types/api"

function clearPassphrase<T extends { passphrase: string }>(values: T): T {
  return { ...values, passphrase: "" }
}

export function KeyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getAccessToken, isAuthenticated, isConfigured, authError } = useApiAccessToken()

  const [keyData, setKeyData] = useState<PgpKey | null>(null)
  const [primaryKey, setPrimaryKey] = useState<PgpKey | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadRequestId, setLoadRequestId] = useState<string | null>(null)
  const [subkeysRefreshToken, setSubkeysRefreshToken] = useState(0)

  const [revokeValues, setRevokeValues] = useState<RevokeKeyFormValues>(defaultRevokeKeyFormValues)
  const [revokeFieldErrors, setRevokeFieldErrors] = useState<RevokeKeyFieldErrors>({})
  const [revokeApiError, setRevokeApiError] = useState<string | null>(null)
  const [revokeRequestId, setRevokeRequestId] = useState<string | null>(null)
  const [revokeSubmitting, setRevokeSubmitting] = useState(false)

  const [extendValues, setExtendValues] = useState<ExtendExpiryFormValues>(defaultExtendExpiryFormValues)
  const [extendFieldErrors, setExtendFieldErrors] = useState<ExtendExpiryFieldErrors>({})
  const [extendApiError, setExtendApiError] = useState<string | null>(null)
  const [extendRequestId, setExtendRequestId] = useState<string | null>(null)
  const [extendSubmitting, setExtendSubmitting] = useState(false)

  const [rotateValues, setRotateValues] = useState<RotateKeyFormValues>(defaultRotateKeyFormValues)
  const [rotateFieldErrors, setRotateFieldErrors] = useState<RotateKeyFieldErrors>({})
  const [rotateApiError, setRotateApiError] = useState<string | null>(null)
  const [rotateRequestId, setRotateRequestId] = useState<string | null>(null)
  const [rotateSubmitting, setRotateSubmitting] = useState(false)

  const [createSubkeyValues, setCreateSubkeyValues] = useState<CreateSubkeyFormValues>(
    defaultCreateSubkeyFormValues,
  )
  const [createSubkeyFieldErrors, setCreateSubkeyFieldErrors] = useState<CreateSubkeyFieldErrors>({})
  const [createSubkeyApiError, setCreateSubkeyApiError] = useState<string | null>(null)
  const [createSubkeyRequestId, setCreateSubkeyRequestId] = useState<string | null>(null)
  const [createSubkeySubmitting, setCreateSubkeySubmitting] = useState(false)

  const [importSubkeysApiError, setImportSubkeysApiError] = useState<string | null>(null)
  const [importSubkeysRequestId, setImportSubkeysRequestId] = useState<string | null>(null)
  const [importSubkeysSubmitting, setImportSubkeysSubmitting] = useState(false)

  const [updateLabelValues, setUpdateLabelValues] = useState<UpdateKeyLabelFormValues>({ label: "" })
  const [updateLabelFieldErrors, setUpdateLabelFieldErrors] = useState<UpdateKeyLabelFieldErrors>({})
  const [updateLabelApiError, setUpdateLabelApiError] = useState<string | null>(null)
  const [updateLabelRequestId, setUpdateLabelRequestId] = useState<string | null>(null)
  const [updateLabelSubmitting, setUpdateLabelSubmitting] = useState(false)

  const [deleteApiError, setDeleteApiError] = useState<string | null>(null)
  const [deleteRequestId, setDeleteRequestId] = useState<string | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  const loadKey = useCallback(async () => {
    if (!id || !isConfigured || !isAuthenticated) {
      return
    }

    setLoading(true)
    setLoadError(null)
    setLoadRequestId(null)

    try {
      const token = await getAccessToken()
      const loaded = await keysApi.get({ accessToken: token, keyId: id })
      setKeyData(loaded)
      setUpdateLabelValues({ label: loaded.label ?? "" })

      if (loaded.role === "subkey" && loaded.parentKeyId) {
        const parent = await keysApi.get({ accessToken: token, keyId: loaded.parentKeyId })
        setPrimaryKey(parent)
      } else {
        setPrimaryKey(loaded)
      }
    } catch (error) {
      setKeyData(null)
      setPrimaryKey(null)
      setLoadError(getApiErrorMessage(error))
      if (error instanceof ApiError && error.requestId) {
        setLoadRequestId(error.requestId)
      }
    } finally {
      setLoading(false)
    }
  }, [getAccessToken, id, isAuthenticated, isConfigured])

  useEffect(() => {
    logUiEvent("debug", {
      eventId: "keyDetail.pageView",
      message: "Key detail page viewed",
      keyId: id,
    })
  }, [id])

  useEffect(() => {
    queueMicrotask(() => {
      void loadKey()
    })
  }, [loadKey])

  const primaryOpenpgpVersion = (primaryKey?.openpgpVersion ?? 4) as 4 | 6
  const requiresPassphrase = primaryKey ? hasPrivateMaterial(primaryKey) : false
  const isRevoked = keyData?.status === "revoked"
  const isSubkey = keyData?.role === "subkey"
  const canExtend = Boolean(requiresPassphrase && !isRevoked)
  const canRotate = Boolean(isSubkey && !isRevoked && requiresPassphrase)
  const isPrimary = keyData?.role === "primary"
  const canCreateSubkey = Boolean(isPrimary && !isRevoked && requiresPassphrase)
  const canImportSubkeys = Boolean(isPrimary && !isRevoked && keyData && hasArmoredKeyring(keyData))
  const showMetadataOnlyHint = Boolean(isPrimary && !requiresPassphrase && !isRevoked)

  const handleRefresh = useCallback(() => {
    logUiEvent("info", {
      eventId: "keyDetail.refresh",
      message: "Key detail refresh requested",
      keyId: id,
    })
    void loadKey()
    setSubkeysRefreshToken((token) => token + 1)
  }, [id, loadKey])

  const handleUpdateLabelSubmit = useCallback(async () => {
    if (!id || !keyData?.id) {
      return
    }

    logUiEvent("info", {
      eventId: "keyDetail.updateLabel.submit",
      message: "Update key label form submitted",
      keyId: id,
    })

    const validation = validateUpdateKeyLabelForm(updateLabelValues)
    if (!validation.valid) {
      setUpdateLabelFieldErrors(validation.fieldErrors)
      logUiEvent("warn", {
        eventId: "keyDetail.updateLabel.validationFailed",
        message: "Update key label validation failed",
        keyId: id,
      })
      return
    }

    setUpdateLabelFieldErrors({})
    setUpdateLabelApiError(null)
    setUpdateLabelRequestId(null)
    setUpdateLabelSubmitting(true)

    try {
      const token = await getAccessToken()
      const updated = await keysApi.update({
        accessToken: token,
        keyId: id,
        body: buildUpdateKeyLabelRequest(updateLabelValues),
      })
      setKeyData(updated)
      setUpdateLabelValues({ label: updated.label ?? "" })
      toast.success("Label updated")
      logUiEvent("info", {
        eventId: "keyDetail.updateLabel.apiSuccess",
        message: "Key label updated",
        keyId: id,
        operationId: "updateKey",
      })
    } catch (error) {
      setUpdateLabelApiError(getApiErrorMessage(error))
      if (error instanceof ApiError) {
        if (error.requestId) {
          setUpdateLabelRequestId(error.requestId)
        }
        logUiEvent("error", {
          eventId: "keyDetail.updateLabel.apiError",
          message: "Update key label failed",
          keyId: id,
          operationId: error.operationId,
          requestId: error.requestId,
          status: error.status,
        })
      }
    } finally {
      setUpdateLabelSubmitting(false)
    }
  }, [getAccessToken, id, keyData?.id, updateLabelValues])

  const handleDeleteSubmit = useCallback(async () => {
    if (!id) {
      return
    }

    logUiEvent("info", {
      eventId: "keyDetail.delete.submit",
      message: "Delete key confirmed",
      keyId: id,
    })

    setDeleteApiError(null)
    setDeleteRequestId(null)
    setDeleteSubmitting(true)

    try {
      const token = await getAccessToken()
      await keysApi.delete({ accessToken: token, keyId: id })
      toast.success("Key deleted")
      logUiEvent("info", {
        eventId: "keyDetail.delete.apiSuccess",
        message: "Key deleted",
        keyId: id,
        operationId: "deleteKey",
      })
      navigate("/keys")
    } catch (error) {
      setDeleteApiError(getApiErrorMessage(error))
      if (error instanceof ApiError) {
        if (error.requestId) {
          setDeleteRequestId(error.requestId)
        }
        logUiEvent("error", {
          eventId: "keyDetail.delete.apiError",
          message: "Delete key failed",
          keyId: id,
          operationId: error.operationId,
          requestId: error.requestId,
          status: error.status,
        })
      }
    } finally {
      setDeleteSubmitting(false)
    }
  }, [getAccessToken, id, navigate])

  const handleCreateSubkeySubmit = useCallback(async () => {
    if (!id || !keyData || keyData.role !== "primary" || !keyData.id) {
      return
    }

    logUiEvent("info", {
      eventId: "keyDetail.createSubkey.submit",
      message: "Create subkey form submitted",
      keyId: id,
    })

    setCreateSubkeyApiError(null)
    setCreateSubkeyRequestId(null)

    const validation = validateCreateSubkeyForm(createSubkeyValues, primaryOpenpgpVersion)
    if (!validation.valid) {
      setCreateSubkeyFieldErrors(validation.fieldErrors)
      logUiEvent("warn", {
        eventId: "keyDetail.createSubkey.validationFailed",
        message: "Client-side create subkey validation failed",
        keyId: id,
      })
      return
    }

    setCreateSubkeyFieldErrors({})
    setCreateSubkeySubmitting(true)

    try {
      const token = await getAccessToken()
      const created = await keysApi.createSubkey({
        accessToken: token,
        primaryKeyId: keyData.id,
        body: buildCreateSubkeyRequest(createSubkeyValues),
      })

      logUiEvent("info", {
        eventId: "keyDetail.createSubkey.apiSuccess",
        message: "Subkey created",
        operationId: "createSubkey",
        keyId: created.id ?? undefined,
        fingerprint: created.fingerprint ?? undefined,
      })

      toast.success("Subkey created", {
        description: created.fingerprint ? `Fingerprint: ${created.fingerprint}` : undefined,
      })

      setCreateSubkeyValues(clearPassphrase(createSubkeyValues))
      setSubkeysRefreshToken((value) => value + 1)
      if (created.id) {
        navigate(`/keys/${created.id}`)
        return
      }
      await loadKey()
    } catch (error) {
      const message = getApiErrorMessage(error)
      setCreateSubkeyApiError(message)
      if (error instanceof ApiError) {
        if (error.requestId) {
          setCreateSubkeyRequestId(error.requestId)
        }
        logUiEvent("error", {
          eventId: "keyDetail.createSubkey.apiError",
          message: "Create subkey API request failed",
          operationId: error.operationId,
          requestId: error.requestId,
          status: error.status,
          keyId: id,
        })
      }
    } finally {
      setCreateSubkeySubmitting(false)
      setCreateSubkeyValues((current) => clearPassphrase(current))
    }
  }, [createSubkeyValues, getAccessToken, id, keyData, loadKey, navigate, primaryOpenpgpVersion])

  const handleImportSubkeysSubmit = useCallback(async () => {
    if (!id || !keyData || keyData.role !== "primary" || !keyData.id) {
      return
    }

    logUiEvent("info", {
      eventId: "keyDetail.importSubkeys.submit",
      message: "Import subkeys from keyring submitted",
      keyId: id,
    })

    setImportSubkeysApiError(null)
    setImportSubkeysRequestId(null)

    const validation = validateImportSubkeysForm()
    if (!validation.valid) {
      logUiEvent("warn", {
        eventId: "keyDetail.importSubkeys.validationFailed",
        message: "Client-side import subkeys validation failed",
        keyId: id,
      })
      return
    }

    setImportSubkeysSubmitting(true)

    try {
      const token = await getAccessToken()
      const result = await keysApi.importSubkeysFromKeyring({
        accessToken: token,
        primaryKeyId: keyData.id,
      })

      logUiEvent("info", {
        eventId: "keyDetail.importSubkeys.apiSuccess",
        message: "Subkeys imported from keyring",
        operationId: "importSubkeysFromKeyring",
        keyId: id,
        count: result.registered.length,
      })

      const registeredCount = result.registered.length
      const skippedCount = result.skippedCount
      const description =
        registeredCount > 0
          ? `${registeredCount} subkey${registeredCount === 1 ? "" : "s"} registered` +
            (skippedCount > 0 ? ` · ${skippedCount} already registered` : "")
          : skippedCount > 0
            ? `${skippedCount} subkey${skippedCount === 1 ? "" : "s"} already registered`
            : "No new subkeys found in the keyring"

      toast.success("Subkeys imported", { description })

      setSubkeysRefreshToken((value) => value + 1)
      await loadKey()
    } catch (error) {
      const message = getApiErrorMessage(error)
      setImportSubkeysApiError(message)
      if (error instanceof ApiError) {
        if (error.requestId) {
          setImportSubkeysRequestId(error.requestId)
        }
        logUiEvent("error", {
          eventId: "keyDetail.importSubkeys.apiError",
          message: "Import subkeys from keyring API request failed",
          operationId: error.operationId,
          requestId: error.requestId,
          status: error.status,
          keyId: id,
        })
      }
    } finally {
      setImportSubkeysSubmitting(false)
    }
  }, [getAccessToken, id, keyData, loadKey])

  const handleRevokeSubmit = useCallback(async () => {
    if (!id || !keyData) {
      return
    }

    logUiEvent("info", {
      eventId: "keyDetail.revoke.submit",
      message: "Revoke key form submitted",
      keyId: id,
    })

    setRevokeApiError(null)
    setRevokeRequestId(null)

    const validation = validateRevokeKeyForm(revokeValues, { requiresPassphrase })
    if (!validation.valid) {
      setRevokeFieldErrors(validation.fieldErrors)
      logUiEvent("warn", {
        eventId: "keyDetail.revoke.validationFailed",
        message: "Client-side revoke validation failed",
        keyId: id,
      })
      return
    }

    setRevokeFieldErrors({})
    setRevokeSubmitting(true)

    try {
      const token = await getAccessToken()
      const updated = await keysApi.revoke({
        accessToken: token,
        keyId: id,
        body: buildRevokeKeyRequest(revokeValues),
      })

      logUiEvent("info", {
        eventId: "keyDetail.revoke.apiSuccess",
        message: "Key revoked",
        operationId: "revokeKey",
        keyId: id,
        fingerprint: updated.fingerprint ?? undefined,
      })

      toast.success("Key revoked", {
        description: updated.fingerprint ? `Fingerprint: ${updated.fingerprint}` : undefined,
      })

      setRevokeValues(clearPassphrase(revokeValues))
      await loadKey()
      setSubkeysRefreshToken((value) => value + 1)
    } catch (error) {
      const message = getApiErrorMessage(error)
      setRevokeApiError(message)
      if (error instanceof ApiError) {
        if (error.requestId) {
          setRevokeRequestId(error.requestId)
        }
        logUiEvent("error", {
          eventId: "keyDetail.revoke.apiError",
          message: "Revoke key API request failed",
          operationId: error.operationId,
          requestId: error.requestId,
          status: error.status,
          keyId: id,
        })
      }
    } finally {
      setRevokeSubmitting(false)
      setRevokeValues((current) => clearPassphrase(current))
    }
  }, [getAccessToken, id, keyData, loadKey, requiresPassphrase, revokeValues])

  const handleExtendSubmit = useCallback(async () => {
    if (!id || !keyData) {
      return
    }

    logUiEvent("info", {
      eventId: "keyDetail.extendExpiry.submit",
      message: "Extend expiry form submitted",
      keyId: id,
    })

    setExtendApiError(null)
    setExtendRequestId(null)

    const validation = validateExtendExpiryForm(extendValues, { requiresPassphrase: true })
    if (!validation.valid) {
      setExtendFieldErrors(validation.fieldErrors)
      logUiEvent("warn", {
        eventId: "keyDetail.extendExpiry.validationFailed",
        message: "Client-side extend expiry validation failed",
        keyId: id,
      })
      return
    }

    setExtendFieldErrors({})
    setExtendSubmitting(true)

    try {
      const token = await getAccessToken()
      const updated = await keysApi.extendExpiry({
        accessToken: token,
        keyId: id,
        body: buildExtendExpiryRequest(extendValues),
      })

      logUiEvent("info", {
        eventId: "keyDetail.extendExpiry.apiSuccess",
        message: "Key expiry extended",
        operationId: "extendKeyExpiry",
        keyId: id,
        fingerprint: updated.fingerprint ?? undefined,
      })

      toast.success("Expiry extended")
      setExtendValues(clearPassphrase(extendValues))
      await loadKey()
      setSubkeysRefreshToken((value) => value + 1)
    } catch (error) {
      const message = getApiErrorMessage(error)
      setExtendApiError(message)
      if (error instanceof ApiError) {
        if (error.requestId) {
          setExtendRequestId(error.requestId)
        }
        logUiEvent("error", {
          eventId: "keyDetail.extendExpiry.apiError",
          message: "Extend expiry API request failed",
          operationId: error.operationId,
          requestId: error.requestId,
          status: error.status,
          keyId: id,
        })
      }
    } finally {
      setExtendSubmitting(false)
      setExtendValues((current) => clearPassphrase(current))
    }
  }, [extendValues, getAccessToken, id, keyData, loadKey])

  const handleRotateSubmit = useCallback(async () => {
    if (!id || !keyData) {
      return
    }

    logUiEvent("info", {
      eventId: "keyDetail.rotate.submit",
      message: "Rotate subkey form submitted",
      keyId: id,
    })

    setRotateApiError(null)
    setRotateRequestId(null)

    const validation = validateRotateKeyForm(rotateValues, primaryOpenpgpVersion)
    if (!validation.valid) {
      setRotateFieldErrors(validation.fieldErrors)
      logUiEvent("warn", {
        eventId: "keyDetail.rotate.validationFailed",
        message: "Client-side rotate validation failed",
        keyId: id,
      })
      return
    }

    setRotateFieldErrors({})
    setRotateSubmitting(true)

    try {
      const token = await getAccessToken()
      const result = await keysApi.rotate({
        accessToken: token,
        keyId: id,
        body: buildRotateKeyRequest(rotateValues),
      })

      logUiEvent("info", {
        eventId: "keyDetail.rotate.apiSuccess",
        message: "Subkey rotated",
        operationId: "rotateKey",
        keyId: result.newKey.id ?? undefined,
        fingerprint: result.newKey.fingerprint ?? undefined,
      })

      toast.success("Subkey rotated", {
        description: result.newKey.fingerprint
          ? `New fingerprint: ${result.newKey.fingerprint}`
          : undefined,
      })

      setRotateValues(clearPassphrase(rotateValues))
      if (result.newKey.id) {
        navigate(`/keys/${result.newKey.id}`)
        return
      }
      await loadKey()
      setSubkeysRefreshToken((value) => value + 1)
    } catch (error) {
      const message = getApiErrorMessage(error)
      setRotateApiError(message)
      if (error instanceof ApiError) {
        if (error.requestId) {
          setRotateRequestId(error.requestId)
        }
        logUiEvent("error", {
          eventId: "keyDetail.rotate.apiError",
          message: "Rotate subkey API request failed",
          operationId: error.operationId,
          requestId: error.requestId,
          status: error.status,
          keyId: id,
        })
      }
    } finally {
      setRotateSubmitting(false)
      setRotateValues((current) => clearPassphrase(current))
    }
  }, [getAccessToken, id, keyData, loadKey, navigate, primaryOpenpgpVersion, rotateValues])

  if (!isConfigured) {
    return (
      <section className="rounded-lg border border-dashed border-border bg-card/50 p-6 text-sm md:p-8">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Key detail</h2>
        <p className="mt-2 text-muted-foreground">Configure Auth0 to view key details via the API.</p>
      </section>
    )
  }

  if (!isAuthenticated) {
    return (
      <section className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm md:p-8">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Key detail</h2>
        <p className="mt-2 text-sm text-muted-foreground">Sign in to view key details for your account.</p>
        {authError ? <p className="mt-2 text-sm text-destructive">{authError}</p> : null}
      </section>
    )
  }

  return (
    <section className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm md:p-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Key detail</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            View metadata, manage subkeys, and run lifecycle actions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            Refresh
          </Button>
          <Link
            to="/keys"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Back to keys
          </Link>
        </div>
      </header>

      {loading ? <p className="text-sm text-muted-foreground">Loading key…</p> : null}

      {loadError ? (
        <div className="text-sm text-destructive">
          <p>{loadError}</p>
          {loadRequestId ? (
            <p className="mt-1 text-xs text-muted-foreground">Request ID: {loadRequestId}</p>
          ) : null}
        </div>
      ) : null}

      {keyData ? (
        <div className="space-y-8">
          {isSubkey && keyData.parentKeyId ? (
            <p className="text-sm text-muted-foreground">
              Subkey of{" "}
              <Link
                to={`/keys/${keyData.parentKeyId}`}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                primary key
              </Link>
            </p>
          ) : null}

          <KeyDetailSummary keyData={keyData} />

          <EditKeyLabelForm
            values={updateLabelValues}
            fieldErrors={updateLabelFieldErrors}
            apiError={updateLabelApiError}
            requestId={updateLabelRequestId}
            submitting={updateLabelSubmitting}
            disabled={false}
            onChange={(nextValues) => {
              setUpdateLabelValues(nextValues)
              setUpdateLabelFieldErrors({})
            }}
            onSubmit={() => void handleUpdateLabelSubmit()}
          />

          <KeyExportAction
            keyId={keyData.id!}
            fingerprint={keyData.fingerprint}
            getAccessToken={getAccessToken}
            invalidateToken={subkeysRefreshToken}
          />

          {keyData.role === "primary" && keyData.id ? (
            <KeyDetailSubkeys
              primaryKeyId={keyData.id}
              getAccessToken={getAccessToken}
              refreshToken={subkeysRefreshToken}
            />
          ) : null}

          {showMetadataOnlyHint ? (
            <p className="text-sm text-muted-foreground">
              Import or register private key material to add subkeys.
            </p>
          ) : null}

          {canImportSubkeys ? (
            <ImportSubkeysForm
              apiError={importSubkeysApiError}
              requestId={importSubkeysRequestId}
              submitting={importSubkeysSubmitting}
              disabled={false}
              onSubmit={() => void handleImportSubkeysSubmit()}
            />
          ) : null}

          {canCreateSubkey ? (
            <CreateSubkeyForm
              values={createSubkeyValues}
              fieldErrors={createSubkeyFieldErrors}
              apiError={createSubkeyApiError}
              requestId={createSubkeyRequestId}
              submitting={createSubkeySubmitting}
              disabled={false}
              primaryOpenpgpVersion={primaryOpenpgpVersion}
              onChange={(nextValues) => {
                setCreateSubkeyValues(nextValues)
                setCreateSubkeyFieldErrors({})
              }}
              onAlgorithmAdjusted={(nextValues, previousValues) => {
                notifyAlgorithmAdjusted(previousValues, nextValues)
                logUiEvent("debug", {
                  eventId: "keyDetail.createSubkey.algorithmAdjusted",
                  message: "Create subkey algorithm adjusted for capabilities",
                  keyId: id,
                  algorithm: nextValues.algorithm,
                  previousAlgorithm: previousValues.algorithm,
                  capabilities: nextValues.capabilities,
                  openpgpVersion: primaryOpenpgpVersion,
                })
              }}
              onSubmit={() => void handleCreateSubkeySubmit()}
            />
          ) : null}

          <div className="grid gap-8 lg:grid-cols-2">
            <RevokeKeyForm
              values={revokeValues}
              fieldErrors={revokeFieldErrors}
              apiError={revokeApiError}
              requestId={revokeRequestId}
              submitting={revokeSubmitting}
              disabled={isRevoked}
              requiresPassphrase={requiresPassphrase}
              onChange={(nextValues) => {
                setRevokeValues(nextValues)
                setRevokeFieldErrors({})
              }}
              onSubmit={() => void handleRevokeSubmit()}
            />

            <ExtendExpiryForm
              values={extendValues}
              fieldErrors={extendFieldErrors}
              apiError={extendApiError}
              requestId={extendRequestId}
              submitting={extendSubmitting}
              disabled={!canExtend}
              requiresPassphrase={canExtend}
              onChange={(nextValues) => {
                setExtendValues(nextValues)
                setExtendFieldErrors({})
              }}
              onSubmit={() => void handleExtendSubmit()}
            />
          </div>

          <DeleteKeyForm
            role={keyData.role ?? "primary"}
            fingerprint={keyData.fingerprint}
            apiError={deleteApiError}
            requestId={deleteRequestId}
            submitting={deleteSubmitting}
            disabled={false}
            onSubmit={() => void handleDeleteSubmit()}
          />

          {isSubkey ? (
            <RotateKeyForm
              values={rotateValues}
              fieldErrors={rotateFieldErrors}
              apiError={rotateApiError}
              requestId={rotateRequestId}
              submitting={rotateSubmitting}
              disabled={!canRotate}
              primaryOpenpgpVersion={primaryOpenpgpVersion}
              onChange={(nextValues) => {
                setRotateValues(nextValues)
                setRotateFieldErrors({})
              }}
              onAlgorithmAdjusted={(nextValues, previousValues) => {
                notifyAlgorithmAdjusted(previousValues, nextValues)
                logUiEvent("debug", {
                  eventId: "keyDetail.rotate.algorithmAdjusted",
                  message: "Rotate subkey algorithm adjusted for capabilities",
                  keyId: id,
                  algorithm: nextValues.algorithm,
                  previousAlgorithm: previousValues.algorithm,
                  capabilities: nextValues.capabilities,
                  openpgpVersion: primaryOpenpgpVersion,
                })
              }}
              onSubmit={() => void handleRotateSubmit()}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
