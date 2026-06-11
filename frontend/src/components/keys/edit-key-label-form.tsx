import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type {
  UpdateKeyLabelFieldErrors,
  UpdateKeyLabelFormValues,
} from "@/lib/update-key-label-validation"

type EditKeyLabelFormProps = {
  values: UpdateKeyLabelFormValues
  fieldErrors: UpdateKeyLabelFieldErrors
  apiError: string | null
  requestId: string | null
  submitting: boolean
  disabled: boolean
  onChange: (values: UpdateKeyLabelFormValues) => void
  onSubmit: () => void
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null
  }
  return <p className="mt-1 text-xs text-destructive">{message}</p>
}

export function EditKeyLabelForm({
  values,
  fieldErrors,
  apiError,
  requestId,
  submitting,
  disabled,
  onChange,
  onSubmit,
}: EditKeyLabelFormProps) {
  return (
    <section role="region" aria-label="Edit key label" className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Edit label</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Rename this key in your vault. Clearing an existing label is not supported.
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
          <Label htmlFor="edit-key-label">Label</Label>
          <Input
            id="edit-key-label"
            value={values.label}
            onChange={(event) => onChange({ label: event.target.value })}
            disabled={submitting || disabled}
            aria-invalid={Boolean(fieldErrors.label)}
          />
          <FieldError message={fieldErrors.label} />
        </div>

        {apiError ? (
          <div className="text-sm text-destructive">
            <p>{apiError}</p>
            {requestId ? <p className="mt-1 text-xs text-muted-foreground">Request ID: {requestId}</p> : null}
          </div>
        ) : null}

        <Button type="submit" variant="outline" disabled={submitting || disabled}>
          {submitting ? "Saving…" : "Save label"}
        </Button>
      </form>
    </section>
  )
}
