import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { CreateKeyForm } from "@/components/keys/create-key-form"
import { useApiAccessToken } from "@/hooks/use-api-access-token"
import { useGroupContext } from "@/hooks/use-group-context"
import { ApiError, getApiErrorMessage } from "@/lib/api-error"
import {
  buildCreateKeyRequest,
  defaultCreateKeyFormValues,
  validateCreateKeyForm,
  type CreateKeyFieldErrors,
  type CreateKeyFormValues,
} from "@/lib/create-key-validation"
import { notifyAlgorithmAdjusted } from "@/lib/algorithm-adjustment-toast"
import { keysApi } from "@/lib/keys-api"
import { logUiEvent } from "@/lib/ui-logger"

function clearPassphraseFields(values: CreateKeyFormValues): CreateKeyFormValues {
  return {
    ...values,
    passphrase: "",
    confirmPassphrase: "",
  }
}

export function CreateKeyPage() {
  const navigate = useNavigate()
  const { getAccessToken, isAuthenticated, isConfigured, authError } = useApiAccessToken()
  const { activeGroup } = useGroupContext()
  const [values, setValues] = useState<CreateKeyFormValues>(defaultCreateKeyFormValues)
  const [teamVaultOverride, setTeamVaultOverride] = useState<boolean | null>(null)
  const [fieldErrors, setFieldErrors] = useState<CreateKeyFieldErrors>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    logUiEvent("debug", {
      eventId: "createKey.pageView",
      message: "Create key page viewed",
    })
  }, [])

  const useTeamVault = teamVaultOverride ?? Boolean(activeGroup)

  const handleSubmit = useCallback(async () => {
    logUiEvent("info", {
      eventId: "createKey.submit",
      message: "Create key form submitted",
    })

    setApiError(null)
    setRequestId(null)

    const validation = validateCreateKeyForm(values)
    if (!validation.valid) {
      setFieldErrors(validation.fieldErrors)
      logUiEvent("warn", {
        eventId: "createKey.validationFailed",
        message: "Client-side validation failed",
      })
      return
    }

    setFieldErrors({})
    setSubmitting(true)

    try {
      const token = await getAccessToken()
      const body = buildCreateKeyRequest(values, {
        ownerGroupId: useTeamVault ? activeGroup?.id : undefined,
      })
      const created = await keysApi.create({ accessToken: token, body })

      logUiEvent("info", {
        eventId: "createKey.apiSuccess",
        message: "Primary key created",
        operationId: "createKey",
        keyId: created.id ?? undefined,
        fingerprint: created.fingerprint ?? undefined,
        groupId: body.ownerGroupId,
      })

      toast.success("Primary key created", {
        description: created.fingerprint
          ? `Fingerprint: ${created.fingerprint}`
          : "Your key is ready. Remember your passphrase — it cannot be recovered.",
      })

      setValues(clearPassphraseFields(values))
      navigate("/keys")
    } catch (error) {
      const message = getApiErrorMessage(error)
      setApiError(message)

      if (error instanceof ApiError) {
        if (error.requestId) {
          setRequestId(error.requestId)
        }
        logUiEvent("error", {
          eventId: "createKey.apiError",
          message: "Create key API request failed",
          operationId: error.operationId,
          requestId: error.requestId,
          status: error.status,
        })
      } else {
        logUiEvent("error", {
          eventId: "createKey.apiError",
          message: "Create key request failed",
        })
      }
    } finally {
      setSubmitting(false)
      setValues((current) => clearPassphraseFields(current))
    }
  }, [activeGroup, getAccessToken, navigate, useTeamVault, values])

  if (!isConfigured) {
    return (
      <section className="rounded-lg border border-dashed border-border bg-card/50 p-6 text-sm md:p-8">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Create primary key</h2>
        <p className="mt-2 text-muted-foreground">
          Configure Auth0 to generate and store keys via the API.
        </p>
      </section>
    )
  }

  if (!isAuthenticated) {
    return (
      <section className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm md:p-8">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Create primary key</h2>
        <p className="mt-2 text-sm text-muted-foreground">Sign in to create a key for your account.</p>
        {authError ? <p className="mt-2 text-sm text-destructive">{authError}</p> : null}
      </section>
    )
  }

  return (
    <section className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm md:p-8">
      <header className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Create primary key</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate a new primary key. Ed25519 is recommended; advanced options support legacy algorithms.
        </p>
      </header>

      {activeGroup ? (
        <label className="mb-6 flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={useTeamVault}
            onChange={(event) => setTeamVaultOverride(event.target.checked)}
          />
          Store key in team vault <span className="font-medium">{activeGroup.name}</span>
        </label>
      ) : null}

      <CreateKeyForm
        values={values}
        fieldErrors={fieldErrors}
        apiError={apiError}
        requestId={requestId}
        submitting={submitting}
        onChange={(nextValues) => {
          setValues(nextValues)
          setFieldErrors({})
        }}
        onAlgorithmChanged={(nextValues) => {
          logUiEvent("debug", {
            eventId: "createKey.algorithmChanged",
            message: "Create key algorithm changed",
            algorithm: nextValues.algorithm,
            openpgpVersion: nextValues.openpgpVersion,
          })
        }}
        onAlgorithmAdjusted={(nextValues, previousValues) => {
          notifyAlgorithmAdjusted(previousValues, nextValues)
          logUiEvent("debug", {
            eventId: "createKey.algorithmChanged",
            message: "Create key algorithm adjusted for OpenPGP version",
            algorithm: nextValues.algorithm,
            previousAlgorithm: previousValues.algorithm,
            openpgpVersion: nextValues.openpgpVersion,
          })
        }}
        onSubmit={() => void handleSubmit()}
        onCancel={() => navigate("/keys")}
      />
    </section>
  )
}
