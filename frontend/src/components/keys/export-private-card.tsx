import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiError, getApiErrorMessage } from "@/lib/api-error"
import {
  buildExportPrivateRequest,
  defaultExportPrivateFormValues,
  isModeBExportAttempt,
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
  /** When false, show owner-only (or other) disabled copy instead of the download form. */
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

  function setRewrapEnabled(enabled: boolean) {
    setValues((current) => {
      if (!enabled) {
        return {
          ...current,
          rewrapEnabled: false,
          passphrase: "",
          newPassphrase: "",
          confirmNewPassphrase: "",
        }
      }
      return { ...current, rewrapEnabled: true }
    })
    setFieldErrors({})
    logUiEvent("info", {
      eventId: "keyDetail.exportPrivate.rewrap.toggle",
      message: enabled
        ? "Export with a new passphrase enabled"
        : "Export with a new passphrase disabled",
      keyId,
    })
  }

  async function handleSubmit() {
    const modeB = isModeBExportAttempt(values)
    logUiEvent("info", {
      eventId: modeB ? "keyDetail.exportPrivate.rewrap.submit" : "keyDetail.exportPrivate.submit",
      message: modeB
        ? "Private keyring rewrap export submitted"
        : "Private keyring export submitted",
      operationId: "exportPrivateKey",
      keyId,
    })

    const validation = validateExportPrivateForm(values)
    if (!validation.valid) {
      setFieldErrors(validation.fieldErrors)
      logUiEvent("warn", {
        eventId: modeB
          ? "keyDetail.exportPrivate.rewrap.validationFailed"
          : "keyDetail.exportPrivate.validationFailed",
        message: "Private keyring export validation failed",
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
        .replace(/[^a-z0-9._-]+/g, "-")}-secret-keyring.asc`
      anchor.download = fallbackName
      anchor.click()
      URL.revokeObjectURL(url)

      toast.success(
        modeB
          ? "Rewrapped private keyring downloaded"
          : "Encrypted private keyring downloaded",
        {
          description: modeB
            ? "The file opens with your new transfer passphrase. The vault key is unchanged. Do not store the file in chat, email, or screenshots."
            : "The file is the full OpenPGP secret keyring and remains passphrase-protected with your vault passphrase. Do not store it in chat, email, or screenshots.",
        },
      )
      logUiEvent("info", {
        eventId: modeB
          ? "keyDetail.exportPrivate.rewrap.success"
          : "keyDetail.exportPrivate.success",
        message: modeB
          ? "Private keyring rewrap export downloaded"
          : "Private keyring export downloaded",
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
        eventId: modeB ? "keyDetail.exportPrivate.rewrap.error" : "keyDetail.exportPrivate.error",
        message: "Private keyring export failed",
        operationId: error instanceof ApiError ? error.operationId : "exportPrivateKey",
        requestId: error instanceof ApiError ? error.requestId : undefined,
        status: error instanceof ApiError ? error.status : undefined,
        keyId,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const rewrapFieldsDisabled = !values.rewrapEnabled || submitting

  return (
    <section
      role="region"
      aria-label="Export private keyring"
      className="space-y-4"
      data-pgp-ui="keyDetail.exportPrivate"
    >
      <div>
        <h3 className="text-sm font-semibold text-foreground">Export private keyring</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Download the stored OpenPGP encrypted secret keyring for backup or use in GnuPG,
          Thunderbird, or other OpenPGP tools. This file includes the primary and every secret
          subkey in the ring (decrypt, sign, and authenticate as applicable).
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
            Without a new passphrase, the download keeps your vault passphrase (no server unlock).
            Do not paste it into chat, email, or screenshots.
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
              I understand this download is the full secret keyring and can decrypt, sign, or
              authenticate as this identity where those capabilities exist in the ring.
            </Label>
          </div>
          <FieldError message={fieldErrors.confirmed} />

          <div className="space-y-3 rounded-md border border-input bg-background p-4">
            <div className="flex items-start gap-2">
              <input
                id="export-private-rewrap"
                type="checkbox"
                className="mt-1 size-4 rounded border-border"
                checked={values.rewrapEnabled}
                onChange={(event) => setRewrapEnabled(event.target.checked)}
                disabled={submitting}
                data-pgp-ui="keyDetail.exportPrivate.rewrap.toggle"
              />
              <Label htmlFor="export-private-rewrap" className="text-sm font-normal leading-snug">
                Export with a new passphrase
              </Label>
            </div>
            <p className="text-sm text-muted-foreground" data-pgp-ui="keyDetail.exportPrivate.rewrap">
              When checked, unlock with your vault passphrase and re-encrypt the download with a
              transfer passphrase. This does not change the passphrase stored in the vault — only
              the downloaded file.
            </p>
            <div>
              <Label htmlFor="export-private-vault-passphrase">Vault passphrase</Label>
              <Input
                id="export-private-vault-passphrase"
                type="password"
                autoComplete="current-password"
                value={values.passphrase}
                onChange={(event) => updateField("passphrase", event.target.value)}
                disabled={rewrapFieldsDisabled}
                aria-invalid={Boolean(fieldErrors.passphrase)}
                data-pgp-ui="keyDetail.exportPrivate.rewrap.passphrase"
              />
              <FieldError message={fieldErrors.passphrase} />
            </div>
            <div>
              <Label htmlFor="export-private-new-passphrase">New transfer passphrase</Label>
              <Input
                id="export-private-new-passphrase"
                type="password"
                autoComplete="new-password"
                value={values.newPassphrase}
                onChange={(event) => updateField("newPassphrase", event.target.value)}
                disabled={rewrapFieldsDisabled}
                aria-invalid={Boolean(fieldErrors.newPassphrase)}
                data-pgp-ui="keyDetail.exportPrivate.rewrap.newPassphrase"
              />
              <FieldError message={fieldErrors.newPassphrase} />
            </div>
            <div>
              <Label htmlFor="export-private-confirm-new-passphrase">
                Confirm transfer passphrase
              </Label>
              <Input
                id="export-private-confirm-new-passphrase"
                type="password"
                autoComplete="new-password"
                value={values.confirmNewPassphrase}
                onChange={(event) => updateField("confirmNewPassphrase", event.target.value)}
                disabled={rewrapFieldsDisabled}
                aria-invalid={Boolean(fieldErrors.confirmNewPassphrase)}
                data-pgp-ui="keyDetail.exportPrivate.rewrap.confirmNewPassphrase"
              />
              <FieldError message={fieldErrors.confirmNewPassphrase} />
            </div>
          </div>

          {apiError ? (
            <p className="text-sm text-destructive" role="alert">
              {apiError}
              {requestId ? (
                <span className="mt-1 block text-xs text-muted-foreground">Request ID: {requestId}</span>
              ) : null}
            </p>
          ) : null}

          <Button type="submit" disabled={submitting} data-pgp-ui="keyDetail.exportPrivate.download">
            {submitting
              ? "Downloading…"
              : values.rewrapEnabled
                ? "Download with new passphrase"
                : "Download encrypted private keyring"}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground" data-pgp-ui="keyDetail.exportPrivate.disabled">
          {disabledReason ?? "Private keyring export is not available for this key."}
        </p>
      )}
    </section>
  )
}
