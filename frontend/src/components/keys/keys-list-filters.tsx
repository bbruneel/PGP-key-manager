import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { KeysListParams, KeysListView } from "@/lib/keys-list-params"
import type { KeyStatus, PgpCapability } from "@/types/api"

type KeysListFiltersProps = {
  params: KeysListParams
  disabled?: boolean
  onChange: (params: KeysListParams) => void
}

const VIEW_OPTIONS: { value: KeysListView; label: string }[] = [
  { value: "all", label: "All primaries" },
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
  { value: "subkeys", label: "Subkeys" },
]

const STATUS_OPTIONS: { value: "all" | KeyStatus; label: string }[] = [
  { value: "all", label: "Any status" },
  { value: "active", label: "Active" },
  { value: "revoked", label: "Revoked" },
  { value: "expired", label: "Expired" },
]

const CAPABILITY_OPTIONS: { value: "all" | PgpCapability; label: string }[] = [
  { value: "all", label: "Any capability" },
  { value: "certify", label: "Certify" },
  { value: "sign", label: "Sign" },
  { value: "encrypt", label: "Encrypt" },
  { value: "authenticate", label: "Authenticate" },
]

export function KeysListFilters({ params, disabled = false, onChange }: KeysListFiltersProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="space-y-2">
        <Label htmlFor="keys-filter-view">View</Label>
        <Select
          value={params.view}
          onValueChange={(value) => onChange({ ...params, view: value as KeysListView })}
          disabled={disabled}
        >
          <SelectTrigger id="keys-filter-view" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VIEW_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="keys-filter-status">Status</Label>
        <Select
          value={params.status ?? "all"}
          onValueChange={(value) =>
            onChange({ ...params, status: value === "all" ? undefined : (value as KeyStatus) })
          }
          disabled={disabled}
        >
          <SelectTrigger id="keys-filter-status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="keys-filter-capability">Capability</Label>
        <Select
          value={params.capability ?? "all"}
          onValueChange={(value) =>
            onChange({
              ...params,
              capability: value === "all" ? undefined : (value as PgpCapability),
            })
          }
          disabled={disabled}
        >
          <SelectTrigger id="keys-filter-capability" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CAPABILITY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
