import { Button } from "@/components/ui/button"
import { formatCapabilities, formatKeyExpiry, formatKeyStatus } from "@/lib/key-display"
import type { PreviewImportSubkeysResponse, PreviewKeyEntry } from "@/types/api"
import { cn } from "@/lib/utils"

type ImportSubkeysFormProps = {
  apiError: string | null
  requestId: string | null
  submitting: boolean
  previewing?: boolean
  disabled: boolean
  preview: PreviewImportSubkeysResponse | null
  onPreview?: () => void
  onSubmit: () => void
}

function shortFingerprint(fingerprint: string): string {
  if (fingerprint.length <= 16) {
    return fingerprint
  }
  return `${fingerprint.slice(0, 8)}…${fingerprint.slice(-8)}`
}

function PreviewSubkeyRow({ entry, action }: { entry: PreviewKeyEntry; action: string }) {
  return (
    <tr className="border-b border-border/60 last:border-0">
      <td className="py-2 pr-3 text-xs">{action}</td>
      <td className="py-2 pr-3 font-mono text-xs" title={entry.fingerprint}>
        {shortFingerprint(entry.fingerprint)}
      </td>
      <td className="py-2 pr-3 text-xs">{entry.algorithm}</td>
      <td className="py-2 pr-3 text-xs">{formatCapabilities(entry.capabilities)}</td>
      <td className="py-2 pr-3 text-xs">{formatKeyExpiry(entry.expiresAt)}</td>
      <td className="py-2 text-xs">{formatKeyStatus(entry.status)}</td>
    </tr>
  )
}

export function ImportSubkeysForm({
  apiError,
  requestId,
  submitting,
  previewing = false,
  disabled,
  preview,
  onPreview,
  onSubmit,
}: ImportSubkeysFormProps) {
  return (
    <section aria-label="Import subkeys from keyring" className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Import subkeys from keyring</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Register metadata-only subkey rows for keys already present in the stored armored keyring.
          Preview shows what would be registered, synced to revoked, or skipped.
        </p>
      </div>

      {preview ? (
        <div className={cn("space-y-3 rounded-md border border-border bg-muted/20 p-4")}>
          <p className="text-sm text-muted-foreground">
            {preview.wouldRegister.length} to register · {preview.wouldUpdate.length} revocation
            sync · {preview.wouldSkipCount} already up to date
          </p>
          {preview.warnings.length > 0 ? (
            <ul className="space-y-1 text-xs text-amber-900 dark:text-amber-200">
              {preview.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
          {preview.wouldRegister.length + preview.wouldUpdate.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="pb-2 pr-3 font-medium">Action</th>
                    <th className="pb-2 pr-3 font-medium">Fingerprint</th>
                    <th className="pb-2 pr-3 font-medium">Algorithm</th>
                    <th className="pb-2 pr-3 font-medium">Capabilities</th>
                    <th className="pb-2 pr-3 font-medium">Expiry</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.wouldRegister.map((entry) => (
                    <PreviewSubkeyRow key={entry.fingerprint} entry={entry} action="Register" />
                  ))}
                  {preview.wouldUpdate.map((entry) => (
                    <PreviewSubkeyRow key={entry.fingerprint} entry={entry} action="Sync revoked" />
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
        noValidate
      >
        {apiError ? (
          <div className="text-sm text-destructive">
            <p>{apiError}</p>
            {requestId ? (
              <p className="mt-1 text-xs text-muted-foreground">Request ID: {requestId}</p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {onPreview ? (
            <Button
              type="button"
              variant="secondary"
              disabled={disabled || submitting || previewing}
              onClick={onPreview}
            >
              {previewing ? "Previewing…" : "Preview import"}
            </Button>
          ) : null}
          <Button type="submit" disabled={disabled || submitting || previewing}>
            {submitting ? "Importing subkeys…" : "Import subkeys from keyring"}
          </Button>
        </div>
      </form>
    </section>
  )
}
