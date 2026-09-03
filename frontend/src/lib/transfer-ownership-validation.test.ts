import { describe, expect, it } from "vitest"

import {
  buildTransferOwnershipRequest,
  defaultTransferOwnershipFormValues,
  describeTransferImpact,
  validateTransferOwnershipForm,
} from "@/lib/transfer-ownership-validation"
import type { Group, GroupMember } from "@/types/api"

const groups: Group[] = [
  {
    id: "group-1",
    name: "Platform",
    ownerUserId: "user-1",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "group-2",
    name: "Security",
    ownerUserId: "user-1",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
]

const members: GroupMember[] = [
  {
    groupId: "group-1",
    userId: "user-1",
    role: "owner",
    invitedByUserId: null,
    joinedAt: "2026-01-01T00:00:00Z",
  },
  {
    groupId: "group-1",
    userId: "user-2",
    role: "member",
    invitedByUserId: "user-1",
    joinedAt: "2026-01-02T00:00:00Z",
  },
]

describe("transfer-ownership-validation", () => {
  it("defaults personal keys toward team destination", () => {
    expect(defaultTransferOwnershipFormValues("user").destinationKind).toBe("team")
    expect(defaultTransferOwnershipFormValues("group").destinationKind).toBe("personal")
  })

  it("requires team selection for team destination", () => {
    const errors = validateTransferOwnershipForm(
      { destinationKind: "team", ownerGroupId: "", targetUserId: "" },
      {
        keyOwnerType: "user",
        availableGroups: groups,
        members,
      },
    )
    expect(errors.ownerGroupId).toMatch(/destination team/i)
  })

  it("rejects transferring to the same team vault", () => {
    const errors = validateTransferOwnershipForm(
      { destinationKind: "team", ownerGroupId: "group-1", targetUserId: "" },
      {
        keyOwnerType: "group",
        currentOwnerGroupId: "group-1",
        availableGroups: groups,
        members,
      },
    )
    expect(errors.ownerGroupId).toMatch(/already in this team/i)
  })

  it("requires recipient for personal destination", () => {
    const errors = validateTransferOwnershipForm(
      { destinationKind: "personal", ownerGroupId: "", targetUserId: "" },
      {
        keyOwnerType: "group",
        currentOwnerGroupId: "group-1",
        availableGroups: groups,
        members,
      },
    )
    expect(errors.targetUserId).toMatch(/recipient/i)
  })

  it("blocks personal destination for personal keys", () => {
    const errors = validateTransferOwnershipForm(
      { destinationKind: "personal", ownerGroupId: "", targetUserId: "user-2" },
      {
        keyOwnerType: "user",
        availableGroups: groups,
        members,
      },
    )
    expect(errors.destinationKind).toMatch(/team-owned/i)
  })

  it("builds request bodies for team and personal destinations", () => {
    expect(
      buildTransferOwnershipRequest({
        destinationKind: "team",
        ownerGroupId: "group-2",
        targetUserId: "user-2",
      }),
    ).toEqual({ ownerGroupId: "group-2" })

    expect(
      buildTransferOwnershipRequest({
        destinationKind: "personal",
        ownerGroupId: "",
        targetUserId: "user-2",
      }),
    ).toEqual({ targetUserId: "user-2" })
  })

  it("describes access impact with subkey count", () => {
    expect(
      describeTransferImpact({
        destinationKind: "team",
        currentOwnerLabel: "Personal vault",
        destinationLabel: "Platform",
        subkeyCount: 2,
      }),
    ).toMatch(/2 subkeys will move/)

    expect(
      describeTransferImpact({
        destinationKind: "personal",
        currentOwnerLabel: "Owned by Platform",
        destinationLabel: "personal vault",
        subkeyCount: 0,
        recipientUserId: "user-2",
      }),
    ).toMatch(/lose access/)
  })
})
