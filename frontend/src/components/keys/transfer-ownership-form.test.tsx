import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { TransferOwnershipForm } from "@/components/keys/transfer-ownership-form"
import { defaultTransferOwnershipFormValues } from "@/lib/transfer-ownership-validation"
import type { Group, GroupMember } from "@/types/api"

const groups: Group[] = [
  {
    id: "group-1",
    name: "Platform",
    ownerUserId: "user-1",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
]

const members: GroupMember[] = [
  {
    groupId: "group-1",
    userId: "user-2",
    role: "member",
    invitedByUserId: "user-1",
    joinedAt: "2026-01-02T00:00:00Z",
  },
]

describe("TransferOwnershipForm", () => {
  it("shows confirm summary before submitting", async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onChange = vi.fn()

    render(
      <TransferOwnershipForm
        values={{
          destinationKind: "team",
          ownerGroupId: "group-1",
          targetUserId: "",
        }}
        fieldErrors={{}}
        apiError={null}
        requestId={null}
        submitting={false}
        disabled={false}
        currentOwnerLabel="Personal vault"
        availableGroups={groups}
        members={[]}
        membersLoading={false}
        subkeyCount={1}
        allowPersonalDestination={false}
        onChange={onChange}
        onConfirm={onConfirm}
      />,
    )

    await user.click(screen.getByRole("button", { name: /transfer ownership/i }))
    expect(screen.getByText(/1 subkey will move/i)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /confirm transfer/i }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it("disables transfer for revoked keys", () => {
    render(
      <TransferOwnershipForm
        values={defaultTransferOwnershipFormValues("user")}
        fieldErrors={{}}
        apiError={null}
        requestId={null}
        submitting={false}
        disabled
        disabledReason="Revoked keys cannot be transferred."
        currentOwnerLabel="Personal vault"
        availableGroups={groups}
        members={members}
        membersLoading={false}
        subkeyCount={0}
        allowPersonalDestination={false}
        onChange={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )

    expect(screen.getByText(/revoked keys cannot be transferred/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /transfer ownership/i })).toBeDisabled()
  })

  it("offers personal destination when allowed", () => {
    render(
      <TransferOwnershipForm
        values={defaultTransferOwnershipFormValues("group")}
        fieldErrors={{}}
        apiError={null}
        requestId={null}
        submitting={false}
        disabled={false}
        currentOwnerLabel="Owned by Platform"
        availableGroups={groups}
        members={members}
        membersLoading={false}
        subkeyCount={0}
        allowPersonalDestination
        onChange={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )

    expect(screen.getByLabelText(/destination/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/recipient/i)).toBeInTheDocument()
  })
})
