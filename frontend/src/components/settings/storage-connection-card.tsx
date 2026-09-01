import { useCallback } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { formatStorageConnectionTestError } from "@/lib/storage-connection-test-error"
import type { StorageConnectionResponse } from "@/types/api"

type StorageConnectionCardProps = {
  connection: StorageConnectionResponse
  selected: boolean
  testing: boolean
  testErrorMessage: string | null
  onSelect: (connectionId: string) => void
  onEdit: (connection: StorageConnectionResponse) => void
  onDelete: (connection: StorageConnectionResponse) => void
  onTest: (connection: StorageConnectionResponse) => void
}

function formatLastTestedAt(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return date.toLocaleString()
}

export function StorageConnectionCard({
  connection,
  selected,
  testing,
  testErrorMessage,
  onSelect,
  onEdit,
  onDelete,
  onTest,
}: StorageConnectionCardProps) {
  const copyExternalId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(connection.externalId)
      toast.success("External ID copied")
    } catch {
      toast.error("Could not copy external ID")
    }
  }, [connection.externalId])

  const lastTestLabel =
    connection.lastTestStatus === "succeeded"
      ? "succeeded"
      : connection.lastTestStatus === "failed"
        ? "failed"
        : null
  const lastTestedAt = formatLastTestedAt(connection.lastTestedAt)

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
          {lastTestLabel ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Last test:{" "}
              <span
                className={
                  lastTestLabel === "succeeded" ? "text-green-700 dark:text-green-400" : "text-destructive"
                }
              >
                {lastTestLabel}
              </span>
              {lastTestedAt ? ` · ${lastTestedAt}` : null}
            </p>
          ) : null}
        </div>
        <span className="rounded-full border border-border px-2 py-0.5 text-xs capitalize text-muted-foreground">
          {connection.status}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant={selected ? "default" : "outline"} onClick={() => onSelect(connection.id)}>
          {selected ? "Selected" : "View details"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={testing}
          data-pgp-ui={`settings.storageConnections.test.${connection.id}`}
          onClick={() => onTest(connection)}
        >
          {testing ? "Testing…" : "Test connection"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => onEdit(connection)}>
          Edit
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => onDelete(connection)}>
          Delete
        </Button>
      </div>

      {testErrorMessage ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {testErrorMessage}
        </p>
      ) : null}

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
          {connection.lastTestErrorCategory ? (
            <div>
              <dt className="font-medium text-foreground">Last test error</dt>
              <dd className="text-xs text-muted-foreground">
                {formatStorageConnectionTestError(connection.lastTestErrorCategory)}
              </dd>
            </div>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Add the external ID to your IAM role trust policy. Setup guide:{" "}
            <a
              className="underline underline-offset-2"
              href="https://github.com/bbruneel/PGP-key-manager/blob/main/docs/customer-setup/aws/setup.md"
              rel="noreferrer"
              target="_blank"
            >
              AWS S3 BYO storage
            </a>
            .
          </p>
        </dl>
      ) : null}
    </article>
  )
}
