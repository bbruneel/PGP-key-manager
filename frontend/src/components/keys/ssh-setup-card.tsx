import { useEffect, useState } from "react"
import { toast } from "sonner"

import { ArchivePasswordDialog } from "@/components/keys/archive-password-dialog"
import { KeySshExportAction } from "@/components/keys/key-ssh-export-action"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiError, getApiErrorMessage } from "@/lib/api-error"
import {
  buildExportSshPrivateRequest,
  defaultExportSshPrivateFormValues,
  validateExportSshPrivateForm,
  type ExportSshPrivateFieldErrors,
  type ExportSshPrivateFormValues,
} from "@/lib/export-ssh-private-validation"
import { keysApi } from "@/lib/keys-api"
import { logUiEvent } from "@/lib/ui-logger"

type SshSetupCardProps = {
  keyId: string
  fingerprint?: string | null
  keyIdHex?: string | null
  label?: string | null
  canDownloadPack: boolean
  packDisabledReason?: string | null
  getAccessToken: () => Promise<string>
  invalidateToken?: number
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null
  }
  return <p className="mt-1 text-xs text-destructive">{message}</p>
}

function clearPassphrase(values: ExportSshPrivateFormValues): ExportSshPrivateFormValues {
  return { ...values, passphrase: "" }
}

