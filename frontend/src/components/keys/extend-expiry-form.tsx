import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ExtendExpiryFieldErrors, ExtendExpiryFormValues } from "@/lib/extend-key-validation"

type ExtendExpiryFormProps = {
  values: ExtendExpiryFormValues
  fieldErrors: ExtendExpiryFieldErrors
  apiError: string | null
  requestId: string | null
  submitting: boolean
  disabled: boolean
  requiresPassphrase: boolean
  onChange: (values: ExtendExpiryFormValues) => void
  onSubmit: () => void
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null
  }
  return <p className="mt-1 text-xs text-destructive">{message}</p>
}

export function ExtendExpiryForm({
  values,
  fieldErrors,
  apiError,
  requestId,
  submitting,
  disabled,
  requiresPassphrase,
  onChange,
  onSubmit,
}: ExtendExpiryFormProps) {
  function updateField<K extends keyof ExtendExpiryFormValues>(key: K, value: ExtendExpiryFormValues[K]) {
    onChange({ ...values, [key]: value })
  }

  return (
    <section aria-label="Extend expiry" className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Extend expiry</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Set a new expiration date. Requires private material on the primary keyring.
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
          <Label htmlFor="extend-expires-at">New expiry date</Label>
          <Input
            id="extend-expires-at"
            type="date"
            value={values.expiresAt}
            onChange={(event) => updateField("expiresAt", event.target.value)}
            aria-invalid={Boolean(fieldErrors.expiresAt)}
            disabled={submitting || disabled}
          />
          <FieldError message={fieldErrors.expiresAt} />
        </div>

        {requiresPassphrase ? (
          <div className="space-y-2">
            <Label htmlFor="extend-passphrase">Passphrase</Label>
            <Input
              id="extend-passphrase"
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

        <Button type="submit" variant="outline" disabled={submitting || disabled}>
          {submitting ? "Updating…" : "Extend expiry"}
        </Button>
      </form>
    </section>
  )
}
