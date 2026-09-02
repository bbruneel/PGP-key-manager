import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { ApiError, getApiErrorMessage } from "@/lib/api-error"
import { copyTextToClipboard } from "@/lib/clipboard"
import { keysApi } from "@/lib/keys-api"
import { logUiEvent } from "@/lib/ui-logger"

type KeySshExportActionProps = {
  keyId: string
  fingerprint?: string | null
  keyIdHex?: string | null
  getAccessToken: () => Promise<string>
  /** Bumped when key material may have changed (refresh, revoke, rotate, etc.). */
  invalidateToken?: number
  /** When true, omit outer heading (used inside SSH setup card). */
  embedded?: boolean
}

export function KeySshExportAction({
  keyId,
  fingerprint,
  keyIdHex,
  getAccessToken,
  invalidateToken = 0,
  embedded = false,
}: KeySshExportActionProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [exportCache, setExportCache] = useState<{
    keyId: string
    invalidateToken: number
    sshLine: string
  } | null>(null)

  const cacheValid =
    exportCache?.keyId === keyId && exportCache?.invalidateToken === invalidateToken

  async function exportSshLine(forceRefresh = false): Promise<string> {
    if (!forceRefresh && cacheValid) {
      return exportCache!.sshLine
    }

    logUiEvent("info", {
      eventId: embedded ? "keyDetail.sshSetup.public.submit" : "keyDetail.exportSsh.submit",
      message: "Export SSH public key requested",
      operationId: "exportSshPublicKey",
      keyId,
    })

    setError(null)
    setRequestId(null)
    setLoading(true)

    try {
      const token = await getAccessToken()
      const sshLine = await keysApi.exportSshPublic({ accessToken: token, keyId })
      setExportCache({ keyId, invalidateToken, sshLine })
      logUiEvent("info", {
        eventId: embedded ? "keyDetail.sshSetup.public.success" : "keyDetail.exportSsh.success",
        message: "SSH public key exported",
        operationId: "exportSshPublicKey",
        keyId,
        fingerprint: fingerprint ?? undefined,
      })
      return sshLine
    } catch (e) {
      const message = getApiErrorMessage(e)
      setError(message)
      if (e instanceof ApiError) {
        if (e.requestId) {
          setRequestId(e.requestId)
        }
        logUiEvent("error", {
          eventId: embedded ? "keyDetail.sshSetup.public.error" : "keyDetail.exportSsh.error",
          message: "Export SSH public key failed",
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
      const sshLine = await exportSshLine()
      await copyTextToClipboard(sshLine)
      toast.success("SSH public key copied to clipboard")
      if (embedded) {
        logUiEvent("info", {
          eventId: "keyDetail.sshSetup.public.copy",
          message: "SSH public key copied",
          keyId,
        })
      }
    } catch {
      // error state already set
    }
  }

  async function handleDownload() {
    try {
      const sshLine = await exportSshLine()
      const blob = new Blob([sshLine + "\n"], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      const suffix = keyIdHex ?? fingerprint ?? keyId
      anchor.download = `${suffix}.pub`
      anchor.click()
      URL.revokeObjectURL(url)
      toast.success("SSH public key download started")
      if (embedded) {
        logUiEvent("info", {
          eventId: "keyDetail.sshSetup.public.download",
          message: "SSH public key downloaded",
          keyId,
        })
      }
    } catch {
      // error state already set
    }
  }

  return (
    <section
      role="region"
      aria-label={embedded ? "SSH public key for servers" : "Export SSH public key"}
      className="space-y-3"
    >
      {embedded ? null : (
        <div>
          <h3 className="text-sm font-semibold text-foreground">Export SSH public key</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Copy or download the OpenSSH one-line public key for <code>authorized_keys</code>.
          </p>
        </div>
      )}
      {embedded ? (
        <p className="text-sm text-muted-foreground">
          Copy or download the OpenSSH one-line public key for <code>authorized_keys</code>.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={loading} onClick={() => void handleCopy()}>
          Copy SSH public key
        </Button>
        <Button type="button" variant="outline" disabled={loading} onClick={() => void handleDownload()}>
          Download .pub
        </Button>
        {cacheValid ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={loading}
            onClick={() => void exportSshLine(true)}
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
