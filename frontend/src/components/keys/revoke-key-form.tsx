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
import { Textarea } from "@/components/ui/textarea"
import {
  REVOCATION_REASONS,
  type RevocationReason,
  type RevokeKeyFieldErrors,
  type RevokeKeyFormValues,
} from "@/lib/revoke-key-validation"

type RevokeKeyFormProps = {
  values: RevokeKeyFormValues
  fieldErrors: RevokeKeyFieldErrors
  apiError: string | null
  requestId: string | null
  submitting: boolean
  disabled: boolean
  requiresPassphrase: boolean
  onChange: (values: RevokeKeyFormValues) => void
  onSubmit: () => void
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null
  }
  return <p className="mt-1 text-xs text-destructive">{message}</p>
}

const REASON_LABELS: Record<RevocationReason, string> = {
  no_reason: "No reason specified",
  key_superseded: "Key superseded",
  key_compromised: "Key compromised",
  key_retired: "Key retired",
  user_id_invalid: "User ID invalid",
}

export function RevokeKeyForm({
  values,
  fieldErrors,
  apiError,
  requestId,
  submitting,
  disabled,
  requiresPassphrase,
  onChange,
  onSubmit,
}: RevokeKeyFormProps) {
  function updateField<K extends keyof RevokeKeyFormValues>(key: K, value: RevokeKeyFormValues[K]) {
    onChange({ ...values, [key]: value })
  }

  return (
    <section role="region" aria-label="Revoke key" className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Revoke key</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Revocation is permanent. With private material stored, the OpenPGP keyring is updated
          cryptographically.
        </p>
      </div>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
        noValidate
      >
        <div className="space-y-2">
          <Label htmlFor="revoke-reason">Reason</Label>
          <Select
            value={values.reason}
            onValueChange={(value: string) => updateField("reason", value as RevocationReason)}
            disabled={submitting || disabled}
          >
            <SelectTrigger id="revoke-reason" className="w-full" aria-invalid={Boolean(fieldErrors.reason)}>
              <SelectValue placeholder="Select reason" />
            </SelectTrigger>
            <SelectContent>
              {REVOCATION_REASONS.map((reason) => (
                <SelectItem key={reason} value={reason}>
                  {REASON_LABELS[reason]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={fieldErrors.reason} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="revoke-description">Description (optional)</Label>
          <Textarea
            id="revoke-description"
            value={values.description}
            onChange={(event) => updateField("description", event.target.value)}
            disabled={submitting || disabled}
            rows={2}
          />
        </div>

        {requiresPassphrase ? (
          <div className="space-y-2">
            <Label htmlFor="revoke-passphrase">Passphrase</Label>
            <Input
              id="revoke-passphrase"
              type="password"
              value={values.passphrase}
              onChange={(event) => updateField("passphrase", event.target.value)}
              autoComplete="current-password"
              aria-invalid={Boolean(fieldErrors.passphrase)}
              disabled={submitting || disabled}
            />
            <FieldError message={fieldErrors.passphrase} />
          </div>
        ) : null}

        {apiError ? (
          <div className="text-sm text-destructive">
            <p>{apiError}</p>
            {requestId ? <p className="mt-1 text-xs text-muted-foreground">Request ID: {requestId}</p> : null}
          </div>
        ) : null}

        <Button type="submit" variant="destructive" disabled={submitting || disabled}>
          {submitting ? "Revoking…" : "Revoke key"}
        </Button>
      </form>
    </section>
  )
}
