import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { ApiError, getApiErrorMessage } from "@/lib/api-error"
import { copyTextToClipboard } from "@/lib/clipboard"
import { keysApi } from "@/lib/keys-api"
import { logUiEvent } from "@/lib/ui-logger"

type KeyExportActionProps = {
  keyId: string
  fingerprint?: string | null
  getAccessToken: () => Promise<string>
}

export function KeyExportAction({ keyId, fingerprint, getAccessToken }: KeyExportActionProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [exportCache, setExportCache] = useState<{ keyId: string; armored: string } | null>(null)

  async function exportArmored(forceRefresh = false): Promise<string> {
    if (!forceRefresh && exportCache?.keyId === keyId) {
      return exportCache.armored
    }

    logUiEvent("info", {
      eventId: "keyDetail.export.submit",
      message: "Export public key requested",
      operationId: "exportPublicKey",
      keyId,
    })

    setError(null)
    setRequestId(null)
    setLoading(true)

    try {
      const token = await getAccessToken()
      const armored = await keysApi.exportPublic({ accessToken: token, keyId })
      setExportCache({ keyId, armored })
      logUiEvent("info", {
        eventId: "keyDetail.export.success",
        message: "Public key exported",
        operationId: "exportPublicKey",
        keyId,
        fingerprint: fingerprint ?? undefined,
      })
      return armored
    } catch (e) {
      const message = getApiErrorMessage(e)
      setError(message)
      if (e instanceof ApiError) {
        if (e.requestId) {
          setRequestId(e.requestId)
        }
        logUiEvent("error", {
          eventId: "keyDetail.export.error",
          message: "Export public key failed",
          operationId: e.operationId,
          requestId: e.requestId,
          status: e.status,
          keyId,
        })
      }
      throw e
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    try {
      const armored = await exportArmored()
      await copyTextToClipboard(armored)
      toast.success("Public key copied to clipboard")
    } catch {
      // error state already set
    }
  }

  async function handleDownload() {
    try {
      const armored = await exportArmored()
      const blob = new Blob([armored], { type: "application/pgp-keys" })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `${fingerprint ?? keyId}.asc`
      anchor.click()
      URL.revokeObjectURL(url)
      toast.success("Public key download started")
    } catch {
      // error state already set
    }
  }

  return (
    <section role="region" aria-label="Export public key" className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Export public key</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Download or copy the armored public key block for sharing or backup.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={loading} onClick={() => void handleCopy()}>
          Copy to clipboard
        </Button>
        <Button type="button" variant="outline" disabled={loading} onClick={() => void handleDownload()}>
          Download .asc
        </Button>
        {exportCache?.keyId === keyId ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={loading}
            onClick={() => void exportArmored(true)}
          >
            Refresh export
          </Button>
        ) : null}
      </div>

      {error ? (
        <div className="text-sm text-destructive">
          <p>{error}</p>
          {requestId ? <p className="mt-1 text-xs text-muted-foreground">Request ID: {requestId}</p> : null}
        </div>
      ) : null}
    </section>
  )
}
