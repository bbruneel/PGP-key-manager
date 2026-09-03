import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type {
  TransferDestinationKind,
  TransferOwnershipFieldErrors,
  TransferOwnershipFormValues,
} from "@/lib/transfer-ownership-validation"
import { describeTransferImpact } from "@/lib/transfer-ownership-validation"
import type { Group, GroupMember } from "@/types/api"

type TransferOwnershipFormProps = {
  values: TransferOwnershipFormValues
  fieldErrors: TransferOwnershipFieldErrors
  apiError: string | null
  requestId: string | null
  submitting: boolean
  disabled: boolean
  disabledReason?: string | null
  currentOwnerLabel: string
  availableGroups: Group[]
  members: GroupMember[]
  membersLoading: boolean
  subkeyCount: number
  allowPersonalDestination: boolean
  onChange: (values: TransferOwnershipFormValues) => void
  onConfirm: () => void
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null
  }
  return <p className="mt-1 text-xs text-destructive">{message}</p>
}

const nativeSelectClassName =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"

export function TransferOwnershipForm({
  values,
  fieldErrors,
  apiError,
  requestId,
  submitting,
  disabled,
  disabledReason,
  currentOwnerLabel,
  availableGroups,
  members,
  membersLoading,
  subkeyCount,
  allowPersonalDestination,
  onChange,
  onConfirm,
}: TransferOwnershipFormProps) {
  const [confirming, setConfirming] = useState(false)

  const destinationGroup = availableGroups.find((group) => group.id === values.ownerGroupId)
  const destinationLabel =
    values.destinationKind === "team"
      ? (destinationGroup?.name ?? "selected team vault")
      : "personal vault"

  const impact = describeTransferImpact({
    destinationKind: values.destinationKind,
    currentOwnerLabel,
    destinationLabel,
    subkeyCount,
    recipientUserId: values.targetUserId || null,
  })

  const updateDestinationKind = (kind: TransferDestinationKind) => {
    setConfirming(false)
    onChange({
      ...values,
      destinationKind: kind,
      ownerGroupId: kind === "team" ? values.ownerGroupId : "",
      targetUserId: kind === "personal" ? values.targetUserId : "",
    })
  }

  return (
    <section
      role="region"
      aria-label="Transfer ownership"
      className="space-y-4"
      data-pgp-ui="keyDetail.transferOwnership"
    >
      <div>
        <h3 className="text-sm font-semibold text-foreground">Transfer ownership</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Move this primary key and its subkeys between personal and team vaults. Does not change
          cryptographic material.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Currently: {currentOwnerLabel}</p>
      </div>

      {disabled && disabledReason ? (
        <p className="text-sm text-muted-foreground" data-pgp-ui="keyDetail.transferOwnership.disabled">
          {disabledReason}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="transfer-destination-kind">Destination</Label>
        <select
          id="transfer-destination-kind"
          className={nativeSelectClassName}
          data-pgp-ui="keyDetail.transferOwnership.destinationKind"
          aria-invalid={Boolean(fieldErrors.destinationKind)}
          value={values.destinationKind}
          disabled={disabled || submitting}
          onChange={(event) => updateDestinationKind(event.target.value as TransferDestinationKind)}
        >
          <option value="team">Team vault</option>
          {allowPersonalDestination ? (
            <option value="personal">Personal vault (pick recipient)</option>
          ) : null}
        </select>
        <FieldError message={fieldErrors.destinationKind} />
      </div>

      {values.destinationKind === "team" ? (
        <div className="space-y-2">
          <Label htmlFor="transfer-owner-group">Team vault</Label>
          <select
            id="transfer-owner-group"
            className={nativeSelectClassName}
            data-pgp-ui="keyDetail.transferOwnership.ownerGroupId"
            aria-invalid={Boolean(fieldErrors.ownerGroupId)}
            value={values.ownerGroupId}
            disabled={disabled || submitting || availableGroups.length === 0}
            onChange={(event) => {
              setConfirming(false)
              onChange({ ...values, ownerGroupId: event.target.value })
            }}
          >
            <option value="">{availableGroups.length === 0 ? "No team vaults" : "Select team vault"}</option>
            {availableGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
          {availableGroups.length === 0 ? (
            <p className="text-xs text-muted-foreground">Join or create a team vault first.</p>
          ) : null}
          <FieldError message={fieldErrors.ownerGroupId} />
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="transfer-target-user">Recipient (group member)</Label>
          <select
            id="transfer-target-user"
            className={nativeSelectClassName}
            data-pgp-ui="keyDetail.transferOwnership.targetUserId"
            aria-invalid={Boolean(fieldErrors.targetUserId)}
            value={values.targetUserId}
            disabled={disabled || submitting || membersLoading || members.length === 0}
            onChange={(event) => {
              setConfirming(false)
              onChange({ ...values, targetUserId: event.target.value })
            }}
          >
            <option value="">
              {membersLoading ? "Loading members…" : "Select recipient"}
            </option>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.userId} ({member.role})
              </option>
            ))}
          </select>
          <FieldError message={fieldErrors.targetUserId} />
        </div>
      )}

      {apiError ? (
        <div className="text-sm text-destructive" data-pgp-ui="keyDetail.transferOwnership.apiError">
          <p>{apiError}</p>
          {requestId ? <p className="mt-1 text-xs text-muted-foreground">Request ID: {requestId}</p> : null}
        </div>
      ) : null}

      {confirming ? (
        <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
          <p className="text-sm text-foreground" data-pgp-ui="keyDetail.transferOwnership.confirmSummary">
            {impact}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={submitting || disabled}
              data-pgp-ui="keyDetail.transferOwnership.confirm"
              onClick={onConfirm}
            >
              {submitting ? "Transferring…" : "Confirm transfer"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => setConfirming(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          disabled={submitting || disabled}
          data-pgp-ui="keyDetail.transferOwnership.submit"
          onClick={() => setConfirming(true)}
        >
          Transfer ownership
        </Button>
      )}
    </section>
  )
}
