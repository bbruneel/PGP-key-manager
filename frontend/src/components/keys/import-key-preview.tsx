import { formatCapabilities, formatKeyExpiry, formatKeyStatus } from "@/lib/key-display"
import type { PreviewKeyEntry } from "@/types/api"
import { cn } from "@/lib/utils"

type ImportKeyPreviewProps = {
  primary: PreviewKeyEntry
  subkeys: PreviewKeyEntry[]
  warnings: string[]
  source: string
  className?: string
}

function shortFingerprint(fingerprint: string): string {
  if (fingerprint.length <= 16) {
    return fingerprint
  }
  return `${fingerprint.slice(0, 8)}…${fingerprint.slice(-8)}`
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "revoked":
      return "bg-destructive/10 text-destructive"
    case "expired":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400"
    default:
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
  }
}

function PreviewRow({ entry }: { entry: PreviewKeyEntry }) {
  return (
    <tr className="border-b border-border/60 last:border-0">
      <td className="py-2 pr-3 font-mono text-xs">{entry.role}</td>
      <td className="py-2 pr-3 font-mono text-xs" title={entry.fingerprint}>
        {shortFingerprint(entry.fingerprint)}
      </td>
      <td className="py-2 pr-3 text-xs">{entry.algorithm}</td>
      <td className="py-2 pr-3 text-xs">{formatCapabilities(entry.capabilities)}</td>
      <td className="py-2 pr-3 text-xs">{formatKeyExpiry(entry.expiresAt)}</td>
      <td className="py-2 text-xs">
        <span
          className={cn(
            "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
            statusBadgeClass(entry.status),
          )}
        >
          {formatKeyStatus(entry.status)}
        </span>
      </td>
    </tr>
  )
}

export function ImportKeyPreview({
  primary,
  subkeys,
  warnings,
  source,
  className,
}: ImportKeyPreviewProps) {
  const rows = [primary, ...subkeys]

  return (
    <section
      aria-label="Import preview"
      className={cn("space-y-4 rounded-md border border-border bg-muted/20 p-4", className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Import preview</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {rows.length} key{rows.length === 1 ? "" : "s"} parsed from {source} material
            {subkeys.length > 0
              ? ` · ${subkeys.length} subkey${subkeys.length === 1 ? "" : "s"} will be registered`
              : ""}
          </p>
        </div>
      </div>

      {warnings.length > 0 ? (
        <ul className="space-y-1 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-muted-foreground">
            <tr className="border-b border-border">
              <th className="pb-2 pr-3 font-medium">Role</th>
              <th className="pb-2 pr-3 font-medium">Fingerprint</th>
              <th className="pb-2 pr-3 font-medium">Algorithm</th>
              <th className="pb-2 pr-3 font-medium">Capabilities</th>
              <th className="pb-2 pr-3 font-medium">Expiry</th>
              <th className="pb-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((entry) => (
              <PreviewRow key={`${entry.role}-${entry.fingerprint}`} entry={entry} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
