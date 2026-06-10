import { useState } from "react"
import { ChevronDown } from "lucide-react"

import { SubkeyAlgorithmFields } from "@/components/keys/subkey-algorithm-fields"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { PrimaryAlgorithmId } from "@/lib/algorithm-spec"
import type { CreateKeyFieldErrors, CreateKeyFormValues } from "@/lib/create-key-validation"
import {
  applyOpenpgpVersionChange,
  applyPrimaryAlgorithmChange,
} from "@/lib/create-key-validation"
import { cn } from "@/lib/utils"

type CreateKeyFormProps = {
  values: CreateKeyFormValues
  fieldErrors: CreateKeyFieldErrors
  apiError: string | null
  requestId: string | null
  submitting: boolean
  onChange: (values: CreateKeyFormValues) => void
  onAlgorithmChanged?: (values: CreateKeyFormValues) => void
  onAlgorithmAdjusted?: (next: CreateKeyFormValues, previous: CreateKeyFormValues) => void
  onSubmit: () => void
  onCancel: () => void
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null
  }
  return <p className="mt-1 text-xs text-destructive">{message}</p>
}

export function CreateKeyForm({
  values,
  fieldErrors,
  apiError,
  requestId,
  submitting,
  onChange,
  onAlgorithmChanged,
  onAlgorithmAdjusted,
  onSubmit,
  onCancel,
}: CreateKeyFormProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false)

  function updateField<K extends keyof CreateKeyFormValues>(key: K, value: CreateKeyFormValues[K]) {
    onChange({ ...values, [key]: value })
  }

  function handleAlgorithmChange(algorithm: PrimaryAlgorithmId) {
    const next = applyPrimaryAlgorithmChange(values, algorithm)
    onChange(next)
    onAlgorithmChanged?.(next)
  }

  return (
    <form
      aria-label="Create primary key form"
      className="space-y-8"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      noValidate
    >
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Identity</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            These details appear on the OpenPGP user ID for your primary key.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="create-key-label">Label (optional)</Label>
          <Input
            id="create-key-label"
            value={values.label}
            onChange={(event) => updateField("label", event.target.value)}
            placeholder="Work signing key"
            aria-invalid={Boolean(fieldErrors.label)}
            disabled={submitting}
          />
          <FieldError message={fieldErrors.label} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="create-key-name">Name</Label>
          <Input
            id="create-key-name"
            value={values.userName}
            onChange={(event) => updateField("userName", event.target.value)}
            placeholder="Jane Doe"
            autoComplete="name"
            aria-invalid={Boolean(fieldErrors.userName)}
            disabled={submitting}
            required
          />
          <FieldError message={fieldErrors.userName} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="create-key-email">Email (optional)</Label>
          <Input
            id="create-key-email"
            type="email"
            value={values.userEmail}
            onChange={(event) => updateField("userEmail", event.target.value)}
            placeholder="jane@example.com"
            autoComplete="email"
            aria-invalid={Boolean(fieldErrors.userEmail)}
            disabled={submitting}
          />
          <FieldError message={fieldErrors.userEmail} />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Security</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            The passphrase encrypts your private key. It is never stored by the server — save it
            somewhere safe.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="create-key-passphrase">Passphrase</Label>
          <Input
            id="create-key-passphrase"
            type="password"
            value={values.passphrase}
            onChange={(event) => updateField("passphrase", event.target.value)}
            autoComplete="new-password"
            aria-invalid={Boolean(fieldErrors.passphrase)}
            disabled={submitting}
            required
          />
          <FieldError message={fieldErrors.passphrase} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="create-key-confirm-passphrase">Confirm passphrase</Label>
          <Input
            id="create-key-confirm-passphrase"
            type="password"
            value={values.confirmPassphrase}
            onChange={(event) => updateField("confirmPassphrase", event.target.value)}
            autoComplete="new-password"
            aria-invalid={Boolean(fieldErrors.confirmPassphrase)}
            disabled={submitting}
            required
          />
          <FieldError message={fieldErrors.confirmPassphrase} />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Validity</h3>
          <p className="mt-1 text-sm text-muted-foreground">Choose when this primary key should expire.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="create-key-expires-at">Expiry date</Label>
          <Input
            id="create-key-expires-at"
            type="date"
            value={values.expiresAt}
            onChange={(event) => updateField("expiresAt", event.target.value)}
            aria-invalid={Boolean(fieldErrors.expiresAt)}
            disabled={submitting}
            required
          />
          <FieldError message={fieldErrors.expiresAt} />
        </div>
      </section>

      <section className="space-y-4">
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground"
          onClick={() => setAdvancedOpen((open) => !open)}
          aria-expanded={advancedOpen}
        >
          Advanced options
          <ChevronDown className={cn("size-4 transition-transform", advancedOpen && "rotate-180")} />
        </button>

        {advancedOpen ? (
          <div className="space-y-4 rounded-md border border-input bg-background p-4">
            <SubkeyAlgorithmFields
              idPrefix="create-key"
              values={values}
              capabilities={["certify", "sign"]}
              openpgpVersion={values.openpgpVersion}
              context="primary"
              fieldError={fieldErrors.algorithm}
              disabled={submitting}
              onChange={(algorithmValues) => {
                const nextAlgorithm = algorithmValues.algorithm as PrimaryAlgorithmId
                if (nextAlgorithm !== values.algorithm) {
                  handleAlgorithmChange(nextAlgorithm)
                  return
                }
                onChange({
                  ...values,
                  keySize: algorithmValues.keySize,
                  curve: algorithmValues.curve,
                })
              }}
            />

            <div className="space-y-2">
              <Label htmlFor="create-key-openpgp-version">OpenPGP version</Label>
              <Select
                value={String(values.openpgpVersion)}
                onValueChange={(value) => {
                  const previous = values
                  const next = applyOpenpgpVersionChange(values, Number(value) as 4 | 6)
                  onChange(next)
                  if (next.algorithm !== previous.algorithm) {
                    onAlgorithmAdjusted?.(next, previous)
                    onAlgorithmChanged?.(next)
                  }
                }}
                disabled={submitting}
              >
                <SelectTrigger id="create-key-openpgp-version" className="w-full">
                  <SelectValue placeholder="Select version" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">Version 4 (RFC 4880)</SelectItem>
                  <SelectItem value="6">Version 6 (RFC 9580)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : null}
      </section>

      {apiError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <p>{apiError}</p>
          {requestId ? <p className="mt-1 text-xs text-muted-foreground">Request ID: {requestId}</p> : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating key…" : "Create key"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
