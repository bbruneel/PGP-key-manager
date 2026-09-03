import type { Group, GroupMember, TransferOwnershipRequest } from "@/types/api"

export type TransferDestinationKind = "team" | "personal"

export type TransferOwnershipFormValues = {
  destinationKind: TransferDestinationKind
  ownerGroupId: string
  targetUserId: string
}

export type TransferOwnershipFieldErrors = {
  destinationKind?: string
  ownerGroupId?: string
  targetUserId?: string
}

export function defaultTransferOwnershipFormValues(
  keyOwnerType: "user" | "group" | undefined,
): TransferOwnershipFormValues {
  return {
    destinationKind: keyOwnerType === "group" ? "personal" : "team",
    ownerGroupId: "",
    targetUserId: "",
  }
}

export function validateTransferOwnershipForm(
  values: TransferOwnershipFormValues,
  options: {
    keyOwnerType: "user" | "group" | undefined
    currentOwnerGroupId?: string | null
    availableGroups: Group[]
    members: GroupMember[]
  },
): TransferOwnershipFieldErrors {
  const errors: TransferOwnershipFieldErrors = {}

  if (values.destinationKind === "team") {
    if (!values.ownerGroupId.trim()) {
      errors.ownerGroupId = "Select a destination team vault"
    } else if (!options.availableGroups.some((group) => group.id === values.ownerGroupId)) {
      errors.ownerGroupId = "Select a team vault you belong to"
    } else if (
      options.keyOwnerType === "group" &&
      options.currentOwnerGroupId &&
      values.ownerGroupId === options.currentOwnerGroupId
    ) {
      errors.ownerGroupId = "Key is already in this team vault"
    }
  } else {
    if (options.keyOwnerType !== "group") {
      errors.destinationKind = "Personal destination is only available for team-owned keys"
    } else if (!values.targetUserId.trim()) {
      errors.targetUserId = "Select a recipient who is a member of this team"
    } else if (!options.members.some((member) => member.userId === values.targetUserId)) {
      errors.targetUserId = "Recipient must be a member of the source team"
    }
  }

  return errors
}

export function buildTransferOwnershipRequest(
  values: TransferOwnershipFormValues,
): TransferOwnershipRequest {
  if (values.destinationKind === "team") {
    return { ownerGroupId: values.ownerGroupId }
  }
  return { targetUserId: values.targetUserId }
}

export function describeTransferImpact(options: {
  destinationKind: TransferDestinationKind
  currentOwnerLabel: string
  destinationLabel: string
  subkeyCount: number
  recipientUserId?: string | null
}): string {
  const subkeyNote =
    options.subkeyCount === 0
      ? "No subkeys will move."
      : options.subkeyCount === 1
        ? "1 subkey will move with the primary."
        : `${options.subkeyCount} subkeys will move with the primary.`

  if (options.destinationKind === "personal") {
    return `Move from ${options.currentOwnerLabel} to the personal vault of ${options.recipientUserId}. Other team members will lose access. ${subkeyNote}`
  }

  return `Move from ${options.currentOwnerLabel} to ${options.destinationLabel}. Members of the destination team will gain access. ${subkeyNote}`
}
