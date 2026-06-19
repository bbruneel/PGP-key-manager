import { useCallback } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import type { StorageConnectionResponse } from "@/types/api"

type StorageConnectionCardProps = {
  connection: StorageConnectionResponse
  selected: boolean
  onSelect: (connectionId: string) => void
  onEdit: (connection: StorageConnectionResponse) => void
  onDelete: (connection: StorageConnectionResponse) => void
}

export function StorageConnectionCard({
  connection,
  selected,
  onSelect,
  onEdit,
  onDelete,
}: StorageConnectionCardProps) {
  const copyExternalId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(connection.externalId)
      toast.success("External ID copied")
    } catch {
      toast.error("Could not copy external ID")
    }
  }, [connection.externalId])

  return (
    <article
      className={`rounded-lg border p-4 shadow-sm ${
        selected ? "border-primary bg-primary/5" : "border-border bg-card"
      }`}
      data-pgp-ui={`settings.storageConnections.card.${connection.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-foreground">{connection.displayName}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {connection.bucket} · {connection.region}
          </p>
        </div>
        <span className="rounded-full border border-border px-2 py-0.5 text-xs capitalize text-muted-foreground">
          {connection.status}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant={selected ? "default" : "outline"} onClick={() => onSelect(connection.id)}>
          {selected ? "Selected" : "View details"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => onEdit(connection)}>
          Edit
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => onDelete(connection)}>
          Delete
        </Button>
      </div>

      {selected ? (
        <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
          <div>
            <dt className="font-medium text-foreground">Connection ID</dt>
            <dd className="font-mono text-xs text-muted-foreground">{connection.id}</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Prefix</dt>
            <dd className="font-mono text-xs text-muted-foreground">{connection.prefix}</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Role ARN</dt>
            <dd className="break-all font-mono text-xs text-muted-foreground">{connection.roleArn}</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">External ID</dt>
            <dd className="flex flex-wrap items-center gap-2">
              <span className="break-all font-mono text-xs text-muted-foreground">{connection.externalId}</span>
              <Button type="button" size="sm" variant="outline" onClick={() => void copyExternalId()}>
                Copy
              </Button>
            </dd>
          </div>
          <p className="text-xs text-muted-foreground">
            Add this external ID to your IAM role trust policy. Connection testing arrives in Phase 17b.
          </p>
        </dl>
      ) : null}
    </article>
  )
}
