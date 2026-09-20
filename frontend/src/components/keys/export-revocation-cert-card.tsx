import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ApiError, getApiErrorMessage } from "@/lib/api-error"
import {
  buildExportRevocationCertRequest,
  defaultExportRevocationCertFormValues,
  validateExportRevocationCertForm,
  type ExportRevocationCertFieldErrors,
  type ExportRevocationCertFormValues,
} from "@/lib/export-revocation-cert-validation"
import { keysApi } from "@/lib/keys-api"
import {
  REVOCATION_REASONS,
  type RevocationReason,
} from "@/lib/revoke-key-validation"
import { logUiEvent } from "@/lib/ui-logger"

type ExportRevocationCertCardProps = {
  keyId: string
  fingerprint?: string | null
  label?: string | null
  disabled: boolean
  disabledReason?: string | null
  getAccessToken: () => Promise<string>
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null
  }
  return <p className="mt-1 text-xs text-destructive">{message}</p>
}

const REASON_LABELS: Record<RevocationReason, string> = {
  no_reason: "No reason specified",
  key_superseded: "Key superseded",
  key_compromised: "Key compromised",
  key_retired: "Key retired",
  user_id_invalid: "User ID invalid",
}

export function ExportRevocationCertCard({
  keyId,
  fingerprint,
  label,
  disabled,
  disabledReason,
  getAccessToken,
}: ExportRevocationCertCardProps) {
  const [values, setValues] = useState<ExportRevocationCertFormValues>(
    defaultExportRevocationCertFormValues,
  )
  const [fieldErrors, setFieldErrors] = useState<ExportRevocationCertFieldErrors>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function updateField<K extends keyof ExportRevocationCertFormValues>(
    key: K,
    value: ExportRevocationCertFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }))
    setFieldErrors({})
  }

  async function handleSubmit() {
    logUiEvent("info", {
      eventId: "keyDetail.exportRevocationCert.submit",
      message: "Export revocation certificate submitted",
      operationId: "exportRevocationCert",
      keyId,
    })

    const validation = validateExportRevocationCertForm(values)
    if (!validation.valid) {
      setFieldErrors(validation.fieldErrors)
      logUiEvent("warn", {
        eventId: "keyDetail.exportRevocationCert.validationFailed",
        message: "Client-side export revocation certificate validation failed",
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
      const armor = await keysApi.exportRevocationCert({
        accessToken: token,
        keyId,
        body: buildExportRevocationCertRequest(values),
      })

      const blob = new Blob([armor], { type: "application/pgp-keys" })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      const shortFp = fingerprint?.slice(-8)?.toLowerCase() ?? "key"
      anchor.href = url
      anchor.download = `revocation-cert-${shortFp}.asc`
      anchor.click()
      URL.revokeObjectURL(url)

      logUiEvent("info", {
        eventId: "keyDetail.exportRevocationCert.apiSuccess",
        message: "Revocation certificate downloaded",
        operationId: "exportRevocationCert",
        keyId,
        fingerprint: fingerprint ?? undefined,
      })

      toast.success("Revocation certificate downloaded", {
        description:
          "Store it offline. This does not revoke the key until you apply the certificate.",
      })

      setValues({ ...defaultExportRevocationCertFormValues(), reason: values.reason })
    } catch (error) {
      const message = getApiErrorMessage(error)
      setApiError(message)
      if (error instanceof ApiError && error.requestId) {
        setRequestId(error.requestId)
      }
      logUiEvent("error", {
        eventId: "keyDetail.exportRevocationCert.apiError",
        message: "Export revocation certificate API request failed",
        operationId: error instanceof ApiError ? error.operationId : "exportRevocationCert",
        requestId: error instanceof ApiError ? error.requestId : undefined,
        status: error instanceof ApiError ? error.status : undefined,
        keyId,
      })
      toast.error("Could not download revocation certificate", { description: message })
    } finally {
      setSubmitting(false)
    }
  }

  if (disabled) {
    return (
      <section role="region" aria-label="Generate revocation certificate" className="space-y-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Generate revocation certificate</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {disabledReason ??
              "A revocation certificate cannot be generated for this key right now."}
          </p>
        </div>
      </section>
    )
  }

  return (
    <section role="region" aria-label="Generate revocation certificate" className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Generate revocation certificate</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Download an offline kill-switch for{label ? ` “${label}”` : " this primary key"}. This does{" "}
          <strong>not</strong> revoke the key — store the file safely and apply it later if needed.
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
          <Label htmlFor="export-revocation-cert-reason">Reason</Label>
          <Select
            value={values.reason}
            onValueChange={(value: string) => updateField("reason", value as RevocationReason)}
            disabled={submitting}
          >
            <SelectTrigger
              id="export-revocation-cert-reason"
              className="w-full"
              aria-invalid={Boolean(fieldErrors.reason)}
            >
              <SelectValue placeholder="Select reason" />
            </SelectTrigger>
            <SelectContent>
              {REVOCATION_REASONS.map((reason) => (
                <SelectItem key={reason} value={reason}>
                  {REASON_LABELS[reason]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={fieldErrors.reason} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="export-revocation-cert-description">Description (optional)</Label>
          <Textarea
            id="export-revocation-cert-description"
            value={values.description}
            onChange={(event) => updateField("description", event.target.value)}
            disabled={submitting}
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="export-revocation-cert-passphrase">Passphrase</Label>
          <Input
            id="export-revocation-cert-passphrase"
            type="password"
            value={values.passphrase}
            onChange={(event) => updateField("passphrase", event.target.value)}
            autoComplete="current-password"
            aria-invalid={Boolean(fieldErrors.passphrase)}
            disabled={submitting}
          />
          <FieldError message={fieldErrors.passphrase} />
        </div>

        {apiError ? (
          <div className="text-sm text-destructive">
            <p>{apiError}</p>
            {requestId ? <p className="mt-1 text-xs text-muted-foreground">Request ID: {requestId}</p> : null}
          </div>
        ) : null}

        <Button type="submit" disabled={submitting}>
          {submitting ? "Generating…" : "Download revocation certificate"}
        </Button>
      </form>
    </section>
  )
}
