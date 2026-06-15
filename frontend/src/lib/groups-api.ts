import { requestJson, requestText } from "@/lib/api-client"
import type {
  AcceptInviteResponse,
  AdminGroup,
  AdminUser,
  CreateGroupInviteRequest,
  CreateGroupRequest,
  Group,
  GroupInvite,
  GroupMember,
  GroupSummary,
  UpdateGroupRequest,
} from "@/types/api"

export type GroupIdOptions = {
  accessToken: string
  groupId: string
}

export type CreateGroupOptions = {
  accessToken: string
  body: CreateGroupRequest
}

export type UpdateGroupOptions = {
  accessToken: string
  groupId: string
  body: UpdateGroupRequest
}

export type InviteGroupMemberOptions = {
  accessToken: string
  groupId: string
  body: CreateGroupInviteRequest
}

export type RemoveGroupMemberOptions = {
  accessToken: string
  groupId: string
  memberUserId: string
}

export type AcceptInviteOptions = {
  accessToken: string
  token: string
}

export const groupsApi = {
  list(options: { accessToken: string }): Promise<Group[]> {
    return requestJson<Group[]>("/api/groups", {
      operationId: "listGroups",
      accessToken: options.accessToken,
      method: "GET",
    })
  },

  create(options: CreateGroupOptions): Promise<Group> {
    return requestJson<Group>("/api/groups", {
      operationId: "createGroup",
      accessToken: options.accessToken,
      method: "POST",
      body: options.body,
    })
  },

  get(options: GroupIdOptions): Promise<Group> {
    return requestJson<Group>(`/api/groups/${options.groupId}`, {
      operationId: "getGroup",
      accessToken: options.accessToken,
      method: "GET",
    })
  },

  update(options: UpdateGroupOptions): Promise<Group> {
    return requestJson<Group>(`/api/groups/${options.groupId}`, {
      operationId: "updateGroup",
      accessToken: options.accessToken,
      method: "PATCH",
      body: options.body,
    })
  },

  delete(options: GroupIdOptions): Promise<void> {
    return requestJson<void>(`/api/groups/${options.groupId}`, {
      operationId: "deleteGroup",
      accessToken: options.accessToken,
      method: "DELETE",
    })
  },

  listMembers(options: GroupIdOptions): Promise<GroupMember[]> {
    return requestJson<GroupMember[]>(`/api/groups/${options.groupId}/members`, {
      operationId: "listGroupMembers",
      accessToken: options.accessToken,
      method: "GET",
    })
  },

  removeMember(options: RemoveGroupMemberOptions): Promise<void> {
    return requestJson<void>(`/api/groups/${options.groupId}/members/${options.memberUserId}`, {
      operationId: "removeGroupMember",
      accessToken: options.accessToken,
      method: "DELETE",
    })
  },

  invite(options: InviteGroupMemberOptions): Promise<GroupInvite> {
    return requestJson<GroupInvite>(`/api/groups/${options.groupId}/invites`, {
      operationId: "inviteGroupMember",
      accessToken: options.accessToken,
      method: "POST",
      body: options.body,
    })
  },

  listInvites(options: GroupIdOptions): Promise<GroupInvite[]> {
    return requestJson<GroupInvite[]>(`/api/groups/${options.groupId}/invites`, {
      operationId: "listGroupInvites",
      accessToken: options.accessToken,
      method: "GET",
    })
  },

  summary(options: GroupIdOptions): Promise<GroupSummary> {
    return requestJson<GroupSummary>(`/api/groups/${options.groupId}/summary`, {
      operationId: "getGroupSummary",
      accessToken: options.accessToken,
      method: "GET",
    })
  },

  exportMembersAudit(options: GroupIdOptions): Promise<string> {
    return requestText(`/api/groups/${options.groupId}/members/audit.csv`, {
      operationId: "exportGroupMembersAudit",
      accessToken: options.accessToken,
      method: "GET",
      headers: { Accept: "text/csv" },
    })
  },

  acceptInvite(options: AcceptInviteOptions): Promise<AcceptInviteResponse> {
    return requestJson<AcceptInviteResponse>(`/api/invites/${options.token}/accept`, {
      operationId: "acceptInvite",
      accessToken: options.accessToken,
      method: "POST",
    })
  },

  listAdminGroups(options: { accessToken: string }): Promise<AdminGroup[]> {
    return requestJson<AdminGroup[]>("/api/admin/groups", {
      operationId: "listAdminGroups",
      accessToken: options.accessToken,
      method: "GET",
    })
  },

  listAdminUsers(options: { accessToken: string }): Promise<AdminUser[]> {
    return requestJson<AdminUser[]>("/api/admin/users", {
      operationId: "listAdminUsers",
      accessToken: options.accessToken,
      method: "GET",
    })
  },
}
