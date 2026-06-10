import { Button } from "@/components/ui/button"

type ImportSubkeysFormProps = {
  apiError: string | null
  requestId: string | null
  submitting: boolean
  disabled: boolean
  onSubmit: () => void
}

export function ImportSubkeysForm({
  apiError,
  requestId,
  submitting,
  disabled,
  onSubmit,
}: ImportSubkeysFormProps) {
  return (
    <section aria-label="Import subkeys from keyring" className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Import subkeys from keyring</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Register metadata-only subkey rows for keys already present in the stored armored keyring.
          No passphrase is required.
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
        {apiError ? (
          <div className="text-sm text-destructive">
            <p>{apiError}</p>
            {requestId ? (
              <p className="mt-1 text-xs text-muted-foreground">Request ID: {requestId}</p>
            ) : null}
          </div>
        ) : null}

        <Button type="submit" disabled={disabled || submitting}>
          {submitting ? "Importing subkeys…" : "Import subkeys from keyring"}
        </Button>
      </form>
    </section>
  )
}
