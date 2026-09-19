import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ApiError, getApiErrorMessage } from "@/lib/api-error"
import {
  buildExportPrivateRequest,
  defaultExportPrivateFormValues,
  validateExportPrivateForm,
  type ExportPrivateFieldErrors,
  type ExportPrivateFormValues,
} from "@/lib/export-private-validation"
import { keysApi } from "@/lib/keys-api"
import { logUiEvent } from "@/lib/ui-logger"

type ExportPrivateCardProps = {
  keyId: string
  fingerprint?: string | null
  keyIdHex?: string | null
  label?: string | null
  canExport: boolean
  disabledReason?: string | null
  getAccessToken: () => Promise<string>
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null
  }
  return <p className="mt-1 text-xs text-destructive">{message}</p>
}

export function ExportPrivateCard({
  keyId,
  fingerprint,
  keyIdHex,
  label,
  canExport,
  disabledReason,
  getAccessToken,
}: ExportPrivateCardProps) {
  const [values, setValues] = useState<ExportPrivateFormValues>(defaultExportPrivateFormValues)
  const [fieldErrors, setFieldErrors] = useState<ExportPrivateFieldErrors>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function updateField<K extends keyof ExportPrivateFormValues>(
    key: K,
    value: ExportPrivateFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }))
    setFieldErrors({})
  }

  async function handleSubmit() {
    logUiEvent("info", {
      eventId: "keyDetail.exportPrivate.submit",
      message: "Private encryption-key export submitted",
      operationId: "exportPrivateKey",
      keyId,
    })

    const validation = validateExportPrivateForm(values)
    if (!validation.valid) {
      setFieldErrors(validation.fieldErrors)
      logUiEvent("warn", {
        eventId: "keyDetail.exportPrivate.validationFailed",
        message: "Private encryption-key export validation failed",
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
      const armor = await keysApi.exportPrivate({
        accessToken: token,
        keyId,
        body: buildExportPrivateRequest(values),
      })

      const blob = new Blob([armor], { type: "application/pgp-keys" })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      const fallbackName = `${(label ?? keyIdHex ?? fingerprint ?? keyId)
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, "-")}-private.asc`
      anchor.download = fallbackName
      anchor.click()
      URL.revokeObjectURL(url)

      toast.success("Encrypted private key downloaded", {
        description:
          "The file remains passphrase-protected OpenPGP armor. Do not store it in chat, email, or screenshots.",
      })
      logUiEvent("info", {
        eventId: "keyDetail.exportPrivate.success",
        message: "Private encryption-key export downloaded",
        operationId: "exportPrivateKey",
        keyId,
        fingerprint: fingerprint ?? undefined,
      })
      setValues({ ...defaultExportPrivateFormValues })
    } catch (error) {
      setApiError(getApiErrorMessage(error))
      if (error instanceof ApiError && error.requestId) {
        setRequestId(error.requestId)
      }
      logUiEvent("error", {
        eventId: "keyDetail.exportPrivate.error",
        message: "Private encryption-key export failed",
        operationId: error instanceof ApiError ? error.operationId : "exportPrivateKey",
        requestId: error instanceof ApiError ? error.requestId : undefined,
        status: error instanceof ApiError ? error.status : undefined,
        keyId,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section
      role="region"
      aria-label="Export private encryption key"
      className="space-y-4"
      data-pgp-ui="keyDetail.exportPrivate"
    >
      <div>
        <h3 className="text-sm font-semibold text-foreground">Export private encryption key</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Download the stored OpenPGP encrypted secret for backup or use in GnuPG, Thunderbird, or
          other OpenPGP tools. Anyone who unlocks this file can decrypt data encrypted to this key.
        </p>
      </div>

      {canExport ? (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            void handleSubmit()
          }}
          noValidate
        >
          <p className="text-sm text-muted-foreground">
            This download is still passphrase-protected OpenPGP armor (no server unlock). Do not
            paste it into chat, email, or screenshots.
          </p>
          <div className="flex items-start gap-2">
            <input
              id="export-private-confirm"
              type="checkbox"
              className="mt-1 size-4 rounded border-border"
              checked={values.confirmed}
              onChange={(event) => updateField("confirmed", event.target.checked)}
              data-pgp-ui="keyDetail.exportPrivate.confirm"
            />
            <Label htmlFor="export-private-confirm" className="text-sm font-normal leading-snug">
              I understand this download can decrypt data encrypted to this key.
            </Label>
          </div>
          <FieldError message={fieldErrors.confirmed} />

          {apiError ? (
            <p className="text-sm text-destructive" role="alert">
              {apiError}
              {requestId ? (
                <span className="mt-1 block text-xs text-muted-foreground">Request ID: {requestId}</span>
              ) : null}
            </p>
          ) : null}

          <Button type="submit" disabled={submitting} data-pgp-ui="keyDetail.exportPrivate.download">
            {submitting ? "Downloading…" : "Download encrypted private key"}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground" data-pgp-ui="keyDetail.exportPrivate.disabled">
          {disabledReason ?? "Private encryption-key export is not available for this key."}
        </p>
      )}
    </section>
  )
}
