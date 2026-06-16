import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { groupsApi } from "@/lib/groups-api"

const getAccessToken = vi.fn()
const setActiveGroupId = vi.fn()
const navigate = vi.fn()

vi.mock("@/hooks/use-api-access-token", () => ({
  useApiAccessToken: () => ({
    getAccessToken,
    isAuthenticated: true,
    isConfigured: true,
    authError: null,
  }),
}))

vi.mock("@/hooks/use-group-context", () => ({
  useGroupContext: () => ({
    groups: [{ id: "group-1", name: "Security Team" }],
    setActiveGroupId,
  }),
}))

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom")
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}))

vi.mock("@/lib/ui-logger", () => ({
  logUiEvent: vi.fn(),
}))

vi.mock("@/lib/groups-api", () => ({
  groupsApi: {
    listMembers: vi.fn(),
    summary: vi.fn(),
    listInvites: vi.fn(),
    invite: vi.fn(),
    removeMember: vi.fn(),
    revokeInvite: vi.fn(),
    leave: vi.fn(),
  },
}))

import { GroupMembersPage } from "@/pages/GroupMembersPage"

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/groups/group-1/members"]}>
      <Routes>
        <Route path="/groups/:groupId/members" element={<GroupMembersPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe("GroupMembersPage", () => {
  beforeEach(() => {
    getAccessToken.mockReset()
    setActiveGroupId.mockReset()
    navigate.mockReset()
    getAccessToken.mockResolvedValue("token-abc")
    vi.mocked(groupsApi.listMembers).mockResolvedValue([
      {
        groupId: "group-1",
        userId: "user-1",
        role: "owner",
        invitedByUserId: null,
        joinedAt: "2026-01-01T00:00:00Z",
      },
    ])
    vi.mocked(groupsApi.summary).mockResolvedValue({
      group: {
        id: "group-1",
        name: "Security Team",
        description: null,
        ownerUserId: "user-1",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
      memberCount: 1,
      pendingInviteCount: 0,
      keyCount: 2,
    })
    vi.mocked(groupsApi.listInvites).mockResolvedValue([])
    vi.mocked(groupsApi.invite).mockResolvedValue({
      id: "invite-1",
      groupId: "group-1",
      token: "token",
      email: "invitee@example.test",
      inviteeUserId: null,
      role: "member",
      invitedByUserId: "user-1",
      expiresAt: "2030-01-01T00:00:00Z",
      acceptedAt: null,
      createdAt: "2026-01-01T00:00:00Z",
    })
    vi.mocked(groupsApi.leave).mockResolvedValue()
  })

  it("submits invite and reloads page data", async () => {
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(groupsApi.listMembers).toHaveBeenCalled()
    })
    await user.type(screen.getByPlaceholderText("Invite email"), "invitee@example.test")
    await user.click(screen.getByRole("button", { name: "Invite" }))

    await waitFor(() => {
      expect(groupsApi.invite).toHaveBeenCalledWith({
        accessToken: "token-abc",
        groupId: "group-1",
        body: {
          email: "invitee@example.test",
          role: "member",
        },
      })
    })
  })

  it("leaves group and navigates to keys", async () => {
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(groupsApi.listMembers).toHaveBeenCalled()
    })
    await user.click(screen.getAllByRole("button", { name: "Leave group" })[0])

    await waitFor(() => {
      expect(groupsApi.leave).toHaveBeenCalledWith({
        accessToken: "token-abc",
        groupId: "group-1",
      })
      expect(setActiveGroupId).toHaveBeenCalledWith(null)
      expect(navigate).toHaveBeenCalledWith("/keys")
    })
  })
})
