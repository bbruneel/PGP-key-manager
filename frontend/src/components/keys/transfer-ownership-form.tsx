import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
        <Select
          value={values.destinationKind}
          onValueChange={(value) => updateDestinationKind(value as TransferDestinationKind)}
          disabled={disabled || submitting}
        >
          <SelectTrigger
            id="transfer-destination-kind"
            className="w-full"
            data-pgp-ui="keyDetail.transferOwnership.destinationKind"
            aria-invalid={Boolean(fieldErrors.destinationKind)}
          >
            <SelectValue placeholder="Select destination" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="team">Team vault</SelectItem>
            {allowPersonalDestination ? (
              <SelectItem value="personal">Personal vault (pick recipient)</SelectItem>
            ) : null}
          </SelectContent>
        </Select>
        <FieldError message={fieldErrors.destinationKind} />
      </div>

      {values.destinationKind === "team" ? (
        <div className="space-y-2">
          <Label htmlFor="transfer-owner-group">Team vault</Label>
          <Select
            value={values.ownerGroupId || undefined}
            onValueChange={(value) => {
              setConfirming(false)
              onChange({ ...values, ownerGroupId: value })
            }}
            disabled={disabled || submitting || availableGroups.length === 0}
          >
            <SelectTrigger
              id="transfer-owner-group"
              className="w-full"
              data-pgp-ui="keyDetail.transferOwnership.ownerGroupId"
              aria-invalid={Boolean(fieldErrors.ownerGroupId)}
            >
              <SelectValue placeholder="Select team vault" />
            </SelectTrigger>
            <SelectContent>
              {availableGroups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {availableGroups.length === 0 ? (
            <p className="text-xs text-muted-foreground">Join or create a team vault first.</p>
          ) : null}
          <FieldError message={fieldErrors.ownerGroupId} />
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="transfer-target-user">Recipient (group member)</Label>
          <Select
            value={values.targetUserId || undefined}
            onValueChange={(value) => {
              setConfirming(false)
              onChange({ ...values, targetUserId: value })
            }}
            disabled={disabled || submitting || membersLoading || members.length === 0}
          >
            <SelectTrigger
              id="transfer-target-user"
              className="w-full"
              data-pgp-ui="keyDetail.transferOwnership.targetUserId"
              aria-invalid={Boolean(fieldErrors.targetUserId)}
            >
              <SelectValue
                placeholder={membersLoading ? "Loading members…" : "Select recipient"}
              />
            </SelectTrigger>
            <SelectContent>
              {members.map((member) => (
                <SelectItem key={member.userId} value={member.userId}>
                  <span className="font-mono text-xs">{member.userId}</span>
                  <span className="ml-2 text-muted-foreground">({member.role})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
