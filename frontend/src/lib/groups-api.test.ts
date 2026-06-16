import { beforeEach, describe, expect, it, vi } from "vitest"

import { requestJson, requestText } from "@/lib/api-client"
import { groupsApi } from "@/lib/groups-api"

vi.mock("@/lib/api-client", () => ({
  requestJson: vi.fn(),
  requestText: vi.fn(),
}))

describe("groupsApi", () => {
  const group = {
    id: "group-1",
    name: "Security",
    description: null,
    ownerUserId: "user-1",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  }

  beforeEach(() => {
    vi.mocked(requestJson).mockReset()
    vi.mocked(requestText).mockReset()
  })

  it("lists groups", async () => {
    vi.mocked(requestJson).mockResolvedValue([group])

    const result = await groupsApi.list({ accessToken: "token-abc" })

    expect(requestJson).toHaveBeenCalledWith("/api/groups", {
      operationId: "listGroups",
      accessToken: "token-abc",
      method: "GET",
    })
    expect(result).toEqual([group])
  })

  it("creates a group", async () => {
    vi.mocked(requestJson).mockResolvedValue(group)

    const body = { name: "Security", description: "Security team keys" }
    const result = await groupsApi.create({ accessToken: "token-abc", body })

    expect(requestJson).toHaveBeenCalledWith("/api/groups", {
      operationId: "createGroup",
      accessToken: "token-abc",
      method: "POST",
      body,
    })
    expect(result).toEqual(group)
  })

  it("lists group members", async () => {
    vi.mocked(requestJson).mockResolvedValue([{ groupId: "group-1", userId: "user-1", role: "owner" }])

    const result = await groupsApi.listMembers({ accessToken: "token-abc", groupId: "group-1" })

    expect(requestJson).toHaveBeenCalledWith("/api/groups/group-1/members", {
      operationId: "listGroupMembers",
      accessToken: "token-abc",
      method: "GET",
    })
    expect(result).toEqual([{ groupId: "group-1", userId: "user-1", role: "owner" }])
  })

  it("removes a group member", async () => {
    vi.mocked(requestJson).mockResolvedValue(undefined)

    await groupsApi.removeMember({ accessToken: "token-abc", groupId: "group-1", memberUserId: "user-2" })

    expect(requestJson).toHaveBeenCalledWith("/api/groups/group-1/members/user-2", {
      operationId: "removeGroupMember",
      accessToken: "token-abc",
      method: "DELETE",
    })
  })

  it("leaves a group", async () => {
    vi.mocked(requestJson).mockResolvedValue(undefined)

    await groupsApi.leave({ accessToken: "token-abc", groupId: "group-1" })

    expect(requestJson).toHaveBeenCalledWith("/api/groups/group-1/members/me", {
      operationId: "leaveGroup",
      accessToken: "token-abc",
      method: "DELETE",
    })
  })

  it("revokes a pending invite", async () => {
    vi.mocked(requestJson).mockResolvedValue(undefined)

    await groupsApi.revokeInvite({ accessToken: "token-abc", groupId: "group-1", inviteId: "invite-1" })

    expect(requestJson).toHaveBeenCalledWith("/api/groups/group-1/invites/invite-1", {
      operationId: "revokeGroupInvite",
      accessToken: "token-abc",
      method: "DELETE",
    })
  })

  it("loads group summary", async () => {
    vi.mocked(requestJson).mockResolvedValue({
      group,
      memberCount: 2,
      pendingInviteCount: 1,
      keyCount: 5,
    })

    const result = await groupsApi.summary({ accessToken: "token-abc", groupId: "group-1" })

    expect(requestJson).toHaveBeenCalledWith("/api/groups/group-1/summary", {
      operationId: "getGroupSummary",
      accessToken: "token-abc",
      method: "GET",
    })
    expect(result.memberCount).toBe(2)
  })

  it("exports members audit CSV", async () => {
    vi.mocked(requestText).mockResolvedValue("groupId,userId\n")

    const result = await groupsApi.exportMembersAudit({ accessToken: "token-abc", groupId: "group-1" })

    expect(requestText).toHaveBeenCalledWith("/api/groups/group-1/members/audit.csv", {
      operationId: "exportGroupMembersAudit",
      accessToken: "token-abc",
      method: "GET",
      headers: { Accept: "text/csv" },
    })
    expect(result).toBe("groupId,userId\n")
  })

  it("lists admin entities", async () => {
    vi.mocked(requestJson)
      .mockResolvedValueOnce([
        {
          ...group,
          memberCount: 2,
          keyCount: 5,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "user-1",
          auth0Sub: "auth0|user-1",
          email: "owner@example.com",
          displayName: "Owner",
          platformRole: "user",
          createdAt: "2026-01-01T00:00:00Z",
        },
      ])

    const groups = await groupsApi.listAdminGroups({ accessToken: "token-abc" })
    const users = await groupsApi.listAdminUsers({ accessToken: "token-abc" })

    expect(requestJson).toHaveBeenNthCalledWith(1, "/api/admin/groups", {
      operationId: "listAdminGroups",
      accessToken: "token-abc",
      method: "GET",
    })
    expect(requestJson).toHaveBeenNthCalledWith(2, "/api/admin/users", {
      operationId: "listAdminUsers",
      accessToken: "token-abc",
      method: "GET",
    })
    expect(groups).toHaveLength(1)
    expect(users).toHaveLength(1)
  })
})
