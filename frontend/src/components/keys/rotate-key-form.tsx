import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  SubkeyAlgorithmFields,
} from "@/components/keys/subkey-algorithm-fields"
import { applyCapabilityChangeToAlgorithmValues, type OpenpgpVersion } from "@/lib/algorithm-spec"
import { SUBKEY_CAPABILITY_OPTIONS } from "@/lib/subkey-capabilities"
import type { PgpCapability } from "@/types/api"
import type { RotateKeyFieldErrors, RotateKeyFormValues } from "@/lib/rotate-key-validation"

type RotateKeyFormProps = {
  values: RotateKeyFormValues
  fieldErrors: RotateKeyFieldErrors
  apiError: string | null
  requestId: string | null
  submitting: boolean
  disabled: boolean
  primaryOpenpgpVersion: OpenpgpVersion
  onChange: (values: RotateKeyFormValues) => void
  onAlgorithmAdjusted?: (next: RotateKeyFormValues, previous: RotateKeyFormValues) => void
  onSubmit: () => void
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null
  }
  return <p className="mt-1 text-xs text-destructive">{message}</p>
}

export function RotateKeyForm({
  values,
  fieldErrors,
  apiError,
  requestId,
  submitting,
  disabled,
  primaryOpenpgpVersion,
  onChange,
  onAlgorithmAdjusted,
  onSubmit,
}: RotateKeyFormProps) {
  function updateField<K extends keyof RotateKeyFormValues>(key: K, value: RotateKeyFormValues[K]) {
    onChange({ ...values, [key]: value })
  }

  function toggleCapability(capability: PgpCapability) {
    const nextCapabilities = values.capabilities.includes(capability)
      ? values.capabilities.filter((item) => item !== capability)
      : [...values.capabilities, capability]
    const { next, adjusted } = applyCapabilityChangeToAlgorithmValues(
      values,
      nextCapabilities,
      primaryOpenpgpVersion,
    )
    const previous = values
    const updated = { ...values, capabilities: nextCapabilities, ...next }
    onChange(updated)
    if (adjusted) {
      onAlgorithmAdjusted?.(updated, previous)
    }
  }

  return (
    <section aria-label="Rotate subkey" className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Rotate subkey</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a replacement subkey on the primary keyring. Your passphrase is required to add the new subkey;
          when revoke previous is enabled, the current subkey is also revoked in the keyring.
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
          <span className="text-sm font-medium text-foreground">Capabilities</span>
          <div className="flex flex-wrap gap-3">
            {SUBKEY_CAPABILITY_OPTIONS.map((capability) => (
              <label key={capability} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={values.capabilities.includes(capability)}
                  onChange={() => toggleCapability(capability)}
                  disabled={submitting || disabled}
                  className="size-4 accent-primary"
                />
                {capability}
              </label>
            ))}
          </div>
          <FieldError message={fieldErrors.capabilities} />
        </div>

        <SubkeyAlgorithmFields
          idPrefix="rotate"
          values={values}
          capabilities={values.capabilities}
          openpgpVersion={primaryOpenpgpVersion}
          fieldError={fieldErrors.algorithm}
          disabled={submitting || disabled}
          onChange={(algorithmValues) => onChange({ ...values, ...algorithmValues })}
        />

        <div className="space-y-2">
          <Label htmlFor="rotate-expires-at">Expiry date</Label>
          <Input
            id="rotate-expires-at"
            type="date"
            value={values.expiresAt}
            onChange={(event) => updateField("expiresAt", event.target.value)}
            aria-invalid={Boolean(fieldErrors.expiresAt)}
            disabled={submitting || disabled}
          />
          <FieldError message={fieldErrors.expiresAt} />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={values.revokePrevious}
            onChange={(event) => updateField("revokePrevious", event.target.checked)}
            disabled={submitting || disabled}
            className="size-4 accent-primary"
          />
          Revoke previous subkey in keyring
        </label>

        <div className="space-y-2">
          <Label htmlFor="rotate-passphrase">Passphrase</Label>
          <Input
            id="rotate-passphrase"
            type="password"
            value={values.passphrase}
            onChange={(event) => updateField("passphrase", event.target.value)}
            autoComplete="current-password"
            aria-invalid={Boolean(fieldErrors.passphrase)}
            disabled={submitting || disabled}
          />
          <FieldError message={fieldErrors.passphrase} />
        </div>

        {apiError ? (
          <div className="text-sm text-destructive">
            <p>{apiError}</p>
            {requestId ? <p className="mt-1 text-xs text-muted-foreground">Request ID: {requestId}</p> : null}
          </div>
        ) : null}

        <Button type="submit" variant="outline" disabled={submitting || disabled}>
          {submitting ? "Rotating…" : "Rotate subkey"}
        </Button>
      </form>
    </section>
  )
}
