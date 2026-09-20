import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useContext } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { GroupContext } from "@/hooks/use-group-context"
import { groupsApi } from "@/lib/groups-api"
import { GroupProvider } from "@/providers/group-context"

const getAccessToken = vi.fn()
const authState = vi.hoisted(() => ({
  isAuthenticated: true,
  isConfigured: true,
  isLoading: false,
}))

vi.mock("@/hooks/use-api-access-token", () => ({
  useApiAccessToken: () => ({
    getAccessToken,
    isAuthenticated: authState.isAuthenticated,
    isConfigured: authState.isConfigured,
    isLoading: authState.isLoading,
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
      <p data-testid="group-error">{context.error ?? "none"}</p>
      <p data-testid="group-loading">{context.isLoading ? "yes" : "no"}</p>
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
    authState.isAuthenticated = true
    authState.isConfigured = true
    authState.isLoading = false
  })

  afterEach(() => {
    cleanup()
  })

  it("loads groups without selecting an active group by default", async () => {
    vi.mocked(groupsApi.list).mockResolvedValue([groupOne, groupTwo])

    render(
      <GroupProvider>
        <ContextProbe />
      </GroupProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId("group-count")).toHaveTextContent("2")
      expect(screen.getByTestId("active-group-id")).toHaveTextContent("none")
    })
  })

  it("waits for Auth0 loading to finish before fetching or clearing groups", async () => {
    authState.isLoading = true
    authState.isAuthenticated = false
    vi.mocked(groupsApi.list).mockResolvedValue([groupOne, groupTwo])

    const { rerender } = render(
      <GroupProvider>
        <ContextProbe />
      </GroupProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId("group-loading")).toHaveTextContent("yes")
    })
    expect(groupsApi.list).not.toHaveBeenCalled()
    expect(screen.getByTestId("group-count")).toHaveTextContent("0")

    authState.isLoading = false
    authState.isAuthenticated = true
    rerender(
      <GroupProvider>
        <ContextProbe />
      </GroupProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId("group-count")).toHaveTextContent("2")
    })
    expect(groupsApi.list).toHaveBeenCalledTimes(1)
  })

  it("keeps already-loaded groups when a later refresh fails", async () => {
    const user = userEvent.setup()
    vi.mocked(groupsApi.list)
      .mockResolvedValueOnce([groupOne, groupTwo])
      .mockRejectedValueOnce(new Error("token race"))

    render(
      <GroupProvider>
        <ContextProbe />
      </GroupProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId("group-count")).toHaveTextContent("2")
    })

    await user.click(screen.getByRole("button", { name: "refresh" }))

    await waitFor(() => {
      expect(screen.getByTestId("group-error")).toHaveTextContent("token race")
    })
    expect(screen.getByTestId("group-count")).toHaveTextContent("2")
  })

  it("ignores stale list responses after a newer refresh starts", async () => {
    let resolveFirst: ((groups: typeof groupOne[]) => void) | undefined
    const firstList = new Promise<(typeof groupOne)[]>((resolve) => {
      resolveFirst = resolve
    })

    vi.mocked(groupsApi.list)
      .mockImplementationOnce(() => firstList)
      .mockResolvedValueOnce([groupTwo])

    getAccessToken
      .mockResolvedValueOnce("token-first")
      .mockResolvedValueOnce("token-second")

    render(
      <GroupProvider>
        <ContextProbe />
      </GroupProvider>,
    )

    await waitFor(() => {
      expect(groupsApi.list).toHaveBeenCalledTimes(1)
    })

    await screen.getByRole("button", { name: "refresh" }).click()

    await waitFor(() => {
      expect(groupsApi.list).toHaveBeenCalledTimes(2)
      expect(screen.getByTestId("group-count")).toHaveTextContent("1")
    })

    resolveFirst?.([groupOne, groupTwo])

    await waitFor(() => {
      expect(screen.getByTestId("group-count")).toHaveTextContent("1")
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
      expect(screen.getByTestId("active-group-id")).toHaveTextContent("none")
    })

    await user.click(screen.getByRole("button", { name: "set-group-2" }))
    await user.click(screen.getByRole("button", { name: "refresh" }))

    await waitFor(() => {
      expect(screen.getByTestId("active-group-id")).toHaveTextContent("group-2")
      expect(screen.getByTestId("group-count")).toHaveTextContent("1")
    })
  })
})
