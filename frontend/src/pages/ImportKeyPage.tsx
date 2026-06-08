import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { ImportKeyForm } from "@/components/keys/import-key-form"
import { useApiAccessToken } from "@/hooks/use-api-access-token"
import { ApiError, getApiErrorMessage } from "@/lib/api-error"
import {
  buildImportKeyRequest,
  defaultImportKeyFormValues,
  validateImportKeyForm,
  type ImportKeyFieldErrors,
  type ImportKeyFormValues,
} from "@/lib/import-key-validation"
import { keysApi } from "@/lib/keys-api"
import { logUiEvent } from "@/lib/ui-logger"

function clearArmoredFields(values: ImportKeyFormValues): ImportKeyFormValues {
  return {
    ...values,
    armoredPublic: "",
    encryptedPrivateArmored: "",
  }
}

export function ImportKeyPage() {
  const navigate = useNavigate()
  const { getAccessToken, isAuthenticated, isConfigured, authError } = useApiAccessToken()
  const [values, setValues] = useState<ImportKeyFormValues>(defaultImportKeyFormValues)
  const [fieldErrors, setFieldErrors] = useState<ImportKeyFieldErrors>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    logUiEvent("debug", {
      eventId: "importKey.pageView",
      message: "Import key page viewed",
    })
  }, [])

  const handleSubmit = useCallback(async () => {
    logUiEvent("info", {
      eventId: "importKey.submit",
      message: "Import key form submitted",
    })

    setApiError(null)
    setRequestId(null)

    const validation = validateImportKeyForm(values)
    if (!validation.valid) {
      setFieldErrors(validation.fieldErrors)
      logUiEvent("warn", {
        eventId: "importKey.validationFailed",
        message: "Client-side validation failed",
      })
      return
    }

    setFieldErrors({})
    setSubmitting(true)

    try {
      const token = await getAccessToken()
      const body = buildImportKeyRequest(values)
      const imported = await keysApi.register({ accessToken: token, body })

      logUiEvent("info", {
        eventId: "importKey.apiSuccess",
        message: "Key imported",
        operationId: "createKey",
        keyId: imported.id ?? undefined,
        fingerprint: imported.fingerprint ?? undefined,
      })

      toast.success("Key imported", {
        description: imported.fingerprint
          ? `Fingerprint: ${imported.fingerprint}`
          : "Your key is now stored in your account.",
      })

      setValues(clearArmoredFields(values))
      navigate("/keys")
    } catch (error) {
      const message = getApiErrorMessage(error)
      setApiError(message)

      if (error instanceof ApiError) {
        if (error.requestId) {
          setRequestId(error.requestId)
        }
        logUiEvent("error", {
          eventId: "importKey.apiError",
          message: "Import key API request failed",
          operationId: error.operationId,
          requestId: error.requestId,
          status: error.status,
        })
      } else {
        logUiEvent("error", {
          eventId: "importKey.apiError",
          message: "Import key request failed",
        })
      }
    } finally {
      setSubmitting(false)
      setValues((current) => clearArmoredFields(current))
    }
  }, [getAccessToken, navigate, values])

  if (!isConfigured) {
    return (
      <section className="rounded-lg border border-dashed border-border bg-card/50 p-6 text-sm md:p-8">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Import key</h2>
        <p className="mt-2 text-muted-foreground">
          Configure Auth0 to import and store keys via the API.
        </p>
      </section>
    )
  }

  if (!isAuthenticated) {
    return (
      <section className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm md:p-8">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Import key</h2>
        <p className="mt-2 text-sm text-muted-foreground">Sign in to import a key for your account.</p>
        {authError ? <p className="mt-2 text-sm text-destructive">{authError}</p> : null}
      </section>
    )
  }

  return (
    <section className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm md:p-8">
      <header className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Import key</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Register an existing OpenPGP key by pasting armored blocks. The server derives fingerprint,
          algorithm, capabilities, and expiry from the key material.
        </p>
      </header>

      <ImportKeyForm
        values={values}
        fieldErrors={fieldErrors}
        apiError={apiError}
        requestId={requestId}
        submitting={submitting}
        onChange={(nextValues) => {
          setValues(nextValues)
          setFieldErrors({})
        }}
        onSubmit={() => void handleSubmit()}
        onCancel={() => navigate("/keys")}
      />
    </section>
  )
}
