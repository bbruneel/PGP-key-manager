import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useApiAccessToken } from "@/hooks/use-api-access-token"
import { useGroupContext } from "@/hooks/use-group-context"
import { ApiError, getApiErrorMessage } from "@/lib/api-error"
import { groupsApi } from "@/lib/groups-api"
import { logUiEvent } from "@/lib/ui-logger"
import type { GroupInvite, GroupMember, GroupMembershipRole, GroupSummary } from "@/types/api"

export function GroupMembersPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const { getAccessToken, isAuthenticated, isConfigured, authError } = useApiAccessToken()
  const { setActiveGroupId, groups } = useGroupContext()
  const [members, setMembers] = useState<GroupMember[]>([])
  const [invites, setInvites] = useState<GroupInvite[]>([])
  const [summary, setSummary] = useState<GroupSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<GroupMembershipRole>("member")
  const [ownerActionsEnabled, setOwnerActionsEnabled] = useState(true)

  useEffect(() => {
    if (groupId) {
      setActiveGroupId(groupId)
    }
  }, [groupId, setActiveGroupId])

  const groupName = useMemo(
    () => groups.find((group) => group.id === groupId)?.name ?? "Team vault",
    [groupId, groups],
  )

  const load = useCallback(async () => {
    if (!groupId || !isConfigured || !isAuthenticated) {
      return
    }
    setLoading(true)
    setError(null)
    setRequestId(null)
    try {
      const accessToken = await getAccessToken()
      const [membersResponse, summaryResponse] = await Promise.all([
        groupsApi.listMembers({ accessToken, groupId }),
        groupsApi.summary({ accessToken, groupId }),
      ])
      setMembers(membersResponse)
      setSummary(summaryResponse)
      try {
        const invitesResponse = await groupsApi.listInvites({ accessToken, groupId })
        setInvites(invitesResponse)
        setOwnerActionsEnabled(true)
      } catch {
        setInvites([])
        setOwnerActionsEnabled(false)
      }
      logUiEvent("info", {
        eventId: "groupMembers.pageView",
        message: "Group members page loaded",
        groupId,
      })
    } catch (apiError) {
      setMembers([])
      setInvites([])
      setSummary(null)
      setError(getApiErrorMessage(apiError))
      if (apiError instanceof ApiError && apiError.requestId) {
        setRequestId(apiError.requestId)
      }
    } finally {
      setLoading(false)
    }
  }, [getAccessToken, groupId, isAuthenticated, isConfigured])

  const refresh = useCallback(() => {
    void load()
  }, [load])

  const performAction = useCallback(
    async (run: (accessToken: string) => Promise<void>, successMessage: string, eventId: string) => {
      if (!groupId) {
        return
      }
      setActionLoading(true)
      setError(null)
      setRequestId(null)
      try {
        const accessToken = await getAccessToken()
        await run(accessToken)
        toast.success(successMessage)
        logUiEvent("info", {
          eventId,
          message: successMessage,
          groupId,
        })
        await load()
      } catch (apiError) {
        setError(getApiErrorMessage(apiError))
        if (apiError instanceof ApiError && apiError.requestId) {
          setRequestId(apiError.requestId)
        }
        logUiEvent("error", {
          eventId: `${eventId}.error`,
          message: "Group member action failed",
          groupId,
        })
      } finally {
        setActionLoading(false)
      }
    },
    [getAccessToken, groupId, load],
  )

  const handleInviteSubmit = useCallback(async () => {
    const email = inviteEmail.trim()
    if (!email || !groupId) {
      setError("Invite email is required")
      return
    }
    await performAction(
      (accessToken) =>
        groupsApi.invite({
          accessToken,
          groupId,
          body: {
            email,
            role: inviteRole,
          },
        }).then(() => undefined),
      "Invite sent",
      "groupMembers.invite.submit",
    )
    setInviteEmail("")
  }, [groupId, inviteEmail, inviteRole, performAction])

  const handleRemoveMember = useCallback(
    async (memberUserId: string) => {
      if (!groupId) {
        return
      }
      await performAction(
        (accessToken) => groupsApi.removeMember({ accessToken, groupId, memberUserId }),
        "Member removed",
        "groupMembers.remove.success",
      )
    },
    [groupId, performAction],
  )

  const handleRevokeInvite = useCallback(
    async (inviteId: string) => {
      if (!groupId) {
        return
      }
      await performAction(
        (accessToken) => groupsApi.revokeInvite({ accessToken, groupId, inviteId }),
        "Invite revoked",
        "groupMembers.revokeInvite.success",
      )
    },
    [groupId, performAction],
  )

  const handleLeaveGroup = useCallback(async () => {
    if (!groupId) {
      return
    }
    await performAction(
      (accessToken) => groupsApi.leave({ accessToken, groupId }),
      "You left the group",
      "groupMembers.leave.success",
    )
    setActiveGroupId(null)
    navigate("/keys")
  }, [groupId, navigate, performAction, setActiveGroupId])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  if (!groupId) {
    return null
  }

  if (!isConfigured) {
    return (
      <section className="rounded-lg border border-dashed border-border bg-card/50 p-6 text-sm md:p-8">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Group members</h2>
        <p className="mt-2 text-muted-foreground">Configure Auth0 to manage group members.</p>
      </section>
    )
  }

  if (!isAuthenticated) {
    return (
      <section className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm md:p-8">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Group members</h2>
        <p className="mt-2 text-sm text-muted-foreground">Sign in to access team vault member management.</p>
        {authError ? <p className="mt-2 text-sm text-destructive">{authError}</p> : null}
      </section>
    )
  }

  return (
    <section className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm md:p-8">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Group members</h2>
          <p className="mt-1 text-sm text-muted-foreground">{groupName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={refresh} disabled={loading || actionLoading}>
            Refresh
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => navigate(`/groups/${groupId}/keys`)}>
            View group keys
          </Button>
        </div>
      </header>

      {summary ? (
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <SummaryCard label="Members" value={String(summary.memberCount)} />
          <SummaryCard label="Pending invites" value={String(summary.pendingInviteCount)} />
          <SummaryCard label="Keys" value={String(summary.keyCount)} />
        </div>
      ) : null}

      {ownerActionsEnabled ? (
        <form
          className="mb-5 grid gap-2 rounded-md border border-input bg-background p-3 md:grid-cols-[2fr_1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault()
            void handleInviteSubmit()
          }}
        >
          <input
            type="email"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            placeholder="Invite email"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            disabled={actionLoading}
          />
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={inviteRole}
            onChange={(event) => setInviteRole(event.target.value as GroupMembershipRole)}
            disabled={actionLoading}
          >
            <option value="member">member</option>
            <option value="owner">owner</option>
          </select>
          <Button type="submit" size="sm" disabled={actionLoading}>
            Invite
          </Button>
        </form>
      ) : null}

      {loading ? <p className="text-sm text-muted-foreground">Loading members…</p> : null}
      {error ? (
        <div className="text-sm text-destructive">
          <p>{error}</p>
          {requestId ? <p className="mt-1 text-xs text-muted-foreground">Request ID: {requestId}</p> : null}
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="overflow-x-auto rounded-md border border-input">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">User ID</th>
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium">Joined</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.userId} className="border-t border-input">
                  <td className="px-3 py-2 font-mono text-xs">{member.userId}</td>
                  <td className="px-3 py-2">{member.role}</td>
                  <td className="px-3 py-2">
                    {new Date(member.joinedAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    })}
                  </td>
                  <td className="px-3 py-2">
                    {ownerActionsEnabled ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void handleRemoveMember(member.userId)}
                        disabled={actionLoading}
                      >
                        Remove
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Owner only</span>
                    )}
                  </td>
                </tr>
              ))}
              {members.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-muted-foreground" colSpan={4}>
                    No members found for this group.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}

      {ownerActionsEnabled && invites.length > 0 ? (
        <div className="mt-4 overflow-x-auto rounded-md border border-input">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Invitee</th>
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium">Expires</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((invite) => (
                <tr key={invite.id} className="border-t border-input">
                  <td className="px-3 py-2">{invite.email ?? invite.inviteeUserId ?? "Unknown"}</td>
                  <td className="px-3 py-2">{invite.role}</td>
                  <td className="px-3 py-2">
                    {invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString() : "n/a"}
                  </td>
                  <td className="px-3 py-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleRevokeInvite(invite.id)}
                      disabled={actionLoading}
                    >
                      Revoke
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="mt-4">
        <Button type="button" variant="outline" size="sm" onClick={() => void handleLeaveGroup()} disabled={actionLoading}>
          Leave group
        </Button>
      </div>
      <Link to={`/groups/${groupId}/keys`} className="mt-2 inline-block text-sm text-primary underline-offset-4 hover:underline">
        Go to team vault keys
      </Link>
    </section>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-input bg-background px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-base font-semibold text-foreground">{value}</p>
    </div>
  )
}