export function SshSetupCard({
  keyId,
  fingerprint,
  keyIdHex,
  label,
  canDownloadPack,
  packDisabledReason,
  getAccessToken,
  invalidateToken = 0,
}: SshSetupCardProps) {
  const [values, setValues] = useState<ExportSshPrivateFormValues>(defaultExportSshPrivateFormValues)
  const [fieldErrors, setFieldErrors] = useState<ExportSshPrivateFieldErrors>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [archivePassword, setArchivePassword] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      setArchivePassword(null)
    }
  }, [])

  function updateField<K extends keyof ExportSshPrivateFormValues>(
    key: K,
    value: ExportSshPrivateFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }))
    setFieldErrors({})
  }

  async function handlePackSubmit() {
    logUiEvent("info", {
      eventId: "keyDetail.sshSetup.pack.submit",
      message: "SSH setup pack download submitted",
      operationId: "exportSshSetupPack",
      keyId,
    })

    const validation = validateExportSshPrivateForm(values)
    if (!validation.valid) {
      setFieldErrors(validation.fieldErrors)
      logUiEvent("warn", {
        eventId: "keyDetail.sshSetup.pack.validationFailed",
        message: "SSH setup pack validation failed",
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
      const pack = await keysApi.exportSshSetupPack({
        accessToken: token,
        keyId,
        body: buildExportSshPrivateRequest(values),
      })

      const url = URL.createObjectURL(pack.blob)
      const anchor = document.createElement("a")
      anchor.href = url
      const fallbackName = `${(label ?? keyIdHex ?? fingerprint ?? keyId)
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, "-")}-ssh-setup.zip`
      anchor.download = pack.filename ?? fallbackName
      anchor.click()
      URL.revokeObjectURL(url)

      if (pack.archivePassword) {
        setArchivePassword(pack.archivePassword)
        logUiEvent("info", {
          eventId: "keyDetail.sshSetup.password.shown",
          message: "SSH setup archive password shown once",
          keyId,
        })
      }

      toast.success("SSH setup pack downloaded", {
        description: "Save the zip password from the dialog. If you lose it, download a new pack.",
      })
      logUiEvent("info", {
        eventId: "keyDetail.sshSetup.pack.success",
        message: "SSH setup pack downloaded",
        operationId: "exportSshSetupPack",
        keyId,
        fingerprint: fingerprint ?? undefined,
      })
      setValues(clearPassphrase({ ...values, confirmed: false }))
    } catch (error) {
      setApiError(getApiErrorMessage(error))
      if (error instanceof ApiError && error.requestId) {
        setRequestId(error.requestId)
      }
      logUiEvent("error", {
        eventId: "keyDetail.sshSetup.pack.error",
        message: "SSH setup pack download failed",
        operationId: error instanceof ApiError ? error.operationId : "exportSshSetupPack",
        requestId: error instanceof ApiError ? error.requestId : undefined,
        status: error instanceof ApiError ? error.status : undefined,
        keyId,
      })
    } finally {
      setSubmitting(false)
      setValues((current) => clearPassphrase(current))
    }
  }

  return (
    <section role="region" aria-label="SSH setup" className="space-y-5" data-pgp-ui="keyDetail.sshSetup">
      <div>
        <h3 className="text-sm font-semibold text-foreground">SSH setup</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Use this authenticate subkey for SSH. The public half goes on servers; the setup pack
          gives you a local OpenSSH private key inside a password-protected zip.
        </p>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-foreground">On servers</h4>
        <KeySshExportAction
          keyId={keyId}
          fingerprint={fingerprint}
          keyIdHex={keyIdHex}
          getAccessToken={getAccessToken}
          invalidateToken={invalidateToken}
          embedded
        />
      </div>

      <div className="space-y-3 border-t border-border pt-5">
        <h4 className="text-sm font-medium text-foreground">On this computer</h4>
        {canDownloadPack ? (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              void handlePackSubmit()
            }}
            noValidate
          >
            <p className="text-sm text-muted-foreground">
              Download an AES-encrypted zip with the OpenSSH private key, matching{" "}
              <code>.pub</code>, README, and an SSH config snippet. The zip password is shown once
              after download.
            </p>
            <div className="space-y-2">
              <Label htmlFor="ssh-setup-passphrase">Vault passphrase</Label>
              <Input
                id="ssh-setup-passphrase"
                type="password"
                autoComplete="current-password"
                value={values.passphrase}
                disabled={submitting}
                onChange={(event) => updateField("passphrase", event.target.value)}
                aria-invalid={Boolean(fieldErrors.passphrase)}
              />
              <FieldError message={fieldErrors.passphrase} />
            </div>
            <div className="flex items-start gap-2">
              <input
                id="ssh-setup-confirm"
                type="checkbox"
                className="mt-1"
                checked={values.confirmed}
                disabled={submitting}
                onChange={(event) => updateField("confirmed", event.target.checked)}
                aria-invalid={Boolean(fieldErrors.confirmed)}
              />
              <Label htmlFor="ssh-setup-confirm" className="font-normal leading-snug">
                I understand this download contains secret key material. I will store it securely
                and not share it.
              </Label>
            </div>
            <FieldError message={fieldErrors.confirmed} />
            <Button type="submit" disabled={submitting}>
              {submitting ? "Downloading…" : "Download SSH setup pack"}
            </Button>
            {apiError ? (
              <div className="text-sm text-destructive">
                <p>{apiError}</p>
                {requestId ? (
                  <p className="mt-1 text-xs text-muted-foreground">Request ID: {requestId}</p>
                ) : null}
              </div>
            ) : null}
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            {packDisabledReason ??
              "Import private keyring material on the primary key to enable the SSH setup pack."}
          </p>
        )}

        <details className="text-sm text-muted-foreground">
          <summary className="cursor-pointer font-medium text-foreground">Prefer GnuPG?</summary>
          <p className="mt-2">
            If you already have this keyring in local GnuPG, configure{" "}
            <code>gpg-agent</code> with SSH support instead of using a standalone OpenSSH private
            key file.
          </p>
        </details>
      </div>

      <ArchivePasswordDialog
        open={Boolean(archivePassword)}
        password={archivePassword}
        onCopy={() => {
          toast.success("Zip password copied")
          logUiEvent("info", {
            eventId: "keyDetail.sshSetup.password.copied",
            message: "SSH setup archive password copied",
            keyId,
          })
        }}
        onDismiss={() => {
          setArchivePassword(null)
          logUiEvent("info", {
            eventId: "keyDetail.sshSetup.password.dismissed",
            message: "SSH setup archive password dialog dismissed",
            keyId,
          })
        }}
      />
    </section>
  )
}
