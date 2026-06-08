import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { ImportKeyFieldErrors, ImportKeyFormValues, ImportMode } from "@/lib/import-key-validation"
import { cn } from "@/lib/utils"

type ImportKeyFormProps = {
  values: ImportKeyFormValues
  fieldErrors: ImportKeyFieldErrors
  apiError: string | null
  requestId: string | null
  submitting: boolean
  onChange: (values: ImportKeyFormValues) => void
  onSubmit: () => void
  onCancel: () => void
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null
  }
  return <p className="mt-1 text-xs text-destructive">{message}</p>
}

export function ImportKeyForm({
  values,
  fieldErrors,
  apiError,
  requestId,
  submitting,
  onChange,
  onSubmit,
  onCancel,
}: ImportKeyFormProps) {
  function updateField<K extends keyof ImportKeyFormValues>(key: K, value: ImportKeyFormValues[K]) {
    onChange({ ...values, [key]: value })
  }

  function setImportMode(mode: ImportMode) {
    onChange({ ...values, importMode: mode })
  }

  return (
    <form
      aria-label="Import key form"
      className="space-y-8"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      noValidate
    >
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Import mode</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose whether you are importing a public key only or a key pair with private material.
          </p>
        </div>

        <div className="flex flex-wrap gap-4" role="radiogroup" aria-label="Import mode">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="import-mode"
              checked={values.importMode === "public"}
              onChange={() => setImportMode("public")}
              disabled={submitting}
              className="size-4 accent-primary"
            />
            Public key
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="import-mode"
              checked={values.importMode === "private"}
              onChange={() => setImportMode("private")}
              disabled={submitting}
              className="size-4 accent-primary"
            />
            Private key
          </label>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Key details</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste armored key blocks exported from GnuPG or another OpenPGP tool.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="import-key-label">Label (optional)</Label>
          <Input
            id="import-key-label"
            value={values.label}
            onChange={(event) => updateField("label", event.target.value)}
            placeholder="Imported work key"
            aria-invalid={Boolean(fieldErrors.label)}
            disabled={submitting}
          />
          <FieldError message={fieldErrors.label} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="import-key-fingerprint">Fingerprint (optional)</Label>
          <Input
            id="import-key-fingerprint"
            value={values.fingerprint}
            onChange={(event) => updateField("fingerprint", event.target.value)}
            placeholder="ABCD1234EFGH5678..."
            aria-invalid={Boolean(fieldErrors.fingerprint)}
            disabled={submitting}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            The server derives the fingerprint from your armored key block. Optionally paste{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono">gpg --fingerprint &lt;key-id&gt;</code>{" "}
            output to verify before import.
          </p>
          <FieldError message={fieldErrors.fingerprint} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="import-key-armored-public">Armored public key</Label>
          <Textarea
            id="import-key-armored-public"
            value={values.armoredPublic}
            onChange={(event) => updateField("armoredPublic", event.target.value)}
            placeholder={"-----BEGIN PGP PUBLIC KEY BLOCK-----\n..."}
            aria-invalid={Boolean(fieldErrors.armoredPublic)}
            disabled={submitting}
            className={cn("min-h-32 font-mono text-xs")}
          />
          <FieldError message={fieldErrors.armoredPublic} />
        </div>

        {values.importMode === "private" ? (
          <div className="space-y-2">
            <Label htmlFor="import-key-armored-private">Armored private key</Label>
            <Textarea
              id="import-key-armored-private"
              value={values.encryptedPrivateArmored}
              onChange={(event) => updateField("encryptedPrivateArmored", event.target.value)}
              placeholder={"-----BEGIN PGP PRIVATE KEY BLOCK-----\n..."}
              aria-invalid={Boolean(fieldErrors.encryptedPrivateArmored)}
              disabled={submitting}
              className={cn("min-h-32 font-mono text-xs")}
            />
            <p className="text-xs text-muted-foreground">
              Paste the encrypted private or secret key block. Your unlock passphrase stays local — it is
              not sent to the server during import.
            </p>
            <FieldError message={fieldErrors.encryptedPrivateArmored} />
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
          {submitting ? "Importing key…" : "Import key"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
