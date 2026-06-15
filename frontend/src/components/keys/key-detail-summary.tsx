import {
  formatCapabilities,
  formatKeyExpiry,
  formatKeyStatus,
  formatRevokedAt,
  hasPrivateMaterial,
} from "@/lib/key-display"
import type { PgpKey } from "@/types/api"

type KeyDetailSummaryProps = {
  keyData: PgpKey
  ownerGroupName?: string | null
}

export function KeyDetailSummary({ keyData, ownerGroupName }: KeyDetailSummaryProps) {
  const revokedLabel = formatRevokedAt(keyData.revokedAt)
  const privateMaterial = hasPrivateMaterial(keyData)
  const ownershipLabel =
    keyData.ownerType === "group"
      ? `Owned by ${ownerGroupName ?? "team vault"}`
      : "Personal vault"

  return (
    <section role="region" aria-label="Key summary" className="space-y-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {keyData.label ?? "Unlabeled key"}
          </h2>
          <span className="rounded-md border border-border bg-muted/60 px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {ownershipLabel}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {keyData.role === "primary" ? "Primary key" : "Subkey"}
          {keyData.openpgpVersion ? ` · OpenPGP v${keyData.openpgpVersion}` : ""}
        </p>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Fingerprint</dt>
          <dd className="mt-0.5 font-mono text-xs text-foreground">{keyData.fingerprint}</dd>
        </div>
        {keyData.keyId ? (
          <div>
            <dt className="text-muted-foreground">Key ID</dt>
            <dd className="mt-0.5 font-mono text-xs text-foreground">{keyData.keyId}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-muted-foreground">Status</dt>
          <dd className="mt-0.5 text-foreground">{formatKeyStatus(keyData.status)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Type</dt>
          <dd className="mt-0.5 text-foreground">{keyData.keyType ?? "unknown"}</dd>
        </div>
        {keyData.algorithm ? (
          <div>
            <dt className="text-muted-foreground">Algorithm</dt>
            <dd className="mt-0.5 text-foreground">{keyData.algorithm}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-muted-foreground">Capabilities</dt>
          <dd className="mt-0.5 text-foreground">{formatCapabilities(keyData.capabilities)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Expiry</dt>
          <dd className="mt-0.5 text-foreground">{formatKeyExpiry(keyData.expiresAt)}</dd>
        </div>
        {revokedLabel ? (
          <div>
            <dt className="text-muted-foreground">Revoked</dt>
            <dd className="mt-0.5 text-foreground">{revokedLabel}</dd>
          </div>
        ) : null}
      </dl>

      {privateMaterial ? (
        <p className="text-sm text-muted-foreground">
          This key has stored private material. Cryptographic lifecycle actions require your passphrase.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Public-only key. Revocation updates metadata only; extend and rotate require private material on the
          primary keyring.
        </p>
      )}
    </section>
  )
}
