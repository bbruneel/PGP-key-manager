import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useContext } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { GroupContext } from "@/hooks/use-group-context"
import { groupsApi } from "@/lib/groups-api"
import { GroupProvider } from "@/providers/group-context"

const getAccessToken = vi.fn()

vi.mock("@/hooks/use-api-access-token", () => ({
  useApiAccessToken: () => ({
    getAccessToken,
    isAuthenticated: true,
    isConfigured: true,
  }),
}))

vi.mock("@/lib/groups-api", () => ({
  groupsApi: {
    list: vi.fn(),
  },
}))

function ContextProbe() {
  const context = useContext(GroupContext)
  if (!context) {
    return null
  }

  return (
    <div>
      <p data-testid="active-group-id">{context.activeGroupId ?? "none"}</p>
      <p data-testid="group-count">{String(context.groups.length)}</p>
      <button type="button" onClick={() => context.setActiveGroupId("group-2")}>
        set-group-2
      </button>
      <button type="button" onClick={() => void context.refreshGroups()}>
        refresh
      </button>
    </div>
  )
}

describe("GroupProvider", () => {
  const groupOne = {
    id: "group-1",
    name: "Team one",
    description: null,
    ownerUserId: "user-1",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  }
  const groupTwo = {
    id: "group-2",
    name: "Team two",
    description: null,
    ownerUserId: "user-2",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  }

  beforeEach(() => {
    getAccessToken.mockReset()
    vi.mocked(groupsApi.list).mockReset()
    getAccessToken.mockResolvedValue("token-abc")
  })

  afterEach(() => {
    cleanup()
  })

  it("loads groups and defaults the active group to the first item", async () => {
    vi.mocked(groupsApi.list).mockResolvedValue([groupOne, groupTwo])

    render(
      <GroupProvider>
        <ContextProbe />
      </GroupProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId("group-count")).toHaveTextContent("2")
      expect(screen.getByTestId("active-group-id")).toHaveTextContent("group-1")
    })
  })

  it("keeps explicit active group when still present after refresh", async () => {
    const user = userEvent.setup()
    vi.mocked(groupsApi.list)
      .mockResolvedValueOnce([groupOne, groupTwo])
      .mockResolvedValueOnce([groupTwo])

    render(
      <GroupProvider>
        <ContextProbe />
      </GroupProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId("active-group-id")).toHaveTextContent("group-1")
    })

    await user.click(screen.getByRole("button", { name: "set-group-2" }))
    await user.click(screen.getByRole("button", { name: "refresh" }))

    await waitFor(() => {
      expect(screen.getByTestId("active-group-id")).toHaveTextContent("group-2")
      expect(screen.getByTestId("group-count")).toHaveTextContent("1")
    })
  })
})
