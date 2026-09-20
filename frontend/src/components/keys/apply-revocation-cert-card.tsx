import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ApiError, getApiErrorMessage } from "@/lib/api-error"
import {
  buildApplyRevocationCertRequest,
  defaultApplyRevocationCertFormValues,
  validateApplyRevocationCertForm,
  type ApplyRevocationCertFieldErrors,
  type ApplyRevocationCertFormValues,
} from "@/lib/apply-revocation-cert-validation"
import { keysApi } from "@/lib/keys-api"
import { logUiEvent } from "@/lib/ui-logger"

type ApplyRevocationCertCardProps = {
  keyId: string
  fingerprint?: string | null
  getAccessToken: () => Promise<string>
  onApplied: () => Promise<void> | void
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null
  }
  return <p className="mt-1 text-xs text-destructive">{message}</p>
}

export function ApplyRevocationCertCard({
  keyId,
  fingerprint,
  getAccessToken,
  onApplied,
}: ApplyRevocationCertCardProps) {
  const [values, setValues] = useState<ApplyRevocationCertFormValues>(
    defaultApplyRevocationCertFormValues,
  )
  const [fieldErrors, setFieldErrors] = useState<ApplyRevocationCertFieldErrors>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function updateField<K extends keyof ApplyRevocationCertFormValues>(
    key: K,
    value: ApplyRevocationCertFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }))
    setFieldErrors({})
  }

  async function handleSubmit() {
    logUiEvent("info", {
      eventId: "keyDetail.applyRevocationCert.submit",
      message: "Apply revocation certificate submitted",
      operationId: "applyRevocationCert",
      keyId,
    })

    const validation = validateApplyRevocationCertForm(values)
    if (!validation.valid) {
      setFieldErrors(validation.fieldErrors)
      logUiEvent("warn", {
        eventId: "keyDetail.applyRevocationCert.validationFailed",
        message: "Client-side apply revocation certificate validation failed",
        keyId,
      })
      return
    }

    setFieldErrors({})
    setApiError(null)
    setRequestId(null)
    setSubmitting(true)

    try {
      const token = await getAccessToken()
      const updated = await keysApi.applyRevocationCert({
        accessToken: token,
        keyId,
        body: buildApplyRevocationCertRequest(values),
      })

      logUiEvent("info", {
        eventId: "keyDetail.applyRevocationCert.apiSuccess",
        message: "Revocation certificate applied",
        operationId: "applyRevocationCert",
        keyId,
        fingerprint: updated.fingerprint ?? fingerprint ?? undefined,
      })

      toast.success("Revocation certificate applied", {
        description: updated.fingerprint
          ? `Fingerprint: ${updated.fingerprint}`
          : "Key is now revoked.",
      })

      setValues(defaultApplyRevocationCertFormValues())
      await onApplied()
    } catch (error) {
      const message = getApiErrorMessage(error)
      setApiError(message)
      if (error instanceof ApiError && error.requestId) {
        setRequestId(error.requestId)
      }
      logUiEvent("error", {
        eventId: "keyDetail.applyRevocationCert.apiError",
        message: "Apply revocation certificate API request failed",
        operationId: error instanceof ApiError ? error.operationId : "applyRevocationCert",
        requestId: error instanceof ApiError ? error.requestId : undefined,
        status: error instanceof ApiError ? error.status : undefined,
        keyId,
      })
      toast.error("Could not apply revocation certificate", { description: message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section role="region" aria-label="Apply revocation certificate" className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Apply revocation certificate</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste a previously downloaded or externally generated revocation certificate. No vault
          passphrase is required. This cryptographically revokes the primary key.
        </p>
      </div>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          void handleSubmit()
        }}
        noValidate
      >
        <div className="space-y-2">
          <Label htmlFor="apply-revocation-cert-armor">Armored certificate</Label>
          <Textarea
            id="apply-revocation-cert-armor"
            value={values.armoredCertificate}
            onChange={(event) => updateField("armoredCertificate", event.target.value)}
            disabled={submitting}
            rows={6}
            className="font-mono text-xs"
            aria-invalid={Boolean(fieldErrors.armoredCertificate)}
            placeholder="-----BEGIN PGP PUBLIC KEY BLOCK-----"
          />
          <FieldError message={fieldErrors.armoredCertificate} />
        </div>

        <div className="space-y-2">
          <label className="flex items-start gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              className="mt-1"
              checked={values.confirmed}
              onChange={(event) => updateField("confirmed", event.target.checked)}
              disabled={submitting}
              aria-invalid={Boolean(fieldErrors.confirmed)}
            />
            <span>
              I understand applying this certificate permanently revokes the key in the vault.
            </span>
          </label>
          <FieldError message={fieldErrors.confirmed} />
        </div>

        {apiError ? (
          <div className="text-sm text-destructive">
            <p>{apiError}</p>
            {requestId ? <p className="mt-1 text-xs text-muted-foreground">Request ID: {requestId}</p> : null}
          </div>
        ) : null}

        <Button type="submit" variant="destructive" disabled={submitting}>
          {submitting ? "Applying…" : "Apply revocation certificate"}
        </Button>
      </form>
    </section>
  )
}
