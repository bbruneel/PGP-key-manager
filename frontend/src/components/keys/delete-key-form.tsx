import { useState } from "react"

import { Button } from "@/components/ui/button"
import type { KeyRole } from "@/types/api"

type DeleteKeyFormProps = {
  role: KeyRole
  fingerprint?: string | null
  apiError: string | null
  requestId: string | null
  submitting: boolean
  disabled: boolean
  onSubmit: () => void
}

export function DeleteKeyForm({
  role,
  fingerprint,
  apiError,
  requestId,
  submitting,
  disabled,
  onSubmit,
}: DeleteKeyFormProps) {
  const [confirming, setConfirming] = useState(false)

  const warningText =
    role === "primary"
      ? "This permanently removes the primary key and all subkeys from your vault."
      : "This permanently removes this subkey record from your vault."

  return (
    <section role="region" aria-label="Delete key" className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Delete key</h3>
        <p className="mt-1 text-sm text-muted-foreground">{warningText}</p>
        {role === "primary" ? (
          <p className="mt-1 text-sm text-muted-foreground">All subkeys will also be removed.</p>
        ) : null}
        {fingerprint ? (
          <p className="mt-2 font-mono text-xs text-muted-foreground">{fingerprint}</p>
        ) : null}
      </div>

      {apiError ? (
        <div className="text-sm text-destructive">
          <p>{apiError}</p>
          {requestId ? <p className="mt-1 text-xs text-muted-foreground">Request ID: {requestId}</p> : null}
        </div>
      ) : null}

      {confirming ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="destructive"
            disabled={submitting || disabled}
            onClick={onSubmit}
          >
            {submitting ? "Deleting…" : "Confirm delete"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => setConfirming(false)}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="destructive"
          disabled={submitting || disabled}
          onClick={() => setConfirming(true)}
        >
          Delete key
        </Button>
      )}
    </section>
  )
}
