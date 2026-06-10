import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DEFAULT_RSA_KEY_SIZE,
  filterAlgorithmsForCapabilities,
  UI_NIST_CURVES,
  UI_RSA_KEY_SIZES,
  type AlgorithmFormValues,
  type NistCurve,
  type OpenpgpVersion,
  type RsaKeySize,
} from "@/lib/algorithm-spec"
import type { PgpCapability } from "@/types/api"

type SubkeyAlgorithmFieldsProps = {
  idPrefix: string
  values: AlgorithmFormValues
  capabilities: PgpCapability[]
  openpgpVersion: OpenpgpVersion
  fieldError?: string
  disabled: boolean
  onChange: (values: AlgorithmFormValues) => void
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null
  }
  return <p className="mt-1 text-xs text-destructive">{message}</p>
}

export function SubkeyAlgorithmFields({
  idPrefix,
  values,
  capabilities,
  openpgpVersion,
  fieldError,
  disabled,
  onChange,
}: SubkeyAlgorithmFieldsProps) {
  const algorithmOptions = filterAlgorithmsForCapabilities(capabilities, openpgpVersion)

  function updateAlgorithm(next: AlgorithmFormValues) {
    onChange(next)
  }

  function handleAlgorithmChange(algorithm: AlgorithmFormValues["algorithm"]) {
    if (algorithm === "rsa") {
      updateAlgorithm({ algorithm, keySize: values.keySize ?? DEFAULT_RSA_KEY_SIZE })
      return
    }
    if (algorithm === "ecdsa" || algorithm === "ecdh") {
      updateAlgorithm({ algorithm, curve: values.curve ?? "P-256" })
      return
    }
    updateAlgorithm({ algorithm })
  }

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-algorithm`}>Algorithm</Label>
        <Select
          value={values.algorithm}
          onValueChange={(value) => handleAlgorithmChange(value as AlgorithmFormValues["algorithm"])}
          disabled={disabled}
        >
          <SelectTrigger
            id={`${idPrefix}-algorithm`}
            className="w-full"
            aria-invalid={Boolean(fieldError)}
          >
            <SelectValue placeholder="Select algorithm" />
          </SelectTrigger>
          <SelectContent>
            {algorithmOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Ed25519/Cv25519 recommended; RSA/ECDSA/ECDH for legacy compatibility.
        </p>
        <FieldError message={fieldError} />
      </div>

      {values.algorithm === "rsa" ? (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-key-size`}>RSA key size</Label>
          <Select
            value={String(values.keySize ?? DEFAULT_RSA_KEY_SIZE)}
            onValueChange={(value) =>
              updateAlgorithm({
                algorithm: "rsa",
                keySize: Number(value) as RsaKeySize,
              })
            }
            disabled={disabled}
          >
            <SelectTrigger id={`${idPrefix}-key-size`} className="w-full">
              <SelectValue placeholder="Select key size" />
            </SelectTrigger>
            <SelectContent>
              {UI_RSA_KEY_SIZES.map((keySize) => (
                <SelectItem key={keySize} value={String(keySize)}>
                  {keySize} bits
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {values.algorithm === "ecdsa" || values.algorithm === "ecdh" ? (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-curve`}>NIST curve</Label>
          <Select
            value={values.curve ?? "P-256"}
            onValueChange={(value) =>
              updateAlgorithm({
                algorithm: values.algorithm,
                curve: value as NistCurve,
              })
            }
            disabled={disabled}
          >
            <SelectTrigger id={`${idPrefix}-curve`} className="w-full">
              <SelectValue placeholder="Select curve" />
            </SelectTrigger>
            <SelectContent>
              {UI_NIST_CURVES.map((curve) => (
                <SelectItem key={curve} value={curve}>
                  {curve}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </>
  )
}
