import { useCallback, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { CreateStorageConnectionRequest, UpdateStorageConnectionRequest } from "@/types/api"

const DISPLAY_NAME_MAX = 128
const REGION_MAX = 64
const BUCKET_MAX = 255
const PREFIX_MAX = 512
const ROLE_ARN_MAX = 512

export type StorageConnectionFormValues = {
  displayName: string
  region: string
  bucket: string
  prefix: string
  roleArn: string
}

type StorageConnectionFormProps = {
  mode: "create" | "edit"
  initialValues?: StorageConnectionFormValues
  submitting: boolean
  onSubmit: (values: CreateStorageConnectionRequest | UpdateStorageConnectionRequest) => void
  onCancel: () => void
}

const emptyValues: StorageConnectionFormValues = {
  displayName: "",
  region: "",
  bucket: "",
  prefix: "",
  roleArn: "",
}

export function StorageConnectionForm({
  mode,
  initialValues = emptyValues,
  submitting,
  onSubmit,
  onCancel,
}: StorageConnectionFormProps) {
  const [values, setValues] = useState<StorageConnectionFormValues>(initialValues)
  const [displayNameError, setDisplayNameError] = useState<string | null>(null)

  const handleSubmit = useCallback(() => {
    const trimmedName = values.displayName.trim()
    if (!trimmedName) {
      setDisplayNameError("Connection name is required")
      return
    }
    if (trimmedName.length > DISPLAY_NAME_MAX) {
      setDisplayNameError(`Connection name must be at most ${DISPLAY_NAME_MAX} characters`)
      return
    }
    if (!values.region.trim() || !values.bucket.trim() || !values.roleArn.trim()) {
      setDisplayNameError(null)
      return
    }

    setDisplayNameError(null)
    const payload = {
      displayName: trimmedName,
      region: values.region.trim(),
      bucket: values.bucket.trim(),
      roleArn: values.roleArn.trim(),
      ...(values.prefix.trim() ? { prefix: values.prefix.trim() } : {}),
    }
    onSubmit(payload)
  }, [onSubmit, values])

  return (
    <form
      className="space-y-4 rounded-lg border border-border bg-muted/20 p-4"
      data-pgp-ui="settings.storageConnections.form"
      onSubmit={(event) => {
        event.preventDefault()
        handleSubmit()
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="storage-provider">Provider</Label>
        <Input id="storage-provider" value="AWS S3" readOnly disabled />
      </div>

      <div className="space-y-1">
        <Label htmlFor="storage-display-name">Connection name</Label>
        <Input
          id="storage-display-name"
          value={values.displayName}
          maxLength={DISPLAY_NAME_MAX}
          onChange={(event) => setValues((current) => ({ ...current, displayName: event.target.value }))}
          placeholder="Personal vault"
        />
        {displayNameError ? <p className="text-sm text-destructive">{displayNameError}</p> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="storage-region">Region</Label>
          <Input
            id="storage-region"
            value={values.region}
            maxLength={REGION_MAX}
            onChange={(event) => setValues((current) => ({ ...current, region: event.target.value }))}
            placeholder="eu-west-1"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="storage-bucket">Bucket</Label>
          <Input
            id="storage-bucket"
            value={values.bucket}
            maxLength={BUCKET_MAX}
            onChange={(event) => setValues((current) => ({ ...current, bucket: event.target.value }))}
            placeholder="acme-pgp-vault"
            required
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="storage-prefix">Prefix (optional)</Label>
        <Input
          id="storage-prefix"
          value={values.prefix}
          maxLength={PREFIX_MAX}
          onChange={(event) => setValues((current) => ({ ...current, prefix: event.target.value }))}
          placeholder="pgp-key-manager/"
        />
        <p className="text-xs text-muted-foreground">Defaults to pgp-key-manager/ when omitted.</p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="storage-role-arn">IAM role ARN</Label>
        <Input
          id="storage-role-arn"
          value={values.roleArn}
          maxLength={ROLE_ARN_MAX}
          onChange={(event) => setValues((current) => ({ ...current, roleArn: event.target.value }))}
          placeholder="arn:aws:iam::123456789012:role/PgpKeyManager"
          required
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={submitting}>
          {mode === "create" ? "Add connection" : "Save changes"}
        </Button>
        <Button type="button" variant="outline" disabled={submitting} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
